

## Relatórios de Gestão - Módulo Financeiro Completo

### Visão Geral
Criar o módulo financeiro completo com reestruturação do Plano de Contas Gerencial (hierarquia Centro de Custo → Sub-Centro), CRUD de Lançamentos Financeiros, estrutura do DRE, e 3 relatórios PDF.

---

### 1. Migrações de Banco de Dados

**a) Reestruturar `plano_contas_gerencial`** (agora = Centro de Custo)
- Adicionar coluna `tipo` varchar (`receita` / `despesa`)

**b) Criar tabela `sub_centros_custo`**
- `id`, `centro_custo_id` (FK → plano_contas_gerencial), `codigo`, `descricao`, `codigo_dre`, `ativo`, timestamps
- RLS: mesma abordagem (leitura pública, edição via `can_edit`)

**c) Criar tabela `dre_contas`** (estrutura hierárquica do DRE)
- `id`, `codigo` (ex: "01", "01.01", "01.01.001"), `descricao`, `nivel` int, `parent_id` (self-ref), `tipo_saldo` (credito/debito), `ordem` int, `ativo`, timestamps
- RLS: leitura pública, edição via `can_edit`

**d) Criar tabela `lancamentos_financeiros`**
- `id`, `granja_id` FK, `data_lancamento` date, `sub_centro_custo_id` FK, `dre_conta_id` FK (opcional), `descricao`, `valor` numeric, `tipo` (receita/despesa), `fornecedor_id` FK (clientes_fornecedores, opcional), `documento`, `observacoes`, timestamps
- RLS: tenant isolation via `granja_belongs_to_tenant`

**e) Atualizar `grupos_produtos`**
- A FK `conta_gerencial_id` já aponta para `plano_contas_gerencial`, continua válida

---

### 2. Atualizar Plano de Contas Gerencial (CRUD hierárquico)

**`src/pages/PlanoContasGerencial.tsx`** - Reformular para:
- Listar Centros de Custo com campo Tipo (Receita/Despesa)
- Expandir cada centro para ver/gerenciar Sub-Centros de Custo
- Formulário de Sub-Centro com: Código, Descrição, Código DRE

**Hooks**: `usePlanoContasGerencial.ts` (atualizar), criar `useSubCentrosCusto.ts`

---

### 3. CRUD do DRE (Estrutura)

**`src/pages/DreEstrutura.tsx`** - Cadastro da estrutura hierárquica do DRE
- Exibição em árvore (código hierárquico: 01 → 01.01 → 01.01.001)
- CRUD de cada nível

**Hook**: `useDreContas.ts`

---

### 4. CRUD de Lançamentos Financeiros

**`src/pages/LancamentosFinanceiros.tsx`** - Tela principal do módulo financeiro
- Listagem com filtros: Período, Centro de Custo, Tipo (Receita/Despesa), Granja
- Formulário: Data, Descrição, Sub-Centro de Custo (select agrupado por Centro), Conta DRE, Valor, Tipo, Fornecedor, Documento, Obs
- Totalizadores

**Hook**: `useLancamentosFinanceiros.ts`

---

### 5. Três Relatórios PDF

Adicionar ao painel de Relatórios (`src/pages/Relatorios.tsx`):

**a) Demonstrativo Gerencial**
- Filtros: Período, Tipo (Receitas/Despesas/Ambos), Agrupamento (Consolidado/Individual)
- PDF: Agrupa lançamentos por Centro de Custo → Sub-Centro, com valores e % dentro do grupo e % do total geral
- Baseado na imagem 26

**b) Demonstrativo de Resultado (DRE)**
- Filtros: Período
- PDF: Estrutura hierárquica das contas DRE com Saldo Anterior, Valor do Período, %, Saldo Atual
- Baseado na imagem 30

**c) Despesas com Bens Móveis**
- Filtros: Período, Opções (Geral Discriminado, Geral Totais, Individual por Bem, etc.)
- PDF: Filtra lançamentos de grupos com flag `maquinas_implementos = true` no `grupos_produtos`

**Arquivo**: `src/lib/relatoriosGestao.ts` (funções PDF separadas)

---

### 6. Navegação

- Adicionar rotas: `/lancamentos-financeiros`, `/dre-estrutura`
- Sidebar: Novo grupo "Financeiro" com itens: Lançamentos, DRE Estrutura
- Atualizar `routeMap.ts`

---

### Arquivos a Criar
- `src/hooks/useSubCentrosCusto.ts`
- `src/hooks/useDreContas.ts`
- `src/hooks/useLancamentosFinanceiros.ts`
- `src/pages/LancamentosFinanceiros.tsx`
- `src/pages/DreEstrutura.tsx`
- `src/lib/relatoriosGestao.ts`

### Arquivos a Modificar
- `src/hooks/usePlanoContasGerencial.ts` (campo tipo)
- `src/pages/PlanoContasGerencial.tsx` (hierarquia com sub-centros)
- `src/pages/Relatorios.tsx` (3 novos cards)
- `src/components/relatorios/RelatorioDialog.tsx` (novos tipos)
- `src/App.tsx` (rotas)
- `src/lib/routeMap.ts`
- `src/components/layout/AppSidebar.tsx`
- `src/lib/importacaoConfig.ts` (configs de importação para novas tabelas)

