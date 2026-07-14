
## Correção da fórmula do Saldo Disponível do Produtor (Devolução)

Regra correta segundo o usuário:

- **Kg de Taxa de Armazenagem** é um crédito exclusivo do sócio que recebe a taxa (ex.: Marcio Grings). Não deve ser debitado do produtor que está recebendo a devolução — hoje está sendo, causando dupla baixa.
- **Notas de Depósito emitidas** não devem entrar no cálculo do saldo disponível para devolução.

Nova fórmula do saldo disponível do produtor:

```
saldo = colheitas + transf.recebidas − transf.enviadas − devoluções (quantidade_kg)
```

## Alterações

### 1. `src/hooks/useSaldoDisponivelProdutor.ts`
- Remover da fórmula final as parcelas `kgTaxaArmazenagem` e `notasDeposito`.
- Manter os campos no retorno (`kgTaxaArmazenagem`, `notasDeposito`) apenas como informação/exibição, para não quebrar componentes que os consomem.
- Manter as queries de devoluções e notas de depósito (a coluna `kg_taxa_armazenagem` continua sendo lida só para exibição/consistência interna).

### 2. `src/components/devolucao/DevolucaoDialog.tsx` (linhas 258-269)
- Alterar a validação: comparar apenas `quantidadeKg` (e não `quantidadeKg + kgTaxaArmazenagem`) contra o `saldoDisponivel`, já que a taxa não sai do estoque do produtor.
- Ao editar, somar de volta apenas `quantidadeOriginal` (remover `kgTaxaOriginal` do ajuste).

### 3. `src/lib/relatoriosPdf.ts` (bloco "Extrato do Produtor", linhas 351-378)
- Remover `totalKgTaxa` da fórmula do saldo e a linha `(−) Kg Taxa Armazenagem` do bloco RESUMO.
- Manter a coluna "Kg Taxa Armazenagem" na tabela de devoluções (informativa), mas sem afetar o saldo.

### 4. Consistência com `useSaldoSocio` (sem alteração)
Já está correto: soma `kg_taxa_armazenagem` como crédito do sócio (`inscricao_emitente_id`). Nenhuma mudança necessária.

## Fora do escopo

- Nenhuma alteração de schema, RLS, ou funções do banco.
- Nenhuma correção de dados históricos do Saulo (os valores de `kg_taxa_armazenagem` permanecem como estão; a nova fórmula deixa de penalizá-lo).
- Não mexer em `useSaldoProdutor` (já não considera taxa nem notas de depósito).

## Validação

1. Recarregar a tela de Devolução para o Saulo: saldo disponível deve deixar de estar negativo e passar a refletir `colheitas + recebidas − enviadas − devoluções`.
2. Recalcular o Extrato do Produtor em PDF: o resumo deve mostrar o mesmo saldo que a tela de Devolução, sem a linha de Kg Taxa Armazenagem.
3. Conferir o saldo do sócio Marcio Grings: continua igual (recebendo o crédito de taxa).
4. Criar uma nova devolução dentro do saldo permitido para confirmar que a validação `quantidadeKg <= saldo` funciona; digitar taxa de armazenagem não deve mais reduzir o limite disponível.
