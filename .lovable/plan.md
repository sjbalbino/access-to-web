
## Diagnóstico

Verifiquei o banco: **11.084 de 12.023 colheitas (92%) estão com `local_entrega_terceiro_id` NULL**. É exatamente por isso que o `useInscricoesComSaldo` está errando o agrupamento (colheitas sem local vs. transferências/devoluções com local) e ocultando o Saulo da lista de devolução.

O mapeamento de importação **já existe** em `src/lib/importacaoConfig.ts` (linha 667):

```ts
{ dbColumn: 'local_entrega_terceiro_id',
  sourceColumn: 'col_localentrega',
  lookupTable: 'locais_entrega',
  lookupColumn: 'codigo',
  lookupLabel: 'nome',
  optional: true }
```

Ou seja, na importação inicial o campo é lido — quando as colheitas ficaram NULL foi porque a coluna estava vazia na planilha original ou o código não batia com `locais_entrega.codigo` naquele momento (por exemplo, os locais só foram cadastrados depois).

O problema: o `updateMode` das colheitas (linha 669-673) hoje só atualiza `inscricao_produtor_id`. Uma reimportação **não** atualiza `local_entrega_terceiro_id`, então o usuário não tem como corrigir em massa.

## Plano de correção

**Arquivo único:** `src/lib/importacaoConfig.ts`, bloco `key: 'colheitas'`, propriedade `updateMode.updateColumns` (linha 672).

Adicionar `local_entrega_terceiro_id` à lista de colunas atualizáveis:

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

Como o `ImportacaoDialog` (linha 686-694) só inclui no payload de UPDATE campos com valor preenchido, a alteração é segura: linhas cuja `col_localentrega` estiver vazia ou não bater com nenhum código de `locais_entrega` **não** vão sobrescrever colheitas existentes — só as linhas com match válido serão atualizadas.

## Como o usuário vai usar

1. Abrir **Importar Dados → Colheitas** e ativar o modo "Atualizar".
2. Subir a mesma planilha original (com `col_codigo` + `col_localentrega` preenchidos).
3. O sistema busca cada colheita pelo `codigo`, resolve `col_localentrega` em `locais_entrega.codigo` e grava o `local_entrega_terceiro_id`.
4. Linhas cujo código do local não bater aparecem no relatório de erros para o usuário cadastrar o local ou corrigir a planilha, mas o restante é atualizado normalmente.

Após a reimportação, o hook `useInscricoesComSaldo` volta a fechar com o extrato (colheitas, transferências e devoluções passam a compartilhar o mesmo `local_entrega_id`), e o Saulo aparece na lista de "Nova Devolução de Depósito" com o saldo real.

## Fora de escopo

- Não altero o hook `useInscricoesComSaldo` neste plano — assim que os dados forem regularizados via reimportação, o cálculo original passa a bater com o extrato. Se você preferir, posso abrir um segundo plano para tornar o hook resiliente a `local_entrega_id` divergentes (agrupar por inscrição em vez de inscrição+local).
- Não altero a UI de importação nem a estrutura da planilha.
