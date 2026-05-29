## Diagnóstico — por que IBS/CBS não está calculando

Investiguei o fluxo (`src/lib/taxCalculator.ts` + `src/pages/NotaFiscalForm.tsx` linhas 1242-1314) e o banco. Encontrei **duas causas reais**:

### 1. CFOPs com `incidencia_ibs_cbs = false`
Todos os CFOPs cadastrados no banco estão com a flag `incidencia_ibs_cbs` em **false**. A função `calculateTaxes` só entra no bloco IBS/CBS/IS quando essa flag é `true`:

```
if (input.incidenciaIbsCbs) { ... cálculo IBS/CBS/IS ... }
```

Resultado: por mais que o emitente tenha alíquota configurada (atualmente 1% IBS e 9% CBS), o cálculo é pulado.

### 2. CST IBS/CBS padrão salvo no formato errado
Nos emitentes, `cst_ibs_padrao` e `cst_cbs_padrao` estão como `"00"` (formato de ICMS, 2 dígitos). A função `cstIbsCbsTemTributacao` em `src/lib/cstReformaTributaria.ts` exige **3 dígitos** ("000", "010", etc). Quando o CST chega como "00", a verificação retorna `false` e o cálculo não ocorre.

---

## Plano

### Passo 1 — Liberar incidência IBS/CBS nos CFOPs de operação tributada
Migration de dados: marcar `incidencia_ibs_cbs = true` para CFOPs de venda/transferência/devolução de produção (séries 5xxx/6xxx típicas: 5101, 5102, 5151, 5152, 5910, 5917, 5949, 6101, 6102, etc) e também os de compra equivalentes (1101, 1102, 2101, 2102), preenchendo `cst_ibs_padrao = '000'` e `cst_cbs_padrao = '000'` onde estiverem nulos. Manter `is_padrao` apenas com `'000'` (Imposto Seletivo é raro).

### Passo 2 — Normalizar CSTs dos emitentes
Migration de dados: para todos os emitentes onde `cst_ibs_padrao`/`cst_cbs_padrao`/`cst_is_padrao` tenham 2 caracteres, converter para 3 dígitos com zero à esquerda (ex: `'00'` → `'000'`).

### Passo 3 — Criar listas de CST faltantes
Hoje `src/lib/cstReformaTributaria.ts` já tem `CST_IBS_CBS` e `CST_IS`. Vou criar `src/lib/cstTabelas.ts` com:
- `CST_ICMS` (CST tabela A — Regime Normal: 00, 10, 20, 30, 40, 41, 50, 51, 60, 70, 90)
- `CSOSN` (Simples Nacional: 101, 102, 103, 201, 202, 203, 300, 400, 500, 900)
- `CST_PIS_COFINS` (01, 02, 03, 04, 05, 06, 07, 08, 09, 49, 50…99)
- `CST_IPI` (00, 49, 50, 99 etc.)

### Passo 4 — Trocar `Input` por `Select` nos campos CST
No diálogo de item em `NotaFiscalForm.tsx` (linhas 3389-3506), substituir os 6 `<Input>` de CST (ICMS, PIS, COFINS, IBS, CBS, IS) por `<Select>` populados com as listas. Para CST ICMS, alternar entre `CST_ICMS` e `CSOSN` conforme `emitente.crt` (1/2 = CSOSN, 3 = CST).

### Passo 5 — Auto-cálculo de impostos
Adicionar um `useEffect` no diálogo de item que dispara `handleCalculateTaxes()` automaticamente quando:
- `itemFormData.valor_total > 0`
- `itemFormData.produto_id` está definido
- `formData.cfop_id` e `formData.emitente_id` estão definidos
- nenhum CST/alíquota foi editado manualmente pelo usuário (controlado por um flag `impostosEditadosManualmente`)

Qualquer edição manual de campo de imposto (CST ou alíquota) seta o flag e desliga o auto-cálculo até que o usuário clique novamente em "Calcular Impostos" (que volta a resetar o flag).

### Passo 6 — Validação
- Abrir uma NFe existente, escolher um produto e CFOP de venda → confirmar que IBS e CBS aparecem preenchidos automaticamente.
- Alterar CST manualmente → confirmar que o valor não é sobrescrito.
- Reemitir um item para checar que `valor_ibs`/`valor_cbs` chegam > 0 no payload.

---

## Detalhes técnicos

**Arquivos alterados:**
- `supabase/migrations/<novo>.sql` — UPDATEs em `cfops` e `emitentes_nfe`
- `src/lib/cstTabelas.ts` (novo)
- `src/pages/NotaFiscalForm.tsx` — Selects + useEffect de auto-cálculo

**Sem mudanças** em `taxCalculator.ts`, edge functions, ou layout do diálogo (apenas tipo de controle).
