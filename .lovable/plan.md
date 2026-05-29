## Objetivo
Substituir os 7 campos `Input` de CST padrão no cadastro do Emitente NF-e (`src/pages/EmitentesNfe.tsx`) por `Select` populados com as tabelas oficiais — espelhando o que já foi feito no diálogo de item da NF-e.

## Mudanças

**`src/pages/EmitentesNfe.tsx`**
1. Importar:
   - `Select`, `SelectTrigger`, `SelectContent`, `SelectItem`, `SelectValue` (já provavelmente existem).
   - `getCstIcmsOptions`, `CST_PIS_COFINS`, `CST_IPI` de `@/lib/cstTabelas`.
   - `CST_IBS_CBS`, `CST_IS` (ou equivalente) de `@/lib/cstReformaTributaria` — se ainda não houver constante exportada, expor as listas existentes nesse arquivo.
2. Trocar os 7 `<Input>` por `<Select>`:
   - **CST ICMS** → `getCstIcmsOptions(formData.crt)` (alterna CSOSN ↔ CST conforme o CRT do emitente).
   - **CST PIS** → `CST_PIS_COFINS`.
   - **CST COFINS** → `CST_PIS_COFINS`.
   - **CST IPI** → `CST_IPI`.
   - **CST IBS** → tabela IBS/CBS da Reforma (3 dígitos).
   - **CST CBS** → mesma tabela IBS/CBS.
   - **CST IS** → tabela IS da Reforma (3 dígitos).
3. Normalizar defaults para 3 dígitos nos CSTs da Reforma:
   - `cst_ibs_padrao`, `cst_cbs_padrao`, `cst_is_padrao` passam de `"00"` para `"000"` no estado inicial, no reset do form e no carregamento (`?? "000"`).

## Fora de escopo
- Não alterar tabelas/edge functions.
- Não mexer no cálculo de impostos nem em `NotaFiscalForm.tsx`.
- Sem migração (colunas já são `varchar(3)` após a migração anterior).
