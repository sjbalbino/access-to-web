## Problema

Ao marcar "Limpar dados existentes antes de importar" na importação de **Contas a Pagar**, ocorre o erro:

> `canceling statement due to statement timeout`

Causas:
1. O `clearExisting` em `ImportacaoDialog.tsx` (linhas 466-472) executa um `DELETE` em massa em `contas_pagar` sem escopo de tenant e sem chunking → estoura o timeout do Postgres quando há muitos registros.
2. `contas_pagar` tem FK vindo de `contas_pagar_baixas`. Mesmo que o delete não desse timeout, ele falharia por violação de chave estrangeira porque as baixas não são limpas antes.
3. O mesmo problema existe para `contas_receber` ↔ `contas_receber_baixas`, `notas_fiscais` ↔ baixas, etc.

## Solução

Refatorar o bloco `clearExisting` em `src/components/importacao/ImportacaoDialog.tsx`:

1. **Limpar filhos antes do pai** via um mapa de dependências:
   - `contas_pagar` → limpar `contas_pagar_baixas` primeiro
   - `contas_receber` → limpar `contas_receber_baixas` primeiro
2. **Escopar pelo tenant selecionado** (quando aplicável), usando as `granja_id` das granjas do tenant:
   - Buscar `granjas.id` onde `tenant_id = tenantId`
   - Deletar com `.in('granja_id', granjaIds)` (em vez de varrer a tabela inteira)
3. **Chunking**: deletar em lotes (ex: 500 ids por vez) para evitar timeout, exibindo progresso na UI.
4. **Mensagem clara** se o tenant não estiver selecionado, abortar antes do delete.

## Arquivo a editar

- `src/components/importacao/ImportacaoDialog.tsx` (substituir o bloco `if (clearExisting) { ... }` por uma função `clearTableScoped(tableName, tenantId)` com mapa de filhos e delete por lotes).

## Fora de escopo

- Não mexer no botão "Limpar Base de Dados" geral de `ImportarDados.tsx` (esse já trata a ordem; se quiser, faço numa próxima rodada para também aplicar chunking).
- Não alterar schema/migration.
