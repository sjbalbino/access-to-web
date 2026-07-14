# Corrigir emitente exibido nas notas de depósito

## Causa raiz

Em `src/components/deposito/NotaDepositoFormDialog.tsx`, ao criar a `notas_fiscais` (linha 329), o campo `inscricao_produtor_id` — que, no modelo do sistema, identifica a **inscrição do sócio emitente** da NF-e — está sendo preenchido com `inscricaoId` (a inscrição do **depositante**, dono do saldo).

Resultado: a NF-e vai corretamente para a SEFAZ com o emitente Marcio Grings (`emitente_id` está certo), mas a tela de Notas Fiscais lê `inscricao_produtor_id` como "Inscrição do Sócio (Emitente)" e mostra o Saulo, exibindo o alerta "Esta inscrição não tem Emitente NF-e vinculado".

O depositante continua correto porque já está gravado nos campos `dest_*`.

## Alterações

### 1. `src/components/deposito/NotaDepositoFormDialog.tsx`

- Linha 329: trocar
  `inscricao_produtor_id: inscricaoId,`
  por
  `inscricao_produtor_id: inscricaoPrincipal.id,`

  (`inscricaoPrincipal` já está disponível na linha 120 via `useInscricaoEmitentePrincipal(granjaId)` e é a inscrição do sócio emitente principal da granja — o Marcio no caso.)

- Nenhuma outra alteração: `emitente_id`, `dest_*`, itens, `notas_deposito_emitidas` (que tem seu próprio `inscricao_produtor_id` = depositante) permanecem como estão.

### 2. Migração de dados (corrigir notas já criadas)

Atualizar `notas_fiscais` das notas de depósito existentes para que `inscricao_produtor_id` aponte para a inscrição vinculada ao `emitente_id` (a inscrição do sócio emitente), somente quando:

- `cfop_id` corresponde ao CFOP 1905, **e**
- `emitente_id` está preenchido, **e**
- o atual `inscricao_produtor_id` é diferente da `inscricoes_produtor.id` referenciada pelo `emitentes_nfe.inscricao_produtor_id`.

Isso corrige a nota #28 (e qualquer outra gerada pelo mesmo fluxo) sem tocar em notas de outros módulos.

## Verificação

- Abrir a nota #28: a aba Emitente deve mostrar "MARCIO GRINGS — IE …" sem o alerta amarelo.
- Emitir uma nova nota de depósito e conferir na tela de Notas Fiscais.
- `dest_*` continua exibindo o Saulo como destinatário/depositante.

## Fora de escopo

- Nenhuma mudança na emissão via Focus NFe (já estava correta).
- Nenhuma mudança no cálculo de saldos, `notas_deposito_emitidas` ou telas de depósito.
