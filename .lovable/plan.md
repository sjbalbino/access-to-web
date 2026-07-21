## Problema

Ao clicar em **Calcular Impostos** na edição de itens da NF-e, os campos **CST IBS**, **CST CBS** e **cClassTrib IBS/CBS** não refletem corretamente o regime tributário do emitente.

### Causa raiz (confirmada em código)

Em `src/lib/taxCalculator.ts`, a resolução de CST IBS/CBS usa apenas:

```
Produto → CFOP → "000"
```

O **emitente** (`emitentes_nfe.cst_ibs_padrao` / `cst_cbs_padrao`) não é consultado em momento algum — diferente do que foi feito recentemente para PIS/COFINS, que agora seguem `Emitente → CFOP → Produto`. Como consequência, o CST cadastrado no produto (frequentemente desatualizado) prevalece sobre o regime do emitente e, quando o CST resultante não é tributado, o `cClassTrib` também não é preenchido.

Em `src/pages/NotaFiscalForm.tsx` (linhas 1299-1331) o `TaxCalculatorInput` não repassa nenhum CST IBS/CBS do emitente, então mesmo que o calculador tentasse consultá-lo, o dado não chegaria.

## Correção proposta

Padronizar IBS/CBS pela **mesma prioridade** já aplicada a PIS/COFINS: `Emitente → CFOP → Produto`. O `cClassTrib` continua vindo do produto (única fonte no schema), mas passa a ser considerado sempre que o CST resolvido indicar tributação.

### 1. `src/lib/taxCalculator.ts`

- Adicionar em `TaxCalculatorInput` os campos:
  - `cstIbsPadraoEmitente: string | null`
  - `cstCbsPadraoEmitente: string | null`
- No bloco IBS/CBS, trocar
  - `input.produtoCstIbs || input.cstIbsPadrao || "000"`
  por
  - `input.cstIbsPadraoEmitente || input.cstIbsPadrao || input.produtoCstIbs || "000"`
- Idem para CBS.
- Manter a atribuição de `cclassTribIbs` / `cclassTribCbs` a partir de `produtoCclassTribIbs/Cbs` sempre que o CST resolvido indicar tributação (`cstIbsCbsTemTributacao`). Quando o CST não for tributado, forçar `cclassTribIbs/Cbs = null`.

### 2. `src/pages/NotaFiscalForm.tsx`

Na montagem do `input` (linhas 1299-1331), incluir:

```
cstIbsPadraoEmitente: emitente.cst_ibs_padrao,
cstCbsPadraoEmitente: emitente.cst_cbs_padrao,
```

Nenhuma outra tela precisa alterar assinatura, pois `CompraDialog`, `NotaDepositoFormDialog`, `DevolucaoDialog` etc. usam sua própria lógica de emissão e não passam por `calculateTaxes` na hora do clique de "Calcular Impostos" do editor de NF-e.

### 3. Comportamento resultante

- Emitente com `cst_ibs_padrao = "050"` (por exemplo, diferimento) e produto com `cst_ibs = "000"` → passa a gravar `050` (regime do emitente).
- Quando o CST resolvido não for tributado, o `cClassTrib` é limpo automaticamente, evitando inconsistência.
- Quando for tributado, o `cClassTrib` do produto é aplicado.

## Fora de escopo

- Alterações no schema (não é necessário adicionar `cclass_trib` a CFOP/Emitente — a única fonte é o cadastro do produto).
- Fluxos de emissão automática de Compra/Depósito/Devolução (usam mapeadores próprios).
