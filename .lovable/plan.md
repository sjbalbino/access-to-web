# Plano: Bloquear digitação manual do campo UNIDADE em itens de NFe

## Objetivo
No formulário de itens da Nota Fiscal (aba "Itens" de `NotaFiscalForm.tsx`), o campo **Unidade** deve ficar bloqueado para digitação manual, aceitando apenas o valor vinculado ao **Produto** selecionado.

## Estado atual
- O campo `item_unidade` é um `Input` editável livre (`onChange` atualiza `itemFormData.unidade`).
- Ao selecionar um produto, a função `handleProductSelect` já preenche a unidade automaticamente com `unidade?.sigla || unidade?.codigo || "UN"`.
- Como o campo permite edição, o usuário pode sobrescrever a unidade do produto, causando inconsistência fiscal.

## Alterações propostas

### 1. Frontend — `src/pages/NotaFiscalForm.tsx`
- Substituir o `Input` de unidade por um campo somente leitura (`disabled` + `className="bg-muted"`).
- Remover o `onChange` do campo para impedir digitação manual.
- Manter o preenchimento automático via `handleProductSelect` quando o produto for alterado.
- Garantir que, ao abrir o diálogo de edição de um item existente, a unidade seja exibida corretamente (lida do item, não permitindo edição).
- Adicionar `aria-label`/`title` para acessibilidade indicando "Unidade vinculada ao produto".

### 2. Validação de impacto
- Verificar se há notas fiscais com itens cuja unidade difere da unidade do produto vinculado. Se existirem, alertar o usuário para revisão, mas não alterar dados históricos (fiscal immutability).
- Confirmar que o mapper para a FocusNFe (`src/lib/focusNfeMapper.ts`) continua usando `item.unidade` corretamente — sem mudança necessária, apenas garantir que o valor não será vazio.

### 3. Testes/verificação
- Abrir um rascunho de NFe e adicionar/editar um item: confirmar que o campo Unidade está cinza/desabilitado e recebe a sigla do produto automaticamente.
- Tentar digitar no campo: confirmar que não é possível.
- Salvar o item e verificar se a unidade foi gravada corretamente.

## Escopo
- Apenas o campo Unidade da aba Itens de `NotaFiscalForm.tsx`.
- Não alterar o comportamento de `EntradaNfeFormDialog.tsx` (já possui lógica própria de desabilitação quando finalizado).
- Não alterar regras de cálculo, tributação ou mapper de NFe.
