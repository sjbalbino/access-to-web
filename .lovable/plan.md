## Objetivo
Substituir o `Select` simples de Produto no diálogo "Adicionar/Editar Item" da NF-e (`src/pages/NotaFiscalForm.tsx`, linhas 3205-3220) por um combobox com campo de pesquisa digitável, permitindo localizar produtos por **código** ou **nome** sem rolar a lista inteira.

## Implementação
1. Em `src/pages/NotaFiscalForm.tsx`, importar `Command`, `CommandInput`, `CommandList`, `CommandEmpty`, `CommandGroup`, `CommandItem` (já existem em `@/components/ui/command`) e `Popover`/`PopoverTrigger`/`PopoverContent`.
2. Substituir o bloco do `Select` de Produto por um `Popover` com:
   - Botão (trigger) mostrando "código - nome" do produto selecionado ou placeholder "Selecione um produto".
   - `CommandInput` com placeholder "Buscar por código ou nome..." (foco automático ao abrir).
   - `CommandList` renderizando `produtos.filter(p => p.ativo)`, com `value` combinando `codigo + nome` para a busca embutida do `cmdk` funcionar por ambos os campos.
   - `onSelect` chama `handleProductSelect(produto.id)` e fecha o popover.
   - Marca de seleção (`Check`) no item ativo.
3. Manter mesma largura do trigger (`w-full`) e popover com `PopoverContent` em `w-[--radix-popover-trigger-width] p-0` para alinhar.
4. Garantir que, ao editar um item existente, o produto atual apareça selecionado mesmo se filtrado por `ativo=false` (injetar manualmente, seguindo padrão da memória `padrao-select-edit-form-robustez`).

## Escopo
Apenas o seletor de Produto do item da NF-e. Sem mudanças em lógica de cálculo, tributos ou outros campos.