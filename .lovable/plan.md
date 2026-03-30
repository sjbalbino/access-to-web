

## Plano: Adicionar campo `percentual_desconto` na importação de Colheitas

### Problema
A importação de colheitas não inclui o campo `percentual_desconto` — o percentual de desconto da umidade que foi aplicado. Esse valor precisa ser persistido pois varia entre safras.

### Alteração

#### `src/lib/importacaoConfig.ts`
Adicionar na lista de `columns` da config `colheitas`:
```
{ accessName: 'percentual_desconto', dbName: 'percentual_desconto', transform: toNumber }
```

Isso permitirá que a planilha Excel inclua a coluna `percentual_desconto` e o valor seja salvo no banco.

### Arquivo impactado
- `src/lib/importacaoConfig.ts` (1 linha adicionada)

