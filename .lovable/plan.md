## Contexto

Hoje o vínculo entre a NF-e e o registro de origem (Compra de Cereais / Devolução de Depósito) só acontece dentro dos diálogos dedicados:

- `EmitirNfeCompraDialog` grava `nota_fiscal_id` e status `nfe_emitida` em `compras_cereais`.
- `EmitirNfeDevolucaoDialog` faz o mesmo em `devolucoes_deposito`.

Quando o usuário emite a NF-e **direto pela página de Notas Fiscais** (`NotaFiscalForm.tsx`), o polling atualiza apenas a própria nota. As tabelas `compras_cereais` e `devolucoes_deposito` continuam com `status = 'pendente'` e `nota_fiscal_id = null` — mesmo padrão do bug já corrigido nas 9 compras órfãs de 21/07.

## O que fazer

### 1. Auto-vinculação no momento da autorização (NotaFiscalForm)
Após `realStatus === 'autorizado' | 'autorizada'` no bloco de polling (linhas ~1057 de `src/pages/NotaFiscalForm.tsx`), executar uma tentativa de vínculo:

- Detectar o "tipo de origem" pela **CFOP dos itens** da nota:
  - `1101 / 1102 / 2101 / 2102` → compra de cereais
  - `1905 / 2905` (entrada em devolução do depositante) → devolução de depósito
- Buscar candidatos elegíveis (`tenant_id` atual, `status = 'pendente'`, `nota_fiscal_id IS NULL`) com:
  - mesmo `cpf_cnpj` da contraparte (vendedor da compra = emitente/destinatário conforme o caso; produtor da devolução),
  - `valor_total` igual ao total da nota (tolerância R$ 0,01),
  - `data_operacao` dentro de ±3 dias da `data_emissao`.
- Se **exatamente 1 candidato** → `UPDATE compras_cereais|devolucoes_deposito SET nota_fiscal_id = <id>, status = 'nfe_emitida'`.
- Se **0 ou múltiplos** → não altera nada e exibe toast informativo ("Vincule manualmente à compra/devolução correspondente").
- Invalida os caches `["compras-cereais"]` / `["devolucoes-deposito"]`.

### 2. Vínculo manual nas listas
Nas telas `CompraCereais` e `DevolucoesDeposito`, no menu de ações de registros com status "Pendente":

- Novo item **"Vincular NF-e existente…"** abre um diálogo que lista as NF-es autorizadas do mesmo emitente/tenant sem origem vinculada (`SELECT` filtrado por CFOP + `cpf_cnpj` contraparte + faixa de datas).
- Ao selecionar, grava `nota_fiscal_id` e status `nfe_emitida` no registro.

### 3. Backfill retroativo
Migration única de reconciliação com o mesmo critério da regra automática (CFOP + CPF/CNPJ + valor + janela de datas) para vincular registros pendentes anteriores à correção. Estritamente vínculos 1‑para‑1; múltiplos ficam para vínculo manual.

### 4. Cancelamento (consistência)
`supabase/functions/focus-nfe-cancelar` já limpa vínculos em compras. Estender a mesma lógica para `devolucoes_deposito` (volta status para `pendente` e limpa `nota_fiscal_id` quando a NF-e vinculada for cancelada).

## Detalhes técnicos

- Arquivos afetados: `src/pages/NotaFiscalForm.tsx`, `src/pages/CompraCereais.tsx`, `src/pages/DevolucoesDeposito.tsx` (+ novo `VincularNfeDialog.tsx` compartilhado), `supabase/functions/focus-nfe-cancelar/index.ts`, 1 migration SQL de backfill.
- Reuso: helpers de match (CFOP → origem, comparação de valor/datas) ficam em `src/lib/nfeVinculo.ts` para serem chamados tanto no polling quanto no diálogo manual.
- Nenhuma mudança de schema — só usa colunas já existentes (`nota_fiscal_id`, `status`, `cpf_cnpj`, `valor_total`, `data_operacao`).