
## Objetivo

Quando alguém se cadastra pela tela de login (`/auth`), a conta nasce **pendente** (sem empresa e sem perfil). O Administrador (ou Super Admin) libera o acesso escolhendo a empresa (tenant) e o nível de acesso. Tudo acompanhado de **e-mails automáticos** de notificação.

## Fluxo de liberação

### 1. Cadastro público (tela de Login → aba "Cadastrar")
- Usuário informa nome, e-mail e senha
- Conta criada com `tenant_id = NULL`, `ativo = false` e **sem** linha em `user_roles`
- Mensagem: *"Cadastro recebido. Você receberá um e-mail assim que um administrador liberar seu acesso."*

### 2. Bloqueio de login enquanto pendente
- No `AuthContext`, após login: se `!profile.ativo` ou não houver role → `signOut()` imediato + toast *"Seu cadastro está aguardando liberação."*

### 3. Tela de Usuários (`/usuarios`) — nova aba "Pendentes de Liberação"
- Badge com a contagem de pendentes
- Super Admin: vê pendentes de todas as empresas + pendentes sem empresa
- Admin comum: vê pendentes sem empresa (para puxar para seu tenant) + pendentes do seu próprio tenant

### 4. Diálogo "Liberar acesso"
- **Empresa (Tenant)**:
  - Super Admin: combobox com todas as empresas + opção "Sem empresa (Super Admin)"
  - Admin comum: travado no próprio tenant
- **Nível de acesso**: Visualizador / Operador / Gerente / Administrador
- **Ativo**: marcado por padrão
- Botões: **Liberar** / **Rejeitar** (apaga a conta via Admin API)

## E-mails automáticos (Lovable Cloud)

São 3 e-mails transacionais (PT-BR), com a identidade visual do AgroGestão (verde agrícola, fonte limpa, fundo branco):

| # | Quando | Para | Conteúdo |
|---|--------|------|----------|
| 1 | Novo cadastro recebido | **Usuário** que se cadastrou | Confirmação de recebimento + aviso de que aguarda liberação |
| 2 | Novo cadastro recebido | **Todos os administradores** do tenant + Super Admins | Aviso de novo pedido pendente, com nome/e-mail do solicitante e link para `/usuarios?tab=pendentes` |
| 3 | Acesso liberado | **Usuário** liberado | Boas-vindas, empresa atribuída, nível de acesso e botão para acessar `/auth` |

Quando o admin **rejeita**, não é enviado e-mail (a conta é simplesmente excluída).

## Detalhes técnicos

### Banco de dados (migração)
- Ajustar trigger `handle_new_user`:
  - No cadastro público (sem `metadata.role`): criar `profiles` com `tenant_id = NULL`, `ativo = false` e **não** inserir em `user_roles`
  - Primeiro usuário do sistema e fluxo via `create-user` continuam como hoje
- RLS de `profiles`: garantir que admins de um tenant e super admins consigam ler/atualizar pendentes

### Edge functions (todas com JWT + verificação de role)
- **`approve-user`** — valida admin, atualiza `profiles.tenant_id`/`ativo`, cria `user_roles`, enfileira e-mail #3
- **`reject-user`** — valida admin, apaga via `auth.admin.deleteUser`
- **`notify-new-signup`** — chamada logo após `signUp`; envia e-mails #1 (usuário) e #2 (admins). Faz lookup dos admins consultando `user_roles` + `profiles` (mesmo tenant ou super admins)

### Infraestrutura de e-mail
- Configurar domínio de envio do Lovable Cloud (assistente exibido se ainda não houver)
- Provisionar a infraestrutura de e-mails transacionais
- Criar 3 templates React Email em `supabase/functions/_shared/transactional-email-templates/`:
  - `cadastro-recebido-usuario.tsx`
  - `cadastro-recebido-admin.tsx`
  - `acesso-liberado.tsx`
- Todos com fundo branco, verde de destaque do AgroGestão, textos em PT-BR

### Frontend
- `src/contexts/AuthContext.tsx`: bloqueio pós-login (pendente → signOut + toast)
- `src/pages/Auth.tsx`: novo texto de sucesso + chamada à `notify-new-signup`
- `src/pages/Usuarios.tsx`: Tabs "Ativos" / "Pendentes" + diálogo de liberação
- Novo componente `LiberarUsuarioDialog.tsx`
- Novo hook `useUsuariosPendentes`

### Sem mudança
- Edge function `create-user` (admin cria usuário já liberado) continua igual e **não** dispara o e-mail de "acesso liberado" (porque o admin já comunicou manualmente). Posso mudar isso depois se quiser.

## Ordem de execução
1. Configurar domínio de e-mail (assistente, se necessário)
2. Provisionar infraestrutura de e-mail transacional
3. Migração do banco (trigger + RLS)
4. Criar 3 templates de e-mail
5. Criar edges `approve-user`, `reject-user`, `notify-new-signup`
6. Ajustar `AuthContext`, `Auth.tsx`, `Usuarios.tsx` + novo diálogo e hook
7. Deploy de todas as edges

## Fora do escopo
- Auto-aprovação por domínio de e-mail
- Histórico/auditoria de aprovações (pode virar relatório depois)
