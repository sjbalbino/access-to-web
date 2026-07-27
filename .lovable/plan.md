## Diagnóstico (confirmado)

A nota 102 (rascunho, CFOP 1905, SOJA INDUSTRIA - KGS) foi gravada com:
- `cst_ibs` / `cst_cbs` = **200** (herdado do cadastro do produto)
- `aliq_ibs` / `aliq_cbs` = **0** (o formulário envia `null`)

Em `src/components/deposito/NotaDepositoFormDialog.tsx` (linhas ~535-544) o item enviado para emissão fixa `aliq_ibs: null` e `aliq_cbs: null`, mas resolve o CST a partir do produto (200). Como o CST 200 consta na lista de CSTs tributados de `validarIbsCbsItens` (`src/lib/focusNfeMapper.ts`, linha 753), a validação exige alíquotas > 0 e bloqueia a transmissão com "IBS/CBS incompletos" — exatamente o erro do print.

Notas 1905 anteriores autorizadas (92, 93, 100) tinham 0,10% / 0,90% gravados, por isso passavam.

## Correção

Enviar as alíquotas do cadastro do produto, como nas notas já autorizadas.

**`src/components/deposito/NotaDepositoFormDialog.tsx`**
- Resolver, junto com o CST, as alíquotas com a mesma prioridade já usada (produto → emitente → padrão):
  - `aliqIbsResolved = produto.aliquota_ibs ?? emitente.aliq_ibs_padrao ?? 0`
  - `aliqCbsResolved = produto.aliquota_cbs ?? emitente.aliq_cbs_padrao ?? 0`
- No item enviado para emissão (linhas 535-544), substituir `aliq_ibs: null` / `aliq_cbs: null` por essas alíquotas, com `base_ibs` / `base_cbs` = valor total do item e `valor_ibs` / `valor_cbs` calculados (base × alíquota / 100).
- Gravar os mesmos campos no `insert` de `notas_fiscais_itens` (linhas 400-404), para o item persistido ficar coerente com o transmitido.

**Reemissão da nota 102**
- A nota 102 continua em rascunho; após o ajuste basta reemiti-la pela tela (o item será atualizado na nova emissão). Se preferir, atualizo os campos da nota 102 no banco para 0,10 / 0,90 para que ela já fique consistente antes da reemissão.

## Observações técnicas

- O CFOP 1905 está com `incidencia_ibs_cbs = false` no cadastro, mas o CST vem do produto (200 – alíquota reduzida com cClassTrib 200036, produtos agropecuários in natura). Mantemos o CST 200 e passamos a alíquota, que é o comportamento das notas já autorizadas pela SEFAZ.
- Nenhuma mudança em `validarIbsCbsItens` — a validação continua exigindo alíquota para CSTs tributados.
- Escopo limitado à emissão de nota de depósito; devolução e compra não são alteradas nesta correção.
