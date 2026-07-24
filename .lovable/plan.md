## Diagnóstico correto

Reinvestigando o banco, JOAO ARI OLIVEIRA DE SOUZA **tem sim** 21.000 kg de transferências recebidas na SOJA 2025/2026 (12.000 em 31/03/2026 vindo de NELSON SEIBEL WERLE + 9.000 em 04/05/2026 vindo de ARISSON CAMPOS DE SOUZA), todas no local Márcio Grings. E ele também tem uma Nota de Depósito Emitida de 21.000 kg na mesma safra.

O `DevolucaoDialog.tsx` alimenta o combobox "Produtor (Destinatário)" com o hook `useInscricoesComSaldo` (`src/hooks/useSaldosDeposito.ts`). Esse hook calcula:

```
saldo = Colheitas + Transferências Recebidas − Notas de Depósito Emitidas
```

Para JOAO ARI: `0 + 21.000 − 21.000 = 0`. E o hook, na linha 423, faz `if (b.saldo <= 0) return;` — excluindo a inscrição. Mesmo cenário no saldo total agregado (`saldoTotalPorInscricao`, linha 426).

**Esse é o cálculo de "saldo para EMITIR nova nota de depósito", não o de "saldo para DEVOLVER".** Semanticamente, no diálogo de devolução, a nota de depósito emitida **não deve reduzir** o saldo disponível para devolução — ela apenas formaliza o depósito. A devolução é justamente a operação que baixa fisicamente esse saldo depositado. Isso bate com o Extrato do Produtor (imagem enviada), que mostra SALDO = 21.000 kg sem descontar a nota de depósito.

## Objetivo

Fazer o combobox de "Produtor (Destinatário)" da Devolução usar a fórmula correta de saldo disponível para devolução:

```
saldo_devolver = Colheitas + Transferências Recebidas − Transferências Enviadas − Devoluções já feitas
```

(A nota de depósito emitida NÃO entra na conta.)

## Escopo

Alteração cirúrgica em `src/hooks/useSaldosDeposito.ts`. Vou introduzir um flag no `useInscricoesComSaldo` para alternar entre as duas semânticas, sem quebrar os outros consumidores (NotaDepositoFormDialog, CompraDialog) que precisam continuar com a fórmula atual.

## Mudanças

**Arquivo:** `src/hooks/useSaldosDeposito.ts`

1. Adicionar novo parâmetro opcional `modo?: 'emissao' | 'devolucao'` (default `'emissao'`) em `useInscricoesComSaldo`.
2. Quando `modo === 'devolucao'`:
   - Buscar **transferências enviadas** (`inscricao_origem_id`) e **devoluções já feitas** por (inscrição, local) na safra/produto — de forma análoga às consultas atuais.
   - Buckets recebem: `+ colheitas + transf_recebidas − transf_enviadas − devolucoes_ja_feitas`.
   - **Não** subtrair `notas_deposito_emitidas` (o bloco `emitidoPorInscricao.forEach` é ignorado neste modo).
   - `saldoTotalPorInscricao` também não desconta emitidas.
3. Quando `modo === 'emissao'` (default): comportamento atual permanece intacto.
4. `queryKey` já inclui `filters` inteiro, então o modo participa naturalmente da chave de cache.

**Arquivo:** `src/components/devolucao/DevolucaoDialog.tsx`

- Uma única linha: passar `modo: 'devolucao'` na chamada de `useInscricoesComSaldo` (linhas 109-112).

## Não altera

- `NotaDepositoFormDialog.tsx`, `CompraDialog.tsx` e demais chamadores continuam sem o parâmetro, mantendo `modo = 'emissao'` (fórmula atual).
- `useSaldoDisponivelProdutor` (usado depois de selecionar o produtor para mostrar o saldo detalhado no rodapé) já está correto — não mexer.
- Nada de banco, migrations ou RLS.

## Validação

1. Reabrir "Nova Devolução de Depósito" com Safra SOJA 2025/2026 + Produto SOJA INDUSTRIA - KGS + Local Márcio Grings → JOAO ARI aparece na lista com saldo disponível = 21.000 kg.
2. Verificar que a lista de produtores no diálogo de **Emissão de Nota de Depósito** (NotaDepositoFormDialog) permanece igual ao que já era exibido (fórmula antiga inalterada).
3. Verificar que produtores que já tinham devolvido tudo (ex.: safras antigas 100% baixadas) não aparecem no combobox de devolução.
4. Lançar uma devolução parcial e conferir que o saldo restante do produtor é atualizado corretamente.