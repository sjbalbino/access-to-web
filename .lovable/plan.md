# Corrigir lookups da importação que falham acima de 1000 registros

## Causa
Em `src/lib/importacaoConfig.ts`, a função `resolveReferences` carrega cada tabela de referência com um único `select` sem paginação. O Supabase devolve no máximo 1000 linhas por requisição, então tabelas maiores ficam parcialmente em cache e os registros excedentes aparecem como "não encontrado" na pré-visualização.

Confirmado no banco:
- `clientes_fornecedores`: 1.329 registros (códigos 74 e 204 existem, mas ficam fora das 1000 primeiras)
- `produtos`: 705 (ok hoje, mas próximo do limite)
- `inscricoes_produtor`: 572

## Mudança

Arquivo: `src/lib/importacaoConfig.ts` — função `resolveReferences` (bloco de montagem do cache, linhas 861-899).

Substituir o `select` único por um loop de paginação usando `.range(from, to)` em páginas de 1000, até a página vir incompleta. Tudo o mais (montagem das chaves, composite, dígitos, etc.) permanece igual.

Pseudocódigo:

```text
const PAGE = 1000
let from = 0
loop:
  data = supabase.from(table).select(cols).range(from, from + PAGE - 1)
  acumula em allData
  se data.length < PAGE → para
  from += PAGE
```

Depois itera `allData` montando o cache exatamente como hoje.

## Fora de escopo
- Nenhuma mudança em UI, em `ImportacaoDialog.tsx`, ou em configs de tabelas.
- Nenhuma mudança no banco.

## Validação
Reabrir o diálogo "Importar Contratos de Venda" com a mesma planilha: os avisos de `clientes_fornecedores.codigo = "74"` e `produtos.codigo = "204"` devem desaparecer e os 129 registros devem ficar válidos (ou restar apenas avisos legítimos).
