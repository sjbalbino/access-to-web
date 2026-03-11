

## Problema

A função `transformRow` (linha 613) busca colunas do Excel usando apenas 3 variações exatas:
- `row["Plano_recdesp"]` (exato)
- `row["PLANO_RECDESP"]` (tudo maiúsculo)
- `row["plano_recdesp"]` (tudo minúsculo)

Se a planilha do Access exporta como `"plano_recdesp"`, `"Plano_Recdesp"`, ou `"Código"` (com acento), nenhuma variação encontra o valor. O mesmo ocorre na função `resolveReferences` (linha 582) que busca `row[ref.sourceColumn]` com match exato.

## Solução

Modificar `src/lib/importacaoConfig.ts` adicionando busca normalizada (case-insensitive + remoção de acentos):

1. **Criar função `normalizeColName`** que normaliza nomes removendo acentos, convertendo para minúsculo e colapsando espaços/underscores.

2. **Criar função `findColumnValue`** que primeiro tenta match exato, depois compara nomes normalizados iterando todas as chaves do row.

3. **Atualizar `transformRow`** (linha 613): substituir o acesso direto por `findColumnValue(row, col.accessName)`.

4. **Atualizar bloco de colunas extras** (linhas 626-632): usar a mesma normalização para detectar se uma coluna já foi mapeada.

5. **Atualizar `resolveReferences`** (linha 582): usar `findColumnValue` para buscar `ref.sourceColumn` no row, e na linha 595 para deletar a chave correta.

### Arquivo a modificar
- `src/lib/importacaoConfig.ts`

