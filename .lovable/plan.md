

## Plano: Vincular colheitas ao Controle de Lavoura apenas pelo `safra_codigo`

### Problema
O plano anterior tentava resolver `lavoura_id` separadamente via `lavouras.codigo`, mas a planilha não traz `lavoura_codigo` de forma confiável. O correto é usar apenas `safra_codigo` para encontrar o registro em `controle_lavouras` (que já contém o `lavoura_id`).

### Alterações

#### 1. `src/lib/importacaoConfig.ts` — config colheitas
- **Remover** a referência `{ dbColumn: 'lavoura_id', sourceColumn: 'lavoura_codigo', lookupTable: 'lavouras', ... }` (linha 542)

#### 2. `src/components/importacao/ImportacaoDialog.tsx` — composite lookup (linhas 193-217)
Reescrever a lógica de composite lookup para:
1. Buscar `controle_lavouras` com `select('id, safra_id, lavoura_id')`
2. Buscar `safras` com `select('id, codigo')` para mapear `safra.codigo → safra.id`
3. Construir cache: `safra_codigo → { controle_id, lavoura_id }` (normalizado sem zeros à esquerda)
4. Para cada linha da planilha:
   - Usar o valor de `safra_codigo` da planilha (campo original, antes da resolução de referência)
   - Buscar no cache e setar `row.controle_lavoura_id` e `row.lavoura_id`
   - Se não encontrar, registrar aviso

**Nota**: Se houver mais de um controle_lavoura para a mesma safra (safras com múltiplas lavouras), será necessário um critério adicional. Caso a planilha tenha `lavoura_codigo`, ele será usado como chave secundária. Caso contrário, o primeiro registro será utilizado.

### Arquivos impactados
- `src/lib/importacaoConfig.ts` (remover 1 linha de referência)
- `src/components/importacao/ImportacaoDialog.tsx` (reescrever ~25 linhas do composite lookup)

