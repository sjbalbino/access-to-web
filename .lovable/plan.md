

## Plano: Remover campo `lavoura_id` da tabela `colheitas`

### Contexto
A tabela `colheitas` é filha de `controle_lavouras`, que já possui `lavoura_id`. O campo `lavoura_id` em `colheitas` é redundante. A vinculação na importação já é feita via `safra_codigo → controle_lavouras`.

### Alterações

#### 1. Migração SQL — remover coluna e foreign key
```sql
ALTER TABLE public.colheitas DROP CONSTRAINT IF EXISTS colheitas_lavoura_id_fkey;
ALTER TABLE public.colheitas DROP COLUMN IF EXISTS lavoura_id;
```

#### 2. `src/hooks/useColheitas.ts`
- Remover `lavoura_id` da interface `Colheita`
- Remover `lavouras (id, nome)` do select da query (a lavoura vem via controle_lavoura)
- Remover `lavoura_id: controle.lavoura_id` do `useCreateColheita`

#### 3. `src/hooks/useColheitasEntrada.ts`
- Remover `lavoura_id` de `ColheitaPendente`, `ColheitaEntradaInput`
- Remover `lavoura_id` do select da query e do `lavouras (id, nome)` join
- Remover `lavoura_id: input.lavoura_id` do insert em `useCreateColheitaEntrada`

#### 4. `src/pages/EntradaColheita.tsx`
- Onde usa `cl.lavoura_id` para filtrar/selecionar lavouras, buscar via `controle_lavouras.lavoura_id` (que já vem do hook de controle_lavouras, não da colheita)
- Remover `lavoura_id: selectedLavouraId` do payload de criação de colheita

#### 5. `src/components/importacao/ImportacaoDialog.tsx`
- Remover `row.lavoura_id = match.lavoura_id` do composite lookup (linha 230)
- Simplificar o cache para `safra_codigo → controle_id` apenas

#### 6. `src/lib/importacaoConfig.ts`
- Nenhuma alteração necessária (já não tem referência de `lavoura_id`)

#### 7. Função SQL `calcular_saldo_deposito`
- Não usa `lavoura_id` da colheita, não precisa alterar

### Arquivos impactados
- Migração SQL (nova)
- `src/hooks/useColheitas.ts`
- `src/hooks/useColheitasEntrada.ts`
- `src/pages/EntradaColheita.tsx`
- `src/components/importacao/ImportacaoDialog.tsx`

