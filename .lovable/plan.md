# Diferença do extrato de LUIS FELIPE BEHNEN (legado x sistema atual)

## O que encontrei

A inscrição estadual **472.101.308-5** existe **duas vezes** no sistema atual, em dois produtores diferentes — e ambos com o mesmo CPF **028.014.670-14**:

- **LUIS FELIPE BEHNEN** — ficou com **todas as entregas**: 81.401 kg (exatamente o total do relatório legado) e a transferência de saída de 11.408 kg.
- **LAIR BEHNEN** (mesma IE 472.101.308-5) — ficou com **todas as devoluções** do legado (24.767 / 34.107 / 1.069 / 13.650 kg) e a transferência de entrada de 3.600 kg.

No sistema legado essa IE é um único cadastro, então entregas e devoluções se anulam e o saldo fica zero. No sistema atual, como a movimentação foi partida em dois cadastros, o LUIS FELIPE aparece com saldo positivo de **39.486 kg** (24.767 de Milho 2023/2024, 1.069 de Soja 2019/2020 e 13.650 de Soja 2021/2022) e o LAIR aparece com saldo negativo equivalente.

Dois pontos adicionais que aparecem no mesmo caso:

1. **Devolução em duplicidade no Milho 2025/2026.** O legado registra 34.107 kg (16.005 + 18.102, ambas com NF-e emitida, no cadastro LAIR). Além dessas, existe uma devolução manual de **30.507 kg lançada em 21/08/2026, ainda "pendente"**, no cadastro LUIS FELIPE. Ela repete a mesma devolução; se os cadastros forem unificados sem tratar isso, a safra fica negativa em 30.507 kg.
2. **Soja 2025/2026 com produtos diferentes.** A entrega de 11.408 kg está como "SOJA PATENTE DECLARADA-KGS" e a transferência de saída dos mesmos 11.408 kg como "SOJA INDUSTRIA - KGS". Só fecha em zero nos relatórios que tratam as sojas como equivalentes; nos relatórios por produto aparece +11.408 em um e −11.408 no outro.

## Correção proposta

1. **Unificar a inscrição 472.101.308-5 em um único cadastro.** Escolher qual produtor mantém a IE (recomendo **LAIR BEHNEN**, dono do CPF 028.014.670-14) e transferir para ele as entregas, devoluções e transferências hoje ligadas à inscrição duplicada. A inscrição duplicada é então desativada, sem apagar histórico.
2. **Excluir a devolução duplicada** de 30.507 kg de 21/08/2026 (status pendente, sem nota emitida), preservando as duas devoluções com NF-e do legado.
3. **Padronizar a variedade da Soja 2025/2026** para que entrega e transferência usem o mesmo produto, deixando o saldo correto também nos relatórios por produto.
4. **Conferir o restante da base:** listar todas as inscrições estaduais repetidas em produtores diferentes na Agropecuária Grings, para saber se o mesmo problema afeta outros produtores e apresentar essa lista antes de qualquer alteração.

Depois disso, gerar o extrato do LUIS FELIPE/LAIR no sistema e comparar linha a linha com o relatório legado para confirmar que o saldo fecha em zero.

## Decisão que preciso de você

Qual dos dois cadastros deve ficar com a inscrição 472.101.308-5: **LAIR BEHNEN** ou **LUIS FELIPE BEHNEN**? E confirma que a devolução pendente de 30.507 kg pode ser excluída como duplicidade?

## Detalhes técnicos

- Inscrições envolvidas: `3e7df5e4-…` (LAIR BEHNEN) e `4a62aef0-…` (LUIS FELIPE BEHNEN), ambas com `inscricao_estadual = '472.101.308-5'`.
- Reapontar `colheitas.inscricao_produtor_id`, `devolucoes_deposito.inscricao_produtor_id`, `transferencias_deposito.inscricao_origem_id/inscricao_destino_id` para a inscrição escolhida, via migração com IDs explícitos.
- Excluir `devolucoes_deposito.id = 'a87234de-136c-4a45-8875-62f529555050'` (30.507 kg, `status = 'pendente'`).
- Ajustar `colheitas.variedade_id` (ou a transferência) na Soja 2025/2026 para o mesmo produto.
- Diagnóstico de duplicidade geral: `select inscricao_estadual from inscricoes_produtor group by inscricao_estadual having count(distinct produtor_id) > 1` na granja `7c708923-…`.
- Nenhuma alteração de código de cálculo de saldo é necessária: as fórmulas em `useSaldoProdutor` / `useSaldoDisponivelProdutor` estão corretas; o problema é de dados.
