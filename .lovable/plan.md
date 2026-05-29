# Mostrar motivo real do erro no cadastro

## Causa raiz

Os logs mostram `POST /signup → 422` sem `error_code`, ou seja, são erros que não batem com nenhum dos padrões (`pwned`, `at least`, `invalid email`, etc.) tratados em `handleSignup`. Nesses casos o código cai no fallback fixo **"Não foi possível concluir o cadastro. Tente novamente em alguns instantes."**, que esconde a mensagem real vinda do Supabase (ex.: falha em trigger `handle_new_user`, conflito de e-mail com normalização diferente, validação de domínio, etc.).

Resultado: o usuário vê sempre a mesma mensagem e nunca o motivo.

## Mudanças (apenas frontend — `src/pages/Auth.tsx`)

1. No `catch`/branch de erro do `handleSignup`:
   - Sempre logar no console: `console.error("Signup error:", error)` (status, message, name) para diagnóstico futuro.
   - Manter as mensagens PT-BR específicas (pwned, senha curta, email inválido, signup desabilitado, rate limit, já cadastrado, network).
   - **Quando nenhum padrão bater**, mostrar a `error.message` original (traduzindo se possível) em vez do fallback genérico. Formato: `"Erro ao criar conta: <mensagem original>"`. Assim o usuário e o suporte enxergam o motivo real.
   - Se `error.message` vier vazio, aí sim usar o texto fallback atual.

2. Mesmo tratamento equivalente em `handleLogin` (logar `error` no console) para futuras investigações.

## Fora de escopo

- Mexer em `AuthContext.signUp` ou no trigger `handle_new_user`.
- Alterar configuração de auth, e-mails ou backend.
- Investigar a fundo o 422 de 11s (depende do motivo que aparecer após a mudança).

## Validação

- Tentar cadastrar com senha vazada → mensagem clara sobre senha vazada (já funcionava).
- Tentar cadastrar com e-mail que está gerando 422 hoje → agora a toast mostra a mensagem real do Supabase, e o console mostra o objeto de erro completo.
