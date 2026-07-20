## Problema

No diálogo de **Nova Devolução de Depósito**, o select "Produtor (Destinatário)" só lista inscrições que têm **colheitas** para a Safra + Produto — ignora transferências recebidas, enviadas e devoluções já feitas. Resultado: **ANTONIO FRANCISCO DA SILVA LIMA**, cujo saldo em SOJA 2025/2026 vem apenas de uma transferência recebida (300 kg), não aparece na lista.

Confirmado no banco: ele não tem `colheitas` na safra atual, mas tem `transferencias_deposito` como destino.

## Causa

O hook `useInscricoesComSaldo` (em `src/hooks/useSaldosDeposito.ts`) monta a lista lendo apenas a tabela `colheitas`. Já existe a fórmula completa de saldo em `useSaldoDisponivelProdutor` (`src/hooks/useSaldoDisponivelProdutor.ts`):

```
Saldo = Colheitas + Transf.Recebidas − Transf.Enviadas − Devoluções
```

(A Taxa de Armazenagem e Notas de Depósito emitidas não entram, conforme já documentado no hook.)

## Correção

Reescrever `useInscricoesComSaldo` para usar a **mesma fórmula do Saldo Disponível do Produtor**, aplicada em lote a todas as inscrições da Safra/Produto:

1. Buscar em paralelo, para a Safra + Produto (com equivalência via `resolveSaldoProdutoIds`) + Local (opcional):
   - `colheitas` — soma `producao_liquida_kg` por `inscricao_produtor_id`.
   - `transferencias_deposito` recebidas — soma `quantidade_kg` por `inscricao_destino_id`.
   - `transferencias_deposito` enviadas — soma `quantidade_kg` por `inscricao_origem_id`.
   - `devolucoes_deposito` com `status ≠ 'cancelada'` — soma `quantidade_kg` por `inscricao_produtor_id`.
2. Consolidar num único `Map` por `(inscricao_produtor_id, local_entrega)`, calculando `saldo_disponivel = colheitas + recebidas − enviadas − devoluções`.
3. Retornar apenas inscrições com `saldo_disponivel > 0` cujo produtor tenha `tipo_produtor = 'produtor'` (mantendo o filtro atual).
4. Manter filtros opcionais existentes: `granjaId`, `localEntregaId`.
5. Buscar metadados das inscrições que não vieram de `colheitas` (nome, IE, CPF, granja etc.) via um único `SELECT ... IN (ids)` em `inscricoes_produtor` — hoje esses metadados só aparecem quando há colheita.

## Detalhes técnicos

- Arquivo único a alterar: `src/hooks/useSaldosDeposito.ts`, função `useInscricoesComSaldo`.
- `TransferenciaDialog` já usa o mesmo hook para o campo Origem — a mudança beneficia também as transferências (origem passa a listar quem tem saldo via recebimento).
- Sem alteração de schema, sem migração.
- O select do dialog já filtra `saldo_disponivel > 0`, então nenhum ajuste em `DevolucaoDialog.tsx` é necessário.

## Validação

- Selecionar Safra **SOJA 2025/2026** + Produto **Soja** → **ANTONIO FRANCISCO DA SILVA LIMA** deve aparecer com 300 kg.
- Produtor que já devolveu tudo (saldo = 0) **não** deve aparecer.
- Edição de devolução existente continua exibindo o produtor original (fallback já presente no dialog).
- Tela de Transferência: Origem passa a listar produtores com saldo mesmo sem colheita própria.
