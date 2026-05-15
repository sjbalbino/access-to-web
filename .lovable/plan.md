## Problema

Após o super admin trocar para "UMBU AGROPECUARIA" pela tela `/selecionar-empresa`, o sistema continua mostrando dados da "AGROPECUARIA GRINGS" (e de todas as outras empresas).

## Causa raiz

As políticas RLS e a função `granja_belongs_to_tenant` contêm um bypass incondicional para super admin:

```
... OR is_super_admin(auth.uid()) ...
```

Como `is_super_admin()` agora retorna `true` sempre (baseado em `is_super_admin_original`), o super admin enxerga TODOS os tenants mesmo depois de selecionar uma empresa específica. O `profile.tenant_id` é atualizado, mas o RLS ignora.

## Solução

Tornar o bypass de super admin **condicional**: só vê tudo quando `profile.tenant_id IS NULL` (Modo Super Admin). Quando escolhe uma empresa, comporta-se como um usuário daquele tenant.

### Migração

1. **Atualizar `granja_belongs_to_tenant(_granja_id)`**:
   - Trocar `OR is_super_admin(auth.uid())` por `OR (is_super_admin(auth.uid()) AND get_user_tenant_id() IS NULL)`.
   - Assim, todas as tabelas filhas (clientes, colheitas, contratos, vendas, NFe, devoluções, compras, inscrições, emitentes, estoque, etc.) ficam automaticamente escopadas.

2. **Atualizar as 4 políticas de `granjas`** (SELECT/INSERT/UPDATE/DELETE):
   - Trocar `OR is_super_admin(auth.uid())` por `OR (is_super_admin(auth.uid()) AND get_user_tenant_id() IS NULL)`.

3. **Não mexer** nas políticas de `tenants` — super admin precisa continuar vendo/gerenciando todos os tenants para poder trocar entre eles.

### Comportamento resultante

- **Super admin com `tenant_id = NULL`** (Modo Super Admin): vê tudo, como hoje.
- **Super admin com `tenant_id = X`**: vê apenas dados do tenant X, exatamente como um usuário comum daquele tenant. Novos registros criados ficam vinculados ao tenant X.
- **Usuários comuns**: nenhum impacto.

### Sem mudanças de código frontend

A página `/selecionar-empresa`, o `AuthContext` e o seletor no header já estão corretos — basta corrigir o RLS no backend.
