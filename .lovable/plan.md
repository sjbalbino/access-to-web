## Problema

- `<iframe>` com blob PDF é bloqueado pelo sandbox do preview do Lovable (ícone de página triste do Chrome).
- `PdfViewer` (pdf.js) não renderiza a página estreita de 80mm de forma confiável dentro do dialog.

## Solução

Renderizar o ticket como **imagem** usando pdf.js apenas para desenhar em canvas e depois exportar via `canvas.toDataURL('image/png')`. Exibir a imagem PNG resultante em um `<img>` dentro do dialog. Sem iframe, sem text layer, sem polling de largura.

## Alterações

**`src/components/shared/TicketDepositoPreview.tsx`**
- Remover o `<iframe>` do blob.
- Ao abrir o dialog e receber `payload.pdfData`, chamar uma função async local que:
  1. Carrega pdf.js (mesmo `loadPdfJs`/worker já usados pelo `PdfViewer` — extrair helper mínimo inline ou reaproveitar).
  2. `getDocument({ data }).promise` → `getPage(1)`.
  3. Cria canvas com `scale = 3` (nítido em telas retina, ticket é pequeno).
  4. `page.render(...)` → `canvas.toDataURL('image/png')`.
  5. Guarda o data URL em `useState<string | null>` e libera o document (`pdf.cleanup(true)`).
- Renderizar `<img src={imgUrl} alt="Ticket de Depósito" className="mx-auto max-w-full h-auto" />` dentro de um container com `overflow-auto`.
- Estados: mostrar Spinner enquanto gera; mostrar mensagem de erro em fallback.
- Baixar/Imprimir continuam usando o `pdfData` original (inalterados).

Sem alterações em `ticketDepositoPdf.ts`, `PdfViewer`, backend ou schema.
