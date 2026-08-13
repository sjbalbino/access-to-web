# Simplificar o diálogo de Relatórios do Controle Gerencial

## Objetivo
O relatório passa a ter um único comportamento: sempre desconsiderar os lançamentos marcados. A escolha "Conteúdo" deixa de existir e o texto descritivo é removido do diálogo e dos títulos dos PDFs.

## Mudanças

1. Diálogo de relatórios (`RelatorioControleDialog.tsx`)
   - Remover o campo "Conteúdo" (Desconsiderando marcados / Somente marcados) e o estado `modo`.
   - Fixar o comportamento em "desconsiderar os marcados" (`somenteMarcados = false`), mantendo a regra de Remessas herdarem a marcação do Contrato de Venda.
   - Remover o texto descritivo abaixo do título do diálogo; manter apenas o nome do conjunto no cabeçalho.
   - Demais filtros (Relatório, Safra, Datas, Orientação, Tamanho) permanecem iguais.

2. Geradores de PDF (`relatoriosControleParalelo.ts`)
   - Títulos passam a ser apenas o nome do relatório (ex.: "Compras de Cereais" e "Consolidado do Controle"), sem o sufixo "Desconsiderando Marcados" / "Somente Marcados".
   - Remover a opção `somenteMarcados` do tipo de opções, já que só existe um modo.

## Observações técnicas
Nenhuma alteração de banco de dados, saldos ou de outros módulos. As marcações continuam sendo gravadas e lidas da mesma forma; apenas a geração do PDF deixa de ter o modo de conferência.
