

## Plano: Lookup composto (IE + Nome) para resolver inscrições duplicadas

### Problema
Duas inscrições compartilham a mesma IE "472.100.110-9" (Dirceu e Marlise). O cache usa apenas IE como chave, causando que a última sobrescreva a primeira.

### Solução
Adicionar suporte a **chave composta** no resolver de referências. Para transferências, a planilha terá colunas extras `inscricao_origem_nome` e `inscricao_destino_nome` para desambiguar.

### Alterações em `src/lib/importacaoConfig.ts`

#### 1. Interface `ReferenceResolver` - adicionar campos opcionais
```typescript
compositeSourceColumn?: string;  // coluna extra na planilha (ex: nome do produtor)
compositeColumns?: string[];     // colunas na lookup table para compor a chave
```

#### 2. Cache building (função `resolveReferences`)
- Quando `ref.compositeColumns` existir, buscar essas colunas adicionais no SELECT
- Criar chaves compostas no cache: `IE|nome` (normalizado, lowercase)
- Manter também a chave simples (IE sozinha) para fallback

#### 3. Resolução de referências
- Se `ref.compositeSourceColumn` existir, ler o valor da planilha e tentar primeiro a chave composta `IE|nome`
- Se não encontrar, fallback para chave simples (comportamento atual para IEs únicas)
- Limpar a coluna extra do row após resolução

#### 4. Config das transferências - atualizar referências de inscrição
```typescript
{ 
  dbColumn: 'inscricao_origem_id', 
  sourceColumn: 'inscricao_origem_ie', 
  compositeSourceColumn: 'inscricao_origem_nome',
  lookupTable: 'inscricoes_produtor', 
  lookupColumn: 'inscricao_estadual',
  compositeColumns: ['nome']
},
{ 
  dbColumn: 'inscricao_destino_id', 
  sourceColumn: 'inscricao_destino_ie',
  compositeSourceColumn: 'inscricao_destino_nome', 
  lookupTable: 'inscricoes_produtor', 
  lookupColumn: 'inscricao_estadual',
  compositeColumns: ['nome']
},
```

### Arquivo alterado
- `src/lib/importacaoConfig.ts`

### Resultado
A planilha de transferências passará a ter colunas `inscricao_origem_nome` e `inscricao_destino_nome`. Quando houver IEs duplicadas, o nome desambigua. Para IEs únicas, o nome é opcional (fallback automático).

