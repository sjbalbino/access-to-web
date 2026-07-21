## Plano de correção

Vou ajustar apenas o fluxo do botão **Calcular Impostos** na edição de itens da NF-e.

### Diagnóstico confirmado

- A nota atual usa CFOP **1905**.
- No cadastro do CFOP, o **CST ICMS padrão é 41**, que é o correto para esta operação.
- O produto do item tem **CST ICMS = 51**, e hoje o cálculo prioriza o produto antes do CFOP, por isso o botão troca indevidamente o ICMS para 51.
- O CFOP está com **incidência IBS/CBS desativada** (`incidencia_ibs_cbs = false`). Por isso o cálculo entra no fluxo que deixa IBS/CBS e valores zerados, mesmo existindo no emitente/produto:
  - CST IBS/CBS = 200
  - cClassTrib IBS/CBS = 200036
  - alíquotas IBS/CBS cadastradas

### Alterações propostas

1. **Corrigir prioridade do ICMS no cálculo da NF-e editável**
   - Para o botão **Calcular Impostos**, usar prioridade:
     - **CFOP → Produto → padrão por CRT**
   - Assim, para CFOP 1905, o CST ICMS permanece **41** e não será substituído pelo CST 51 do produto.

2. **Corrigir IBS/CBS para não depender do flag antigo de incidência do CFOP**
   - O cálculo de CST e cClassTrib IBS/CBS será feito mesmo quando `incidencia_ibs_cbs` estiver desativado no CFOP.
   - O flag de incidência passará a controlar apenas o cálculo monetário quando necessário, não a gravação dos campos fiscais cadastrais.
   - CST IBS/CBS continuará resolvendo por prioridade:
     - **Emitente → CFOP → Produto → 000**
   - `cClassTrib` será preenchido pelo produto quando compatível com o CST resolvido.

3. **Usar alíquotas do produto como fallback para IBS/CBS**
   - Se o resultado ficar sem alíquota pelo emitente, usar `produto.aliquota_ibs` e `produto.aliquota_cbs` antes de zerar.
   - Isso evita que o botão zere IBS/CBS quando a alíquota já está no produto.

4. **Ajustar persistência do item**
   - Ao salvar o item, aplicar a mesma regra de tributação IBS/CBS para base/valor:
     - se o CST tributa, calcula base e valor;
     - se não tributa, mantém base/valor zerados;
     - mantém `cClassTrib` somente quando o CST exige classificação.

### Arquivos a alterar

- `src/lib/taxCalculator.ts`
- `src/pages/NotaFiscalForm.tsx`

### Validação

Após implementar, vou validar que no item da nota atual:

- **CST ICMS** permanece **41** ao clicar em Calcular Impostos.
- **CST IBS/CBS** permanece/preenche **200**.
- **cClassTrib IBS/CBS** permanece/preenche **200036**.
- **IBS/CBS** não são zerados indevidamente quando houver CST tributado e alíquota disponível.