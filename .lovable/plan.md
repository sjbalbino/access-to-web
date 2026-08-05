# Notas Fiscais: corrigir agrupamento e expandir/recolher

## O que está acontecendo hoje (verificado no código)

A lista renderiza os grupos "em corrida": ela percorre as notas já ordenadas por data de emissão (decrescente) e cria um cabeçalho de emitente **cada vez que o emitente da linha muda em relação à anterior** (`src/pages/NotasFiscais.tsx`, montagem das linhas da tabela, e a mesma lógica em `src/components/notas-fiscais/NotasFiscaisMobileList.tsx`).

Consequências diretas:

- **Vários agrupamentos do mesmo emitente**: como as notas se alternam por data (JULIO CESAR, UMBU, JULIO CESAR, UMBU...), o mesmo emitente ganha um cabeçalho a cada bloco — exatamente o que aparece no print.
- **Expandir/recolher inconsistente**: o estado de recolhido é guardado por emitente (`collapsedGroups` por `emitente_id`), mas existem N cabeçalhos para o mesmo emitente. Recolher em um cabeçalho recolhe todos os blocos daquele emitente, e cada cabeçalho duplicado mostra/oculta o mesmo estado — dando a sensação de que não expande mais. Além disso o ícone está invertido (recolhido mostra seta para cima), reforçando a confusão.
- O total exibido no cabeçalho (`X nota(s) — Total`) já soma **todas** as notas do emitente na página, então aparece repetido em cada bloco duplicado.

## O que será feito

1. **Um único grupo por emitente**: agrupar as notas da página por `emitente_id` antes de renderizar (mantendo a ordem por data decrescente dentro de cada grupo) e ordenar os grupos pela nota mais recente de cada emitente. Cada emitente passa a ter exatamente um cabeçalho, com contagem e total corretos.
2. **Expandir/recolher confiável**: o toggle passa a operar sobre a lista de grupos realmente existente. "Expandir todos" limpa o estado; "Recolher todos" marca todas as chaves de grupo da página. Sem cabeçalhos duplicados, clicar no cabeçalho volta a expandir normalmente.
3. **Ícone correto**: recolhido → seta para a direita/baixo indicando "expandir"; expandido → seta para cima indicando "recolher", com `title`/`aria-label` coerentes.
4. **Cabeçalho clicável inteiro** (não só o ícone), com área de toque adequada — igual no desktop e no mobile.
5. **Mesma correção no mobile**: `NotasFiscaisMobileList` consome a mesma estrutura agrupada, evitando duplicar a regra.

Filtros, busca, paginação e ações das notas permanecem inalterados.

## Detalhes técnicos

- Criar em `src/pages/NotasFiscais.tsx` um `useMemo` que produz `grupos: { key: string; emitenteId: string | null; nome: string; ie: string; notas: NotaFiscal[]; total: number }[]` a partir de `dadosPaginados`, usando `Map` para preservar ordem de primeira aparição.
- `collapseAllGroups` passa a usar `grupos.map(g => g.key)`; `toggleGroup` continua por `key`.
- A tabela desktop renderiza `grupos.flatMap(...)` em vez do laço com `lastEmitenteId`; remove-se o `groupNotas(...)` que refiltrava o array a cada linha (O(n²)).
- `NotasFiscaisMobileList` recebe `grupos` (nova prop) em lugar de `notas`, eliminando o laço de corrida próprio.
- Tipagem explícita do grupo em um tipo exportado compartilhado entre a página e o componente mobile.
- Verificação: em 1215px e em 393px, recolher todos → expandir um grupo → expandir todos, confirmando um único cabeçalho por emitente e totais coerentes.
