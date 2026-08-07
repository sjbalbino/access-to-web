# Colheita Diária não gera para o local "Márcio Grings"

## Causa confirmada

O local **Márcio Grings** é a sede da AGROPECUÁRIA GRINGS (`is_sede = true`).

Os relatórios tratam "sede" como sinônimo de "colheita sem local de terceiro": quando o local escolhido é a sede, o filtro busca apenas registros com o campo de local **vazio (nulo)**.

Mas no banco todas as 9.961 colheitas desse local estão gravadas **apontando explicitamente para Márcio Grings** — nenhuma está com o campo vazio (verificado por consulta: 0 colheitas com local nulo em todo o banco, resultado da normalização feita anteriormente).

Ou seja: o filtro procura o conjunto vazio e o relatório encerra com "Nenhuma colheita encontrada no período". Escolher "Todos os locais" funciona; escolher Márcio Grings (ou UMBU AGROPECUÁRIA, também sede) nunca retorna nada.

## Correção

Quando o local selecionado for a sede, considerar **os registros daquele local E os registros sem local definido** (compatibilidade com dados antigos), em vez de somente os sem local.

Aplicar em três filtros que hoje repetem a mesma regra errada em `src/components/relatorios/RelatorioDialog.tsx`:

1. **Colheita Diária** (~linha 1144) — troca de `.is(campo, null)` por condição "igual ao local OU nulo".
2. **Entrega por Variedade** (~linha 1256) — mesma troca.
3. **Saldo Disponível** (~linha 497) — o filtro em memória passa a aceitar `localId === localEntregaId || localId === null` quando o local é sede.

Para evitar repetição, criar um helper local no arquivo (ex. `aplicarFiltroLocal(query)` e `localCombina(localId)`) usado pelos três pontos.

## Ajuste secundário

O seletor "Local de Entrega" do diálogo lista locais inativos (ex.: GRANDESPE, Sommar). Passa a listar apenas locais com `ativo !== false`, mantendo a opção "Todos".

## Detalhes técnicos

- No PostgREST, a condição composta usa `.or("local_entrega_terceiro_id.eq.<id>,local_entrega_terceiro_id.is.null")`.
- Nenhuma alteração de banco de dados é necessária — os dados já estão corretos; o defeito é apenas no filtro do relatório.
