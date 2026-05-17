# Plano: Isolamento Multi-tenant Completo (revisado)

## Classificação Final das Tabelas

### GLOBAIS (compartilhadas entre todos os tenants)
- `ncm`
- `unidades_medida`
- `ibge_municipios`
- `cfops`
- `culturas` *(sistema; não citada mas é cadastro de catálogo)*

### POR TENANT — com seed automático ao criar tenant
Quando um novo tenant for criado, copiar registros "mais utilizados" de um template:
- `dre_contas`
- `tabela_umidades`
- `plano_contas_gerencial`

### POR TENANT — importação manual / cadastro
- `safras`
- `produtos`, `grupos_produtos`
- `placas`, `transportadoras`, `locais_entrega`
- `lavouras`, `silos`, `controle_lavouras`
- `plantios`, `aplicacoes`, `chuvas`, `floracoes`, `insetos`, `plantas_invasoras`, `analises_solo`, `pivos`

### Já isoladas (sem mudança)
`granjas`, `clientes_fornecedores`, `inscricoes_produtor`, `emitentes_nfe`, `compras_cereais`, `contratos_venda`, `devolucoes_deposito`, `entradas_nfe`, `estoque_produtos`, `notas_fiscais*`, `remessas_venda`, `transferencias_deposito`, `notas_deposito_emitidas`, `colheitas` (via `granja_id`).

## Estratégia para Dados Existentes
Todos os registros atuais sem `tenant_id` → atribuídos ao tenant **AGROPECUARIA GRINGS** (primeiro tenant). UMBU começa zerada nesses cadastros e importa do legado.

## Etapas

### 1. Migração SQL — Adicionar `tenant_id` + RLS por tenant
Para cada tabela das duas listas "POR TENANT":
1. `ALTER TABLE ... ADD COLUMN tenant_id uuid REFERENCES tenants(id)`
2. `UPDATE ... SET tenant_id = '<id-GRINGS>'` (backfill)
3. Dropar policies atuais (`Permitir leitura pública ...`, etc.)
4. Criar 4 policies padrão (SELECT/INSERT/UPDATE/DELETE) com:
   ```sql
   tenant_id = get_user_tenant_id()
   OR (is_super_admin(auth.uid()) AND get_user_tenant_id() IS NULL)
   ```
5. Criar índice em `(tenant_id)`
6. Para colunas `codigo`/CNPJ com UNIQUE global → recriar como UNIQUE parcial por tenant

### 2. Seed automático ao criar tenant
Criar função `seed_tenant_defaults(tenant_id uuid)` que copia registros padrão para `dre_contas`, `tabela_umidades`, `plano_contas_gerencial`. Trigger `AFTER INSERT ON tenants`. Os "registros padrão" serão os atualmente existentes no tenant GRINGS (template).

### 3. Frontend — Injetar `tenant_id` nos inserts
Hooks a ajustar (`profile.tenant_id` do AuthContext):
- `useProdutos`, `useGruposProdutos`, `usePlanoContasGerencial`, `usePlacas`, `useTransportadoras`, `useLocaisEntrega`
- `useSafras`, `useLavouras`, `useSilos`, `useControleLavouras`
- `usePlantios`, `useAplicacoes`, `useChuvas`, `useFloracoes`, `useInsetos`, `usePlantasInvasoras`, `useAnalisesSolo`, `usePivos`
- `useDreContas`, `useTabelaUmidades`
- `ImportacaoDialog.tsx` — injetar `tenant_id` para essas tabelas no import

### 4. Página "Importar Dados"
Sem mudanças: `count` via RLS passará a refletir apenas o tenant selecionado.

## Detalhes técnicos
- `cfops` permanece GLOBAL → todas as empresas usam a mesma tabela fiscal de CFOPs (correto, é tabela de domínio).
- Super admin sem tenant selecionado vê tudo (modo super admin já implementado).
- `culturas` mantida global (catálogo agronômico padrão).
- Linter de segurança será rodado após a migration.

## Riscos
- Migração mecânica em ~17 tabelas + ~17 hooks. Volume alto mas baixo risco.
- UMBU terá `dre_contas`, `tabela_umidades`, `plano_contas_gerencial` zerados até o seed rodar — o seed automático cobrirá novos tenants; UMBU será populada manualmente ou via UPDATE pontual.
