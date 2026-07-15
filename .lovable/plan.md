## Problema

O log mostra `[PdfViewer] Loaded PDF with 2 page(s)` — ou seja, `getDocument()` funciona. Mas depois disso nenhuma imagem aparece: nenhum log de render, nenhum erro. O `page.render()` do pdfjs-dist v6.1.200 está travando/silenciando dentro do laço, então `setImages` nunca é chamado e o spinner nunca sai.

Tentar consertar o pipeline de render do pdf.js v6 (canvas + toDataURL) é frágil — a API mudou várias vezes entre v4/v5/v6, e o dev-server do Vite adiciona problemas de worker/MIME.

## Solução proposta: trocar o preview para `<iframe>` + Blob URL

O navegador tem visualizador de PDF nativo. Não precisamos do pdf.js só para *mostrar* um PDF já pronto — ele é útil quando precisamos manipular texto/anotações, o que não é o caso aqui.

### Mudanças em `src/components/shared/PdfViewer.tsx`

1. Remover completamente a dependência de `pdfjs-dist` no componente (import, worker, loop de render, canvas, toDataURL).
2. No `useEffect`, quando receber `pdfData: Uint8Array`:
   - Criar `new Blob([pdfData], { type: "application/pdf" })`
   - Gerar `URL.createObjectURL(blob)` e guardar em state
   - No cleanup, chamar `URL.revokeObjectURL(url)` para não vazar memória
3. Renderizar `<iframe src={blobUrl} title="Prévia do PDF" className="h-full w-full border-0 bg-background" />`
4. Manter o spinner enquanto `blobUrl` não estiver pronto e o tratamento de `error`/`customErrorMessage`.
5. Chamar `onRenderComplete?.()` no `onLoad` do iframe.
6. Manter a assinatura `PdfViewerProps` (incluindo `forceVisibleTextLayer` como aceito-e-ignorado) para não quebrar quem chama.

### Ganhos

- Elimina a classe de bugs de worker do pdf.js no Vite dev-server.
- Elimina o loop de render que hoje trava silenciosamente.
- Usuário ganha zoom, busca de texto, impressão e scroll nativos do navegador.
- Texto continua selecionável (útil para copiar valores dos relatórios).

### Riscos / trade-offs

- Perde-se o controle fino sobre escala/rasterização (não precisamos hoje).
- Alguns navegadores muito antigos não têm viewer nativo — não é o caso do público-alvo (Chrome/Edge/Firefox modernos).
- Botões externos "Imprimir/Baixar/Excel" continuam funcionando porque operam sobre `pdfData`, não sobre o iframe.

### Validação após implementar

1. Reproduzir "Extrato do Produtor" via Playwright e verificar screenshot mostrando conteúdo do PDF (não spinner).
2. Testar Resumo, Colheitas e DANFE em seguida.
3. Se OK, remover os `console.log` de diagnóstico.

### Arquivo alterado

- `src/components/shared/PdfViewer.tsx` (reescrita focada; ~60 linhas)

Nenhuma outra tela precisa mudar — a API do componente é preservada.