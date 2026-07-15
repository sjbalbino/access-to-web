## Problema

O preview do Ticket de Depósito aparece em branco. O `PdfViewer` (pdf.js legacy) está falhando silenciosamente com o PDF customizado 80mm (erro `readableStream is not async iterable` na text layer) e o canvas não fica visível.

## Solução

Trocar o preview do ticket por um `<iframe>` nativo carregando um blob URL do PDF — usa o visualizador do próprio navegador, que lida bem com PDFs de 1 página em formato customizado. Baixar e Imprimir continuam funcionando.

## Alterações

**`src/components/shared/TicketDepositoPreview.tsx`**
- Substituir `<PdfViewer pdfData=… />` por `<iframe src={blobUrl} className="h-full w-full" title="Ticket de Depósito" />`.
- Criar `blobUrl` via `useMemo`/`useEffect` a partir de `payload.pdfData`; revogar com `URL.revokeObjectURL` no unmount e ao fechar o dialog.
- Adicionar `<DialogDescription className="sr-only">` para remover o warning de acessibilidade dos logs.

Nenhuma outra alteração. `PdfViewer` continua sendo usado nos demais previews (DANFE, contrato, relatórios).
