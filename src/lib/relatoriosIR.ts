import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, parseISO } from 'date-fns';
import { desenharCabecalhoBrand, desenharRodapeBrand } from './pdfBrand';
import { entregarRelatorio } from './relatorioViewer';

const fmtBRL = (v: number) =>
  (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const fmtDate = (d: string) => {
  try { return format(parseISO(d), 'dd/MM/yyyy'); } catch { return d; }
};

export interface RateioMovimento {
  origem_tipo: 'lancamento' | 'cp' | 'cr' | 'cp_baixa' | 'cr_baixa';
  origem_id: string;
  data: string;
  descricao: string;
  documento: string | null;
  conta_codigo: string | null;
  conta_descricao: string | null;
  tipo: 'receita' | 'despesa';
  valor_total: number;
  socio_id: string;
  socio_nome: string;
  socio_cpf_cnpj: string | null;
  percentual: number;
  valor_rateio: number;
}

interface Filtros {
  granjaNome?: string;
  dataInicial?: string;
  dataFinal?: string;
}

/** Demonstrativo Gerencial por Sócio: agrupa receitas e despesas por sócio e conta DRE. */
export function gerarDemonstrativoSocioPdf(movs: RateioMovimento[], filtros: Filtros) {
  const doc = new jsPDF('landscape');
  desenharCabecalhoBrand(doc);
  const pageW = doc.internal.pageSize.getWidth();

  doc.setFontSize(14);
  doc.text('Demonstrativo Gerencial por Sócio', pageW / 2, 34, { align: 'center' });

  doc.setFontSize(9);
  const subtitle = [
    filtros.granjaNome ? `Granja: ${filtros.granjaNome}` : 'Todas as granjas',
    filtros.dataInicial ? `De: ${fmtDate(filtros.dataInicial)}` : '',
    filtros.dataFinal ? `Até: ${fmtDate(filtros.dataFinal)}` : '',
  ].filter(Boolean).join('  |  ');
  doc.text(subtitle, pageW / 2, 40, { align: 'center' });

  // Agrupa por sócio
  const porSocio = new Map<string, RateioMovimento[]>();
  movs.forEach((m) => {
    const k = m.socio_id;
    if (!porSocio.has(k)) porSocio.set(k, []);
    porSocio.get(k)!.push(m);
  });

  let y = 26;
  let totalGeralR = 0;
  let totalGeralD = 0;

  Array.from(porSocio.entries()).forEach(([, lista]) => {
    const socio = lista[0];
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`Sócio: ${socio.socio_nome}${socio.socio_cpf_cnpj ? ` — ${socio.socio_cpf_cnpj}` : ''}`, 14, y);
    y += 5;

    const rows = lista
      .sort((a, b) => a.data.localeCompare(b.data))
      .map((m) => [
        fmtDate(m.data),
        m.documento || '-',
        `${m.conta_codigo || ''} ${m.conta_descricao || ''}`.trim(),
        m.descricao,
        m.tipo === 'receita' ? fmtBRL(m.valor_rateio) : '',
        m.tipo === 'despesa' ? fmtBRL(m.valor_rateio) : '',
      ]);

    const totR = lista.filter((m) => m.tipo === 'receita').reduce((s, m) => s + m.valor_rateio, 0);
    const totD = lista.filter((m) => m.tipo === 'despesa').reduce((s, m) => s + m.valor_rateio, 0);
    totalGeralR += totR;
    totalGeralD += totD;

    rows.push([
      '', '', '', 'TOTAL DO SÓCIO',
      fmtBRL(totR),
      fmtBRL(totD),
    ]);
    rows.push([
      '', '', '', 'RESULTADO LÍQUIDO',
      '',
      fmtBRL(totR - totD),
    ]);

    autoTable(doc, {
      startY: y,
      head: [['Data', 'Documento', 'Conta DRE', 'Histórico', 'Receita', 'Despesa']],
      body: rows,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [22, 101, 52] },
      columnStyles: {
        0: { halign: 'center', cellWidth: 22 },
        1: { cellWidth: 30 },
        2: { cellWidth: 55 },
        4: { halign: 'right', cellWidth: 30 },
        5: { halign: 'right', cellWidth: 30 },
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.row.index >= rows.length - 2) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [240, 240, 240];
        }
      },
    });
    y = (doc as any).lastAutoTable.finalY + 6;
    if (y > 180) { doc.addPage(); y = 14; }
  });

  // Total geral
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`TOTAL GERAL — Receitas: ${fmtBRL(totalGeralR)}  |  Despesas: ${fmtBRL(totalGeralD)}  |  Resultado: ${fmtBRL(totalGeralR - totalGeralD)}`, 14, y + 4);

  desenharRodapeBrand(doc);
  entregarRelatorio(doc, `demonstrativo-socios-${new Date().toISOString().slice(0, 10)}.pdf`);
}

