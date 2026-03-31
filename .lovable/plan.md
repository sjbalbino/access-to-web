

## Plano: Adicionar campo `codigo` à tabela `colheitas`

### Alterações

#### 1. Migração SQL
```sql
ALTER TABLE public.colheitas ADD COLUMN codigo character varying;
```

#### 2. `src/lib/importacaoConfig.ts`
Adicionar mapeamento na lista `columns` de colheitas:
```typescript
{ accessName: 'COL_CODIGO', dbName: 'codigo', transform: toStr },
```

#### 3. `src/hooks/useColheitas.ts`
Adicionar `codigo` às interfaces `Colheita` e `ColheitaInput`.

### Arquivos impactados
- Migração SQL (nova)
- `src/lib/importacaoConfig.ts` (1 linha)
- `src/hooks/useColheitas.ts` (2 linhas)

