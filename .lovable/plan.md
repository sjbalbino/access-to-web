## Objetivo

Na emissão de Notas de Depósito (contra-nota CFOP 1905), o valor unitário de cada variedade hoje é fixo em R$ 1,00/kg (hard-coded). Passará a ser um campo editável por item, pré-preenchido com 1,00.

## Comportamento

- Na linha de inclusão de variedade, ao lado de "Quantidade (kg)", entra o campo **Valor Unitário (R$/kg)**, já preenchido com `1,00`.
- Na lista de itens já incluídos, cada linha ganha um input de valor unitário editável (mesma UX do input de quantidade), mostrando ao lado o **valor total do item** (quantidade × unitário).
- O rodapé "Total da nota" passa a somar `Σ (quantidade × valor_unitario)` em vez de assumir R$ 1,00/kg.
- Texto "Valor simbólico (R$ 1,00/kg)" vira uma orientação: valor padrão sugerido R$ 1,00/kg, editável pelo operador.
- Validação: valor unitário deve ser > 0 ao adicionar o item; ao editar, valores inválidos caem para 0 e o botão "Gerar NFe" fica bloqueado enquanto houver item com valor unitário ≤ 0.
- Modo `readOnly` (notas importadas/autorizadas) mantém os campos desabilitados.
- Na edição de nota existente, o valor unitário é carregado dos itens da NF-e vinculada quando houver; caso não haja, assume 1,00.

## Detalhes técnicos

Arquivo: `src/components/deposito/NotaDepositoFormDialog.tsx`

1. `interface ItemNotaDeposito` ganha `valor_unitario: number`.
2. Novo estado `valorUnitario` (string, default `"1"`) na linha de inclusão; `handleAddItem` valida e grava o valor; reset volta para `"1"`.
3. Novo `handleUpdateItemValor(produtoId, valor)` análogo ao `handleUpdateItemQtd`.
4. `totalKg` é mantido para os avisos de saldo; adiciona-se `totalValor = Σ (quantidade_kg × valor_unitario)`.
5. Em `itensResolvidos` (linha ~400) inclui-se `valor_unitario` e `valor_total = quantidade × valor_unitario`; `totalNotaKg` (usado como total financeiro) é substituído por `totalNotaValor`.
6. Insert em `notas_fiscais`: `total_produtos` / `total_nota` passam a usar o total financeiro calculado.
7. Insert em `notas_fiscais_itens` (linha ~507) e payload `itensParaEmissao` (linha ~633): `valor_unitario` e `valor_total` reais; as bases `base_ibs` / `base_cbs` e os respectivos `valor_ibs` / `valor_cbs` passam a ser calculados sobre `valor_total` do item (hoje usam `quantidade`, que só coincidia porque o unitário era 1).
8. O registro em `notas_deposito_emitidas` continua guardando apenas `quantidade_kg` — sem mudança de schema no banco.

Nenhuma alteração de banco de dados é necessária.
