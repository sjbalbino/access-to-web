## Confirmação do comportamento atual

Sim, confirmado. Na configuração de importação de **Colheitas** (`src/lib/importacaoConfig.ts`, linhas 669-676) existe um `updateMode` fixo:

```ts
updateMode: {
  lookupColumn: 'codigo',
  sourceColumn: 'codigo',
  updateColumns: [
    { sourceColumn: 'inscricao_produtor_id', dbColumn: 'inscricao_produtor_id' },
    { sourceColumn: 'local_entrega_terceiro_id', dbColumn: 'local_entrega_terceiro_id' },
  ],
},
```

Como `updateMode` está presente, o `ImportacaoDialog` **desliga o insert e o upsert** (`upsertSupported = !!syncConflictLabel && !config.updateMode`) e roda somente UPDATE por `codigo`, atualizando apenas `inscricao_produtor_id` e `local_entrega_terceiro_id`. Ou seja: a "reimportação" atual **não insere colheitas novas nem atualiza pesos/umidade/etc.** — por design, só corrige vínculos de inscrição e local de entrega em colheitas já existentes.

Por isso a queixa anterior ("parou a importação com reload") vinha combinada com esse comportamento — mesmo se tivesse concluído, nenhum registro novo teria sido inserido.

## Plano ajustado

Manter todas as correções de robustez do plano anterior **e** dar ao usuário controle sobre o modo:

### 1. `src/components/importacao/ImportacaoDialog.tsx`
- **Toggle "Modo de importação"** para tabelas que tenham `updateMode`:
  - `Atualizar existentes` (atual, default) — roda o `updateMode`.
  - `Inserir novos + atualizar existentes (upsert)` — roda upsert por `codigo`.
  - `Somente inserir novos` — insert com fallback de erro de duplicidade ignorado.
- Ajustar `upsertSupported` para permitir upsert quando existe `updateMode` **e** o usuário optar por ele.
- Paginar o lookup de `controle_lavouras` em páginas de 1000 (`.range()`) — mesmo pré-requisito do plano anterior.
- Remover o fallback linha-a-linha; registrar erro do batch inteiro.
- `select('id, <lookupColumn>')` paginado no pós-insert.
- `window.onbeforeunload` durante a execução para evitar reload acidental.

### 2. `src/lib/importacaoConfig.ts`
- Adicionar em `colheitas` uma chave `upsertConflict: 'codigo'` para habilitar o novo modo upsert quando o usuário selecionar.
- Nenhuma alteração nas colunas mapeadas.

### Fora do escopo
- Backend, RLS, schema de `colheitas`, hooks de negócio (`useColheitas`, telas de detalhe).

## Validação
1. Selecionar Colheitas → o novo seletor de modo deve aparecer, default "Atualizar existentes" (comportamento atual preservado).
2. Trocar para "Inserir novos + atualizar existentes" e reimportar a planilha → colheitas novas entram, existentes têm todos os campos atualizados.
3. Tenant com >1000 controles de lavoura → todas as colheitas conseguem casar o `controle_lavoura_id`.
4. Batch com erro → demais batches continuam; resumo final lista falhas.
5. Recarregar durante execução → navegador alerta.