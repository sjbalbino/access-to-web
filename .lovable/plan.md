## Objetivo

Aplicar a abordagem escolhida ("PDF renderizado como imagem via pdf.js → canvas → PNG") a **todos** os relatórios do sistema, substituindo o `PdfViewer` atual (canvas + text layer) por uma renderização mais simples e confiável.

## Escopo (o que muda)

Todos os relatórios já passam pelo mesmo componente:

- `PreviewRelatorioDialog` → usado por todos os relatórios de gestão, IR, estoque, romaneios, contratos, recibos.
- `DanfePdfViewer` → visualização de DANFE em `NotasFiscais` e `MdeDialog`.

Ambos são wrappers finos de `src/components/shared/PdfViewer.tsx`. **Alterando esse único arquivo, a mudança propaga para todo o sistema.**

## Alterações

### 1. `src/components/shared/PdfViewer.tsx` (reescrever)

Substituir a lógica atual (canvas + text layer + ResizeObserver + fallback de fontes) por:

1. Carregar pdf.js via `loadPdfJs()` (mantém worker atual).
2. `getDocument({ data }).promise` → iterar de `1` a `numPages`.
3. Para cada página:
   - `getViewport({ scale: 2 })` (renderização nítida).
   - Renderizar em `<canvas>` off-DOM.
   - `canvas.toDataURL("image/png")` → armazenar em `useState<string[]>`.
4. `pdf.cleanup(true)` no `finally`.
5. Render:
   ```tsx
   <div className="h-full w-full overflow-auto bg-muted/40 p-4 space-y-4">
     {images.map((src, i) => (
       <img key={i} src={src} alt={`Página ${i + 1}`}
            className="mx-auto max-w-full block shadow-md border border-border bg-background rounded-sm" />
     ))}
   </div>
   ```
6. Estados: `loading` (Spinner centralizado), `error` (AlertCircle + mensagem, mantendo prop `errorMessage`).
7. Flag `cancelled` para evitar setState após unmount / troca de PDF.
8. Manter a assinatura `PdfViewerProps` (`pdfData`, `errorMessage`, `onRenderComplete`) — as props `forceVisibleTextLayer` e a ref de largura deixam de ser necessárias, mas a prop é aceita e ignorada para não quebrar chamadores.

### 2. Nenhuma outra alteração necessária

- `PreviewRelatorioDialog.tsx` continua igual (já usa `PdfViewer`).
- `DanfePdfViewer.tsx` continua igual.
- `NotasFiscais.tsx`, `MdeDialog.tsx`, geradores em `src/lib/*Pdf.ts`, `relatoriosGestao.ts`, `relatoriosIR.ts`, `relatoriosEstoque.ts`, `romaneioVendaPdf.ts`, `contratoVendaPdf.ts`, `reciboPdf.ts`: **nenhuma mudança**.
- `TicketDepositoPreview` (bobina 80mm) **não muda** — continua com `<pre>` que funcionou.

## Detalhes técnicos

- **Escala 2×**: bom equilíbrio entre nitidez e memória. Para PDFs grandes (relatórios financeiros com muitas páginas), a renderização é sequencial página a página; imagens ficam em memória enquanto o dialog está aberto.
- **Sem text layer**: perde-se seleção/busca de texto dentro do preview, mas o botão "Baixar PDF" segue disponível para quem precisar do PDF real.
- **Sem ResizeObserver**: as imagens usam `max-w-full` e escalam via CSS, evitando o loop de `viewportWidth` que atrasava a primeira renderização.
- **Impressão / download**: seguem inalterados em `PreviewRelatorioDialog` — usam o `jsPDF` original (`doc.save`, `doc.output("blob")`), portanto sem perda de qualidade.

## Validação

1. Abrir um relatório de Gestão (DRE) → confirmar renderização como imagem.
2. Abrir um relatório de Estoque multi-página → confirmar todas as páginas.
3. Abrir DANFE em Notas Fiscais → confirmar renderização.
4. Testar botões Imprimir / Baixar PDF / Excel.
5. Confirmar que o ticket de depósito (bobina) continua funcionando.

## Arquivos modificados

- `src/components/shared/PdfViewer.tsx` (1 arquivo)