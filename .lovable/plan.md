# Plano para corrigir a importação de colheitas

Vou ajustar o fluxo para que `granja_id` seja usado apenas como dado auxiliar de resolução e nunca mais seja enviado no `POST` de `colheitas`.

## O que será corrigido

1. **Ajustar a configuração de colheitas**
   - Em `src/lib/importacaoConfig.ts`, trocar a referência de `colheitas` que hoje resolve para `granja_id` por um campo auxiliar interno.
   - Manter o código da granja apenas para localizar o `controle_lavoura_id`.

2. **Parar a injeção indevida de `granja_id` durante a preparação das linhas**
   - Em `src/components/importacao/ImportacaoDialog.tsx`, revisar a etapa que aplica a granja selecionada/global.
   - Para `colheitas`, usar somente um campo auxiliar e não preencher `row.granja_id`.

3. **Corrigir a resolução composta de colheitas**
   - Continuar usando `safra_codigo` + granja auxiliar para encontrar `controle_lavoura_id`.
   - Remover a lógica que volta a popular `row.granja_id` e `row.lavoura_id` na linha final de `colheitas`.

4. **Blindar a sanitização antes do insert**
   - Garantir que o payload final de `colheitas` contenha apenas colunas reais da tabela.
   - Excluir explicitamente campos auxiliares e quaisquer campos indevidos, inclusive `granja_id` e `lavoura_id`.

5. **Validar o resultado**
   - Conferir que o request `POST /colheitas` não envia mais `granja_id`.
   - Confirmar que a importação passa a falhar apenas se o `controle_lavoura_id` não puder ser resolvido.

## Detalhes técnicos

- **Causa atual identificada:** o `granja_id` ainda entra no payload por mais de um ponto no frontend:
  - a configuração de `colheitas` ainda o trata como referência resolvida;
  - a etapa genérica de aplicação de granja pode preencher `row.granja_id`;
  - a resolução composta de `colheitas` volta a escrever `row.granja_id` e `row.lavoura_id`.
- **Arquivos envolvidos:**
  - `src/lib/importacaoConfig.ts`
  - `src/components/importacao/ImportacaoDialog.tsx`
- **Objetivo final:** o insert de `colheitas` deve sair apenas com campos como `controle_lavoura_id`, `safra_id`, `silo_id`, `placa_id`, `variedade_id`, `inscricao_produtor_id` e demais colunas reais da tabela.