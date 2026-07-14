## Diagnóstico

O relatório **Resumo do Produtor** (`src/components/relatorios/RelatorioDialog.tsx`, função `gerarResumoProdutor`) agrupa as linhas pela chave `safra_id | inscricao_id | local`. Porém, apenas as **colheitas** consultam o `local_entrega_terceiro_id` real. Todos os demais movimentos (devoluções, transferências enviadas/recebidas, compras, remessas, entrada de armazenagem) usam a string `"Sede"` **hardcoded** (linhas 695, 700, 705, 710, 715, 721).

No caso do Saulo Wiberling Medeiros:
- 42 colheitas → todas em **Márcio Grings** (144.090 kg)
- 103 devoluções (133.101 kg) + 10 transferências recebidas (23.097 kg) → forçadas para **"Sede"**

Resultado: o PDF cria dois blocos ("Local Entrega: Márcio Grings" com só depósitos, e "Local Entrega: Sede" com só devoluções/transferências), quando na realidade tudo pertence ao Márcio Grings.

## Correção

Editar `src/components/relatorios/RelatorioDialog.tsx` para usar o local real de cada movimento:

1. **Devoluções (`qDev`)** — incluir `local_entrega_id` e `local:locais_entrega!devolucoes_deposito_local_entrega_id_fkey(nome)`. Usar `d.local?.nome || "Sede"`.
2. **Devoluções taxa (`qDevTx`)** — mesmo esquema (`local_entrega_id` → nome).
3. **Transferências enviadas (`qTrOr`)** — incluir `local_saida_id` e join `local:locais_entrega!transferencias_deposito_local_saida_id_fkey(nome)`. Usar `t.local?.nome || "Sede"`.
4. **Transferências recebidas (`qTrDe`)** — incluir `local_entrada_id` e join análogo.
5. **Compras (`qCompra`)** — verificar se `compras_cereais` tem coluna de local; se sim, aplicar o mesmo. Caso contrário, manter "Sede" (irrelevante para Saulo, sem compras).
6. **Remessas de venda** — normalmente não têm local de depósito (é local de entrega da venda); manter agrupamento no local do contrato/colheita. Como aproximação, usar o local majoritário das colheitas daquela (safra, inscricao) — se existir, senão "Sede".

Com isso, o (safra, inscricao) do Saulo terá **um único bloco** "Márcio Grings" com colheitas, devoluções e transferências somando corretamente, alinhando com o extrato individual.

## Fora do escopo

- Não altera fórmulas de saldo (já corrigidas na task anterior).
- Não altera schema, RLS, nem outros relatórios.
- Não mexe em `useSaldoSocio`/`useSaldoDisponivelProdutor`.

## Validação

Regerar o PDF Resumo do Produtor para Saulo: deve aparecer um único "Local Entrega: Márcio Grings" com colunas Depósitos, Devolução, Tra.Entrada preenchidas e Saldo batendo com o extrato.
