## Objetivo
Impedir que operadores excluam remessas após o carregamento sem emissão de NFe. Remover o botão **Excluir** da lista de remessas, mantendo apenas o botão **Cancelar** (que preserva o registro no histórico).

## Alterações no arquivo `src/pages/RemessasVendaForm.tsx`

1. **Remover import do ícone `Trash2`** e do hook `useDeleteRemessaVenda`
2. **Remover estado `remessaExcluir`** e a função `handleExcluir`
3. **Remover o botão Excluir** da coluna de Ações da tabela de remessas
4. **Remover o `<AlertDialog>` de confirmação de exclusão** do final do componente

O botão **Cancelar** (ícone `Ban`) e seu respectivo dialog permanecem inalterados, assim como toda a lógica de cancelamento.