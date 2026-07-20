## Objetivo
No select de **Vendedor** da tela de Compra de Cereais, listar **todos os produtores ativos da granja selecionada**, mesmo que não tenham nenhuma movimentação (colheita, transferência ou devolução) na safra selecionada. O saldo exibido continua sendo o saldo real na safra (podendo ser 0 kg).

## Comportamento atual
`useInscricoesComSaldo` só retorna inscrições que aparecem nos "buckets" de movimentação (colheitas + transferências + devoluções da safra). Produtores sem movimento naquela safra são omitidos.

## Mudanças

### 1. `src/hooks/useSaldosDeposito.ts`
Após montar os buckets, buscar **todas as inscrições de produtor** da granja (quando `granjaId` informado) ou do tenant, filtrando por `tipo_produtor = 'produtor'` e produtor ativo. Para cada inscrição que ainda não tem bucket, criar uma entrada com `total_depositado = 0` e `saldo = 0` — respeitando o local selecionado quando `localEntregaId` estiver preenchido (senão `local_entrega_id = null`).

A regra de descarte por saldo continua condicionada ao flag `incluirSemSaldo` já existente — quando `true` (caso da CompraDialog), essas inscrições sem movimento passam.

### 2. `src/components/compra/CompraDialog.tsx`
Nenhuma mudança na chamada (já passa `incluirSemSaldo: true`). O select passará a listar automaticamente todos os produtores da granja.

## Fora do escopo
- Outras telas que usam `useInscricoesComSaldo` (Notas de Depósito, Devoluções, etc.) — como não passam `incluirSemSaldo: true`, continuam mostrando somente quem tem saldo > 0. Sem regressão.
