## Problema

O upsert de `inscricoes_produtor` falha com:
> there is no unique or exclusion constraint matching the ON CONFLICT specification

O `ImportacaoDialog` faz `onConflict: 'granja_id,codigo'`, mas essa combinação **não tem UNIQUE constraint** no banco — a migration anterior criou a coluna `codigo` mas não o índice único.

## Correção (uma única migration)

1. **Limpar duplicatas existentes** de `codigo` dentro do mesmo `granja_id` (manter o registro mais antigo, zerar `codigo` dos demais) — necessário porque o índice único falha se já houver duplicatas.
2. **Criar índice único parcial**:
   ```sql
   CREATE UNIQUE INDEX inscricoes_produtor_granja_codigo_uniq
   ON public.inscricoes_produtor (granja_id, codigo)
   WHERE codigo IS NOT NULL;
   ```
   Parcial (`WHERE codigo IS NOT NULL`) para não bloquear inscrições sem código legado.

## Após aprovar a migration

Reimportar a planilha de Inscrições Produtor com a coluna `INSCCODIGO` — o upsert então funcionará e todas as demais tabelas (colheitas, remessas, etc.) poderão ser reimportadas usando o código sequencial correto.

## Não altera

- Nenhum código de aplicação.
- Nenhum dado além do `codigo` de eventuais duplicatas (que hoje já estão inconsistentes).
