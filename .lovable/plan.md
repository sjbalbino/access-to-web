## Adicionar validação JWT nas Edge Functions fiscais

### Funções a alterar (8 fiscais + 1 enriquecer)

Em cada uma das 8 funções `focus-nfe-*`, inserir bloco de validação JWT logo no início do `try {` (após o handler de OPTIONS):

```ts
const authHeader = req.headers.get("Authorization");
if (!authHeader?.startsWith("Bearer ")) {
  return new Response(JSON.stringify({ error: "Não autorizado" }),
    { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
const _authClient = createClient(SUPABASE_URL!, Deno.env.get("SUPABASE_ANON_KEY")!,
  { global: { headers: { Authorization: authHeader } } });
const { data: _userData, error: _userErr } = await _authClient.auth.getUser();
if (_userErr || !_userData?.user) {
  return new Response(JSON.stringify({ error: "Não autenticado" }),
    { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
```

### Verificação de role nas funções destrutivas
Em `focus-nfe-emitir`, `focus-nfe-cancelar` e `focus-nfe-carta-correcao`, adicionar checagem de role (`admin`, `gerente` ou `operador` — manter operador para não quebrar o fluxo atual de emissão) consultando `user_roles` via service-role client.

### Funções somente-leitura
`focus-nfe-consultar`, `focus-nfe-download`, `focus-nfe-enviar-email`, `focus-nfe-mde`, `focus-nfe-verificar-empresa`: apenas JWT, sem role check.

### Corrigir `enriquecer-clientes-fornecedores` (cross-tenant)
- Exigir role `admin` ou `gerente`.
- Buscar `tenant_id` do usuário em `profiles`.
- Se o body trouxer `tenant_id` diferente do do usuário e ele não for super admin → 403.
- Forçar o `tenant_id` efetivo nas queries para o do usuário (exceto super admin).

### Sem mudanças no front-end
O `supabase.functions.invoke` já envia o `Authorization` automaticamente. Nenhum hook ou componente precisa ser tocado.

### Após implementar
Marcar findings `focus_nfe_no_auth` e `enriquecer_cross_tenant` como `mark_as_fixed`.