/** Livro Caixa do Produtor Rural por sócio (regime de caixa: apenas baixas + lançamentos). */
export function gerarLivroCaixaPdf(movs: RateioMovimento[], filtros: Filtros) {
  const doc = new jsPDF();
  desenharCabecalhoBrand(doc);
  const pageW = doc.internal.pageSize.getWidth();

  const porSocio = new Map<string, RateioMovimento[]>();
  movs.forEach((m) => {
    const k = m.socio_id;
    if (!porSocio.has(k)) porSocio.set(k, []);
    porSocio.get(k)!.push(m);
  });

  let first = true;
  porSocio.forEach((lista) => {
    if (!first) doc.addPage();
    first = false;
    const socio = lista[0];

    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('Livro Caixa do Produtor Rural', pageW / 2, 34, { align: 'center' });
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Sócio: ${socio.socio_nome}`, 14, 42);
    if (socio.socio_cpf_cnpj) doc.text(`CPF/CNPJ: ${socio.socio_cpf_cnpj}`, 14, 47);
    const sub = [
      filtros.granjaNome ? `Granja: ${filtros.granjaNome}` : '',
      filtros.dataInicial ? `De: ${fmtDate(filtros.dataInicial)}` : '',
      filtros.dataFinal ? `Até: ${fmtDate(filtros.dataFinal)}` : '',
    ].filter(Boolean).join('  |  ');
    if (sub) doc.text(sub, 14, 52);

    let saldo = 0;
    const rows = lista
      .sort((a, b) => a.data.localeCompare(b.data))
      .map((m) => {
        const entrada = m.tipo === 'receita' ? m.valor_rateio : 0;
        const saida = m.tipo === 'despesa' ? m.valor_rateio : 0;
        saldo += entrada - saida;
        return [
          fmtDate(m.data),
          m.descricao,
          m.documento || '-',
          entrada ? fmtBRL(entrada) : '',
          saida ? fmtBRL(saida) : '',
          fmtBRL(saldo),
        ];
      });

    const totE = lista.filter((m) => m.tipo === 'receita').reduce((s, m) => s + m.valor_rateio, 0);
    const totS = lista.filter((m) => m.tipo === 'despesa').reduce((s, m) => s + m.valor_rateio, 0);
    rows.push(['', 'TOTAL DO PERÍODO', '', fmtBRL(totE), fmtBRL(totS), fmtBRL(totE - totS)]);

    autoTable(doc, {
      startY: 58,
      head: [['Data', 'Histórico', 'Nº Doc.', 'Entradas', 'Saídas', 'Saldo']],
      body: rows,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [22, 101, 52] },
      columnStyles: {
        0: { halign: 'center', cellWidth: 22 },
        2: { cellWidth: 26 },
        3: { halign: 'right', cellWidth: 28 },
        4: { halign: 'right', cellWidth: 28 },
        5: { halign: 'right', cellWidth: 30 },
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.row.index === rows.length - 1) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [240, 240, 240];
        }
      },
    });
  });

  desenharRodapeBrand(doc);
  entregarRelatorio(doc, `livro-caixa-${new Date().toISOString().slice(0, 10)}.pdf`);
}
