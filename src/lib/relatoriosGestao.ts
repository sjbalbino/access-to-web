import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { entregarRelatorio } from './relatorioViewer';

// =============================================
// Demonstrativo Gerencial (Receitas/Despesas)
// =============================================
export interface DemonstrativoGerencialData {
  periodo: string;
  tipo: string; // receita, despesa, ambos
  lancamentos: {
    centro_codigo: string;
    centro_descricao: string;
    centro_tipo: string;
    sub_codigo: string;
    sub_descricao: string;
    valor: number;
  }[];
}

export function gerarDemonstrativoGerencialPdf(data: DemonstrativoGerencialData) {
  const doc = new jsPDF('landscape');
  doc.setFontSize(16);
  doc.text('Demonstrativo Gerencial', 14, 15);
  doc.setFontSize(10);
  doc.text(`Período: ${data.periodo} | Tipo: ${data.tipo === 'ambos' ? 'Receitas e Despesas' : data.tipo === 'receita' ? 'Receitas' : 'Despesas'}`, 14, 22);

  // Group by centro
  const grupos: Record<string, { centro_codigo: string; centro_descricao: string; centro_tipo: string; itens: { sub_codigo: string; sub_descricao: string; valor: number }[] }> = {};
  data.lancamentos.forEach(l => {
    const key = l.centro_codigo;
    if (!grupos[key]) grupos[key] = { centro_codigo: l.centro_codigo, centro_descricao: l.centro_descricao, centro_tipo: l.centro_tipo, itens: [] };
    const existing = grupos[key].itens.find(i => i.sub_codigo === l.sub_codigo);
    if (existing) existing.valor += l.valor;
    else grupos[key].itens.push({ sub_codigo: l.sub_codigo, sub_descricao: l.sub_descricao, valor: l.valor });
  });

  const totalGeral = data.lancamentos.reduce((s, l) => s + l.valor, 0);
  const rows: any[] = [];

  Object.values(grupos).sort((a, b) => a.centro_codigo.localeCompare(b.centro_codigo)).forEach(g => {
    const totalGrupo = g.itens.reduce((s, i) => s + i.valor, 0);
    rows.push([
      { content: `${g.centro_codigo} - ${g.centro_descricao} (${g.centro_tipo === 'receita' ? 'R' : 'D'})`, colSpan: 3, styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } },
      { content: fmtCurr(totalGrupo), styles: { fontStyle: 'bold', fillColor: [240, 240, 240], halign: 'right' } },
      { content: totalGeral > 0 ? ((totalGrupo / totalGeral) * 100).toFixed(1) + '%' : '0%', styles: { fontStyle: 'bold', fillColor: [240, 240, 240], halign: 'right' } },
    ]);
    g.itens.sort((a, b) => a.sub_codigo.localeCompare(b.sub_codigo)).forEach(i => {
      rows.push([
        '',
        i.sub_codigo,
        i.sub_descricao,
        { content: fmtCurr(i.valor), styles: { halign: 'right' } },
        { content: totalGrupo > 0 ? ((i.valor / totalGrupo) * 100).toFixed(1) + '%' : '0%', styles: { halign: 'right' } },
      ]);
    });
  });

  rows.push([
    { content: 'TOTAL GERAL', colSpan: 3, styles: { fontStyle: 'bold', fillColor: [220, 220, 220] } },
    { content: fmtCurr(totalGeral), styles: { fontStyle: 'bold', fillColor: [220, 220, 220], halign: 'right' } },
    { content: '100%', styles: { fontStyle: 'bold', fillColor: [220, 220, 220], halign: 'right' } },
  ]);

  autoTable(doc, {
    startY: 28,
    head: [['Centro', 'Código', 'Sub-Centro', { content: 'Valor (R$)', styles: { halign: 'right' } }, { content: '% Grupo', styles: { halign: 'right' } }]],
    body: rows,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [60, 60, 60] },
  });

  entregarRelatorio(doc, 'demonstrativo-gerencial.pdf');
}

// =============================================
// DRE - Demonstrativo de Resultado
// =============================================
export interface DreReportData {
  periodo: string;
  contas: {
    codigo: string;
    descricao: string;
    nivel: number;
    saldo_anterior: number;
    valor_periodo: number;
    saldo_atual: number;
  }[];
}

