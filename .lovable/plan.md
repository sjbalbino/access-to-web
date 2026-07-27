## Objetivo

Na tela **Notas Fiscais**, a coluna "Valor Total" fica parcialmente coberta e a barra de ações (até 8 ícones) força rolagem horizontal, cortando itens da linha. A meta é deixar todos os itens visíveis dentro da largura útil da tela.

## Diagnóstico (verificado em `src/pages/NotasFiscais.tsx`, linhas 567–753)

- A tabela usa `min-w-[600px]` dentro de `overflow-x-auto`, e a coluna de Ações é `sticky right-0` — ela flutua sobre a coluna "Valor Total" quando há rolagem, exatamente o efeito do print.
- A célula de ações renderiza até 8 botões `size="icon"` (40px cada) em `flex gap-1`, o que soma ~330px só de ações.
- Colunas como "Natureza Op." e "Série" ocupam espaço mas têm baixo valor informativo na listagem.

## Mudanças propostas (apenas apresentação, em `src/pages/NotasFiscais.tsx`)

1. **Remover o comportamento sticky** da coluna Ações (header e célula), eliminando a sobreposição sobre "Valor Total".
2. **Compactar a barra de ações**: botões em tamanho reduzido (`h-7 w-7`, ícones `h-3.5 w-3.5`), `gap-0.5`, e `flex-nowrap` com alinhamento à direita — reduz a largura de ~330px para ~200px.
3. **Agrupar ações secundárias em um menu "mais"** (ícone de três pontos, `DropdownMenu`): mantêm-se visíveis diretamente Visualizar, Duplicar, DANFE e Download; entram no menu XML, E-mail, Carta de Correção (e seus downloads), Cancelar e Excluir. Assim a linha nunca ultrapassa a largura, independentemente do status da nota.
4. **Enxugar colunas**: "Série" passa a ser exibida junto ao Número (ex.: `104 / 930`) e a coluna "Natureza Op." fica apenas em telas `xl`. Larguras fixas para Número, Data e Status; Destinatário absorve o restante.
5. **Ajustar o container**: manter `overflow-x-auto` como salvaguarda em telas muito estreitas, mas com `min-w-[640px]` e `table-fixed` para que em desktop (≥1000px, como no print) tudo caiba sem barra de rolagem.

## Detalhes técnicos

- Nenhuma alteração em hooks, queries ou regras de negócio.
- Reutilizar o `DropdownMenu` do shadcn já disponível em `@/components/ui/dropdown-menu`.
- Tokens semânticos preservados; as cores por ação continuam nas classes existentes.
- Validação: abrir `/notas-fiscais` no preview em 1012px de largura e conferir que Valor Total, Status e todas as ações aparecem sem rolagem horizontal.
