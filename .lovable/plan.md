## Objetivo
Na tela de remessas de um contrato de venda, exibir as remessas da **data mais recente para a mais antiga** (ordem decrescente).

## Passos
1. Alterar no hook `src/hooks/useRemessasVenda.ts` a ordenação da query de remessas, trocando `.order("codigo", { ascending: true })` por `.order("data_remessa", { ascending: false })`.

## Fora do escopo
- Nenhuma outra alteração de UI ou lógica.
- Sem impacto em outros módulos (o hook só é usado na listagem de remessas por contrato).
