# Remover a importação de Dessecação

## Diagnóstico (verificado)

Você está certo. A checagem mostra:

- `src/lib/importacaoConfig.ts` (linha 156) cria uma planilha de importação para o tipo `dessecacao`.
- O Controle de Lavoura **não tem aba de Dessecação**: as abas de aplicação existentes são Adubação, Herbicidas, Fungicidas, Inseticidas, Adjuvantes, Micronutrientes, Inoculantes e Calcários (`ControleLavouraDetalhe.tsx`).
- No banco não existe nenhum registro com `tipo = 'dessecacao'` (hoje: inseticida 209, herbicida 150, fungicida 131, adubação 43).

Ou seja: quem importasse por essa planilha gravaria custos que nunca apareceriam na tela — dado invisível. Dessecação é aplicação de herbicida, então a planilha de Herbicidas cobre o caso.

## O que será feito

1. Remover a Dessecação da lista de importações (o item deixa de aparecer no assistente de Importar Dados e o modelo Excel correspondente deixa de existir).
2. Remover "Dessecação" da lista de tipos de aplicação usada nos formulários, para não oferecer um tipo sem aba.
3. Não haverá migração de dados nem exclusão de registros — não existe nenhum registro desse tipo.

## Detalhes técnicos

- `src/lib/importacaoConfig.ts`: retirar `{ tipo: 'dessecacao', label: 'Dessecação' }` do factory de configurações de aplicação.
- `src/pages/ImportarDados.tsx` / `src/components/importacao/ImportacaoDialog.tsx`: remover a chave `aplicacoes_dessecacao` das listas de chaves de aplicação (contagem, limpeza e resolução de referências).
- `src/hooks/useAplicacoes.ts`: remover a entrada `dessecacao` de `TIPOS_APLICACAO` (o valor permanece no type/enum do banco, sem uso, para não quebrar tipagem nem exigir migração).
- `src/hooks/useProdutosByGrupo.ts`: manter ou remover o mapeamento `dessecacao -> DESSECANTES` conforme a limpeza acima (ficará sem uso).

## Observação

Se em algum momento você quiser controlar dessecação separadamente (custo próprio, com aba própria no Controle de Lavoura), o caminho é o inverso: criar a aba e só então manter a importação. Hoje o caminho correto é usar Herbicidas.
