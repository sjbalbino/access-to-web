## Diagnóstico
O erro atual não está na planilha em si: a importação de **colheitas** está montando o `POST /colheitas` com campos que a tabela não possui.

**Problema exato**
- O payload enviado hoje inclui `granja_id` e `lavoura_id`.
- Pela estrutura real da tabela `colheitas`, existem `controle_lavoura_id`, `safra_id`, `silo_id`, `placa_id`, `variedade_id`, `inscricao_produtor_id` e `local_entrega_terceiro_id`.
- **`granja_id` e `lavoura_id` não existem em `colheitas`**.
- Por isso o backend responde `PGRST204: Could not find the 'granja_id' column of 'colheitas' in the schema cache`.

## O que vou corrigir
1. **Ajustar a configuração de importação de colheitas**
   - Remover `granja_id` como coluna persistida da configuração final de `colheitas`.
   - Manter a granja apenas como dado auxiliar para resolver o `controle_lavoura_id`.

2. **Corrigir a sanitização antes do insert**
   - Parar de incluir `granja_id` e `lavoura_id` em `validDbColumns` para `colheitas`.
   - Garantir que o payload final envie apenas colunas realmente existentes na tabela.

3. **Preservar o vínculo correto da colheita**
   - Continuar usando `granja`/`safra` apenas para localizar o `controle_lavoura_id` quando necessário.
   - Se preciso, armazenar esse valor em campo auxiliar temporário (`_granja_id`) e removê-lo antes do insert.

4. **Ajustar a validação da importação**
   - Em vez de exigir `row.granja_id` para salvar em `colheitas`, validar que a linha conseguiu resolver o `controle_lavoura_id`.
   - Assim a importação continua segura sem tentar gravar coluna inexistente.

5. **Validar o resultado**
   - Reexecutar a importação e conferir que o request de `colheitas` não carrega mais `granja_id` nem `lavoura_id`.
   - Confirmar que a importação passa a inserir as linhas válidas.

## Detalhes técnicos
- Arquivos principais:
  - `src/lib/importacaoConfig.ts`
  - `src/components/importacao/ImportacaoDialog.tsx`
- Pontos já identificados:
  - `importacaoConfig.ts`: `colheitas` ainda resolve `granja_id` como referência persistida.
  - `ImportacaoDialog.tsx`: a montagem final do payload adiciona manualmente `granja_id` e `lavoura_id` para `colheitas`.
- Referência oficial do erro:
  - `PGRST204` acontece quando uma coluna enviada/solicitada não existe para aquela rota.

<presentation-actions>
  <presentation-open-history>View History</presentation-open-history>
</presentation-actions>

<presentation-actions>
<presentation-link url="https://docs.lovable.dev/tips-tricks/troubleshooting">Troubleshooting docs</presentation-link>
</presentation-actions>