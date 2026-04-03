

## Plano: Expandir dialog de edição e adicionar totais na lista de remessas

### Problemas identificados

1. **Dialog de edição muito estreito** (800px): o grid de 7 colunas com valores (Kgs Remessa, Sacos Remessa, Kgs Nota, Sacos Nota, Preço Kg, Vlr Remessa, Vlr Nota) fica comprimido, cortando campos como "Vlr Nota".

2. **Lista de remessas sem linha de totais**: não há totalização de Kg Remessa, Kg Nota e Valor Nota no rodapé da tabela.

### Alterações

#### 1. `src/components/remessas/EditarRemessaDialog.tsx`
- Aumentar largura máxima do dialog de `sm:max-w-[800px]` para `sm:max-w-[1100px]`
- Isso permite que os 7 campos de valores sejam exibidos sem corte

#### 2. `src/pages/RemessasVendaForm.tsx`
- Adicionar `TableFooter` com linha de totais calculados (soma de `kg_remessa`, `kg_nota`, `valor_nota`) das remessas não canceladas
- Usar `formatNumber` e `formatCurrency` para exibir os totais na mesma formatação das células

### Arquivos alterados
- `src/components/remessas/EditarRemessaDialog.tsx` (1 linha — max-width)
- `src/pages/RemessasVendaForm.tsx` (adicionar footer com totais)

