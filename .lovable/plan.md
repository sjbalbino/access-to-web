## Objetivo

Fazer com que a **Compra de Cereais** liste todos os produtores que tenham alguma movimentação na safra selecionada (colheita, transferência ou devolução), independentemente do saldo disponível — inclusive quando o saldo estiver zerado ou negativo.

## Contexto

O select de Vendedor em `src/components/compra/CompraDialog.tsx` usa o hook `useInscricoesComSaldo`. Hoje ele exclui buckets `(inscrição, local)` com `saldo <= 0` e também exclui inscrições cujo saldo agregado seja `<= 0`. Por isso GEDEON TRENHAGO, que está com saldo zero na safra TRIGO 2025 (Márcio Grings), não aparece.

## Mudanças

Arquivo único: `src/hooks/useSaldosDeposito.ts`, dentro de `useInscricoesComSaldo`.

Remover os dois filtros de saldo:

- Linha ~412: remover `if (b.saldo <= 0) return;`
- Linhas ~413-415: remover o filtro por `saldoTotalPorInscricao <= 0`.

Manter todos os demais filtros:

- `tipoProdutor !== 'produtor'` continua excluindo sócios/terceiros.
- `filters.granjaId` continua respeitado.
- Ordenação alfabética preservada.

## Efeito colateral

Este hook também é usado em outras telas (Notas de Depósito, Devolução, etc.). Para não afetar aquelas — onde saldo positivo é obrigatório — o hook ganha um parâmetro opcional `incluirSemSaldo?: boolean` (default `false`, comportamento atual). A `CompraDialog` passa `incluirSemSaldo: true`.

## Como o usuário verá

Depois do ajuste, ao selecionar Safra "TRIGO 2025", produto "TRIGO INDUSTRIA" e local "Márcio Grings" na Compra de Cereais, GEDEON TRENHAGO aparecerá no select de Vendedor com **Saldo: 0 kg** (ou o valor negativo, quando for o caso). As demais telas (Notas de Depósito, Devolução) permanecem inalteradas.