export function gerarDrePdf(data: DreReportData) {
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text('Demonstrativo de Resultado do Exercício (DRE)', 14, 15);
  doc.setFontSize(10);
  doc.text(`Período: ${data.periodo}`, 14, 22);

  const totalPeriodo = data.contas.reduce((s, c) => s + c.valor_periodo, 0);

  const rows = data.contas.map(c => {
    const indent = '  '.repeat(c.nivel - 1);
    const isBold = c.nivel <= 2;
    const pct = totalPeriodo > 0 ? ((c.valor_periodo / totalPeriodo) * 100).toFixed(1) + '%' : '0%';
    return [
      { content: `${indent}${c.codigo}`, styles: isBold ? { fontStyle: 'bold' as const } : {} },
      { content: `${indent}${c.descricao}`, styles: isBold ? { fontStyle: 'bold' as const } : {} },
      { content: fmtCurr(c.saldo_anterior), styles: { halign: 'right' as const, ...(isBold ? { fontStyle: 'bold' as const } : {}) } },
      { content: fmtCurr(c.valor_periodo), styles: { halign: 'right' as const, ...(isBold ? { fontStyle: 'bold' as const } : {}) } },
      { content: pct, styles: { halign: 'right' as const, ...(isBold ? { fontStyle: 'bold' as const } : {}) } },
      { content: fmtCurr(c.saldo_atual), styles: { halign: 'right' as const, ...(isBold ? { fontStyle: 'bold' as const } : {}) } },
    ];
  });

  autoTable(doc, {
    startY: 28,
    head: [['Código', 'Descrição', { content: 'Saldo Anterior', styles: { halign: 'right' } }, { content: 'Valor Período', styles: { halign: 'right' } }, { content: '%', styles: { halign: 'right' } }, { content: 'Saldo Atual', styles: { halign: 'right' } }]],
    body: rows,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [60, 60, 60] },
    columnStyles: { 0: { cellWidth: 25 }, 1: { cellWidth: 55 } },
  });

  // Save the PDF instead of opening a window to avoid browser blockers
  entregarRelatorio(doc, `dre_${data.periodo.replace(/\s+/g, '_')}.pdf`);
}

// =============================================
// Despesas com Bens Móveis
// =============================================
export interface BensMoveisDespesa {
  grupo_nome: string;
  produto_nome: string | null;
  data_lancamento: string;
  descricao: string;
  valor: number;
  documento: string | null;
}

export function gerarBensMoveisPdf(despesas: BensMoveisDespesa[], periodo: string, modoRelatorio: string) {
  const doc = new jsPDF('landscape');
  doc.setFontSize(16);
  doc.text('Despesas com Bens Móveis (Máquinas e Implementos)', 14, 15);
  doc.setFontSize(10);
  doc.text(`Período: ${periodo} | Modo: ${modoRelatorio}`, 14, 22);

  if (modoRelatorio === 'geral_totais') {
    // Group by grupo
    const grupos: Record<string, number> = {};
    despesas.forEach(d => {
      grupos[d.grupo_nome] = (grupos[d.grupo_nome] || 0) + d.valor;
    });
    const total = Object.values(grupos).reduce((s, v) => s + v, 0);
    const rows = Object.entries(grupos).sort().map(([nome, valor]) => [
      nome,
      { content: fmtCurr(valor), styles: { halign: 'right' as const } },
      { content: total > 0 ? ((valor / total) * 100).toFixed(1) + '%' : '0%', styles: { halign: 'right' as const } },
    ]);
    rows.push([
      { content: 'TOTAL', styles: { fontStyle: 'bold' as const } } as any,
      { content: fmtCurr(total), styles: { fontStyle: 'bold' as const, halign: 'right' as const } },
      { content: '100%', styles: { fontStyle: 'bold' as const, halign: 'right' as const } },
    ]);
    autoTable(doc, {
      startY: 28,
      head: [['Grupo', { content: 'Total (R$)', styles: { halign: 'right' } }, { content: '%', styles: { halign: 'right' } }]],
      body: rows,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [60, 60, 60] },
    });
  } else {
    // Discriminado
    const total = despesas.reduce((s, d) => s + d.valor, 0);
    const rows = despesas.map(d => [
      d.data_lancamento ? formatDateBr(d.data_lancamento) : '-',
      d.grupo_nome,
      d.produto_nome || '-',
      d.descricao,
      d.documento || '-',
      { content: fmtCurr(d.valor), styles: { halign: 'right' as const } },
    ]);
    rows.push([
      { content: 'TOTAL', colSpan: 5, styles: { fontStyle: 'bold' as const } } as any,
      { content: fmtCurr(total), styles: { fontStyle: 'bold' as const, halign: 'right' as const } },
    ]);
    autoTable(doc, {
      startY: 28,
      head: [[{ content: 'Data', styles: { halign: 'center' } }, 'Grupo', 'Produto', 'Descrição', 'Documento', { content: 'Valor (R$)', styles: { halign: 'right' } }]],
      body: rows,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [60, 60, 60] },
    });
  }

  entregarRelatorio(doc, 'despesas-bens-moveis.pdf');
}

