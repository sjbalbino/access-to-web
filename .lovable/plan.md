# Local de entrega nas Notas de Depósito Emitidas

## Resultado da verificação (AGROPECUÁRIA GRINGS)

Nenhum campo de local de entrega está nulo, em branco ou zerado:

| Tabela | Registros | Sem local |
| --- | --- | --- |
| colheitas | 11.091 | 0 |
| compras_cereais | 1.733 | 0 |
| devolucoes_deposito | 3.835 | 0 |
| transferencias_deposito (saída e entrada) | 1.097 | 0 |
| remessas_venda (nome do local) | 3.540 | 0 |
| contratos_venda (nome do local) | 213 | 0 |

Não há nada a atualizar para "MARCIO GRINGS" nessas tabelas.

O único ponto real é a tabela **notas_deposito_emitidas**, que hoje **não possui** campo de local de entrega — por isso o saldo elegível para emissão é calculado por inscrição (agregado), sem separar por local, o que pode divergir dos relatórios por local.

## O que será feito

1. **Banco**: adicionar o campo de local de entrega em `notas_deposito_emitidas`, com índice e referência ao cadastro de locais.
2. **Preenchimento dos registros existentes** (regra em cascata):
   - se o produtor/safra/produto da nota tem colheitas em **um único** local, usa esse local;
   - caso contrário, usa o local sede da granja da nota (na AGROPECUÁRIA GRINGS: **Márcio Grings**; na UMBU: UMBU AGROPECUÁRIA).
3. **Gravação de novas notas**: o formulário de nota de depósito já pede o local antes da inscrição — passará a gravar esse local em cada item da nota.
4. **Cálculo de saldo**: no modo de emissão, as notas emitidas passam a ser abatidas **por local** (mantendo compatibilidade com registros sem local, que continuam abatendo no agregado até o preenchimento acima ser aplicado).
5. **Listagem/relatórios**: a consulta de notas emitidas passa a trazer o nome do local e aceitar filtro por local.

## Detalhes técnicos

- Migração: `ALTER TABLE public.notas_deposito_emitidas ADD COLUMN local_entrega_id uuid REFERENCES public.locais_entrega(id)` + índice; backfill via `UPDATE` conforme regra em cascata (executado como operação de dados, não na migração de schema).
- `src/hooks/useNotasDepositoEmitidas.ts`: novo campo na interface `NotaDepositoEmitida` / `NotaDepositoInput`, join `local_entrega:locais_entrega(id, nome)` e filtro `localEntregaId`.
- `src/components/deposito/NotaDepositoFormDialog.tsx`: incluir `local_entrega_id: localEntregaId` no payload de criação e restaurar o local ao editar.
- `src/hooks/useSaldosDeposito.ts`: no `emitidasPromise`, selecionar `local_entrega_id` e aplicar o filtro de local com condição "igual ao local OU nulo" (mesmo padrão já usado nos relatórios), removendo o comentário que afirma que a tabela não guarda local.
- Nenhuma alteração nas demais tabelas — os dados de local já estão íntegros.
