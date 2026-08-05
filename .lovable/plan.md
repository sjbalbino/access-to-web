# Transferências e Notas de Depósito: listar todos os produtores

## Transferências: liberar produtores sem saldo

O que existe hoje (verificado): o combobox de Inscrição (origem e destino) já lista **todas** as inscrições (`useAllInscricoes`, sem filtro de saldo). O que impede a operação é a validação no salvamento: quando a quantidade é maior que o saldo, aparece "Saldo insuficiente" e a transferência é **abortada**.

Mudanças:

1. Remover o bloqueio de salvamento por saldo. No lugar dele, exibir um **diálogo de confirmação** ("Quantidade acima do saldo disponível — Transferir mesmo assim?"), no mesmo padrão já usado nas Notas de Depósito. Confirmando, a transferência é gravada normalmente.
2. Mostrar sempre o saldo da origem no formulário, inclusive quando for **zero ou negativo**, com destaque em cor de alerta e o valor real (ex.: "Saldo disponível: -1.200 kg"), em vez de esconder a informação.
3. Marcar no combobox de origem, ao lado do nome, o saldo daquele produtor quando safra e produto já estiverem escolhidos, para o operador decidir com informação à vista.

## Notas de Depósito: ARLINDO / lista de produtores

O que foi verificado no banco:

- Não existe produtor "ARLINDO FUCINA FACCO". Na Agropecuária Grings existe **arlindo fucina antonello** — IE 472.100.513-9, ativo. (Também existem ARLINDO JOSE LUDWIG e EDUARDO ROSSATO FACCO, outros cadastros.)
- O select de Inscrição da Nota de Depósito só oferece inscrições com **saldo a emitir maior que zero**, filtradas pelo Local de Entrega escolhido. Movimentações desse produtor:
  - SOJA 2025/2026 (local Márcio Grings): 176.431 colhidos + 24.000 recebidos − 193.924 já emitidos = **6.507 kg** → aparece.
  - TRIGO 2023: 19.165 colhidos − 19.165 emitidos = **0 kg** → fica oculto pela regra atual.
  - Safras antigas (SOJA 2021/2022, 2022/2023, TRIGO 2020/2021/2022) estão no local **GRANDESPE**, não em Márcio Grings → ficam ocultas quando o local escolhido é Márcio Grings.

Ou seja, o desaparecimento vem da combinação "saldo zerado/negativo" + "local diferente do escolhido", não de cadastro inativo.

Mudanças:

1. Passar a listar **todos os produtores ativos da granja do local escolhido**, mesmo com saldo zero ou negativo (a emissão acima do saldo já é permitida hoje, apenas com confirmação).
2. Exibir o saldo ao lado de cada inscrição na lista (ex.: "ARLINDO FUCINA ANTONELLO — IE 472.100.513-9 · saldo 0 kg"), com destaque visual para saldo zerado/negativo, para o operador não emitir por engano.
3. Manter o filtro por Local de Entrega para o cálculo do saldo mostrado, mas sem usá-lo para esconder o produtor.

## Detalhes técnicos

- `src/components/transferencias/TransferenciaDialog.tsx`: substituir o `toast` bloqueante de "Saldo insuficiente" por um `AlertDialog` de confirmação (estado `confirmSaldoOpen` + payload pendente), mantendo as demais validações (origem ≠ destino, campos obrigatórios). Exibir o saldo sempre que `safraId`, `produtoId` e `inscricaoOrigemId` estiverem preenchidos, sem a condição `saldoOrigem &&` que oculta o texto em saldo zero.
- `src/components/deposito/NotaDepositoFormDialog.tsx`: chamar `useInscricoesComSaldo({ safraId, localEntregaId, granjaId, incluirSemSaldo: true })` — o hook já cria buckets com saldo 0 para inscrições da granja sem movimentação quando `incluirSemSaldo` está ligado; e usar o campo de saldo retornado para compor o rótulo do `SelectItem`.
- `src/hooks/useSaldosDeposito.ts`: quando `incluirSemSaldo` estiver ligado junto com `localEntregaId`, garantir uma única linha por inscrição no local selecionado (evitar duplicar a mesma inscrição em "sem_local" e no local filtrado) e ordenar por nome do produtor.
- Sem mudanças de banco de dados; os cálculos de saldo e as regras fiscais permanecem iguais.
- Verificação: em Notas de Depósito, escolher Local "Márcio Grings" + safra TRIGO 2023 e confirmar que ARLINDO FUCINA ANTONELLO aparece com saldo 0; em Transferências, lançar quantidade acima do saldo e confirmar que grava após a confirmação.
