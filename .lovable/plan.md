## Diagnóstico

No Extrato de Movimentação (`src/components/relatorios/RelatorioDialog.tsx`), a coluna Sacos é montada por linha com critérios diferentes:

- Depósitos/colheitas: usam `total_sacos` gravado no banco (linha ~1364), que vem com arredondamento próprio do romaneio.
- Transferências, devoluções e compras: usam `Math.round(kg / 60)` (linhas ~1389, 1407, 1424, 1438).
- Vendas: usam `sacos` da remessa, com fallback `Math.round(kg / 60)` (linha ~1457).

Os totais (Total da Inscrição / Local / Produtor) em `src/lib/relatoriosPdf.ts` somam esses valores já arredondados (`acc.sacos += r.sacos`, linhas ~1920-1924). Como cada linha é arredondada isoladamente, a soma das entradas e saídas não se cancela: no caso do DIRCEU VIDAL DE TOLEDO, os Kilos fecham em 0 mas os sacos deixam resíduo de 1.

## Correção proposta

1. Em `src/lib/relatoriosPdf.ts` (`gerarExtratoMovimentacaoPdf`): acumular também os kilos por inscrição/local/produtor e calcular o total de sacos como `Math.round(totalKg / 60)` em vez de somar os sacos já arredondados das linhas. Assim, kg zero sempre resulta em 0 sacos.
2. Aplicar o mesmo critério no bloco RESUMO GERAL (acumulador `sacos` por operação/produto): derivar sacos de `entradas - saidas` em kg.
3. Manter as linhas individuais exibindo o saco do documento (romaneio/remessa), que é o valor fiscal real de cada movimento.

## Detalhes técnicos

- Alterar apenas a camada de apresentação do PDF; nenhuma query ou regra de negócio muda.
- Peso da saca fixo em 60 kg, igual ao já usado no arquivo.
- Arredondamento com `Math.round` e exibição com `formatNumber(..., 0)`, conforme o padrão BR do projeto.
