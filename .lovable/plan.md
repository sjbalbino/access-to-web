
## Diagnóstico

O código de Classificação Tributária IBS/CBS (`cClassTrib`, tabela NT 2025.002) **existe** no cadastro do produto (`produtos.cclass_trib_ibs` e `cclass_trib_cbs`), mas nunca é copiado para o item da NF-e no momento do auto-cálculo. Resultado: o item entra sem `cclass_trib_ibs/cbs`, o `focusNfeMapper` acaba caindo no fallback `defaultClassTribIbsCbs(cst)` ou reclama que o campo está faltando.

Cadeia atual:

- `src/pages/NotaFiscalForm.tsx` (linhas 1311-1321) passa `produtoCclassTribIbs` e `produtoCclassTribCbs` para `calculateTaxes`.
- `src/lib/taxCalculator.ts` **aceita** esses campos no `TaxCalculatorInput` (linhas 41-42) mas **não os devolve** no `TaxCalculatorOutput` (linhas 49-88).
- `handleCalculateTaxes` (linhas 1325-1340) grava só `cst_*` e `aliq_*` no `itemFormData`; `cclass_trib_ibs/cbs` continua vazio.

Adicionalmente:
- O `emitentes_nfe` **não tem** colunas `cclass_trib_ibs/cbs` — a mensagem de erro do `focusNfeMapper.ts:833` que diz "Informe no cadastro do produto ou do emitente" está enganosa.
- Não há fallback no emitente por design: o cClassTrib depende de NCM/CST específico do produto, não do emitente. Manter só no produto.

## Plano de correção

**Escopo:** dois arquivos, sem migração de banco.

### 1) `src/lib/taxCalculator.ts`
- Adicionar `cclassTribIbs: string | null` e `cclassTribCbs: string | null` ao `TaxCalculatorOutput`.
- Preencher no retorno:
  - Se `cstIbsCbsTemTributacao(cstIbs)` (ou seja, o CST usa cClassTrib), devolver `input.produtoCclassTribIbs` (ou `null` quando ausente).
  - Mesma lógica para CBS com `input.produtoCclassTribCbs`.
  - Quando o CFOP não tem incidência de IBS/CBS ou o CST é de não-tributação, devolver `null` (não faz sentido enviar cClassTrib).

### 2) `src/pages/NotaFiscalForm.tsx`
- Em `handleCalculateTaxes` (linhas 1325-1340), incluir no `setItemFormData`:
  ```ts
  cclass_trib_ibs: result.cclassTribIbs || "",
  cclass_trib_cbs: result.cclassTribCbs || "",
  ```
- Assim, sempre que o usuário selecionar um produto novo (ou trocar), o auto-cálculo (useEffect linhas 1347-1362) já grava o cClassTrib do produto no item.
- Comportamento preservado: quando o usuário edita manualmente esses campos, o `impostosEditadosManualmente = true` continua bloqueando o auto-cálculo (linha 1349), então a edição manual não é sobrescrita.

### 3) `src/lib/focusNfeMapper.ts` — mensagem de erro
- Trocar a mensagem da linha 833 de _"Informe no cadastro do produto ou do emitente"_ para _"Informe o Código de Classificação Tributária no cadastro do produto."_, refletindo o comportamento real.

## Verificação

1. Abrir uma NF-e em rascunho, adicionar um item de um produto que tem `cclass_trib_ibs` cadastrado.
2. Confirmar que os campos "Cód. Class. IBS" e "Cód. Class. CBS" no dialog do item aparecem preenchidos automaticamente.
3. Emitir a NF-e e conferir no payload/XML gerado pela Focus que `IBSCBS.cClassTrib` bate com o cadastrado.
4. Testar com produto sem cClassTrib cadastrado e CFOP com incidência IBS/CBS → a validação existente do `focusNfeMapper` deve barrar antes do envio, agora com a mensagem correta.

## Fora de escopo

- Não adiciono coluna `cclass_trib_*` no `emitentes_nfe` — o campo é próprio do produto/NCM, não do emitente.
- Não altero o fallback `defaultClassTribIbsCbs` (continua sendo rede de segurança para produtos legados).
- Não altero contra-nota, itens de entrada de NF-e nem outros formulários — apenas o fluxo de emissão de NF-e.
