# Corrigir "Saldo Disponível" do vendedor na Compra de Cereais

## Diagnóstico (confirmado no banco)

Produtor **PEDRO PAULO RAMIRES MIDON** (IE 472.100.820-0), safra atual, local Márcio Grings:

| Movimento | Kg |
|---|---|
| Colheitas | 33.720 |
| Transferências recebidas | 24.000 |
| Devoluções de depósito | -45.720 |
| **Saldo físico (extrato)** | **12.000** |
| Notas de depósito emitidas | 57.720 |

O select de Vendedor em `CompraDialog` usa `useInscricoesComSaldo` no modo padrão `'emissao'`, cuja fórmula é
`Colheitas + Transf. Recebidas − Notas de Depósito Emitidas` = 33.720 + 24.000 − 57.720 = **0**.

Ou seja: o valor mostrado é o "saldo a contra-notar" (quanto ainda falta emitir nota de depósito), não o saldo físico disponível para compra. Como as notas de depósito do produtor já foram totalmente emitidas, aparece 0 — mesmo havendo 12.000 kg em estoque.

Também verificado: as compras de cereais desse produtor não possuem `devolucao_id` e suas quantidades coincidem exatamente com as devoluções (27.720 + 18.000 = 45.720), isto é, cada compra corresponde a uma devolução já registrada. Portanto descontar compras *e* devoluções duplicaria a saída.

## Correção proposta

1. Em `src/components/compra/CompraDialog.tsx`, chamar `useInscricoesComSaldo` com `modo: 'devolucao'` (saldo físico: Colheitas + Transf. Recebidas − Transf. Enviadas − Devoluções), mantendo `incluirSemSaldo: true` para continuar listando todos os produtores da granja.
2. Em `src/hooks/useSaldosDeposito.ts`, renomear conceitualmente o modo para deixar a intenção clara: aceitar `modo: 'emissao' | 'fisico'` com `'devolucao'` mantido como alias de `'fisico'` (compatibilidade com `DevolucaoDialog` e demais chamadas), e atualizar o comentário da fórmula para citar Compra de Cereais.
3. No rótulo do select de Vendedor, exibir "(12.000 kg disponíveis)" em vez de apenas "kg", para diferenciar do saldo a emitir.

Nenhuma alteração de dados no banco é necessária — os registros do produtor estão corretos; apenas a fórmula exibida na tela de compras está inadequada.

## Detalhes técnicos

- Arquivos alterados: `src/components/compra/CompraDialog.tsx`, `src/hooks/useSaldosDeposito.ts`.
- O modo físico não consulta `notas_deposito_emitidas`, portanto o saldo passa a acompanhar exatamente o Extrato do Produtor / Saldo Disponível dos relatórios.
- Sem impacto nas notas de depósito (`NotaDepositoFormDialog` continua no modo `'emissao'`).
