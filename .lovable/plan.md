Plano para resolver o preview em branco do PDF:

1. Ajustar o visualizador interno de PDF
   - Trocar a estratégia de renderização atual baseada em PDF.js/canvas por uma prévia via URL local segura quando o PDF já foi gerado pelo jsPDF.
   - Manter o fallback com PDF.js apenas se a prévia nativa falhar, para não quebrar tickets/DANFE que já usam o componente compartilhado.

2. Corrigir o fluxo do diálogo de relatórios
   - Em `PreviewRelatorioDialog`, gerar e armazenar um `Blob`/URL do PDF enquanto o diálogo estiver aberto.
   - Exibir o PDF por `<object>`/`iframe` dentro do diálogo com fallback visual claro, evitando popup e evitando o bloqueio do Chrome.
   - Revogar a URL ao fechar o diálogo para não vazar memória.

3. Manter ações existentes
   - Preservar `Imprimir`, `Excel` e `Baixar PDF`.
   - Se a visualização ainda não carregar, o usuário continuará conseguindo baixar o PDF normalmente.

4. Corrigir aviso de acessibilidade do diálogo
   - Adicionar descrição acessível (`DialogDescription`) ao conteúdo do preview para remover o warning do Radix.

5. Validar no navegador
   - Abrir `/relatorios/producao`, acionar o preview e verificar se a página mostra texto/tabela do PDF em vez de canvas branco.
   - Conferir console para garantir que não há erro novo de PDF/renderização.

Detalhe técnico: o print mostra que o PDF.js criou o canvas e desenhou ao menos linhas/bordas, mas não renderizou o conteúdo textual. Como o bloqueio original era de popup/abrir nova aba, não há necessidade de forçar todo relatório a passar pelo canvas do PDF.js; uma URL local de `Blob` dentro do próprio diálogo evita popup e usa o renderizador nativo do Chrome no contexto correto.