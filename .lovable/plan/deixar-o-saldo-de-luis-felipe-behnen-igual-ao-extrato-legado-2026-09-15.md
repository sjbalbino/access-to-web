# Deixar o saldo de LUIS FELIPE BEHNEN igual ao extrato legado

## Resposta à sua pergunta

Não preciso de mais nada: já identifiquei registro por registro o que precisa mudar. A causa é que a inscrição estadual **472.101.308-5** existe duas vezes — uma vinculada ao produtor LUIS FELIPE BEHNEN (ficou com todas as entregas, 81.401 kg, exatamente o total do legado) e outra vinculada ao produtor LAIR BEHNEN (ficou com as devoluções e a transferência de entrada). Basta trazer essas movimentações para o LUIS FELIPE.

## Movimentações a transferir do LAIR para o LUIS FELIPE

Devoluções (todas já com NF-e emitida, local Márcio Grings):

| Safra | Data | Quantidade |
|---|---|---|
| MILHO 2023/2024 | 12/03/2024 | 23.307 kg |
| MILHO 2023/2024 | 09/05/2024 | 1.460 kg |
| MILHO 2025/2026 | 20/02/2026 | 16.005 kg |
| MILHO 2025/2026 | 23/02/2026 | 18.102 kg |
| SOJA 2019/2020 | 22/08/2025 | 1.069 kg |
| SOJA 2021/2022 | 02/05/2022 | 12.900 kg |
| SOJA 2021/2022 | 01/12/2022 | 750 kg |

Transferência de entrada:

| Safra | Data | Quantidade | Origem |
|---|---|---|---|
| MILHO 2025/2026 | 23/02/2026 | 3.600 kg | CLAUDIO RAUCH |

Isso reproduz exatamente as colunas do legado: Depósitos 81.401, Devolução −73.593, Tra.Entrada 3.600, Tra.Saída −11.408, Saldo 0.

## Também é necessário

1. **Excluir a devolução em duplicidade** de 30.507 kg lançada em 21/08/2026 no LUIS FELIPE (Milho 2025/2026, status pendente, sem nota emitida). Ela repete as devoluções de 16.005 + 18.102 kg que vêm do legado; sem excluí-la a safra fica negativa em 30.507 kg.
2. **Padronizar a variedade da Soja 2025/2026**: a entrega de 11.408 kg está como "SOJA PATENTE DECLARADA-KGS" e a transferência de saída dos mesmos 11.408 kg como "SOJA INDUSTRIA - KGS". Vou alinhar as duas para o mesmo produto, para o saldo fechar em zero também nos relatórios por produto.
3. **Desativar a inscrição duplicada** vinculada ao LAIR BEHNEN, mantendo nela apenas as movimentações que não pertencem ao extrato do LUIS FELIPE (Soja 2015/2016 de 7.309 kg e Soja 2018/2019 de 26.213 kg, que já se anulam entre entrega e devolução). O LAIR continua com sua própria inscrição 472.101.304-2.
4. **Listar as demais inscrições estaduais repetidas** na Agropecuária Grings, para eu te mostrar se outros produtores têm o mesmo problema — sem alterar nada nesses casos sem sua confirmação.

Ao final, gero o extrato do LUIS FELIPE no sistema e comparo linha a linha com o PDF do legado.

## Detalhes técnicos

- Inscrições: `3e7df5e4-dd2e-42ff-9b37-428a50bd94a4` (produtor LAIR BEHNEN, IE duplicada) → `4a62aef0-cef9-4888-b64c-d7a045d0b3f7` (produtor LUIS FELIPE BEHNEN).
- `UPDATE devolucoes_deposito SET inscricao_produtor_id = '4a62aef0-…'` para os ids `2b377aba`, `d6aa234d`, `40c572a9`, `4c1e3af9`, `64da73ca`, `112e1c64`, `5805f647`.
- `UPDATE transferencias_deposito SET inscricao_destino_id = '4a62aef0-…'` para a transferência de 3.600 kg (origem `e76a1581-…`, 23/02/2026).
- `DELETE FROM devolucoes_deposito WHERE id = 'a87234de-136c-4a45-8875-62f529555050'` (30.507 kg, `status = 'pendente'`).
- Ajustar `variedade_id` da colheita `58156a08-…` (ou da remessa/transferência) para o mesmo produto da transferência de saída na Soja 2025/2026.
- `UPDATE inscricoes_produtor SET ativa = false` na inscrição duplicada, sem excluir histórico.
- Operações de dados via run_sql, com ids explícitos; nenhuma mudança nas fórmulas de saldo (`useSaldoProdutor`, `useSaldoDisponivelProdutor`) — o problema é de dados.
