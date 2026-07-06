## Problema

1. **DANFE não exibe corretamente Transportador / CNPJ-CPF** — hoje o código coloca o nome do motorista em `transp_nome` apenas como fallback (sem CPF), então o motorista aparece como "transportador" sem documento.
2. **Motorista + CPF do motorista** não aparecem em lugar nenhum quando há transportadora cadastrada (a DANFE oficial não tem campo próprio para motorista → precisa ir nas Informações Complementares).
3. **Ao incluir/editar a remessa, o usuário não vê prévia** das Informações Complementares que serão gravadas na NFe.

## O que fazer

### 1. Preencher os campos oficiais de Transportador da DANFE
Em `src/components/remessas/EmitirNfeAutomaticoDialog.tsx`, alterar a montagem do `notaFiscalData`:

- **Se houver transportadora cadastrada:** usar os dados dela (`transp_nome`, `transp_cpf_cnpj`, `transp_ie`, endereço, cidade, uf) como já hoje.
- **Se NÃO houver transportadora, mas houver motorista informado na remessa:** preencher os campos oficiais da DANFE com os dados do motorista:
  - `transp_nome` = `remessa.motorista`
  - `transp_cpf_cnpj` = `remessa.motorista_cpf` (limpo, 11 dígitos → o mapper já detecta CPF vs CNPJ e envia `transportador_cpf`).
  - demais campos (IE, endereço, cidade, uf) ficam `null`.
- **Se não houver nenhum dos dois:** deixar tudo `null`.

### 2. Sempre adicionar Motorista + CPF nas Informações Complementares (redundância útil)
Quando `remessa.motorista` estiver preenchido, adicionar linha `Motorista: <nome> - CPF: <cpf>` nas Informações Complementares. Isso garante que, mesmo quando o transportador for a empresa, o motorista físico apareça na DANFE.

Também adicionar `Placa: <placa>/<uf>` para reforçar a rastreabilidade.

### 3. Prévia das Informações Complementares no dialog da remessa
Em `src/components/remessas/EditarRemessaDialog.tsx`:
- Extrair a lógica de montagem do texto de Informações Complementares para uma função utilitária compartilhada em novo arquivo `src/lib/infoComplementarRemessa.ts`.
- Usar essa mesma função no `EmitirNfeAutomaticoDialog` para eliminar duplicação.
- Adicionar um Card "Informações Complementares (NFe)" no `EditarRemessaDialog` com um `<Textarea readOnly>` que se recalcula em tempo real conforme o usuário altera transportadora, motorista, CPF, placa etc.

## Detalhes técnicos

- Função utilitária:
  ```ts
  buildInfoComplementarRemessa({
    contrato, remessa, transportadora, localEntrega
  }): string
  ```
- No `EditarRemessaDialog`, receber `contrato` via prop e a lista de transportadoras via `useTransportadoras` (já usado) para resolver o nome pelo `transportadoraId` selecionado, refletindo o estado atual do formulário na prévia.
- `RemessasVendaForm.tsx`: passar `contrato` como prop ao `EditarRemessaDialog`.
- Nenhum ajuste no `focusNfeMapper.ts` — o mapper já envia `transportador_nome/cpf/cnpj/ie/endereco/municipio/uf` corretamente.

## Arquivos afetados
- criar `src/lib/infoComplementarRemessa.ts`
- editar `src/components/remessas/EmitirNfeAutomaticoDialog.tsx`
- editar `src/components/remessas/EditarRemessaDialog.tsx`
- editar `src/pages/RemessasVendaForm.tsx`
