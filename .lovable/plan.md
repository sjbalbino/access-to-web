# Diagnóstico

Consultei o banco para **CLAUDIA ANDREIA FRANCA SANTOS** (inscrição `77f410f2…`, granja Agropecuária Grings) na safra **SOJA 2025/2026** (`0db3a3c8…`):

| Movimentação | Qtd (kg) | Local |
|---|---|---|
| Colheita | 0 | — |
| Transferência recebida | 9.600 | Márcio Grings |
| Devolução (pendente) | 9.600 | Márcio Grings |
| Transferência enviada | 0 | — |
| Notas de depósito emitidas | 0 | — |

**Saldo correto para emissão de nota de depósito** (Colheitas + Transferências Recebidas − Notas Emitidas) = **0 + 9.600 − 0 = 9.600 kg** → deveria aparecer.

# Causa

O hook `useInscricoesComSaldo` em `src/hooks/useSaldosDeposito.ts` (usado pelo seletor de produtor no dialog de Nota de Depósito) está subtraindo **devoluções** e **transferências enviadas** do saldo — o que corresponde ao "Saldo Disponível" do produtor, **não** ao saldo elegível para contra-nota de depósito. Como resultado, o saldo cai para 0 e o filtro `if (b.saldo <= 0) return` descarta a Claudia.

Regra correta (já discutida): **Saldo para emitir nota de depósito = Colheitas + Transferências Recebidas − Notas de Depósito Emitidas** (não canceladas). Devoluções e transferências enviadas ficam de fora desse cálculo.

# Correção

Alteração pontual em `src/hooks/useSaldosDeposito.ts`, apenas dentro de `useInscricoesComSaldo`:

1. **Remover** o processamento de `enviadasPromise` e `devolucoesPromise` da montagem dos buckets (as duas fontes deixam de compor o saldo elegível para emissão).
2. **Subtrair notas de depósito emitidas por local** dos buckets. Hoje elas só são consideradas no saldo agregado por inscrição (`saldoTotalPorInscricao`), mas não descontadas do bucket por local. Como a tabela `notas_deposito_emitidas` não guarda `local_entrega_id`, o desconto será feito assim:
   - Se existir apenas um bucket para a inscrição, todo o total emitido é subtraído dele.
   - Se existirem múltiplos locais para a mesma inscrição, distribui o total emitido proporcionalmente entre os buckets da inscrição (mesma abordagem já usada em `saldoTotalPorInscricao`).
3. Manter o filtro `saldo > 0` (ou `incluirSemSaldo`) e a checagem agregada por inscrição.

O `useSaldosDeposito` (saldo por produto após selecionar a inscrição) já segue esta fórmula correta — nenhuma mudança nele.

Não altero relatórios, transferências, devoluções, nem o hook `useSaldoDisponivelProdutor` — o "Saldo Disponível" continua descontando devoluções em todos os outros contextos.

# Validação

1. Reabrir **Nova Nota de Depósito** → Safra `SOJA 2025/2026`, Local `Márcio Grings` → Claudia deve aparecer com 9.600 kg.
2. Produtores com notas de depósito já emitidas continuam com saldo reduzido apenas pelo emitido.
3. Produtores com devoluções e/ou transferências enviadas voltam a mostrar o saldo bruto de depósito (colheita + transf. recebidas − emitidas), como acordado.

# Arquivo tocado

- `src/hooks/useSaldosDeposito.ts` — função `useInscricoesComSaldo` apenas.
