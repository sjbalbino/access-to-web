

## Plano: Adicionar campo `codigo` ao Controle de Lavouras para vínculo na importação

### Problema
A tabela `controle_lavouras` não possui um campo identificador legado (código do Access). Quando uma safra tem múltiplas lavouras, o vínculo via `safra_codigo` sozinho é ambíguo — não há como distinguir qual `controle_lavoura` é o correto. O sistema Access tem um código único para cada registro de controle, e esse código precisa ser preservado na importação para que as colheitas possam vincular corretamente.

### Alterações

#### 1. Migração SQL — adicionar coluna `codigo` em `controle_lavouras`
```sql
ALTER TABLE public.controle_lavouras
  ADD COLUMN codigo character varying;
```

#### 2. `src/lib/importacaoConfig.ts` — config de `controle_lavouras`
- Adicionar coluna `codigo` ao array `columns`:
  ```typescript
  { accessName: 'codigo', dbName: 'codigo', transform: toStr },
  ```

#### 3. `src/lib/importacaoConfig.ts` — config de `colheitas`
- Adicionar coluna auxiliar `safra_codigo` ao `columns` (para aparecer no modelo Excel):
  ```typescript
  { accessName: 'safra_codigo', dbName: '_safra_codigo', transform: toStr },
  ```

#### 4. `src/components/importacao/ImportacaoDialog.tsx` — composite lookup
- Alterar o lookup para buscar `controle_lavouras` pelo campo `codigo` diretamente, em vez de fazer o caminho indireto via `safras.codigo`:
  - Cache: `controle_lavouras.codigo` (normalizado) → `{ controle_id, safra_id }`
  - Remover a query de `safras` e o mapeamento intermediário
- Limpar campo `_safra_codigo` do row antes do insert

#### 5. `src/hooks/useControleLavouras.ts`
- Incluir `codigo` no tipo `ControleLavoura` e no `ControleLavouraInput`

#### 6. UI do Controle de Lavoura (formulário/lista)
- Exibir campo `codigo` na listagem e no formulário de edição

### Arquivos impactados
- Migração SQL (nova)
- `src/lib/importacaoConfig.ts`
- `src/components/importacao/ImportacaoDialog.tsx`
- `src/hooks/useControleLavouras.ts`
- `src/components/controle-lavoura/ControleLavouraForm.tsx`
- `src/components/controle-lavoura/ControleLavouraList.tsx`

