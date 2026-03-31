
Objetivo: corrigir definitivamente a importação de **colheitas** para que o vínculo com a tabela pai seja feito por `safra_codigo -> controle_lavouras.codigo -> colheitas.controle_lavoura_id`, sem depender de `safra_id`.

1) Diagnóstico (causa real do bug atual)
- O lookup composto em `ImportacaoDialog.tsx` até encontra o controle, porém no saneamento final (`validDbColumns`) o campo calculado `controle_lavoura_id` não está autorizado para insert.
- Resultado: o campo é removido antes do `.insert()`, e vai `NULL` para o banco.
- Além disso, se `safra_codigo` vier vazio/com nome alternativo de coluna, hoje a linha pode passar sem erro e também ser inserida sem vínculo.

2) Correção no motor de importação (`src/components/importacao/ImportacaoDialog.tsx`)
- No bloco de colheitas:
  - Manter lookup em `controle_lavouras` por `codigo` (normalizado, sem zeros à esquerda).
  - Ler `safra_codigo` com fallback robusto de cabeçalho (ex.: `safra_codigo`, `SAFRA_CODIGO`, `safras_codigo`).
  - Se não houver código na linha: gerar erro de referência explícito.
  - Se houver código e não encontrar controle: gerar erro de referência explícito.
  - Se encontrar: preencher **somente** `row.controle_lavoura_id` (não preencher `row.safra_id`).
- No saneamento antes do insert:
  - Incluir `controle_lavoura_id` em `validDbColumns` quando `config.key === 'colheitas'`.
  - Remover campos auxiliares (`_safra_codigo` e aliases) antes do insert.

3) Ajuste de configuração de importação (`src/lib/importacaoConfig.ts`)
- Manter `safra_codigo` como coluna auxiliar no modelo da planilha.
- Garantir que ela continue aparecendo no template de colheitas (já está), para o usuário sempre informar o código de vínculo correto.

4) Comportamento esperado após correção
- Cada linha da planilha:
  - lê `safra_codigo`,
  - localiza `controle_lavouras.codigo`,
  - grava `colheitas.controle_lavoura_id` com o `id` encontrado.
- Linhas sem código ou sem correspondência não serão importadas silenciosamente; aparecerão em “avisos/erros de referência”.
- `safra_id` deixa de ser usado nessa importação (fica fora da lógica de vínculo).

5) Validação pós-implementação
- Teste com planilha contendo `safra_codigo` válido: confirmar `controle_lavoura_id` preenchido.
- Teste com `safra_codigo` inválido/vazio: confirmar linha bloqueada com aviso.
- Conferência no banco:
  - Antes/depois da reimportação, verificar registros novos com `controle_lavoura_id IS NULL`.
- Como os registros já importados com null não se autocorrigem, fazer reimportação desses dados após o patch (com limpeza seletiva dos registros inválidos, se necessário).

Arquivos impactados
- `src/components/importacao/ImportacaoDialog.tsx` (correção principal)
- `src/lib/importacaoConfig.ts` (garantia de coluna auxiliar no template)
