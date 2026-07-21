## Diagnóstico da nota 94

Confirmado no banco:

- CFOP da nota e do item: **1102 – Compra para comercialização**, com `cst_icms_padrao = 00` e `incidencia_icms = true`.
- Produto **SOJA INDUSTRIA – KGS** tem `cst_icms = 51` (diferimento), correto.
- Após "Calcular Impostos": item ficou com `cst_icms = 00`, `aliq_icms = 18%`, `valor_icms = R$ 1.112,40`. IBS/CBS/cClassTrib estão corretos (200 / 200036).

Causa raiz: no último ajuste do calculador, a prioridade do ICMS ficou **CFOP → Produto → padrão**. Como o CFOP 1102 tem CST padrão "00", ele sobrescreve o CST 51 do produto na compra de soja entre produtores rurais.

Além disso, o produto é "SOJA INDUSTRIA", ou seja, compra para **industrialização** (CFOP 1.101), não comercialização (1.102). O CompraDialog está gravando 1102 como default.

## Correções propostas

### 1. `src/lib/taxCalculator.ts` — prioridade correta do ICMS

Inverter a resolução do CST ICMS para respeitar o regime do produto (que é onde o diferimento fica cadastrado):

- Nova prioridade: **Produto → CFOP → padrão por CRT**.
- Assim, quando o produto tem CST 51, ele prevalece sobre o CST 00 do CFOP 1102.
- Adicionalmente, se o CST resolvido for de **não tributação** (ex.: 40, 41, 50, 51, 60), zerar `baseIcms`, `aliqIcms` e `valorIcms` — hoje o cálculo aplica alíquota mesmo em CST não tributado por causa da checagem restrita em `cstIcmsTemTributacao`.

Isso mantém intactas as regras já corrigidas de IBS/CBS/cClassTrib (Emitente → CFOP → Produto).

### 2. `src/components/compra/CompraDialog.tsx` — CFOP padrão de compra

Ajustar o default do CFOP na criação da compra:

- Compra de grão de produtor rural → **1.101 (Compra para industrialização/produção rural)** interna e **2.101** interestadual.
- Manter a possibilidade do usuário trocar, mas o default deixa de ser 1102.

### 3. Ajustar nota 94 (correção pontual dos dados existentes)

Como a nota 94 está em **rascunho**, atualizar:

- `notas_fiscais.cfop_id` → CFOP 1101.
- `notas_fiscais_itens.cfop` → "1101".
- `notas_fiscais_itens.cst_icms` → "51".
- `notas_fiscais_itens.aliq_icms` → 0, `base_icms` → 0, `valor_icms` → 0.
- `notas_fiscais.total_icms` e `total_bc_icms` → 0 (recalcular a partir dos itens).

### 4. Validação

Após as mudanças, reabrir a nota 94, clicar em **Calcular Impostos** e confirmar que:

- CFOP permanece **1101**.
- CST ICMS permanece **51** (diferimento), sem alíquota nem valor.
- IBS/CBS continuam **200 / 200036** com as alíquotas cadastradas.

## Arquivos alterados

- `src/lib/taxCalculator.ts`
- `src/components/compra/CompraDialog.tsx`
- Migração de dados: `UPDATE` em `notas_fiscais` e `notas_fiscais_itens` da nota 94.
