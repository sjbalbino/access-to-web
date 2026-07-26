## Objetivo

No relatório **Extrato do Produtor**, a coluna **Variedade** (e, junto dela, Local e Lavoura) quebra em várias linhas por célula, inflando a altura das linhas e o número de páginas. O objetivo é garantir uma linha por registro, sem perder legibilidade nem alterar nenhum cálculo.

## Situação atual (verificada)

Em `src/lib/relatoriosPdf.ts`, na função `gerarExtratoProdutorPdf` (seção **COLHEITAS**, linhas ~199-252):
- As colunas 0 (Local), 2 (Lavoura) e 3 (Variedade) usam `cellWidth: 26` com o comportamento padrão do autoTable (`overflow: "linebreak"`), então textos longos quebram em 2-3 linhas.
- A tabela **RESUMO POR VARIEDADE** (linhas ~405-455) tem o mesmo comportamento na coluna de variedade.

## Mudanças propostas (somente apresentação)

Arquivo único: `src/lib/relatoriosPdf.ts`

1. **Forçar linha única nas colunas de texto da tabela COLHEITAS**
   - Aplicar `overflow: "ellipsize"` e `cellWidth` fixo nas colunas Local, Lavoura e Variedade, de modo que texto excedente seja cortado com reticências em vez de quebrar linha.
   - Reservar um pouco mais de largura para Variedade (ex.: Local 24 / Lavoura 26 / Variedade 34 mm), aproveitando a folga do formato paisagem, já que as colunas numéricas restantes são estreitas.

2. **Truncamento inteligente antes da renderização**
   - Aplicar um helper de truncamento (já existe o padrão `trunc` usado no Extrato de Movimentação) nos valores de Lavoura e Variedade, evitando que a ellipsização do autoTable seja acionada em textos muito longos.

3. **Compactar a altura das linhas**
   - Reduzir levemente o `cellPadding` das linhas de corpo dessa tabela (de 1.5 para 1.2) mantendo `fontSize: 7`, o que reduz páginas sem prejudicar a leitura.

4. **Mesmo tratamento no RESUMO POR VARIEDADE**
   - Coluna de variedade com largura fixa maior e `overflow: "ellipsize"`, garantindo uma linha por variedade.

## Fora de escopo

- Nenhuma alteração em queries, cálculos, subtotais ou nos demais relatórios (Extrato de Movimentação, Extrato de Depósitos, etc.).
