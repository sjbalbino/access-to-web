

## Plano: Corrigir importação de Produtos

### Problemas
1. **Unidade de medida "KG" não encontrada**: O cache de lookup em `resolveReferences` faz comparação case-sensitive. Se o banco tem "kg" e a planilha tem "KG", não encontra.
2. **Campo `cust_medio` ausente**: A planilha do Access tem `cust_medio` que não está mapeado na config de produtos.

O campo "nome" já está mapeado corretamente (linha 215) e o fuzzy matching já é case-insensitive — se a planilha realmente tem a coluna "nome", ela deveria funcionar. O problema real é provavelmente o lookup de referências.

### Alterações em `src/lib/importacaoConfig.ts`

#### 1. Lookup case-insensitive no `resolveReferences`
- Linha 592: normalizar chave do cache para lowercase → `cache[key.toLowerCase()] = item.id`
- Linha 608: normalizar valor de busca para lowercase → `lookupCache[cacheKey]?.[sourceValue.toLowerCase()]`

Isso resolve "KG" vs "kg", "Kg", etc. para todas as tabelas de referência.

#### 2. Adicionar campo `cust_medio` na config de produtos
- Adicionar nova coluna: `{ accessName: 'cust_medio', dbName: 'custo_medio', transform: toNumber }`
- Verificar se a coluna `custo_medio` existe na tabela `produtos` no banco; se não, criar via migração.

### Arquivos a modificar
- `src/lib/importacaoConfig.ts` — case-insensitive lookup + novo campo `cust_medio`
- Possível migração SQL se coluna `custo_medio` não existir na tabela `produtos`

