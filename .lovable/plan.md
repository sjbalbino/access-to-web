## Problema

Em `src/pages/EmitentesNfe.tsx` (linha 292), o upsert de credenciais só roda se **algum campo for truthy**:

```ts
if (emitenteId && (credentials.api_access_token || credentials.api_consumer_key || ...)) {
  await upsertCredentials.mutateAsync(...);
}
```

Quando o usuário **apaga o token** (string vazia / null), a condição vira `false`, o upsert é pulado, e o token antigo continua salvo no banco — exatamente o sintoma reportado.

## Correção

1. Remover a condição "tem algum valor preenchido". Sempre que houver `emitenteId` e o usuário tiver permissão (i.e. `credentialsQuery` retornou dado ou usuário é admin/gerente), executar o upsert, passando `null` nos campos vazios.
2. No hook `useUpsertEmitenteCredentials` (já normaliza `?? null`), garantir que strings vazias virem `null` antes de enviar (`v?.trim() ? v : null`), para gravar `NULL` no banco em vez de string vazia.
3. Após salvar, invalidar `["emitente-credentials", emitenteId]` (já faz) e também forçar refetch ao reabrir o diálogo (já faz via `useQuery` por id).

## Arquivos

- `src/pages/EmitentesNfe.tsx` — ajustar bloco do `handleSubmit` (linhas ~291-302).
- `src/hooks/useEmitenteCredentials.ts` — normalizar strings vazias para `null` no `upsert`.

## Fora de escopo

Nenhuma mudança de schema, RLS ou outras telas.
