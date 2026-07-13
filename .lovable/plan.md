## Objetivo

Alterar o **modelo de importação de colheitas** (`modelo_colheitas.xlsx`, gerado dinamicamente pelo sistema) acrescentando duas colunas — `inscricao_codigo` e `inscricao_nome` — e ajustar o importador para usá-las como forma robusta de identificar a inscrição correta, permitindo corrigir as 640 colheitas com IE genérica (`000/111`) num novo import.

## Mudanças (apenas em `src/lib/importacaoConfig.ts`)

Na configuração `colheitas`:

1. **Substituir o resolver atual** de `inscricao_produtor_id`:
   - Hoje: `sourceColumn: 'inscricao_codigo'` com aliases (`inscricao_ie`, etc.) → busca em `inscricoes_produtor.codigo`.
   - Novo: resolver **composto** —
     - `sourceColumn: 'inscricao_codigo'` → busca por `inscricoes_produtor.codigo` (chave primária de identificação).
     - `compositeSourceColumn: 'inscricao_nome'` → usado como conferência/desambiguação contra `nome` ou `produtores.nome`.
   - Mantém `optional: true` para não travar linhas sem inscrição.

2. **Ativar `updateMode`** na config de colheitas:
   - `lookupColumn: 'codigo'` (colheita.codigo)
   - `sourceColumn: 'COL_CODIGO'`
   - `updateColumns: [{ sourceColumn: 'inscricao_codigo', dbColumn: 'inscricao_produtor_id' }]` (resolvido via referência)

   Assim, ao reimportar a planilha em modo update, o sistema atualiza **apenas** o vínculo da inscrição das colheitas já existentes, sem alterar peso, data, silo, etc. Linhas com `inscricao_codigo` em branco não sofrem alteração.

## Efeitos automáticos

- `handleDownloadTemplate` em `ImportarDados.tsx` já monta os headers a partir de `config.columns` + `config.references` (incluindo `compositeSourceColumn`). Ou seja, ao adicionar o resolver composto, o botão "Baixar modelo" das colheitas passará a incluir as duas novas colunas automaticamente — sem mexer no `ImportarDados.tsx`.
- Nenhuma migration necessária. Nenhuma coluna nova no banco.

## Fluxo de uso

1. Você baixa o novo `modelo_colheitas.xlsx` (já com as 2 colunas).
2. Regenera sua planilha completa de colheitas com `inscricao_codigo` e `inscricao_nome` preenchidos **apenas nas 640 linhas** com IE 000/111 (as demais podem ficar em branco, pois já estão corretas no banco).
3. Importa em **modo update** — só as 640 colheitas com `inscricao_codigo` preenchido têm seu `inscricao_produtor_id` atualizado.
4. Auditoria: `SELECT count(*)` das colheitas ainda em 000/111 deve cair para (quase) zero.

## O que aprovar

Aprovar libera as duas alterações em `importacaoConfig.ts` (resolver composto + updateMode).
