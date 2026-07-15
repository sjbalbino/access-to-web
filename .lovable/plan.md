# Plano: Corrigir preview em branco do PdfViewer nos relatórios

## Diagnóstico

A abordagem "pdf.js → canvas → PNG" que apliquei no `PdfViewer.tsx` **não é a mesma do ticket**. O `TicketDepositoPreview` na verdade **não usa pdf.js** — ele exibe `previewText` como `<pre>` texto puro. Ou seja, "funciona no ticket" porque não depende de renderização de PDF nenhuma.

No `PdfViewer` atual (com pdfjs-dist 6.1.200), o preview aparece em branco. Causas prováveis, em ordem de suspeita:

1. **Worker do pdf.js não carrega** — `?url` em `.mjs` no Vite às vezes retorna um caminho quebrado no dev server; `getDocument().promise` fica pendente para sempre sem erro visível. O usuário só vê o dialog vazio (o spinner pode estar sob a `DialogContent` ou fora da área visível se `h-full` não propagou).
2. **API `page.render({canvas, canvasContext, viewport})`** — em pdfjs-dist v6 o parâmetro `canvas` foi adicionado, mas o correto e mais compatível continua sendo passar apenas `canvasContext` + `viewport`. Passar ambos pode disparar warning ou falha silenciosa.
3. **Buffer detached** — `getDocument({ data: pdfData.slice() })` cria cópia; ok. Mas se o `useEffect` re-executar (ex.: `onRenderComplete` sem `useCallback`), o `cancelled=true` interrompe antes de setar imagens. No caso atual `PreviewRelatorioDialog` não passa `onRenderComplete`, então improvável — mas dá para blindar.
4. **`standardFontDataUrl: "/pdfjs/standard_fonts/"`** — só existem os arquivos de LICENSE em `public/pdfjs/standard_fonts/`, sem os `.pfb`/`.bcmap`. Isso não trava a renderização, mas gera warnings.

## Correções propostas em `src/components/shared/PdfViewer.tsx`

### 1. Carregar o worker com `new URL(..., import.meta.url)` (padrão Vite recomendado pelo pdfjs)
Substituir:
```ts
import pdfWorkerUrl from "pdfjs-dist/legacy/build/pdf.worker.mjs?url";
...
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
```
por:
```ts
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/legacy/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();
```
Isso é o padrão testado com pdfjs-dist v4+/v6 em Vite e evita o problema de MIME/resolução do `?url`.

### 2. Corrigir chamada `page.render`
Trocar `page.render({ canvas, canvasContext: context, viewport })` por:
```ts
const renderTask = page.render({ canvasContext: context, viewport });
await renderTask.promise;
```
Assinatura estável em v4/v5/v6.

### 3. Logs de diagnóstico temporários
Adicionar `console.log("[PdfViewer] pages:", pdf.numPages)` e `console.error` mais explícitos para capturar falhas silenciosas de worker.

### 4. Fallback visual imediato
Trocar a condição do spinner para `{(loading || (!error && images.length === 0 && pdfData)) && ...}` — garante que algo apareça mesmo se o `setLoading(true)` ainda não flushou.

### 5. Remover `standardFontDataUrl` se pasta não tem os arquivos
Ou baixá-los para `public/pdfjs/standard_fonts/` via `pdfjs-dist/standard_fonts/*`. Para agora, remover a opção — pdfjs cai em fallback interno.

## Validação (após aplicar em build mode)

Rodar Playwright:
1. Login → `/relatorios/producao` → clicar "Gerar Relatório" (Extrato do Produtor) → preencher filtros → gerar
2. Screenshot do dialog. Verificar:
   - Spinner aparece durante `loading`
   - Imagens PNG das páginas aparecem
   - Sem erros de worker no console
3. Testar também um relatório multi-página (Resumo do Produtor) e a DANFE para garantir compatibilidade.

## Alternativa (se pdf.js continuar problemático)

Voltar ao approach `<iframe src={blobUrl}>` que é nativo do browser, com fallback de download. Mais simples, sem worker, sem canvas — mas depende do PDF viewer nativo do navegador (Chrome mostra bem, alguns embedded webviews não).

## Arquivos afetados

- `src/components/shared/PdfViewer.tsx` — reescrita do bloco de load + render

## Nenhuma alteração em

- `PreviewRelatorioDialog.tsx`, `DanfePdfViewer.tsx`, geradores de PDF, backend.
