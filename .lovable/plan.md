## Correção da importação de Controle de Lavouras

**Causa:** Em `src/components/importacao/ImportacaoDialog.tsx` (linha 438), `controle_lavouras` está incluído em `REQUIRES_GRANJA`, mas a tabela **não possui coluna `granja_id`**. Toda linha é rejeitada com "granja_id ausente", resultando em "Nenhuma linha válida".

## Alteração

`src/components/importacao/ImportacaoDialog.tsx` linha 438:

```ts
const REQUIRES_GRANJA = new Set(['contratos_venda','colheitas']);
```

Remove apenas `'controle_lavouras'`. O isolamento por tenant continua garantido por `TENANT_SCOPED_TABLES`.

## Após a correção

Reimportar `controle_lavouras` selecionando a empresa contratante. Os códigos (`safra_codigo`, `lavoura_codigo`) continuam resolvendo IDs normalmente.