# Corrigir Código exibido na lista de Controle de Lavoura

## Problema
Na lista de Controle de Lavoura a coluna **Código** está exibindo `controle_lavouras.codigo` (código interno do registro de controle). No sistema legado, o "Código" identifica a **Lavoura** (ex.: 351 = GERSON, 364 = CASCATA). Por isso os códigos parecem trocados em relação ao legado.

## Solução
Trocar a fonte da coluna **Código** para usar o código da própria Lavoura, que já vem no join (`lavouras.codigo`).

## Alterações
- `src/components/controle-lavoura/ControleLavouraList.tsx`
  - Linha que renderiza `{controle.codigo || '-'}` passa a renderizar `{controle.lavouras?.codigo ?? '-'}`.
  - Ajustar também o filtro de busca para considerar `controle.lavouras?.codigo` (em vez de `controle.codigo`) ao procurar por número.

Nenhuma mudança de schema, hook ou backend — apenas apresentação.

## Validação
- Abrir Controle de Lavoura, filtrar por SOJA 2025/2026 + CRUZ ALTA e conferir que código 351 aparece para a lavoura GERSON, 364 para CASCATA, etc., batendo com o legado.
- Buscar pelo número da lavoura no campo de busca continua funcionando.