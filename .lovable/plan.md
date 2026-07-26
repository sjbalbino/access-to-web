## Objetivo

No relatório **Extrato Venda da Produção**, a coluna CONTR. deve mostrar o **número do contrato do comprador** (`numero_contrato_comprador`) em vez do número interno.

## Alteração

Em `src/components/relatorios/RelatorioDialog.tsx`, função `gerarExtratoVendaProducao`:

1. Incluir `numero_contrato_comprador` no `select` da consulta a `contratos_venda`.
2. Preencher o campo `numero` da linha com `numero_contrato_comprador`, usando o número interno como fallback quando o contrato do comprador estiver vazio.
3. Renomear o cabeçalho da coluna da planilha de "Contrato" para "Contrato Comprador".

Nenhuma alteração no gerador de PDF (`relatoriosPdf.ts`) nem no banco de dados é necessária — apenas a origem do dado muda.
