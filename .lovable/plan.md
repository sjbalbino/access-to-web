# Padronização de campos monetários (R$ BR, 2 decimais)

## Objetivo
Garantir que todo campo que representa valor em dinheiro use o componente `CurrencyInput` (`src/components/ui/currency-input.tsx`), exibindo prefixo `R$`, separador de milhar `.`, decimal `,` e 2 casas decimais. Campos de quantidade (KG, sacas, %, unidades) NÃO são alterados — continuam com suas regras atuais (ex.: KG arredondado).

## Critérios de identificação
Um campo é "monetário" quando:
- Nome contém: `valor`, `preco`, `preço`, `custo`, `total`, `subtotal`, `desconto`, `acrescimo`, `juros`, `multa`, `frete`, `seguro`, `comissao`, `taxa`, `saldo` (em R$), `vlr`, `montante`.
- E NÃO é: `quantidade`, `kg`, `peso`, `sacos`, `percentual`, `aliquota`, `umidade`, `impureza`.

## Escopo de arquivos (varredura)
Formulários e dialogs que contêm inputs `type="number"` ou `Input` ligados a campos monetários, incluindo (não exaustivo):

- `src/components/contas/ContaFormDialog.tsx` (valor, desconto, juros, multa, valor pago)
- `src/components/contas/BaixasDialog.tsx`
- `src/components/contas/GerarParcelasDialog.tsx`
- `src/pages/LancamentosFinanceiros.tsx`
- `src/pages/VendaProducaoForm.tsx` (preço/kg, valor total, comissão, frete)
- `src/pages/RemessasVendaForm.tsx` (valor nota, frete)
- `src/pages/NotaFiscalForm.tsx` (valores de itens, totais, desconto, frete, seguro)
- `src/components/entradas-nfe/EntradaNfeFormDialog.tsx` (vUnCom, vProd, vDesc, vFrete, vSeg, vOutro, vTotal)
- `src/components/compra/CompraDialog.tsx`
- `src/components/devolucao/DevolucaoDialog.tsx`
- `src/components/deposito/NotaDepositoFormDialog.tsx`
- `src/components/transferencias/TransferenciaDialog.tsx`
- `src/components/notas-fiscais/ContraNotaDialog.tsx`
- `src/pages/ContasBancarias.tsx` (saldo inicial)
- `src/pages/Produtos.tsx` (preço padrão se existir)
- `src/pages/ContratosVenda*` / formulários relacionados

## Abordagem técnica
1. Rodar `rg` para listar todos os inputs candidatos por nome de campo.
2. Para cada arquivo, substituir `<Input type="number" ... />` por `<CurrencyInput value={...} onChange={(v) => ...} />`, ajustando o handler para receber `number | null` em vez de evento.
3. Manter os campos de quantidade intactos (`QuantityInput` ou Input numérico atual).
4. Onde o valor for somente leitura/calculado, exibir via `formatBrazilianNumber(value, 2)` com prefixo `R$ `.

## Não inclui
- Alteração de schema ou tipos no banco.
- Alteração de relatórios PDF (já usam `formatCurrency`).
- Campos de quantidade (KG, sacas, %, etc).

## Execução
Será feito em lotes por módulo (financeiro → vendas → NFe → estoque) para manter cada edição revisável. Começo pelo módulo financeiro (Contas a Pagar/Receber, Baixas, Parcelas, Lançamentos) nesta primeira rodada e sigo nos demais nas próximas mensagens, confirmando a cada lote.