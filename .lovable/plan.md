# Ajustar modelo de planilha de importação de aplicações

## Contexto

O usuário baixou o modelo de "Aplicações - Herbicidas" e encontrou colunas confusas:
- Campo **Tipo** no cabeçalho, sem saber o que preencher.
- Duplicatas aparentes: `safra_codigo` + `safra_codigo`; `granja_codigo` + `granja_codigo_raw`; `produto_codigo` + `produto_codigo_raw`.

## Causa

O gerador de modelo (`handleDownloadTemplate` em `src/pages/ImportarDados.tsx`) concatena:
1. Todos os `accessName` das `columns` da configuração — incluindo `tipo` (que é fixo por planilha) e os códigos legíveis (`safra_codigo`, `granja_codigo`, `produto_codigo`).
2. Todos os `sourceColumn` das `references` — incluindo as colunas internas `_granja_codigo_raw`, `safra_codigo`, `_produto_codigo_raw`.

Isso gera duplicatas e expõe colunas técnicas que o usuário não deve preencher.

## O que será feito

1. **Ocultar colunas fixas do modelo**: a coluna `tipo` (e outras cujo valor é gerado automaticamente pela importação) não deve aparecer no cabeçalho do modelo Excel.
2. **Evitar duplicatas entre `columns` e `references`**: se o `sourceColumn` de uma referência já estiver representado por um `accessName` de coluna (ou por um alias), não repetir no cabeçalho.
3. **Usar nomes amigáveis nas referências**: quando a referência for um código legado, manter o nome legível (`granja_codigo`, `produto_codigo`) em vez do nome técnico `_granja_codigo_raw` / `_produto_codigo_raw`.
4. **Adicionar linha de exemplo ou nota** (opcional): incluir uma segunda linha no modelo com exemplo de preenchimento para reduzir dúvidas.

## Escopo

- Apenas a geração do modelo Excel em `src/pages/ImportarDados.tsx`.
- Nenhuma alteração na lógica de importação, validação ou banco de dados.

## Resultado esperado

O modelo de Herbicidas (e dos demais tipos de aplicação) virá apenas com as colunas que o usuário realmente precisa preencher:
- `data_aplicacao`
- `area_aplicada`
- `dose_ha`
- `quantidade_total`
- `valor_unitario`
- `valor_total`
- `aplicador`
- `equipamento`
- `condicao_climatica`
- `observacoes`
- `safra_codigo`
- `granja_codigo`
- `produto_codigo`

Sem `tipo`, sem `_raw` e sem duplicatas.
