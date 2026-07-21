
## Contexto

Na emissão de NFe, os CSTs de PIS e COFINS são resolvidos na ordem **Produto → Emitente → CFOP → fallback**. Hoje o sistema acaba gravando **CST 01** (operação tributável) em várias operações porque:

- CFOPs `1102`, `2102`, `5102`, `6102` estão cadastrados com `cst_pis_padrao = 01` e `cst_cofins_padrao = 01`
- 5 emitentes (de 12) estão com CST PIS/COFINS = `01`
- Fallback do código nos diálogos de Compra (Emitir), Devolução e Remessa é `"01"`

Para produtor rural PF, o correto é **CST 08** (sem incidência da contribuição).

## Mudanças

### 1. Dados (via insert tool — UPDATE)

- `cfops`: setar `cst_pis_padrao = '08'` e `cst_cofins_padrao = '08'` nos CFOPs `1102`, `2102`, `5102`, `6102` (os demais já estão em 08).
- `emitentes_nfe`: setar `cst_pis_padrao = '08'` e `cst_cofins_padrao = '08'` em todos os registros onde estão nulos ou `01`.
- `produtos`: idem — normalizar `cst_pis` e `cst_cofins` para `'08'` onde estão nulos ou `01`.

Notas fiscais **já autorizadas/canceladas** não serão alteradas (imutabilidade fiscal).

### 2. Código (fallbacks) — trocar `"01"` por `"08"`

- `src/components/compra/EmitirNfeCompraDialog.tsx` (linhas 323/327)
- `src/components/devolucao/EmitirNfeDevolucaoDialog.tsx` (linhas 278/282)
- `src/components/remessas/EmitirNfeAutomaticoDialog.tsx` (linhas 345/349)

Arquivos que já usam `"08"` como fallback (`CompraDialog.tsx`, `NotaDepositoFormDialog.tsx`) permanecem inalterados.

### 3. `src/lib/taxCalculator.ts`

Trocar defaults `"01"` por `"08"` nos campos `cstPis`/`cstCofins` e ajustar cálculo para não gerar valor quando CST = 08 (já é a regra, pois 08 não está em `cstPisCofinsTemTributacao`).

## Validação

- Rodar uma emissão de teste (compra, devolução, remessa e nota de depósito) e conferir no XML/DB que os itens ficam com `cst_pis = 08`, `cst_cofins = 08`, `valor_pis = 0`, `valor_cofins = 0`.
- Verificar que notas já autorizadas continuam com seus valores originais.

## Fora de escopo

- Ajustes de alíquotas de PIS/COFINS no cadastro dos emitentes (permanecem como estão; com CST 08 não são utilizadas no cálculo).
