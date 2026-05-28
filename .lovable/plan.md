
## Diagnóstico

Você está correto. Hoje o modelo é:

- `emitentes_nfe` está amarrado a `granja_id` (1 por granja).
- `emitentes_nfe_credentials` guarda o token também ligado ao emitente da granja.
- `inscricoes_produtor` aponta para esse emitente via `emitente_id` e usa o flag `is_emitente_principal`.

Resultado: a granja inteira compartilha **token, ambiente, série e numeração**, mas na hora de emitir o sistema envia o **CPF do sócio** como emitente. A Focus rejeita porque, na conta dela, **cada CPF/CNPJ é uma empresa independente**, com **seu próprio token**, **seu próprio certificado A1**, **sua própria habilitação de ambiente** e **sua própria numeração/série**.

Como você confirmou que na Focus NFe usa **token específico por empresa** e **numeração própria por sócio**, o caminho certo é mover toda a configuração fiscal do nível "granja" para o nível **inscrição do produtor**.

## Novo modelo

```text
produtor (Julio Cesar)
  └── inscricao_produtor (CPF 606.846.740-68, IE RS xxxxx)
        ├── emitente_nfe (1:1)
        │     ├── ambiente (prod / homologação)
        │     ├── serie_nfe / numero_atual_nfe
        │     ├── serie_nfce / numero_atual_nfce
        │     ├── CRT, alíquotas e CSTs padrão
        │     ├── certificado_nome / certificado_validade
        │     └── credenciais → token da Focus daquela empresa
        └── (granja vira apenas vínculo opcional)
```

Cada inscrição passa a ter seu próprio cadastro de emitente, espelhando 1:1 a "empresa" cadastrada na Focus NFe.

## O que muda

### Banco de dados (migration)

1. Adicionar `inscricao_produtor_id` (uuid, FK) em `emitentes_nfe` e tornar `granja_id` apenas informativo (nullable).
2. Criar índice único parcial em `emitentes_nfe(inscricao_produtor_id)` para garantir 1 emitente por inscrição.
3. **Migração de dados**: para cada `emitentes_nfe` atual, criar/clonar um registro por inscrição vinculada àquela granja, copiando ambiente, série, numeração, CRT, alíquotas, CSTs e certificado. Replicar `emitentes_nfe_credentials` (token) para cada novo emitente.
4. Atualizar `inscricoes_produtor.emitente_id` para apontar para o novo emitente próprio da inscrição.
5. Remover/aposentar a flag `is_emitente_principal` (não faz mais sentido — cada inscrição já tem seu próprio emitente).

### Backend / Edge Functions

6. `focus-nfe-emitir`, `focus-nfe-consultar`, `focus-nfe-cancelar`, `focus-nfe-carta-correcao`, `focus-nfe-download`, `focus-nfe-verificar-empresa`: buscar token e ambiente via `inscricoes_produtor → emitentes_nfe → emitentes_nfe_credentials`, em vez de via granja.
7. Numeração da NF-e (próximo número) lida e incrementada no emitente da **inscrição emissora**, não no emitente da granja.

### Frontend

8. Tela **FISCAL → Emitentes NF-e** passa a listar emitentes **por inscrição** (mostrando "Sócio — CPF/CNPJ — IE — Granja"). Formulário de criação/edição amarrado à inscrição, não à granja.
9. No cadastro do **Produtor / Inscrições do Produtor**: botão "Configurar Emitente NF-e desta inscrição" abre o emitente correspondente.
10. Fluxo de emissão (`useFocusNfe`, `focusNfeMapper`, Vendas / Compras / Transferências / Notas de depósito) passa a resolver o emitente pela **inscrição emissora** escolhida, e não mais pela granja.
11. Mensagens de erro da Focus (empresa não encontrada, token inválido, ambiente errado) com orientação direta: "Verifique no painel da Focus NFe se o CPF/CNPJ X está cadastrado como empresa, com token e certificado A1 do ambiente Y".

### Caso específico do Julio Cesar (resolve o erro atual)

- Após a migração, o emitente do Julio terá o CPF correto da inscrição. Você ajusta o **token** desse emitente para o token-empresa do Julio na Focus, marca **ambiente = Produção**, define **série e próximo número** próprios dele, e a emissão volta a funcionar — sem afetar outros sócios da mesma granja.

## Detalhes técnicos

- A coluna `granja_id` em `emitentes_nfe` permanece (nullable) só como referência de qual granja o sócio opera; toda lógica fiscal passa a usar `inscricao_produtor_id`.
- A migração de dados é idempotente: se já existir emitente para a inscrição, não duplica.
- `useInscricaoEmitentePrincipal` é substituído por `useEmitenteDaInscricao(inscricaoId)`.
- RLS dos novos campos segue o mesmo padrão multi-tenant (`tenant_id` derivado da inscrição).
- Nenhum dado fiscal histórico (NF-e já autorizadas) é alterado — só o cadastro de emitente.

## Fora do escopo

- Não vamos mexer no fluxo de upload/renovação de certificado A1 (continua sendo feito direto no painel da Focus).
- Não vamos automatizar o cadastro da "empresa" na Focus — isso continua manual no painel deles.
