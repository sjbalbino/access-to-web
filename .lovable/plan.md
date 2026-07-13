## Diagnóstico

- Total de inscrições no banco: **1.217**
- AGROPECUARIA GRINGS: **1.176** → 586 com `codigo` (originais do Access) + **590 sem `codigo`** (duplicatas)
- O sistema de fato duplicou durante uma importação anterior, quando o índice único `(granja_id, codigo)` ainda não protegia os registros sem código.
- As 586 originais estão íntegras e únicas. As 590 sem código são cópias redundantes de IEs que já existem com código.

## Objetivo

Remover as duplicatas com segurança, deixando a GRINGS com as 586 originais, sem afetar movimentações (FKs) que porventura estejam apontando para linhas duplicadas.

## Passos

1. **Baixar o CSV atual** (`inscricoes_sem_codigo.csv`) — já está disponível no chat como artifact. Vou reemitir o card de download nesta rodada para garantir o acesso.

2. **Auditoria de vínculos** (somente leitura): para cada uma das 590 inscrições sem código da GRINGS, verificar se há registros dependentes apontando para o `id` delas em:
   - `notas_fiscais`, `notas_fiscais_itens`
   - `remessas_venda`, `contratos_venda`
   - `contas_pagar`, `contas_receber`
   - `notas_deposito_emitidas`, `devolucoes_deposito`, `transferencias_deposito`
   - `emitentes_nfe` (via `emitente_id`)
   - Rateios e saldos
   
   Gerar um relatório CSV `duplicatas_inscricoes_grings.csv` com colunas: `id_duplicata`, `inscricao_estadual`, `cpf_cnpj`, `produtor`, `tem_movimentacao`, `qtd_vinculos_por_tabela`.

3. **Classificação automática** de cada duplicata:
   - **Segura para excluir**: sem nenhum vínculo em movimentação. Excluir direto.
   - **Precisa remapear**: tem vínculos. Antes de excluir, redirecionar os FKs para a inscrição "canônica" (a que tem `codigo` e mesmo `inscricao_estadual` + `cpf_cnpj` dentro da GRINGS).
   - **Ambígua**: não há canônica correspondente (IE genérica `111.111.111-1`, `000.000.000-0` etc.). Ficam para revisão manual — não são excluídas automaticamente.

4. **Apresentar o relatório** para você aprovar antes de qualquer exclusão. Nenhuma linha é apagada sem confirmação explícita.

5. **Após aprovação**, executar migration com:
   - `UPDATE` de FKs das linhas "precisa remapear" para o `id` canônico
   - `DELETE` das linhas "segura para excluir" e das já remapeadas
   - Deixar intocadas as "ambíguas" para você decidir caso a caso

6. **Auditoria pós-limpeza**: reexecutar a contagem por granja para confirmar que a GRINGS voltou a ter 586 inscrições, e regenerar o CSV de "sem código" (que deve ficar quase vazio ou só com as ambíguas).

## Detalhes técnicos

- Chave de deduplicação dentro da GRINGS: `(granja_id, inscricao_estadual, cpf_cnpj)`. Onde houver múltiplas linhas com essa mesma tripla, a que possui `codigo NOT NULL` é a canônica.
- Todas as leituras de auditoria usam `psql` (read-only). Todas as escritas passam por `supabase--migration` com sua aprovação.
- O índice único atual continua protegendo contra futuras duplicações de linhas com código; após a limpeza, faz sentido também adicionar índice único parcial em `(granja_id, inscricao_estadual, cpf_cnpj) WHERE codigo IS NULL` para bloquear reincidência, mas isso é opcional — decidimos depois.

## O que você precisa decidir agora

- **Aprovar este plano** para eu rodar a auditoria detalhada e gerar o relatório de duplicatas (passos 1–3), ainda sem apagar nada.
- Só depois de você revisar esse relatório é que executo qualquer exclusão.
