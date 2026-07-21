## Diagnóstico da Nota 89

Nota 89 (`id 3c31c97c-…`, rascunho, "COMPRA PARA COMERCIALIZACAO", criada 21/07 17:15) foi gravada com:
- `emitente_id` = `3bbed7…` (OK — emitente vinculado à inscrição `f0ad86…`)
- `inscricao_produtor_id` = **NULL** ← problema
- `inscricao_remetente_id` = NULL

O mesmo padrão aparece nas notas 84, 90 e 94 (todas de compra, mesma granja). As notas 85, 86, 87, 88 (autorizadas) têm `inscricao_produtor_id` corretamente preenchido.

### Causa raiz (confirmada em código)

Existem dois fluxos que criam NF-e de compra:

1. **`src/components/compra/EmitirNfeCompraDialog.tsx`** (linha 240): faz `insert` em `notas_fiscais` **incluindo** `inscricao_produtor_id: compra.inscricao_comprador_id`. As notas geradas por esse fluxo aparecem com o campo preenchido.
2. **`src/components/compra/CompraDialog.tsx`** (linhas 430-462): faz `insert` em `notas_fiscais` **sem** incluir `inscricao_produtor_id`. Todas as notas em `rascunho` recentes vêm desse fluxo — por isso saíram sem o sócio emitente.

Nenhum trigger/edge function limpa o campo depois; a coluna simplesmente não é enviada no `INSERT` desse diálogo.

## Correção

### 1) `src/components/compra/CompraDialog.tsx`

No `insert` da nota fiscal (bloco iniciando em `.from('notas_fiscais').insert({ … })`, ~linha 432), adicionar:

```ts
inscricao_produtor_id: inscricaoPrincipal?.id ?? emitente.inscricao_produtor_id ?? null,
```

- `inscricaoPrincipal` já é a inscrição do comprador (sócio principal da granja), usada logo abaixo em `inscricaoProdutor: { … }`.
- Fallback via `emitente.inscricao_produtor_id` garante o vínculo mesmo se `inscricaoPrincipal` não estiver resolvido no momento do insert (o `emitente_nfe` é 1:1 com inscrição do produtor).

### 2) Backfill dos registros existentes

Rodar UPDATE único para preencher `inscricao_produtor_id` das notas em rascunho/erro que ficaram sem o campo, usando o vínculo pelo `emitente_id`:

```sql
UPDATE public.notas_fiscais nf
   SET inscricao_produtor_id = e.inscricao_produtor_id
  FROM public.emitentes_nfe e
 WHERE nf.emitente_id = e.id
   AND nf.inscricao_produtor_id IS NULL
   AND e.inscricao_produtor_id IS NOT NULL;
```

Isso corrige a nota 89 (e as outras: 84, 90, 94, além de qualquer outra herdada do mesmo bug).

### 3) Verificação

- Reabrir a nota 89 na tela de Notas Fiscais e confirmar que o emitente/sócio aparece corretamente na exibição e no agrupamento.
- Criar uma nova compra pelo `CompraDialog` e conferir que `notas_fiscais.inscricao_produtor_id` já sai preenchido no `INSERT`.

## Escopo

Somente `CompraDialog.tsx` (uma linha adicionada no insert) + UPDATE de backfill via ferramenta de dados. Nenhuma alteração de schema, RLS ou de outros fluxos (EmitirNfeCompraDialog, MDe, depósito, devolução, venda) — todos já preenchem o campo corretamente.