// =============================================
// Extrato Contas a Pagar / Receber por Cliente/Fornecedor
// =============================================
export interface ExtratoCfItem {
  tipo: 'receber' | 'pagar';
  data_emissao: string;
  data_vencimento: string;
  documento: string | null;
  parcela: string | null;
  valor_original: number;
  valor_pago: number;
  juros: number;
  multa: number;
  desconto: number;
  status: string;
  data_ult_pagamento: string | null;
}

export interface ExtratoCfData {
  cliente_nome: string;
  cliente_doc: string | null;
  periodo: string;
  tipoFiltro: 'receber' | 'pagar' | 'ambos';
  itens: ExtratoCfItem[];
}

export function gerarExtratoCfPdf(data: ExtratoCfData) {
  const doc = new jsPDF('landscape');
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFontSize(16);
  doc.text('Extrato de Contas por Cliente/Fornecedor', pageWidth / 2, 15, { align: 'center' });
  doc.setFontSize(10);
  doc.text(`${data.cliente_nome}${data.cliente_doc ? ' — ' + data.cliente_doc : ''}`, 14, 22);
  const tipoLabel = data.tipoFiltro === 'ambos' ? 'A Receber e A Pagar' : data.tipoFiltro === 'receber' ? 'A Receber' : 'A Pagar';
  doc.text(`Período: ${data.periodo} | Tipo: ${tipoLabel}`, 14, 28);

  let cursorY = 34;

  const buildSection = (titulo: string, itens: ExtratoCfItem[]) => {
    if (itens.length === 0) return;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(titulo, 14, cursorY);
    doc.setFont('helvetica', 'normal');
    cursorY += 2;

    const totOrig = itens.reduce((s, i) => s + (i.valor_original || 0), 0);
    const totPago = itens.reduce((s, i) => s + (i.valor_pago || 0), 0);
    const totSaldo = itens.reduce((s, i) => s + Math.max(0, (i.valor_original || 0) - (i.valor_pago || 0)), 0);

    const rows = itens.map(i => {
      const saldo = Math.max(0, (i.valor_original || 0) - (i.valor_pago || 0));
      return [
        { content: formatDateBr(i.data_emissao), styles: { halign: 'center' as const } },
        { content: formatDateBr(i.data_vencimento), styles: { halign: 'center' as const } },
        i.documento || '-',
        { content: i.parcela || '-', styles: { halign: 'center' as const } },
        { content: fmtCurr(i.valor_original), styles: { halign: 'right' as const } },
        { content: fmtCurr(i.valor_pago), styles: { halign: 'right' as const } },
        { content: fmtCurr(saldo), styles: { halign: 'right' as const } },
        { content: i.data_ult_pagamento ? formatDateBr(i.data_ult_pagamento) : '-', styles: { halign: 'center' as const } },
        { content: statusLabel(i.status), styles: { halign: 'center' as const } },
      ];
    });

    rows.push([
      { content: 'TOTAL', colSpan: 4, styles: { fontStyle: 'bold' as const, fillColor: [230, 230, 230] as any } } as any,
      { content: fmtCurr(totOrig), styles: { fontStyle: 'bold' as const, halign: 'right' as const, fillColor: [230, 230, 230] as any } },
      { content: fmtCurr(totPago), styles: { fontStyle: 'bold' as const, halign: 'right' as const, fillColor: [230, 230, 230] as any } },
      { content: fmtCurr(totSaldo), styles: { fontStyle: 'bold' as const, halign: 'right' as const, fillColor: [230, 230, 230] as any } },
      { content: '', styles: { fillColor: [230, 230, 230] as any } } as any,
      { content: '', styles: { fillColor: [230, 230, 230] as any } } as any,
    ]);

    autoTable(doc, {
      startY: cursorY,
      head: [[
        { content: 'Emissão', styles: { halign: 'center' } },
        { content: 'Vencim.', styles: { halign: 'center' } },
        'Documento',
        { content: 'Parc.', styles: { halign: 'center' } },
        { content: 'Valor (R$)', styles: { halign: 'right' } },
        { content: 'Pago (R$)', styles: { halign: 'right' } },
        { content: 'Saldo (R$)', styles: { halign: 'right' } },
        { content: 'Últ. Pgto', styles: { halign: 'center' } },
        { content: 'Status', styles: { halign: 'center' } },
      ]],
      body: rows,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [60, 60, 60] },
    });

    cursorY = (doc as any).lastAutoTable.finalY + 8;
  };

  const receber = data.itens.filter(i => i.tipo === 'receber');
  const pagar = data.itens.filter(i => i.tipo === 'pagar');

  if (data.tipoFiltro !== 'pagar') buildSection('Contas a Receber', receber);
  if (data.tipoFiltro !== 'receber') buildSection('Contas a Pagar', pagar);

  if (data.tipoFiltro === 'ambos' && receber.length > 0 && pagar.length > 0) {
    const totRec = receber.reduce((s, i) => s + Math.max(0, (i.valor_original || 0) - (i.valor_pago || 0)), 0);
    const totPag = pagar.reduce((s, i) => s + Math.max(0, (i.valor_original || 0) - (i.valor_pago || 0)), 0);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`Saldo Líquido (Receber - Pagar): R$ ${fmtCurr(totRec - totPag)}`, 14, cursorY);
  }

  entregarRelatorio(doc, `extrato-${data.cliente_nome.replace(/\s+/g, '_')}.pdf`);
}

