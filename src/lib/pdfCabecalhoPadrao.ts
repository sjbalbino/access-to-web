/**
 * Cabeçalho padrão de todos os relatórios PDF (jsPDF): nome da empresa à esquerda
 * e nome do sistema à direita, na margem superior de cada página.
 * Aplicado automaticamente no momento de salvar/gerar o PDF.
 */
import jsPDF from 'jspdf';

export const NOME_SISTEMA = 'AgroGestão - Sistema de Gerenciamento Agropecuário';

let empresaAtual = '';
export function definirEmpresaCabecalhoPdf(nome: string) { empresaAtual = nome; }

const MARCA = '__cabecalhoPadrao';
type DocMarcado = jsPDF & { [MARCA]?: 'aplicado' | 'ignorar' };

/** Documentos que não são relatórios (contrato, recibo) podem desativar o cabeçalho. */
export function semCabecalhoPadrao(doc: jsPDF) { (doc as DocMarcado)[MARCA] = 'ignorar'; }

export function aplicarCabecalhoPadrao(doc: jsPDF) {
  const d = doc as DocMarcado;
  if (d[MARCA]) return;
  d[MARCA] = 'aplicado';
  const w = doc.internal.pageSize.getWidth();
  if (w < 150) return; // tickets de bobina
  const fonte = doc.getFont();
  const tamanho = doc.getFontSize();
  const cor = doc.getTextColor();
  const atual = doc.getCurrentPageInfo().pageNumber;
  for (let p = 1; p <= doc.getNumberOfPages(); p++) {
    doc.setPage(p);
    doc.setFontSize(7);
    doc.setTextColor(60, 60, 60);
    doc.setFont('helvetica', 'bold');
    if (empresaAtual) doc.text(empresaAtual, 8, 5);
    doc.setFont('helvetica', 'normal');
    doc.text(NOME_SISTEMA, w - 8, 5, { align: 'right' });
  }
  doc.setPage(atual);
  doc.setFont(fonte.fontName, fonte.fontStyle);
  doc.setFontSize(tamanho);
  doc.setTextColor(cor);
}

// Intercepta save/output para todos os PDFs do sistema.
const proto = jsPDF.prototype as unknown as Record<string, (...a: unknown[]) => unknown>;
if (!proto.__cabecalhoPatch) {
  proto.__cabecalhoPatch = (() => true) as never;
  for (const m of ['save', 'output']) {
    const orig = proto[m];
    proto[m] = function (this: jsPDF, ...args: unknown[]) {
      try { aplicarCabecalhoPadrao(this); } catch { /* não bloqueia a geração */ }
      return orig.apply(this, args);
    };
  }
}
