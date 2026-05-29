# E-mails transacionais — Fluxo de aprovação de usuários

Implementar os 3 e-mails em PT-BR, com identidade visual do AgroGestão (verde agrícola), disparados a partir de `notify@notify.sisagro.app`.

## E-mails

1. **Confirmação de cadastro → novo usuário**
   - Assunto: "Cadastro recebido — aguardando liberação"
   - Conteúdo: agradecimento, explicação de que um administrador irá analisar e liberar o acesso, e que receberá novo e-mail quando aprovado.

2. **Alerta de novo cadastro → administradores**
   - Assunto: "Novo cadastro aguardando liberação no AgroGestão"
   - Conteúdo: nome e e-mail do solicitante, botão "Liberar acesso" levando a `https://sisagro.app/usuarios`.
   - Destinatários: todos os usuários com role `admin` (do tenant) + Super Admins.

3. **Liberação concedida → usuário**
   - Assunto: "Seu acesso ao AgroGestão foi liberado"
   - Conteúdo: boas-vindas, empresa (tenant) atribuída, perfil (Visualizador / Operador / Gerente / Administrador) e botão "Acessar o sistema" levando a `https://sisagro.app/auth`.

## Infra

- Provisionar infraestrutura de e-mails transacionais (Edge Functions `send-transactional-email`, `handle-email-unsubscribe`, `handle-email-suppression` + tabelas de supressão e tokens de descadastro).
- Criar página `/unsubscribe` no app para gerenciar descadastros (tema AgroGestão).
- Templates React Email em `supabase/functions/_shared/transactional-email-templates/`:
  - `cadastro-recebido.tsx`
  - `novo-cadastro-admin.tsx`
  - `acesso-liberado.tsx`
- Registrar os 3 templates em `registry.ts`.

## Disparos

- **`Auth.tsx`** (após signup público): substituir a chamada atual a `notify-new-signup` por:
  - `send-transactional-email` com template `cadastro-recebido` → e-mail do usuário.
  - `send-transactional-email` com template `novo-cadastro-admin` → 1 envio por admin (busca via edge function `notify-new-signup`, que faz a query de admins e dispara cada e-mail individualmente — mantém a função para centralizar a lógica de descoberta de destinatários).
- **`approve-user` edge function**: após aprovar, disparar `send-transactional-email` com template `acesso-liberado` → e-mail do usuário aprovado, passando `templateData` com `nome`, `empresa`, `perfil` e URL de login.

## Considerações

- Idempotência: usar `idempotencyKey` baseado em `user_id + template_name + (admin_id quando aplicável)`.
- O `notify-new-signup` permanece como orquestrador (descobre admins do tenant e dispara um e-mail por admin); a função `send-transactional-email` é o único ponto de saída.
- DNS de `notify.sisagro.app` ainda em verificação — os envios ficam enfileirados e começam automaticamente quando ativar.
- Cores e estilo seguem tema verde agrícola do sistema; corpo do e-mail em fundo branco (#ffffff).

## Fora de escopo

- Editar templates de autenticação nativa do Supabase (signup confirmation, password reset) — pode ser feito depois se desejado.
- Auto-aprovação por domínio de e-mail.
