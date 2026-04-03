import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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

  doc.save('demonstrativo-gerencial.pdf');
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

  doc.save('dre.pdf');
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
      head: [['Grupo', 'Total (R$)', '%']],
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
      head: [['Data', 'Grupo', 'Produto', 'Descrição', 'Documento', 'Valor (R$)']],
      body: rows,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [60, 60, 60] },
    });
  }

  doc.save('despesas-bens-moveis.pdf');
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
