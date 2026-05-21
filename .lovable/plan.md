## Causa do problema

A planilha contém colunas (`uf`, `descricao`, `tipo_veiculo`) que **não existem** na tabela `placas` do banco. Como a configuração de importação em `src/lib/importacaoConfig.ts` mapeia essas colunas, elas eram enviadas no `INSERT` e o Supabase rejeitava o lote inteiro com o erro:

> Could not find the 'uf' column of 'placas' in the schema cache

A importação então caía no fallback linha-a-linha e apenas as linhas em que o Excel **não tinha valor** nessas colunas eram aceitas — por isso só 20 das 40 placas entraram.

Campos reais da tabela `placas`: `placa`, `tipo`, `granja_id`, `marca`, `modelo`, `ano`, `cor`, `capacidade_kg`, `peso_tara`, `propriedade`, `proprietario`, `motorista`, `observacoes`, `ativa`.

## Correção

**`src/lib/importacaoConfig.ts`** — config de `placas`:

1. Remover mapeamentos inexistentes:
   - `descricao` ❌
   - `uf` ❌
2. Renomear `tipo_veiculo` → `tipo` (campo correto no banco; aceita `accessName: 'tipo_veiculo'` mapeando para `dbName: 'tipo'` para compatibilidade com o Access).
3. Manter os demais campos: `placa`, `tipo`, `capacidade_kg`, `propriedade`, `peso_tara`, `motorista`, `ativa`, e adicionar suporte opcional a `marca`, `modelo`, `ano`, `cor`, `proprietario`, `observacoes` (caso existam na planilha).

## Após a correção

Você poderá clicar em **Reimportar** em Placas e os 40 registros entrarão corretamente (as 20 já importadas continuarão — não há constraint de unicidade na coluna `placa`, então pode haver duplicação se reimportar tudo; recomendo excluir as 20 antes ou importar só as faltantes).
