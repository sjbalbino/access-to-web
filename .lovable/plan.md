
## Diagnóstico

Confirmei no banco: existem duas NF-es número 86 / série 930 no emitente `3bbed79d…`:

- `a3bb2c4a…` — criada 16:07, **autorizada** às 16:26 (chave final `…861215536120`).
- `465d2a36…` — criada 16:52, rejeitada com **"Duplicidade de NF-e, com diferença na Chave de Acesso"** (código 539) no mesmo número 86.

Timeline no emitente (mesma série 930):

| Nota | Criada | Autorizada (updated_at) | Nº |
|---|---|---|---|
| 4f6d228e | 16:00:49 | **16:29:49** | 85 |
| a3bb2c4a | 16:07:55 | 16:26:22 | 86 |
| 465d2a36 | 16:52:11 | 17:11:39 (rejeitada) | 86 |

A nota 85 foi enviada primeiro, mas o retorno da SEFAZ chegou **depois** da nota 86 (16:29 vs 16:26).

## Causa raiz

Em `supabase/functions/focus-nfe-emitir/index.ts` (linhas 478–486), após autorização a função faz:

```ts
await supabase.from("emitentes_nfe")
  .update({ numero_atual_nfe: numeroEmitido })
  .eq("id", emitenteData.id);
```

Isso **sobrescreve** `numero_atual_nfe` sem comparar com o valor atual. Quando uma nota mais antiga (85) tem retorno mais lento que uma mais nova (86), o update tardio da 85 **regride** o contador de 86 → 85.

Sequência que gerou o problema:

1. 16:07 — nota 86 emitida com `numero_atual_nfe=85` → reserva 86.
2. 16:26 — SEFAZ autoriza a 86, contador vai para **86**.
3. 16:29 — retorno tardio da 85 sobrescreve o contador de volta para **85**.
4. 16:52 — usuário cria uma nova nota; a função lê `numero_atual_nfe=85` e reserva **86 de novo**.
5. SEFAZ recusa (539 — Duplicidade), pois o número 86 já foi consumido com outra chave.

O tratamento de duplicidade existente (linhas 373–396) só entra em ação **depois** da rejeição — não previne o problema.

## Correção proposta

Tornar a atualização de `numero_atual_nfe` monotônica (nunca regride) nos três pontos onde ela é gravada após a autorização:

### 1. `supabase/functions/focus-nfe-emitir/index.ts`

No bloco de sucesso (linhas 477–486), substituir o `update` cego por uma leitura + comparação:

```ts
const numeroEmitido = Number(responseData.numero ?? proximoNumero);
if (emitenteData?.id && numeroEmitido > 0) {
  const { data: cur } = await supabase
    .from("emitentes_nfe")
    .select("numero_atual_nfe")
    .eq("id", emitenteData.id)
    .maybeSingle();
  const atual = Number(cur?.numero_atual_nfe ?? 0);
  if (numeroEmitido > atual) {
    await supabase
      .from("emitentes_nfe")
      .update({ numero_atual_nfe: numeroEmitido })
      .eq("id", emitenteData.id);
  }
}
```

Também no bloco de duplicidade (linhas 390–396), o cálculo já usa `Math.max` — manter, apenas confirmar leitura fresca.

### 2. `src/components/compra/EmitirNfeCompraDialog.tsx` (linhas 197–214) e `src/components/remessas/EmitirNfeAutomaticoDialog.tsx` (linhas 194–211)

Ambos gravam `numero_atual_nfe = proximoNumero` diretamente. Aplicar o mesmo padrão: reler o valor atual e só atualizar se `proximoNumero > atual`.

### 3. Correção pontual do dado atual

A nota `465d2a36…` está com `numero=86` e status `erro_autorizacao`. O contador do emitente já está em 89 (correto). Duas opções — o usuário escolhe:

- **Descartar**: excluir a nota `465d2a36` (é apenas uma tentativa rejeitada, nunca foi para a SEFAZ com sucesso), ou
- **Reaproveitar**: limpar `numero`, `chave_acesso`, `uuid_api` e `protocolo` da nota `465d2a36` para que a próxima tentativa de emissão pegue o próximo número disponível (90).

## Fora do escopo

Não vou mexer em concorrência entre emissões simultâneas do mesmo emitente (dois usuários clicando "Emitir" ao mesmo tempo) — isso exigiria uma sequence Postgres dedicada por (emitente, série). Se quiser, posso planejar isso em separado.
