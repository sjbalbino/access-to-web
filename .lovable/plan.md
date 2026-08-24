# Custos da Lavoura

Consolidar os custos de produção de cada lavoura/safra a partir dos lançamentos já existentes (plantios + aplicações), com visualização na tela e relatório em PDF/Excel. Nenhuma alteração no banco de dados: todos os valores já estão gravados em `plantios.valor_total` e `aplicacoes.valor_total`.

## 1. Aba "Custos" no Controle de Lavoura

Nova aba (última posição, ícone de moeda) dentro da lavoura/safra aberta, somente leitura:

- **Cartões de indicadores**: Custo Total (R$), Custo por Hectare (R$/ha), Custo por Saca (R$/sc de 60 kg) e Produção Colhida (kg e sacas).
- **Tabela de composição por tipo**: uma linha para Sementes (plantios) e uma para cada tipo de aplicação com lançamentos (Adubação, Herbicidas, Fungicidas, Inseticidas, Adjuvantes, Micronutrientes, Inoculantes, Calcários), com colunas: Tipo, Nº de lançamentos, Total (R$), R$/ha, % do custo total. Rodapé com totais.
- **Barra de participação** simples por tipo (%) para leitura visual rápida.
- Ordem das linhas: Sementes primeiro, depois os tipos por valor decrescente. Linhas com valor zero não aparecem.

Regras de cálculo:
- Área base para R$/ha: `ha_plantado` do controle; se estiver vazio ou zero, usa `area_total`; se ambos zerados, R$/ha aparece como "-".
- Sacas colhidas: soma de `producao_kg` das colheitas do controle ÷ 60.
- R$/saca só é exibido quando houver produção colhida; caso contrário mostra "-".
- Valores em moeda BR com exatamente 2 casas decimais; kg como inteiro.

## 2. Relatório "Custos da Lavoura"

Novo card na seção **Produção** da tela de Relatórios, com filtros de Safra (obrigatória) e Lavoura (opcional — em branco lista todas), gerando PDF e permitindo exportação em Excel no mesmo padrão dos demais relatórios.

Estrutura do PDF (retrato):
- Cabeçalho padrão do sistema com safra e período de geração.
- Um bloco por lavoura: área (ha), produção (kg e sacas) e a tabela de composição por tipo (Total R$, R$/ha, R$/sc, %).
- Subtotal por lavoura e, no final, **Resumo Geral**: uma linha por lavoura com Custo Total, R$/ha e R$/sc, mais linha de total geral (valores numéricos alinhados à direita, datas centralizadas, textos à esquerda).
- Quando a safra tiver várias lavouras, também um resumo consolidado por tipo de custo.

## Detalhes técnicos

- Novo hook `src/hooks/useCustosLavoura.ts`:
  - `useCustosLavoura(controleLavouraId)` — agrega `aplicacoes` (por `tipo`) e `plantios` do controle, mais colheitas, retornando as linhas do resumo e os indicadores. Tipagem explícita das linhas (`LinhaCustoLavoura`).
  - `useCustosLavouraSafra(safraId, lavouraId?)` — busca os controles da safra com joins de lavoura e agrega os mesmos números por controle, para o relatório. Paginação por `fetchAllRows` (padrão já usado no Controle Gerencial) para não truncar em 1.000 linhas.
- Novo componente `src/components/controle-lavoura/CustosTab.tsx` (< 150 linhas, tokens semânticos, TanStack Query, skeleton de carregamento e estado vazio) registrado em `ControleLavouraDetalhe.tsx`.
- Gerador `gerarCustosLavouraPdf` em `src/lib/relatoriosPdf.ts`, reutilizando `pdfBrand` e o padrão de alinhamento dos relatórios existentes; abas de Excel via o mecanismo `setPendingSheets` já utilizado.
- `src/pages/Relatorios.tsx`: novo tipo `custos_lavoura` e card no grupo Produção. `src/components/relatorios/RelatorioDialog.tsx`: filtros Safra/Lavoura e chamada do gerador.
- Reaproveitar `TIPOS_APLICACAO` de `useAplicacoes.ts` como fonte dos rótulos, evitando duplicação de nomes.
