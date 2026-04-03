

## Plano: Incluir colunas compostas no modelo de importação

### Problema
A função `handleDownloadTemplate` em `ImportarDados.tsx` gera os cabeçalhos do modelo Excel usando apenas `sourceColumn` das referências, ignorando `compositeSourceColumn`. Por isso, as colunas `inscricao_origem_nome` e `inscricao_destino_nome` não aparecem no modelo baixado.

### Correção

**Arquivo:** `src/pages/ImportarDados.tsx`

Alterar a linha que monta `refHeaders` para incluir também os `compositeSourceColumn` quando existirem:

```typescript
const refHeaders = (config.references || []).flatMap(r => 
  r.compositeSourceColumn 
    ? [r.sourceColumn, r.compositeSourceColumn] 
    : [r.sourceColumn]
);
```

### Resultado
O modelo Excel de Transferências passará a incluir as colunas `inscricao_origem_nome` e `inscricao_destino_nome`, permitindo ao usuário preencher o nome do produtor para desambiguar inscrições com a mesma IE.

