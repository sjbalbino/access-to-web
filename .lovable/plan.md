## Objetivo

Adicionar botões de navegação para a **primeira** e **última** página em todas as listagens paginadas do sistema.

## Mudanças

### 1. `src/components/ui/table-pagination.tsx` (componente padrão)
- Adicionar botão **«** (ChevronsLeft) antes do "Anterior" → vai para página 1
- Adicionar botão **»** (ChevronsRight) depois do "Próximo" → vai para `totalPaginas`
- Desabilitar quando já estiver na primeira/última página
- Em telas pequenas, exibir apenas os ícones (sem texto) para economizar espaço

### 2. `src/pages/ClientesFornecedores.tsx` (paginação inline customizada)
- A tela tem paginação própria (linhas 517-527), fora do componente `TablePagination`
- Adicionar dois botões equivalentes: "Primeira" e "Última"
- Manter o mesmo visual já usado (Button outline, size sm)

### Resultado visual

```text
[«] [Anterior] [1] [2] ... [10] [Próximo] [»]
```

Todas as demais telas que já usam `TablePagination` (Placas, Produtos, etc.) recebem o novo comportamento automaticamente, sem alterações individuais.
