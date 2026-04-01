

## Plano: Adicionar filtros de pesquisa na lista de Clientes/Fornecedores

### Alterações

**Arquivo:** `src/pages/ClientesFornecedores.tsx`

1. Adicionar estados de filtro:
   - `filtroNome` (texto) — busca por nome/razão social
   - `filtroCpfCnpj` (texto) — busca por CPF/CNPJ
   - `filtroTipo` (select) — Cliente / Fornecedor / Ambos / Todos
   - `filtroCidade` (texto) — busca por cidade
   - `filtroAtivo` (select) — Ativos / Inativos / Todos (padrão: Ativos)

2. Inserir barra de filtros entre o CardHeader e a Table, com layout em grid responsivo (4 colunas desktop, empilhado mobile)

3. Aplicar `useMemo` para filtrar `clientesFornecedores` antes de renderizar a tabela, usando os critérios acima com busca case-insensitive parcial para campos texto

4. Adicionar paginação (similar ao padrão já usado em EntradaColheita) com 20 itens por página

### Impacto
- 1 arquivo alterado: `src/pages/ClientesFornecedores.tsx`
- Nenhuma alteração no banco de dados

