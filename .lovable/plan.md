## Objetivo
Exibir o nome do vendedor (produtor) na tabela de listagem de contratos de venda em **Vendas da Produção**.

## Alterações

### 1. `src/pages/VendasProducao.tsx`
- Adicionar coluna **"Vendedor"** no cabeçalho da tabela, posicionada logo após "Comprador".
- Exibir o nome do produtor via `contrato.inscricao_produtor?.produtor?.nome` (padrão: `-`).
- Aumentar `colSpan` da mensagem "Nenhum contrato encontrado" de `10` para `11`.

### Notas
- O hook `useContratosVenda` já busca o relacionamento `inscricao_produtor → produtor` (nome do produtor). Nenhuma alteração no backend ou hook é necessária.
- O ajuste é puramente de exibição na interface.
