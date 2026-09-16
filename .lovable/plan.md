# Correção do produtor ANDREIA ROSSATO (IE genérica 111.111.111-1)

## Formato de extrato que eu preciso (resposta à sua pergunta)

Mande sempre o **extrato discriminado** (como o que você enviou agora). O resumo sozinho não serve para corrigir, porque ele não mostra qual lançamento está no cadastro errado. O ideal é o par que você mandou: detalhado + resumo para conferência final.

Do detalhado eu uso: data, operação (entrada/saída/devolução), safra, variedade, quilos e o nome do comprador/vendedor.

## O que encontrei no caso da ANDREIA ROSSATO

O cadastro da ANDREIA ROSSATO está **sem nenhum lançamento** no sistema atual. Os três movimentos do extrato dela foram lançados na IE genérica 111.111.111-1, mas no cadastro de **cleomar teckio** — que hoje funciona como um "saco" que recebeu os movimentos de vários produtores com IE genérica.

Movimentos localizados (SOJA 2022/2023, SOJA INDUSTRIA - KGS), todos batendo com o extrato legado:

| Data | Operação | Quilos | Contraparte |
|---|---|---|---|
| 18/04/2023 | Transferência de entrada | 30.000 | helio rossato |
| 26/07/2023 | Devolução de depósito | 15.000 | — |
| 27/09/2023 | Devolução de depósito | 15.000 | — |

Nenhum dos três está ligado a NF-e no sistema (são registros importados do legado), então podem ser reapontados sem tocar em documento fiscal.

## Correção proposta

1. Reapontar a transferência de entrada de 30.000 kg do dia 18/04/2023 para o cadastro da ANDREIA ROSSATO.
2. Reapontar as duas devoluções de 15.000 kg (26/07/2023 e 27/09/2023) para o cadastro da ANDREIA ROSSATO.
3. Conferir o saldo dela depois: deve fechar em **zero** na SOJA 2022/2023, com 30.000 de entrada e 30.000 de devolução — igual ao resumo do legado.
4. Conferir também o saldo do cleomar teckio, que deve reduzir exatamente esses mesmos valores.

Nada será excluído; apenas a inscrição vinculada de cada lançamento muda.

## Detalhes técnicos

- Atualização de `transferencias_deposito.inscricao_destino_id` no registro `2f76c479` para a inscrição `961e2fe6` (ANDREIA ROSSATO).
- Atualização de `devolucoes_deposito.inscricao_produtor_id` nos registros `032294d7` e `5ed77e35` para a mesma inscrição.
- Conferência posterior pela mesma fórmula de saldo usada pelo sistema (colheitas + entradas − saídas − devoluções − vendas).

## Como seguimos nos próximos produtores

Você manda o par de extratos (detalhado + resumo), eu localizo os lançamentos no cadastro genérico, reaponto para o produtor correto e devolvo o saldo conferido antes de passar ao próximo.
