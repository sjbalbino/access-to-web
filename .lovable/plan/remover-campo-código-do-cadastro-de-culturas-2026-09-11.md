# Remover campo Código do cadastro de Culturas

## Objetivo
O campo **Código** de culturas só armazena o código vindo do sistema legado. Ele não é mais necessário na tela de cadastro, mas precisa continuar existindo no banco de dados para as importações de dados legados (tabela de umidades e importação geral) continuarem funcionando.

## O que muda para o usuário
- No formulário **Nova/Editar Cultura**, o campo "Código" some; o campo "Nome" passa a ocupar a linha inteira.
- Na lista de culturas, a coluna "Código" é removida.
- A busca passa a considerar apenas o nome da cultura.
- Nada muda nas importações: culturas que já têm código legado gravado continuam sendo reconhecidas normalmente.

## Detalhes técnicos
Arquivo alterado: `src/pages/Culturas.tsx` (somente frontend; sem migração no banco).

1. **Formulário**: remover o input `codigo` e reorganizar o grid — "Nome" fica em linha própria, seguido de Peso Saco Indústria / Peso Saco Semente, checkbox Informar PH.
2. **Estado do formulário**: remover `codigo` de `emptyCultura` e do `handleEdit`, preservando o valor existente na edição (não enviar `codigo` no update para não apagar o código legado já gravado).
3. **Lista**: remover a coluna "Código" do `TableHeader` e o `TableCell` correspondente.
4. **Busca**: filtrar somente por `nome`.
5. **Hook `useCulturas.ts`**: manter `codigo` na interface `Cultura` (usado pelas importações); em `CulturaInput`, o campo pode ser removido do formulário sem quebrar `ImportarUmidadesDialog.tsx`, que continua gravando `codigo` diretamente via insert próprio.

## O que NÃO muda
- Coluna `culturas.codigo` no banco (mantida para matching de importações legadas).
- `src/lib/importacaoConfig.ts` e `src/components/importacao/ImportarUmidadesDialog.tsx` (continuam usando o código para localizar/criar culturas na importação).

## Verificação
- Build sem erros.
- Abrir Culturas: lista sem coluna Código, formulário sem campo Código, salvar/editar/excluir funcionando.
