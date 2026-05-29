# Corrigir mensagem de erro no cadastro

## Causa raiz

Os logs do Auth mostram `POST /signup → 422` e que a proteção **Pwned Passwords (HIBP)** está ativa. A senha usada (`123456`) é uma das mais vazadas do mundo, então o Supabase rejeita com `weak_password / pwned`. O `Auth.tsx` só trata `Invalid login credentials` e `User already registered`, caindo no genérico **"Erro ao criar conta"** e escondendo a causa real.

## Mudanças (apenas frontend — `src/pages/Auth.tsx`)

No `handleSignup`, ampliar o mapeamento de erros para cobrir:

- **Senha vazada / fraca** (`weak_password`, mensagem contém `pwned` ou `compromised`)
  → "Esta senha foi encontrada em vazamentos públicos. Escolha uma senha mais forte (evite '123456', 'senha', datas, etc.)."
- **Senha curta** (contém `at least`)
  → "A senha deve ter pelo menos 6 caracteres."
- **Email inválido** (`invalid email`)
  → "Email inválido."
- **Signups desabilitados** (`signup is disabled`)
  → "O cadastro está temporariamente desabilitado. Contate o administrador."
- **Rate limit** (`rate limit`)
  → "Muitas tentativas. Aguarde alguns minutos e tente novamente."
- Manter os casos atuais (já cadastrado).
- Como fallback, mostrar `error.message` em vez de só "Erro ao criar conta", para que erros futuros fiquem visíveis.

Também reforçar o schema Zod do cadastro para sugerir senha mínima de 8 caracteres (recomendação, mantendo 6 como mínimo técnico do Supabase) — opcional, posso deixar em 6 se preferir.

## Fora de escopo

- Desativar HIBP (recomendo manter ativo — é segurança).
- Mudar fluxo de aprovação, e-mails ou backend.

## Validação

- Tentar cadastro com `123456` → deve mostrar mensagem clara sobre senha vazada.
- Tentar cadastro com senha forte nova → deve concluir normalmente.
