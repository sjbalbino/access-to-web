

## Plano: Usar `safra_codigo` apenas para vínculo com `controle_lavouras`

### Problema
Na importação de colheitas, a coluna `safra_codigo` da planilha resolve `safra_id` diretamente na tabela `safras` (referência na linha 541 de `importacaoConfig.ts`). Porém, o correto é que `safra_codigo` sirva **somente** para localizar o registro em `controle_lavouras` (via `safras.codigo` → `safras.id` → `controle_lavouras.safra_id`), e o `safra_id` da colheita seja preenchido automaticamente a partir do controle encontrado — não por lookup direto.

### Alterações

#### 1. `src/lib/importacaoConfig.ts`
- **Remover** a referência `{ dbColumn: 'safra_id', sourceColumn: 'safra_codigo', ... }` da config de `colheitas` (linha 541)
- Manter `safra_codigo` apenas como coluna auxiliar para o composite lookup no `ImportacaoDialog`

#### 2. `src/components/importacao/ImportacaoDialog.tsx`
- No composite lookup de colheitas (linhas 194-234), após encontrar o `controle_lavoura_id`, **também preencher** `row.safra_id` a partir do controle encontrado:
  - Alterar o cache para mapear `safra_codigo → { controle_id, safra_id }`
  - Atribuir `row.controle_lavoura_id = match.controle_id` e `row.safra_id = match.safra_id`

### Arquivos impactados
- `src/lib/importacaoConfig.ts` (remover 1 linha de referência)
- `src/components/importacao/ImportacaoDialog.tsx` (~10 linhas alteradas no composite lookup)

