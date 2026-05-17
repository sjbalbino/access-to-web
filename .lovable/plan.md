# Multi-tenant — implementação final

Migração aplicada com sucesso. Todas as 20 tabelas listadas no plano agora têm `tenant_id` com DEFAULT `get_user_tenant_id()` e RLS por tenant + bypass do super admin no "Modo Super Admin".

## Resultado por área

- **Frontend**: nenhum hook precisou ser alterado — o DEFAULT no banco preenche `tenant_id` automaticamente.
- **ImportacaoDialog**: estendido para injetar `tenant_id = selectedTenantId` em todas as tabelas isoladas (super admin pode importar para qualquer tenant).
- **Seed automático**: novo tenant recebe cópia de `dre_contas`, `tabela_umidades` e `plano_contas_gerencial` do template GRINGS via trigger `tenants_seed_defaults`.
- **Dados existentes**: backfilled para o tenant AGROPECUARIA GRINGS.

## Verificação pós-implementação
1. Logado como super admin em UMBU AGROPECUARIA, a tela /importar-dados deve mostrar apenas tabelas com dados do tenant UMBU.
2. As listas de produtos, grupos, plano de contas, etc. devem aparecer vazias para UMBU até serem importadas.
3. Em "Modo Super Admin" (sem empresa selecionada), todos os dados são visíveis para auditoria.

## Linter
22 warnings WARN sobre "Public Can Execute SECURITY DEFINER Function" são pré-existentes — funções como `get_user_tenant_id`, `has_role`, `can_edit`, `is_super_admin`, `granja_belongs_to_tenant` são intencionalmente acessíveis aos roles autenticados via REST. Não foram introduzidas por esta migração.
