## Objetivo

1. Passar a registrar **quem** cancelou a NF-e, **quando** e o **motivo**, exibindo essas informações na tela da nota.
2. Corrigir o erro ao baixar a DANFE de notas canceladas.

## Parte 1 — Auditoria do cancelamento

### Banco (migration)
Adicionar em `notas_fiscais`:
- `cancelado_por uuid` (referência lógica a `auth.users.id`)
- `cancelado_por_nome text` (snapshot do nome, para não depender de join)
- `cancelado_em timestamptz`
- `cancelado_motivo text` (hoje o motivo vai para `motivo_status`, mas ele é sobrescrito por outras transições; guardar separado preserva o histórico)

Backfill: para notas já `cancelado`, preencher `cancelado_em = updated_at` e `cancelado_motivo = motivo_status`. `cancelado_por` fica nulo (não temos como recuperar retroativamente).

### Edge function `focus-nfe-cancelar`
- Já valida o usuário (`_userData.user`). Buscar `nome` em `profiles` pelo `user.id`.
- No `update` da nota após cancelamento bem-sucedido, gravar `cancelado_por`, `cancelado_por_nome`, `cancelado_em = now()`, `cancelado_motivo = justificativa`.

### Frontend
- Em `src/pages/NotasFiscais.tsx` (detalhe/lista) e no cabeçalho de `NotaFiscalForm.tsx` quando status = cancelado, exibir bloco:
  > Cancelada por **{nome}** em **{data/hora BR}** — Motivo: *{motivo}*
- Atualizar `src/integrations/supabase/types.ts` (auto-gerado após migration).

## Parte 2 — Erro ao baixar DANFE de nota cancelada

Diagnóstico: `focus-nfe-download` consulta a nota na Focus NFe e usa `consultaData.caminho_danfe`. Para notas canceladas, a Focus continua devolvendo `caminho_danfe` (a DANFE existe, apenas com tarja "CANCELADA"), mas em alguns casos o campo vem vazio até que a consulta pós-cancelamento seja processada, ou o `ref` salvo diverge.

Ações:
1. Adicionar logs do payload de consulta quando `caminho_danfe` estiver ausente para descobrir a causa exata na nota 42.
2. Se `caminho_danfe` ausente e status = cancelado, tentar endpoint alternativo `/v2/nfe/{ref}.pdf` da Focus NFe como fallback antes de erro.
3. Retornar mensagem de erro clara ao usuário (“DANFE ainda não disponível para esta nota cancelada — tente novamente em alguns segundos”) em vez do erro genérico atual.

## Arquivos afetados
- `supabase/migrations/<new>.sql` (colunas + backfill)
- `supabase/functions/focus-nfe-cancelar/index.ts`
- `supabase/functions/focus-nfe-download/index.ts`
- `src/pages/NotasFiscais.tsx` e/ou componente de detalhe
- `src/integrations/supabase/types.ts` (regenerado)

## Fora de escopo
- Recuperar retroativamente quem cancelou notas antigas (informação não existe).