function statusLabel(s: string): string {
  const map: Record<string, string> = { aberto: 'Aberto', parcial: 'Parcial', pago: 'Pago', cancelado: 'Cancelado' };
  return map[s] || s;
}

// Helpers
function fmtCurr(v: number) {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDateBr(d: string) {
  try {
    const [y, m, day] = d.split('-');
    return `${day}/${m}/${y}`;
  } catch { return d; }
}

// =============================================
// Auditoria de Recálculo de Rateio
// =============================================
export interface AuditoriaRateioLog {
  id: string;
  created_at: string;
  data_inicial: string;
  data_final: string;
  granja_nome: string;
  usuario_nome: string;
  status: string;
  observacoes: string | null;
  backup_data: any;
}

export function gerarRelatorioAuditoriaRateioPdf(log: AuditoriaRateioLog) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Cabeçalho
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Relatório de Auditoria: Recálculo de Rateio', pageWidth / 2, 15, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`ID do Log: ${log.id}`, 14, 25);
  doc.text(`Data/Hora da Ação: ${new Date(log.created_at).toLocaleString('pt-BR')}`, 14, 30);
  doc.text(`Usuário Responsável: ${log.usuario_nome}`, 14, 35);
  doc.text(`Granja: ${log.granja_nome}`, 14, 40);
  doc.text(`Período Processado: ${formatDateBr(log.data_inicial)} até ${formatDateBr(log.data_final)}`, 14, 45);
  doc.text(`Status Atual: ${log.status.toUpperCase()}`, 14, 50);

  if (log.observacoes) {
    doc.text(`Observações: ${log.observacoes}`, 14, 55);
  }

  let cursorY = 65;

  // Resumo das alterações
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Resumo das Alterações', 14, cursorY);
  cursorY += 5;

  const backup = log.backup_data;
  const numLancamentos = Array.isArray(backup) ? backup.length : 0;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Total de lançamentos afetados: ${numLancamentos}`, 14, cursorY);
  cursorY += 10;

  if (numLancamentos > 0) {
    // Tabela com amostra ou resumo por lançamento
    const rows = backup.slice(0, 50).map((b: any) => [
      b.lancamento_id?.substring(0, 8) || '-',
      b.data ? formatDateBr(b.data) : '-',
      b.descricao || '-',
      { content: fmtCurr(b.valor || 0), styles: { halign: 'right' as const } },
      b.socio_nome || '-',
      { content: `${b.percentual_antigo || 0}%`, styles: { halign: 'center' as const } },
      { content: `${b.percentual_novo || 0}%`, styles: { halign: 'center' as const } }
    ]);

    if (numLancamentos > 50) {
      rows.push([{ content: `... e mais ${numLancamentos - 50} alterações não listadas neste resumo.`, colSpan: 7, styles: { halign: 'center' as const, fontStyle: 'italic' as const } }]);
    }

    autoTable(doc, {
      startY: cursorY,
      head: [['ID Lanç.', 'Data', 'Descrição', { content: 'Valor (R$)', styles: { halign: 'right' } }, 'Sócio', { content: '% Ant.', styles: { halign: 'center' } }, { content: '% Novo', styles: { halign: 'center' } }]],
      body: rows,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [60, 60, 60] },
    });
  } else {
    doc.text('Nenhum dado de backup detalhado disponível para este log.', 14, cursorY);
  }

  const fileName = `auditoria-rateio-${log.id.substring(0, 8)}.pdf`;
  entregarRelatorio(doc, fileName);
}
