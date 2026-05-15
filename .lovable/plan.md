## Objetivo

Permitir que o super admin (admin sem tenant fixo) troque qual empresa contratante está atendendo. A troca atualiza o `tenant_id` do próprio profile do super admin no banco, fazendo com que todas as RLS passem a filtrar pelos dados daquela empresa. Também deve existir uma forma de "voltar" ao modo super admin (sem tenant).

## Importante sobre o modelo atual

- Hoje, super admin = `role admin` + `profiles.tenant_id IS NULL`. A função `is_super_admin()` depende disso.
- Se trocarmos `profiles.tenant_id` para um tenant real, o usuário **deixa de ser super admin** enquanto estiver "dentro" daquela empresa (passa a se comportar como admin daquele tenant). Isso é o comportamento desejado pela opção escolhida ("trocar permanentemente").
- Para conseguir voltar ao modo super admin, precisamos lembrar em algum lugar que ele **é** super admin originalmente. Solução: nova coluna `profiles.is_super_admin_original BOOLEAN DEFAULT false`, marcada `true` para os super admins atuais. A função `is_super_admin()` passa a olhar essa coluna em vez de `tenant_id IS NULL`.

## Mudanças no banco (migration)

1. Adicionar coluna `profiles.is_super_admin_original BOOLEAN NOT NULL DEFAULT false`.
2. Backfill: marcar `true` para todos os profiles que hoje são `admin` + `tenant_id IS NULL`.
3. Atualizar a função `is_super_admin(_user_id)` para retornar `true` quando `profiles.is_super_admin_original = true` (independente do tenant_id atual).
4. Trigger `handle_new_user`: quando o role criado é `admin` e `tenant_id` vier null, marcar `is_super_admin_original = true`.
5. Política RLS de UPDATE em `profiles`: permitir que o próprio super admin original atualize seu `tenant_id` (já existe update do próprio profile, mas conferir e ajustar se necessário).

## Mudanças no frontend

### Hook / contexto
- `AuthContext`: usar a nova coluna `is_super_admin_original` para determinar `isSuperAdmin` (em vez de `tenant_id IS NULL`). Continuar expondo `profile.tenant_id` como "empresa ativa".

### Nova página `/selecionar-empresa`
- Rota protegida só para `isSuperAdmin`.
- Lista todas as empresas contratantes (`useTenants`) em cards/lista com busca.
- Card destacado "Modo Super Admin (todas as empresas)" para voltar ao `tenant_id = null`.
- Indica visualmente qual está ativa hoje.
- Ao clicar: chama `supabase.from('profiles').update({ tenant_id }).eq('id', user.id)`, invalida o React Query, recarrega o `AuthContext` e redireciona para `/`.

### Acesso à página
- Adicionar rota em `App.tsx`.
- Adicionar item no menu do usuário (header/sidebar) "Trocar empresa contratante" visível só para super admin.
- No login, se super admin não tiver tenant ativo, redirecionar automaticamente para `/selecionar-empresa` (opcional, pode-se manter livre).

### Indicador na UI
- Mostrar no header o nome da empresa ativa quando o super admin estiver "dentro" de um tenant, com um botão rápido para trocar.

## Arquivos previstos

- `supabase/migrations/...sql` — coluna nova, backfill, ajuste de função, trigger.
- `src/pages/SelecionarEmpresa.tsx` — nova página.
- `src/App.tsx` — registrar rota.
- `src/contexts/AuthContext.tsx` — usar `is_super_admin_original`.
- `src/components/layout/AppSidebar.tsx` (ou header) — link "Trocar empresa contratante" + indicador da empresa ativa.

## Pontos de atenção

- Após trocar o tenant, **todas** as queries cacheadas devem ser invalidadas (`queryClient.clear()`), pois os dados visíveis mudam por completo.
- Documentos fiscais e registros já criados pelo super admin enquanto estava em "modo todas as empresas" mantêm seu `tenant_id` original — a troca não migra dados, só muda o filtro.
- Garantir que a política RLS de `granjas` (e tabelas correlatas) continua funcionando: hoje ela libera tudo para `is_super_admin`. Com a nova lógica, quando o super admin entrar em um tenant ele continuará vendo tudo (porque `is_super_admin` segue true). Se quiser que ele veja **apenas** o tenant ativo, a política precisa mudar para `tenant_id = get_user_tenant_id() OR (is_super_admin AND get_user_tenant_id() IS NULL)`. **Confirmar com o usuário** se é isso que ele quer (ver só dados da empresa ativa) ou se prefere que super admin sempre veja tudo independentemente do tenant escolhido.
