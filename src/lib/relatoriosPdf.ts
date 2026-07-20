import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { desenharCabecalhoBrand, desenharRodapeBrand } from "./pdfBrand";
import { entregarRelatorio } from "./relatorioViewer";

const formatCurrency = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return "-";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
};

const formatNumber = (value: number | null | undefined, decimals = 0): string => {
  if (value === null || value === undefined) return "-";
  const rounded = decimals === 0 ? Math.round(value) : value;
  return new Intl.NumberFormat("pt-BR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(rounded);
};

const formatDate = (dateStr: string | null | undefined): string => {
  if (!dateStr) return "-";
  try {
    return format(new Date(dateStr.split("T")[0] + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR });
  } catch {
    return dateStr;
  }
};

function downloadPdf(doc: jsPDF, filename: string) {
  entregarRelatorio(doc, filename);
}

// ==================== EXTRATO DO PRODUTOR ====================

export interface ExtratoColheita {
  data_colheita: string | null;
  lavoura?: string | null;
  variedade?: string | null;
  peso_bruto: number | null;
  peso_tara: number | null;
  producao_kg: number | null;
  umidade: number | null;
  impureza: number | null;
  kg_desconto_total: number | null;
  producao_liquida_kg: number | null;
  local_entrega?: string | null;
}

export interface ExtratoTransferencia {
  data_transferencia: string;
  nome_outro: string | null;
  quantidade_kg: number;
  local_entrega?: string | null;
}

export interface ExtratoDevolucao {
  data_devolucao: string;
  quantidade_kg: number;
  taxa_armazenagem: number | null;
  kg_taxa_armazenagem: number | null;
  local_entrega?: string | null;
}

export interface ExtratoNotaDeposito {
  data_emissao: string | null;
  nota_fiscal_numero: string | null;
  quantidade_kg: number;
  local_entrega?: string | null;
}

export interface ExtratoData {
  produtorNome: string;
  cpfCnpj: string | null;
  inscricaoEstadual: string | null;
  safraNome: string;
  produtoNome: string | null;
  colheitas: ExtratoColheita[];
  transferenciasRecebidas: ExtratoTransferencia[];
  transferenciasEnviadas: ExtratoTransferencia[];
  devolucoes: ExtratoDevolucao[];
  notasDeposito: ExtratoNotaDeposito[];
}

export function gerarExtratoProdutorPdf(data: ExtratoData): void {
  const doc = new jsPDF({ orientation: "landscape" });
  const pageWidth = doc.internal.pageSize.getWidth();
  let yPos = desenharCabecalhoBrand(doc);

  // Título
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("EXTRATO DO PRODUTOR", pageWidth / 2, yPos, { align: "center" });

  yPos += 8;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Produtor: ${data.produtorNome}`, 14, yPos);
  if (data.cpfCnpj) doc.text(`CPF/CNPJ: ${data.cpfCnpj}`, pageWidth / 2, yPos);
  yPos += 5;
  if (data.inscricaoEstadual) doc.text(`IE: ${data.inscricaoEstadual}`, 14, yPos);
  doc.text(`Safra: ${data.safraNome}`, pageWidth / 2, yPos);
  yPos += 5;
  if (data.produtoNome) doc.text(`Produto: ${data.produtoNome}`, 14, yPos);
  yPos += 8;

  const PESO_SACA = 60;
  const toSacas = (kg: number | null | undefined) => formatNumber((Number(kg) || 0) / PESO_SACA, 1);

  const localOf = (l: string | null | undefined) => (l && l.trim()) || "Sede";

  // Helper: groups rows by local, emits subtotal rows and returns
  // the list of subtotal indices for styling.
  function renderSection<T>(
    title: string,
    items: T[],
    getLocal: (t: T) => string,
    toRow: (t: T) => any[],
    sumCols: number, // number of numeric columns from end (used for subtotal)
    sumFn: (list: T[]) => any[], // returns just the numeric totals cells
    head: any[],
    columnStyles: any,
    localColSpan: number,
  ) {
    if (items.length === 0) return;
    doc.setFont("helvetica", "bold");
    doc.text(title, 14, yPos);

    const sorted = [...items].sort((a, b) => getLocal(a).localeCompare(getLocal(b), "pt-BR"));
    const body: any[] = [];
    const subtotalIdx = new Set<number>();
    let currentLocal = "";
    let bucket: T[] = [];

    const flush = () => {
      if (!bucket.length) return;
      const totals = sumFn(bucket);
      body.push([
        { content: `Subtotal ${currentLocal}`, colSpan: localColSpan, styles: { fontStyle: "bold", halign: "right" } },
        ...totals,
      ]);
      subtotalIdx.add(body.length - 1);
      bucket = [];
    };

    sorted.forEach((it) => {
      const loc = getLocal(it);
      if (loc !== currentLocal) {
        flush();
        currentLocal = loc;
      }
      body.push(toRow(it));
      bucket.push(it);
    });
    flush();

    // Total geral
    const totals = sumFn(sorted);
    body.push([
      { content: "TOTAL GERAL", colSpan: localColSpan, styles: { fontStyle: "bold", halign: "right" } },
      ...totals,
    ]);
    const totalGeralIdx = body.length - 1;

    autoTable(doc, {
      startY: yPos + 2,
      head: [head],
      body,
      styles: { fontSize: 7, cellPadding: 1.5 },
      headStyles: { fillColor: [66, 66, 66], textColor: 255 },
      columnStyles,
      didParseCell: (d) => {
        if (d.section !== "body") return;
        if (subtotalIdx.has(d.row.index)) {
          d.cell.styles.fillColor = [240, 240, 240];
          d.cell.styles.fontStyle = "bold";
        }
        if (d.row.index === totalGeralIdx) {
          d.cell.styles.fillColor = [210, 210, 210];
          d.cell.styles.fontStyle = "bold";
        }
      },
    });
    yPos = (doc as any).lastAutoTable.finalY + 5;
  }

  const sumBy = (arr: any[], key: string) => arr.reduce((s, x) => s + (Number(x[key]) || 0), 0);

  // COLHEITAS
  renderSection<ExtratoColheita>(
    "COLHEITAS",
    data.colheitas,
    (c) => localOf(c.local_entrega),
    (c) => [
      localOf(c.local_entrega),
      formatDate(c.data_colheita),
      c.lavoura || "-",
      c.variedade || "-",
      formatNumber(c.peso_bruto, 0),
      formatNumber(c.peso_tara, 0),
      formatNumber(c.producao_kg, 0),
      c.umidade != null ? formatNumber(c.umidade, 1) + "%" : "-",
      c.impureza != null ? formatNumber(c.impureza, 1) + "%" : "-",
      formatNumber(c.kg_desconto_total, 0),
      formatNumber(c.producao_liquida_kg, 0),
      toSacas(c.producao_liquida_kg),
    ],
    8,
    (list) => {
      const totLiq = sumBy(list, "producao_liquida_kg");
      return [
        formatNumber(sumBy(list, "peso_bruto"), 0),
        formatNumber(sumBy(list, "peso_tara"), 0),
        formatNumber(sumBy(list, "producao_kg"), 0),
        "", "",
        formatNumber(sumBy(list, "kg_desconto_total"), 0),
        formatNumber(totLiq, 0),
        toSacas(totLiq),
      ];
    },
    [
      "Local",
      { content: "Data", styles: { halign: "center" } },
      "Lavoura", "Variedade",
      { content: "P.Bruto", styles: { halign: "right" } },
      { content: "Tara", styles: { halign: "right" } },
      { content: "Líquido", styles: { halign: "right" } },
      { content: "Umid.", styles: { halign: "right" } },
      { content: "Imp.", styles: { halign: "right" } },
      { content: "Desc.", styles: { halign: "right" } },
      { content: "Prod.Líq.(kg)", styles: { halign: "right" } },
      { content: "Sacas", styles: { halign: "right" } },
    ],
    {
      0: { halign: "left", cellWidth: 26 },
      1: { halign: "center", cellWidth: 20 },
      2: { halign: "left", cellWidth: 26 },
      3: { halign: "left", cellWidth: 26 },
      4: { halign: "right" }, 5: { halign: "right" }, 6: { halign: "right" },
      7: { halign: "right" }, 8: { halign: "right" }, 9: { halign: "right" }, 10: { halign: "right" }, 11: { halign: "right" },
    },
    4,
  );

  // TRANSFERÊNCIAS RECEBIDAS
  renderSection<ExtratoTransferencia>(
    "TRANSFERÊNCIAS RECEBIDAS",
    data.transferenciasRecebidas,
    (t) => localOf(t.local_entrega),
    (t) => [localOf(t.local_entrega), formatDate(t.data_transferencia), t.nome_outro || "-", formatNumber(t.quantidade_kg, 0), toSacas(t.quantidade_kg)],
    2,
    (list) => {
      const tot = sumBy(list, "quantidade_kg");
      return [formatNumber(tot, 0), toSacas(tot)];
    },
    [
      "Local",
      { content: "Data", styles: { halign: "center" } },
      "Origem",
      { content: "Qtd (kg)", styles: { halign: "right" } },
      { content: "Sacas", styles: { halign: "right" } },
    ],
    { 0: { halign: "left", cellWidth: 30 }, 1: { halign: "center", cellWidth: 25 }, 2: { halign: "left" }, 3: { halign: "right", cellWidth: 28 }, 4: { halign: "right", cellWidth: 24 } },
    3,
  );

  // TRANSFERÊNCIAS ENVIADAS
  renderSection<ExtratoTransferencia>(
    "TRANSFERÊNCIAS ENVIADAS",
    data.transferenciasEnviadas,
    (t) => localOf(t.local_entrega),
    (t) => [localOf(t.local_entrega), formatDate(t.data_transferencia), t.nome_outro || "-", formatNumber(t.quantidade_kg, 0), toSacas(t.quantidade_kg)],
    2,
    (list) => {
      const tot = sumBy(list, "quantidade_kg");
      return [formatNumber(tot, 0), toSacas(tot)];
    },
    [
      "Local",
      { content: "Data", styles: { halign: "center" } },
      "Destino",
      { content: "Qtd (kg)", styles: { halign: "right" } },
      { content: "Sacas", styles: { halign: "right" } },
    ],
    { 0: { halign: "left", cellWidth: 30 }, 1: { halign: "center", cellWidth: 25 }, 2: { halign: "left" }, 3: { halign: "right", cellWidth: 28 }, 4: { halign: "right", cellWidth: 24 } },
    3,
  );

  // DEVOLUÇÕES
  renderSection<ExtratoDevolucao>(
    "DEVOLUÇÕES",
    data.devolucoes,
    (d) => localOf(d.local_entrega),
    (d) => [
      localOf(d.local_entrega),
      formatDate(d.data_devolucao),
      formatNumber(d.quantidade_kg, 0),
      toSacas(d.quantidade_kg),
      d.taxa_armazenagem != null ? formatNumber(d.taxa_armazenagem, 2) + "%" : "-",
      formatNumber(d.kg_taxa_armazenagem, 0),
      toSacas(d.kg_taxa_armazenagem),
    ],
    5,
    (list) => {
      const tot = sumBy(list, "quantidade_kg");
      const totTx = sumBy(list, "kg_taxa_armazenagem");
      return [formatNumber(tot, 0), toSacas(tot), "", formatNumber(totTx, 0), toSacas(totTx)];
    },
    [
      "Local",
      { content: "Data", styles: { halign: "center" } },
      { content: "Qtd (kg)", styles: { halign: "right" } },
      { content: "Sacas", styles: { halign: "right" } },
      { content: "Taxa Armaz. (%)", styles: { halign: "right" } },
      { content: "Kg Taxa", styles: { halign: "right" } },
      { content: "Sacas Taxa", styles: { halign: "right" } },
    ],
    { 0: { halign: "left", cellWidth: 30 }, 1: { halign: "center", cellWidth: 25 }, 2: { halign: "right" }, 3: { halign: "right" }, 4: { halign: "right" }, 5: { halign: "right" }, 6: { halign: "right" } },
    2,
  );

  // NOTAS DE DEPÓSITO
  renderSection<ExtratoNotaDeposito>(
    "NOTAS DE DEPÓSITO",
    data.notasDeposito,
    (n) => localOf(n.local_entrega),
    (n) => [localOf(n.local_entrega), formatDate(n.data_emissao), n.nota_fiscal_numero || "-", formatNumber(n.quantidade_kg, 0), toSacas(n.quantidade_kg)],
    2,
    (list) => {
      const tot = sumBy(list, "quantidade_kg");
      return [formatNumber(tot, 0), toSacas(tot)];
    },
    [
      "Local",
      { content: "Data", styles: { halign: "center" } },
      "Nota Fiscal",
      { content: "Qtd (kg)", styles: { halign: "right" } },
      { content: "Sacas", styles: { halign: "right" } },
    ],
    { 0: { halign: "left", cellWidth: 30 }, 1: { halign: "center", cellWidth: 25 }, 2: { halign: "left" }, 3: { halign: "right", cellWidth: 28 }, 4: { halign: "right", cellWidth: 24 } },
    3,
  );



  // RESUMO POR VARIEDADE (agrupamento das colheitas)
  if (data.colheitas.length > 0) {
    const porVariedade = new Map<string, { producao: number; liquida: number; qtd: number }>();
    data.colheitas.forEach((c) => {
      const key = c.variedade || "-";
      const acc = porVariedade.get(key) || { producao: 0, liquida: 0, qtd: 0 };
      acc.producao += c.producao_kg || 0;
      acc.liquida += c.producao_liquida_kg || 0;
      acc.qtd += 1;
      porVariedade.set(key, acc);
    });

    if (yPos > doc.internal.pageSize.getHeight() - 40) {
      doc.addPage();
      yPos = desenharCabecalhoBrand(doc);
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("RESUMO POR VARIEDADE", 14, yPos);
    const variedadesBody = Array.from(porVariedade.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([variedade, v]) => [
        variedade,
        String(v.qtd),
        formatNumber(v.producao, 0),
        formatNumber(v.liquida, 0),
        toSacas(v.liquida),
      ]);
    const totalVarProducao = Array.from(porVariedade.values()).reduce((s, v) => s + v.producao, 0);
    const totalVarLiquida = Array.from(porVariedade.values()).reduce((s, v) => s + v.liquida, 0);
    const totalVarQtd = Array.from(porVariedade.values()).reduce((s, v) => s + v.qtd, 0);
    variedadesBody.push([
      "TOTAL",
      String(totalVarQtd),
      formatNumber(totalVarProducao, 0),
      formatNumber(totalVarLiquida, 0),
      toSacas(totalVarLiquida),
    ]);
    autoTable(doc, {
      startY: yPos + 2,
      head: [[
        "Variedade",
        { content: "Colheitas", styles: { halign: "right" } },
        { content: "Prod. Bruta (kg)", styles: { halign: "right" } },
        { content: "Prod. Líquida (kg)", styles: { halign: "right" } },
        { content: "Sacas", styles: { halign: "right" } },
      ]],
      body: variedadesBody,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [66, 66, 66], textColor: 255 },
      columnStyles: {
        0: { halign: "left" },
        1: { halign: "right", cellWidth: 25 },
        2: { halign: "right", cellWidth: 35 },
        3: { halign: "right", cellWidth: 40 },
        4: { halign: "right", cellWidth: 25 },
      },
      didParseCell: (d) => {
        if (d.row.index === variedadesBody.length - 1) {
          d.cell.styles.fontStyle = "bold";
          d.cell.styles.fillColor = [240, 240, 240];
        }
      },
    });
    yPos = (doc as any).lastAutoTable.finalY + 5;
  }

  const totalColheitas = data.colheitas.reduce((s, c) => s + (c.producao_liquida_kg || 0), 0);
  const totalRecebidas = data.transferenciasRecebidas.reduce((s, t) => s + t.quantidade_kg, 0);
  const totalEnviadas = data.transferenciasEnviadas.reduce((s, t) => s + t.quantidade_kg, 0);
  const totalDevolucoes = data.devolucoes.reduce((s, d) => s + d.quantidade_kg, 0);
  // Kg de Taxa de Armazenagem é crédito do sócio recebedor da taxa, não sai do estoque do produtor.
  const saldo = totalColheitas + totalRecebidas - totalEnviadas - totalDevolucoes;


  // Check if need new page
  if (yPos > doc.internal.pageSize.getHeight() - 50) {
    doc.addPage();
    yPos = desenharCabecalhoBrand(doc);
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("RESUMO", 14, yPos);
  yPos += 6;
  doc.setFontSize(9);

  const fmtKgSc = (kg: number) => `${formatNumber(kg, 0)} kg  (${formatNumber(kg / 60, 1)} sc)`;
  const resumoData = [
    ["Total Colheitas", fmtKgSc(totalColheitas)],
    ["(+) Transf. Recebidas", fmtKgSc(totalRecebidas)],
    ["(-) Transf. Enviadas", fmtKgSc(totalEnviadas)],
    ["(-) Devoluções", fmtKgSc(totalDevolucoes)],
    ["= SALDO", fmtKgSc(saldo)],
  ];


  autoTable(doc, {
    startY: yPos,
    body: resumoData,
    styles: { fontSize: 9, cellPadding: 2 },
    columnStyles: { 0: { halign: "left", fontStyle: "bold", cellWidth: 60 }, 1: { halign: "right", cellWidth: 40 } },
    theme: "plain",
    didParseCell: (data) => {
      if (data.row.index === resumoData.length - 1) {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fontSize = 11;
      }
    },
  });

  desenharRodapeBrand(doc);
  downloadPdf(doc, `extrato_produtor_${data.produtorNome.replace(/\s/g, "_")}.pdf`);
}

// ==================== RELATÓRIO DE COLHEITAS ====================

export interface RelColheita {
  data_colheita: string | null;
  produtor_nome: string | null;
  lavoura_nome: string | null;
  placa: string | null;
  peso_bruto: number | null;
  peso_tara: number | null;
  producao_kg: number | null;
  umidade: number | null;
  impureza: number | null;
  kg_desconto_total: number | null;
  producao_liquida_kg: number | null;
  total_sacos: number | null;
}

export function gerarRelatorioColheitasPdf(colheitas: RelColheita[], filtrosTexto: string): void {
  const doc = new jsPDF({ orientation: "landscape" });
  const pageWidth = doc.internal.pageSize.getWidth();
  desenharCabecalhoBrand(doc);

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("RELATÓRIO DE COLHEITAS", pageWidth / 2, 34, { align: "center" });
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(filtrosTexto, pageWidth / 2, 40, { align: "center" });

  const body = colheitas.map(c => [
    formatDate(c.data_colheita),
    c.produtor_nome || "-",
    c.lavoura_nome || "-",
    c.placa || "-",
    formatNumber(c.peso_bruto, 0),
    formatNumber(c.peso_tara, 0),
    formatNumber(c.producao_kg, 0),
    c.umidade != null ? formatNumber(c.umidade, 1) + "%" : "-",
    c.impureza != null ? formatNumber(c.impureza, 1) + "%" : "-",
    formatNumber(c.kg_desconto_total, 0),
    formatNumber(c.producao_liquida_kg, 0),
    formatNumber(c.total_sacos, 1),
  ]);

  const totPesoBruto = colheitas.reduce((s, c) => s + (c.peso_bruto || 0), 0);
  const totProdLiq = colheitas.reduce((s, c) => s + (c.producao_liquida_kg || 0), 0);
  const totSacas = colheitas.reduce((s, c) => s + (c.total_sacos || 0), 0);

  body.push([
    "TOTAL", "", "", "",
    formatNumber(totPesoBruto, 0), "", "", "", "",
    "",
    formatNumber(totProdLiq, 0),
    formatNumber(totSacas, 1),
  ]);

  autoTable(doc, {
    startY: 44,
    head: [[
      { content: "Data", styles: { halign: "center" } },
      "Produtor", "Lavoura", "Placa",
      { content: "P.Bruto", styles: { halign: "right" } },
      { content: "Tara", styles: { halign: "right" } },
      { content: "Líquido", styles: { halign: "right" } },
      { content: "Umid.", styles: { halign: "right" } },
      { content: "Imp.", styles: { halign: "right" } },
      { content: "Desc.", styles: { halign: "right" } },
      { content: "Prod.Líq.", styles: { halign: "right" } },
      { content: "Sacas", styles: { halign: "right" } },
    ]],
    body,
    styles: { fontSize: 7, cellPadding: 1.5 },
    headStyles: { fillColor: [66, 66, 66], textColor: 255 },
    columnStyles: {
      0: { halign: "center", cellWidth: 18 },
      1: { halign: "left", cellWidth: 40 },
      2: { halign: "left", cellWidth: 30 },
      3: { halign: "left", cellWidth: 18 },
      4: { halign: "right" }, 5: { halign: "right" }, 6: { halign: "right" },
      7: { halign: "right" }, 8: { halign: "right" }, 9: { halign: "right" },
      10: { halign: "right" }, 11: { halign: "right" },
    },
    didParseCell: (data) => {
      if (data.row.index === body.length - 1 && data.section === "body") {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fillColor = [230, 230, 230];
      }
    },
  });

  desenharRodapeBrand(doc);
  downloadPdf(doc, "relatorio_colheitas.pdf");
}

// ==================== RELATÓRIO DE VENDAS ====================

export interface RelContratoVenda {
  numero: number;
  data_contrato: string;
  comprador_id?: string | null;
  comprador_nome: string | null;
  comprador_cpf_cnpj?: string | null;
  produto_nome: string | null;
  quantidade_kg: number | null;
  preco_kg: number | null;
  valor_total: number | null;
  total_carregado_kg: number | null;
  saldo_kg: number | null;
}

export type VendasPdfOrientation = "portrait" | "landscape";
export type VendasPdfPageSize = "a4" | "a3" | "letter" | "legal";

export function gerarRelatorioVendasPdf(
  contratos: RelContratoVenda[],
  filtrosTexto: string,
  opcoes?: { orientacao?: VendasPdfOrientation; tamanho?: VendasPdfPageSize },
): void {
  const doc = new jsPDF({
    orientation: opcoes?.orientacao ?? "landscape",
    format: opcoes?.tamanho ?? "a4",
  });
  const pageWidth = doc.internal.pageSize.getWidth();
  desenharCabecalhoBrand(doc);

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("RELATÓRIO DE VENDAS", pageWidth / 2, 34, { align: "center" });
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(filtrosTexto, pageWidth / 2, 40, { align: "center" });

  const sc = (kg: number | null) => formatNumber((Number(kg) || 0) / 60, 1);

  // Agrupar por comprador
  const SEM = "__SEM_COMPRADOR__";
  const grupos = new Map<string, { label: string; doc: string | null; itens: RelContratoVenda[] }>();
  for (const c of contratos) {
    const key = (c.comprador_id || c.comprador_nome || SEM) as string;
    if (!grupos.has(key)) {
      grupos.set(key, {
        label: c.comprador_nome || "SEM COMPRADOR",
        doc: c.comprador_cpf_cnpj || null,
        itens: [],
      });
    }
    grupos.get(key)!.itens.push(c);
  }
  const gruposOrdenados = Array.from(grupos.values()).sort((a, b) => {
    if (a.label === "SEM COMPRADOR") return 1;
    if (b.label === "SEM COMPRADOR") return -1;
    return a.label.localeCompare(b.label, "pt-BR");
  });

  const COL_COUNT = 11;
  const body: any[] = [];
  const headerRows = new Set<number>();
  const subtotalRows = new Set<number>();
  let totalGeralRowIdx = -1;

  let totContratado = 0, totCarregado = 0, totSaldo = 0, totValor = 0, totContratos = 0;

  for (const g of gruposOrdenados) {
    // Cabeçalho do grupo
    const headerText = `COMPRADOR: ${g.label}${g.doc ? `  —  CPF/CNPJ: ${g.doc}` : ""}`;
    headerRows.add(body.length);
    body.push([{ content: headerText, colSpan: COL_COUNT, styles: { halign: "left" } }]);

    // Linhas
    g.itens.sort((a, b) => (b.data_contrato || "").localeCompare(a.data_contrato || "") || (Number(b.numero) - Number(a.numero)));
    let sQtd = 0, sCarreg = 0, sSaldo = 0, sValor = 0;
    for (const c of g.itens) {
      sQtd += c.quantidade_kg || 0;
      sCarreg += c.total_carregado_kg || 0;
      sSaldo += c.saldo_kg || 0;
      sValor += c.valor_total || 0;
      body.push([
        c.numero?.toString() ?? "",
        formatDate(c.data_contrato),
        c.produto_nome || "-",
        formatNumber(c.quantidade_kg, 0),
        sc(c.quantidade_kg),
        formatCurrency(c.preco_kg),
        formatCurrency(c.valor_total),
        formatNumber(c.total_carregado_kg, 0),
        sc(c.total_carregado_kg),
        formatNumber(c.saldo_kg, 0),
        sc(c.saldo_kg),
      ]);
    }

    // Subtotal do comprador
    subtotalRows.add(body.length);
    body.push([
      { content: `Subtotal ${g.label} (${g.itens.length} contrato${g.itens.length !== 1 ? "s" : ""})`, colSpan: 3, styles: { halign: "right" } },
      formatNumber(sQtd, 0),
      sc(sQtd),
      "",
      formatCurrency(sValor),
      formatNumber(sCarreg, 0),
      sc(sCarreg),
      formatNumber(sSaldo, 0),
      sc(sSaldo),
    ]);

    totContratado += sQtd;
    totCarregado += sCarreg;
    totSaldo += sSaldo;
    totValor += sValor;
    totContratos += g.itens.length;
  }

  // TOTAL GERAL
  totalGeralRowIdx = body.length;
  body.push([
    { content: `TOTAL GERAL (${totContratos} contrato${totContratos !== 1 ? "s" : ""})`, colSpan: 3, styles: { halign: "right" } },
    formatNumber(totContratado, 0),
    sc(totContratado),
    "",
    formatCurrency(totValor),
    formatNumber(totCarregado, 0),
    sc(totCarregado),
    formatNumber(totSaldo, 0),
    sc(totSaldo),
  ]);

  autoTable(doc, {
    startY: 44,
    head: [[
      { content: "Nº", styles: { halign: "right" } },
      { content: "Data", styles: { halign: "center" } },
      "Produto",
      { content: "Qtd (kg)", styles: { halign: "right" } },
      { content: "Sacas", styles: { halign: "right" } },
      { content: "Preço/kg", styles: { halign: "right" } },
      { content: "Valor Total", styles: { halign: "right" } },
      { content: "Carreg. (kg)", styles: { halign: "right" } },
      { content: "Carreg. (sc)", styles: { halign: "right" } },
      { content: "Saldo (kg)", styles: { halign: "right" } },
      { content: "Saldo (sc)", styles: { halign: "right" } },
    ]],
    body,
    styles: { fontSize: 7, cellPadding: 1.5 },
    headStyles: { fillColor: [66, 66, 66], textColor: 255 },
    columnStyles: {
      0: { halign: "right", cellWidth: 12 },
      1: { halign: "center", cellWidth: 20 },
      2: { halign: "left", cellWidth: 35 },
      3: { halign: "right" }, 4: { halign: "right" }, 5: { halign: "right" },
      6: { halign: "right" }, 7: { halign: "right" }, 8: { halign: "right" },
      9: { halign: "right" }, 10: { halign: "right" },
    },
    didParseCell: (data) => {
      if (data.section !== "body") return;
      const i = data.row.index;
      if (i === totalGeralRowIdx) {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fillColor = [200, 200, 200];
      } else if (subtotalRows.has(i)) {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fillColor = [230, 230, 230];
      } else if (headerRows.has(i)) {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fillColor = [220, 235, 220];
        data.cell.styles.textColor = [40, 40, 40];
      }
    },
  });

  desenharRodapeBrand(doc);
  downloadPdf(doc, "relatorio_vendas.pdf");
}


// ==================== RESUMO DO PRODUTOR ====================

export interface ResumoProdutorRow {
  local_entrega: string;
  cultura: string;
  safra: string;
  inscricao_estadual: string;
  nome: string;
  tipo: string; // INDUST / SEMENT
  depositos_kg: number;
  compras_kg: number;
  vendas_kg: number;
  devolucao_kg: number;
  tr_saida_kg: number;
  tr_entrada_kg: number;
  ent_armaz_kg: number;
  saldo_kg: number;
  peso_saca: number;
}

export interface ResumoProdutorData {
  produtorNome: string;
  cpfCnpj: string | null;
  safraNome: string;
  rows: ResumoProdutorRow[];
}

export function gerarResumoProdutorPdf(data: ResumoProdutorData): void {
  const doc = new jsPDF({ orientation: "landscape" });
  const pageWidth = doc.internal.pageSize.getWidth();
  let yPos = desenharCabecalhoBrand(doc);

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("RESUMO DO PRODUTOR", pageWidth / 2, yPos, { align: "center" });
  yPos += 7;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Produtor: ${data.produtorNome}`, 14, yPos);
  if (data.cpfCnpj) doc.text(`CPF/CNPJ: ${data.cpfCnpj}`, pageWidth / 2, yPos);
  yPos += 5;
  doc.text(`Safra: ${data.safraNome}`, 14, yPos);
  yPos += 6;

  const head = [[
    "Inscrição", "Nome", "Tipo",
    { content: "Depósitos", styles: { halign: "right" as const } },
    { content: "Compras", styles: { halign: "right" as const } },
    { content: "Vendas", styles: { halign: "right" as const } },
    { content: "Devolução", styles: { halign: "right" as const } },
    { content: "Tra.Saída", styles: { halign: "right" as const } },
    { content: "Tra.Entrada", styles: { halign: "right" as const } },
    { content: "Ent.Armaz.", styles: { halign: "right" as const } },
    { content: "Saldo", styles: { halign: "right" as const } },
    { content: "Sacos", styles: { halign: "right" as const } },
  ]];

  const rows = [...data.rows].sort((a, b) =>
    a.local_entrega.localeCompare(b.local_entrega, "pt-BR") ||
    a.cultura.localeCompare(b.cultura, "pt-BR") ||
    a.safra.localeCompare(b.safra, "pt-BR") ||
    a.nome.localeCompare(b.nome, "pt-BR")
  );

  const body: any[] = [];
  const groupHeaderIdx = new Set<number>();
  const subtotalIdx = new Set<number>();

  const num = (n: number) => formatNumber(Math.round(n || 0), 0);
  const sacos = (kg: number, ps: number) => formatNumber(Math.round((kg || 0) / (ps || 60)), 0);

  const emptyRow = (label: string) => [{ content: label, colSpan: 12, styles: { fillColor: [220, 230, 220] as any, fontStyle: "bold" as const, halign: "left" as const } }];

  function blankAcc() {
    return { depositos: 0, compras: 0, vendas: 0, devolucao: 0, tr_saida: 0, tr_entrada: 0, ent_armaz: 0, saldo: 0, ps: 60 };
  }

  let currentLocal = ""; let currentCultura = ""; let currentSafra = "";
  let sumSafra = blankAcc(); let sumCultura = blankAcc(); let sumLocal = blankAcc(); let sumGeral = blankAcc();

  const pushSubtotal = (label: string, s: ReturnType<typeof blankAcc>) => {
    body.push([
      { content: label, colSpan: 3, styles: { fontStyle: "bold" as const, halign: "right" as const } },
      num(s.depositos), num(s.compras), num(s.vendas), num(s.devolucao),
      num(s.tr_saida), num(s.tr_entrada), num(s.ent_armaz), num(s.saldo),
      sacos(s.saldo, s.ps),
    ]);
    subtotalIdx.add(body.length - 1);
  };

  const flushSafra = () => {
    if (currentSafra) pushSubtotal(`Total Safra ${currentSafra} →`, sumSafra);
    sumSafra = blankAcc();
  };
  const flushCultura = () => {
    flushSafra();
    if (currentCultura) pushSubtotal(`Total Cultura ${currentCultura} →`, sumCultura);
    sumCultura = blankAcc();
  };
  const flushLocal = () => {
    flushCultura();
    if (currentLocal) pushSubtotal(`Total Local ${currentLocal} →`, sumLocal);
    sumLocal = blankAcc();
  };

  const addTo = (acc: ReturnType<typeof blankAcc>, r: ResumoProdutorRow) => {
    acc.depositos += r.depositos_kg || 0;
    acc.compras += r.compras_kg || 0;
    acc.vendas += r.vendas_kg || 0;
    acc.devolucao += r.devolucao_kg || 0;
    acc.tr_saida += r.tr_saida_kg || 0;
    acc.tr_entrada += r.tr_entrada_kg || 0;
    acc.ent_armaz += r.ent_armaz_kg || 0;
    acc.saldo += r.saldo_kg || 0;
    acc.ps = r.peso_saca || 60;
  };

  rows.forEach((r) => {
    if (r.local_entrega !== currentLocal) {
      flushLocal();
      currentLocal = r.local_entrega; currentCultura = ""; currentSafra = "";
      body.push(emptyRow(`Local Entrega: ${r.local_entrega}`));
      groupHeaderIdx.add(body.length - 1);
    }
    if (r.cultura !== currentCultura) {
      flushCultura();
      currentCultura = r.cultura; currentSafra = "";
      body.push(emptyRow(`Cultura: ${r.cultura}`));
      groupHeaderIdx.add(body.length - 1);
    }
    if (r.safra !== currentSafra) {
      flushSafra();
      currentSafra = r.safra;
      body.push(emptyRow(`Safra: ${r.safra}`));
      groupHeaderIdx.add(body.length - 1);
    }
    body.push([
      r.inscricao_estadual, r.nome, r.tipo,
      num(r.depositos_kg), num(r.compras_kg), num(r.vendas_kg), num(r.devolucao_kg),
      num(r.tr_saida_kg), num(r.tr_entrada_kg), num(r.ent_armaz_kg), num(r.saldo_kg),
      sacos(r.saldo_kg, r.peso_saca),
    ]);
    addTo(sumSafra, r); addTo(sumCultura, r); addTo(sumLocal, r); addTo(sumGeral, r);
  });
  flushLocal();
  pushSubtotal("TOTAL GERAL →", sumGeral);
  const totalGeralIdx = body.length - 1;

  autoTable(doc, {
    startY: yPos,
    head,
    body,
    styles: { fontSize: 7, cellPadding: 1.2 },
    headStyles: { fillColor: [66, 66, 66], textColor: 255 },
    columnStyles: {
      0: { halign: "left", cellWidth: 28 },
      1: { halign: "left", cellWidth: 55 },
      2: { halign: "left", cellWidth: 18 },
      3: { halign: "right" }, 4: { halign: "right" }, 5: { halign: "right" },
      6: { halign: "right" }, 7: { halign: "right" }, 8: { halign: "right" },
      9: { halign: "right" }, 10: { halign: "right" }, 11: { halign: "right" },
    },
    didParseCell: (d) => {
      if (d.section !== "body") return;
      if (subtotalIdx.has(d.row.index)) {
        d.cell.styles.fillColor = [240, 240, 240];
        d.cell.styles.fontStyle = "bold";
      }
      if (d.row.index === totalGeralIdx) {
        d.cell.styles.fillColor = [200, 200, 200];
      }
    },
  });

  desenharRodapeBrand(doc);
  downloadPdf(doc, `resumo_produtor_${data.produtorNome.replace(/\s/g, "_")}.pdf`);
}

// ==================== RELATÓRIO COLHEITA DIÁRIA ====================

export interface RelColheitaDiariaRow {
  data_colheita: string | null;
  local_nome: string;
  lavoura_ie: string;         // "LAVOURA / IE"
  variedade: string;
  peso_bruto: number;
  perc_impureza: number;
  kg_impureza: number;
  perc_umidade: number;
  perc_desconto: number;
  kg_umidade: number;
  perc_avariados: number;
  kg_avariados: number;
  perc_outros: number;
  kg_outros: number;
  kg_desconto_total: number;
  producao_liquida_kg: number;
  total_sacos: number;
  romaneio: string;
  ph: number;
  ha: number;
  controle_lavoura_id: string | null;
  tipo_colheita: string;      // industria / semente
  tipo_produtor_label: string; // Parceria / Arrendamento / Terceiros

}

export interface RelColheitaDiariaParams {
  safraNome: string;
  culturaNome: string;
  periodo: string;
  tipoProdutorLabel: string;
  localFiltroLabel: string;
  rows: RelColheitaDiariaRow[];
}

export function gerarColheitaDiariaPdf(params: RelColheitaDiariaParams): void {
  const doc = new jsPDF({ orientation: "landscape", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  desenharCabecalhoBrand(doc);

  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("RELATÓRIO RECEBIMENTO DIÁRIO", pageWidth / 2, 34, { align: "center" });

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`SAFRA: ${params.safraNome}`, 14, 41);
  doc.text(`CULTURA: ${params.culturaNome}`, pageWidth / 2, 41, { align: "center" });
  doc.text(`Período: ${params.periodo}`, pageWidth - 14, 41, { align: "right" });
  doc.text(`Tipo: ${params.tipoProdutorLabel}`, 14, 46);
  doc.text(`Local: ${params.localFiltroLabel}`, pageWidth - 14, 46, { align: "right" });

  const rows = params.rows;
  const body: any[] = [];

  const numCols = 19; // qtd colunas
  const spacerCells = (label: string, indexOfLabel = 0): any[] => {
    const arr: any[] = new Array(numCols).fill("");
    arr[indexOfLabel] = label;
    return arr;
  };

  const makeRow = (r: RelColheitaDiariaRow): any[] => [
    r.lavoura_ie,
    r.variedade,
    formatNumber(r.peso_bruto, 0),
    r.perc_impureza ? formatNumber(r.perc_impureza, 2) : "",
    r.kg_impureza ? formatNumber(r.kg_impureza, 0) : "",
    r.perc_umidade ? formatNumber(r.perc_umidade, 2) : "",
    r.perc_desconto ? formatNumber(r.perc_desconto, 2) : "",
    r.kg_umidade ? formatNumber(r.kg_umidade, 0) : "",
    r.perc_avariados ? formatNumber(r.perc_avariados, 2) : "0,00",
    r.kg_avariados ? formatNumber(r.kg_avariados, 0) : "0",
    r.perc_outros ? formatNumber(r.perc_outros, 2) : "0,00",
    r.kg_outros ? formatNumber(r.kg_outros, 0) : "0",
    formatNumber(r.kg_desconto_total, 0),
    formatNumber(r.producao_liquida_kg, 0),
    formatNumber(r.total_sacos, 0),
    r.romaneio || "",
    r.ph ? formatNumber(r.ph, 2) : "0,00",
    "",
    "",

  ];

  const sumRow = (label: string, list: RelColheitaDiariaRow[]): any[] => {
    const s = (fn: (r: RelColheitaDiariaRow) => number) => list.reduce((a, r) => a + (fn(r) || 0), 0);
    const totLiq = s(r => r.producao_liquida_kg);
    const totSacos = s(r => r.total_sacos);
    // HA distinto por controle_lavoura_id (fallback: soma HA quando id é nulo)
    const seen = new Set<string>();
    let totHa = 0;
    list.forEach(r => {
      if (r.controle_lavoura_id) {
        if (!seen.has(r.controle_lavoura_id)) {
          seen.add(r.controle_lavoura_id);
          totHa += r.ha || 0;
        }
      } else {
        totHa += r.ha || 0;
      }
    });
    return [
      label,
      String(list.length),
      formatNumber(s(r => r.peso_bruto), 0),
      "",
      formatNumber(s(r => r.kg_impureza), 0),
      "",
      "",
      formatNumber(s(r => r.kg_umidade), 0),
      "",
      formatNumber(s(r => r.kg_avariados), 0),
      "",
      formatNumber(s(r => r.kg_outros), 0),
      formatNumber(s(r => r.kg_desconto_total), 0),
      formatNumber(totLiq, 0),
      formatNumber(totSacos, 0),
      "",
      "",
      totHa > 0 ? formatNumber(totHa, 2) : "",
      totHa > 0 ? formatNumber(totSacos / totHa, 2) : "",
    ];
  };


  // Agrupamento: Local -> Data
  const boldRows: number[] = [];
  const subtotalRows: number[] = [];
  const groupHeaderRows: number[] = [];

  // Ordenar por local, depois data
  const rowsOrdenadas = [...rows].sort((a, b) => {
    const l = a.local_nome.localeCompare(b.local_nome, "pt-BR");
    if (l !== 0) return l;
    return (a.data_colheita || "").localeCompare(b.data_colheita || "");
  });

  const porLocal = new Map<string, RelColheitaDiariaRow[]>();
  rowsOrdenadas.forEach(r => {
    if (!porLocal.has(r.local_nome)) porLocal.set(r.local_nome, []);
    porLocal.get(r.local_nome)!.push(r);
  });

  porLocal.forEach((lista, local) => {
    // cabeçalho do local
    body.push(spacerCells(`Local Entrega: ${local}`));
    groupHeaderRows.push(body.length - 1);

    const porData = new Map<string, RelColheitaDiariaRow[]>();
    lista.forEach(r => {
      const k = r.data_colheita || "";
      if (!porData.has(k)) porData.set(k, []);
      porData.get(k)!.push(r);
    });

    porData.forEach((rowsDia, data) => {
      rowsDia.forEach(r => body.push(makeRow(r)));
      const totalRow = sumRow(`Total do Dia --> ${formatDate(data)}`, rowsDia);
      body.push(totalRow);
      subtotalRows.push(body.length - 1);
    });

    // total do local
    const totalLocal = sumRow(`Loc.Entrega: ${local}`, lista);
    body.push(totalLocal);
    boldRows.push(body.length - 1);
  });

  // Total período
  const totalGeral = sumRow(`TOTAL PERÍODO -->`, rowsOrdenadas);
  body.push(totalGeral);
  boldRows.push(body.length - 1);

  autoTable(doc, {
    startY: 51,
    head: [[
      "Produtor/CPF", "Variedade",
      { content: "Kgs.Bruto", styles: { halign: "right" } },
      { content: "%Imp", styles: { halign: "right" } },
      { content: "Kgs.Imp", styles: { halign: "right" } },
      { content: "%Um", styles: { halign: "right" } },
      { content: "%Desc", styles: { halign: "right" } },
      { content: "Kgs.Umid", styles: { halign: "right" } },
      { content: "%Avar", styles: { halign: "right" } },
      { content: "Avar.", styles: { halign: "right" } },
      { content: "%Outr", styles: { halign: "right" } },
      { content: "Outros", styles: { halign: "right" } },
      { content: "Kgs.Desc", styles: { halign: "right" } },
      { content: "Kgs.Líquido", styles: { halign: "right" } },
      { content: "SACOS", styles: { halign: "right" } },
      { content: "Romaneio", styles: { halign: "center" } },
      { content: "PH", styles: { halign: "right" } },
      { content: "HA", styles: { halign: "right" } },
      { content: "MÉDIA", styles: { halign: "right" } },
    ]],
    body,
    styles: { fontSize: 6.5, cellPadding: 1 },
    headStyles: { fillColor: [66, 66, 66], textColor: 255, fontSize: 7 },
    columnStyles: {
      0: { halign: "left", cellWidth: 34 },
      1: { halign: "left", cellWidth: 30 },
      2: { halign: "right" }, 3: { halign: "right" }, 4: { halign: "right" },
      5: { halign: "right" }, 6: { halign: "right" }, 7: { halign: "right" },
      8: { halign: "right" }, 9: { halign: "right" }, 10: { halign: "right" },
      11: { halign: "right" }, 12: { halign: "right" }, 13: { halign: "right" },
      14: { halign: "right" }, 15: { halign: "center" }, 16: { halign: "right" },
      17: { halign: "right" }, 18: { halign: "right" },
    },
    didParseCell: (d) => {
      if (d.section !== "body") return;
      if (groupHeaderRows.includes(d.row.index)) {
        d.cell.styles.fontStyle = "bold";
        d.cell.styles.fillColor = [220, 230, 241];
      } else if (boldRows.includes(d.row.index)) {
        d.cell.styles.fontStyle = "bold";
        d.cell.styles.fillColor = [200, 200, 200];
      } else if (subtotalRows.includes(d.row.index)) {
        d.cell.styles.fontStyle = "bold";
        d.cell.styles.fillColor = [235, 235, 235];
      }
    },
  });

  // Resumo por Variedade
  let finalY = (doc as any).lastAutoTable.finalY + 6;
  const porVariedade = new Map<string, { kg: number; sacos: number }>();
  rowsOrdenadas.forEach(r => {
    const cur = porVariedade.get(r.variedade) || { kg: 0, sacos: 0 };
    cur.kg += r.producao_liquida_kg || 0;
    cur.sacos += r.total_sacos || 0;
    porVariedade.set(r.variedade, cur);
  });
  const resumoBody: any[] = Array.from(porVariedade.entries()).map(([v, t]) => [
    v, formatNumber(t.kg, 0), formatNumber(t.sacos, 0),
  ]);
  const totKg = rowsOrdenadas.reduce((s, r) => s + (r.producao_liquida_kg || 0), 0);
  const totSc = rowsOrdenadas.reduce((s, r) => s + (r.total_sacos || 0), 0);
  resumoBody.push(["TOTAL PERÍODO", formatNumber(totKg, 0), formatNumber(totSc, 0)]);

  if (finalY > doc.internal.pageSize.getHeight() - 40) {
    doc.addPage();
    finalY = 20;
  }

  autoTable(doc, {
    startY: finalY,
    head: [[{ content: "RESUMO VARIEDADE", colSpan: 3, styles: { halign: "center" } }],
      ["Variedade",
        { content: "Kgs.Líquido", styles: { halign: "right" } },
        { content: "Sacos", styles: { halign: "right" } }]],
    body: resumoBody,
    styles: { fontSize: 8, cellPadding: 1.5 },
    headStyles: { fillColor: [66, 66, 66], textColor: 255 },
    columnStyles: { 0: { halign: "left", cellWidth: 80 }, 1: { halign: "right", cellWidth: 40 }, 2: { halign: "right", cellWidth: 30 } },
    tableWidth: 150,
    margin: { left: pageWidth / 2 - 75 },
    didParseCell: (d) => {
      if (d.section === "body" && d.row.index === resumoBody.length - 1) {
        d.cell.styles.fontStyle = "bold";
        d.cell.styles.fillColor = [200, 200, 200];
      }
    },
  });

  desenharRodapeBrand(doc);
  downloadPdf(doc, "colheita_diaria.pdf");
}

// ==================== RELATÓRIO RESUMO DA COLHEITA POR LAVOURA ====================

export interface RelResumoColheitaRow {
  cultura_nome: string;
  local_nome: string;
  lavoura_nome: string;
  controle_lavoura_id: string | null;
  ha: number;
  peso_bruto: number;
  perc_impureza: number;
  kg_impureza: number;
  perc_umidade: number;
  perc_desconto: number;
  kg_umidade: number;
  perc_avariados: number;
  kg_avariados: number;
  perc_outros: number;
  kg_outros: number;
  kg_desconto_total: number;
  producao_liquida_kg: number;
  total_sacos: number;
}

export interface RelResumoColheitaLavouraParams {
  safraNome: string;
  culturaNome: string;
  tipoProdutorLabel: string;
  rows: RelResumoColheitaRow[];
}

export function gerarResumoColheitaLavouraPdf(params: RelResumoColheitaLavouraParams): void {
  const doc = new jsPDF({ orientation: "landscape", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  desenharCabecalhoBrand(doc);

  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("Relatório da colheita das Lavouras", pageWidth / 2, 34, { align: "center" });

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`SAFRA: ${params.safraNome}`, 14, 41);
  doc.text(`CULTURA: ${params.culturaNome}`, pageWidth / 2, 41, { align: "center" });
  doc.text(`Tipo Produtor: ${params.tipoProdutorLabel}`, pageWidth - 14, 41, { align: "right" });

  const numCols = 17;
  const spacerCells = (label: string): any[] => {
    const arr: any[] = new Array(numCols).fill("");
    arr[0] = label;
    return arr;
  };

  const wavg = (list: RelResumoColheitaRow[], getPct: (r: RelResumoColheitaRow) => number) => {
    const totBruto = list.reduce((a, r) => a + (r.peso_bruto || 0), 0);
    if (totBruto <= 0) return 0;
    const soma = list.reduce((a, r) => a + (getPct(r) || 0) * (r.peso_bruto || 0), 0);
    return soma / totBruto;
  };

  const haDistinto = (list: RelResumoColheitaRow[]): number => {
    const seen = new Set<string>();
    let tot = 0;
    list.forEach(r => {
      if (r.controle_lavoura_id) {
        if (!seen.has(r.controle_lavoura_id)) {
          seen.add(r.controle_lavoura_id);
          tot += r.ha || 0;
        }
      } else {
        tot += r.ha || 0;
      }
    });
    return tot;
  };

  const makeLavouraRow = (lavoura: string, list: RelResumoColheitaRow[]): any[] => {
    const s = (fn: (r: RelResumoColheitaRow) => number) => list.reduce((a, r) => a + (fn(r) || 0), 0);
    const totSacos = s(r => r.total_sacos);
    const ha = haDistinto(list);
    return [
      lavoura,
      String(list.length),
      formatNumber(s(r => r.peso_bruto), 0),
      formatNumber(wavg(list, r => r.perc_impureza), 2),
      formatNumber(s(r => r.kg_impureza), 0),
      formatNumber(wavg(list, r => r.perc_umidade), 2),
      formatNumber(wavg(list, r => r.perc_desconto), 2),
      formatNumber(s(r => r.kg_umidade), 0),
      formatNumber(wavg(list, r => r.perc_avariados), 2),
      formatNumber(s(r => r.kg_avariados), 0),
      formatNumber(wavg(list, r => r.perc_outros), 2),
      formatNumber(s(r => r.kg_outros), 0),
      formatNumber(s(r => r.kg_desconto_total), 0),
      formatNumber(s(r => r.producao_liquida_kg), 0),
      formatNumber(totSacos, 0),
      ha > 0 ? formatNumber(ha, 2) : "",
      ha > 0 ? formatNumber(totSacos / ha, 2) : "",
    ];
  };

  const sumRow = (label: string, list: RelResumoColheitaRow[]): any[] => {
    const s = (fn: (r: RelResumoColheitaRow) => number) => list.reduce((a, r) => a + (fn(r) || 0), 0);
    const totSacos = s(r => r.total_sacos);
    const ha = haDistinto(list);
    return [
      label,
      String(list.length),
      formatNumber(s(r => r.peso_bruto), 0),
      formatNumber(wavg(list, r => r.perc_impureza), 2),
      formatNumber(s(r => r.kg_impureza), 0),
      formatNumber(wavg(list, r => r.perc_umidade), 2),
      formatNumber(wavg(list, r => r.perc_desconto), 2),
      formatNumber(s(r => r.kg_umidade), 0),
      formatNumber(wavg(list, r => r.perc_avariados), 2),
      formatNumber(s(r => r.kg_avariados), 0),
      formatNumber(wavg(list, r => r.perc_outros), 2),
      formatNumber(s(r => r.kg_outros), 0),
      formatNumber(s(r => r.kg_desconto_total), 0),
      formatNumber(s(r => r.producao_liquida_kg), 0),
      formatNumber(totSacos, 0),
      ha > 0 ? formatNumber(ha, 2) : "",
      ha > 0 ? formatNumber(totSacos / ha, 2) : "",
    ];
  };

  const body: any[] = [];
  const groupHeaderRows: number[] = [];
  const subtotalRows: number[] = [];
  const boldRows: number[] = [];

  const porCultura = new Map<string, RelResumoColheitaRow[]>();
  params.rows.forEach(r => {
    const k = r.cultura_nome || "-";
    if (!porCultura.has(k)) porCultura.set(k, []);
    porCultura.get(k)!.push(r);
  });
  const culturasOrdenadas = Array.from(porCultura.keys()).sort((a, b) => a.localeCompare(b, "pt-BR"));

  culturasOrdenadas.forEach(cultura => {
    const listaCultura = porCultura.get(cultura)!;
    body.push(spacerCells(`CULTURA: ${cultura}`));
    groupHeaderRows.push(body.length - 1);

    const porLocal = new Map<string, RelResumoColheitaRow[]>();
    listaCultura.forEach(r => {
      const k = r.local_nome || "-";
      if (!porLocal.has(k)) porLocal.set(k, []);
      porLocal.get(k)!.push(r);
    });
    const locaisOrdenados = Array.from(porLocal.keys()).sort((a, b) => a.localeCompare(b, "pt-BR"));

    locaisOrdenados.forEach(local => {
      const listaLocal = porLocal.get(local)!;
      body.push(spacerCells(`LOCAL ENTREGA: ${local}`));
      groupHeaderRows.push(body.length - 1);

      const porLavoura = new Map<string, RelResumoColheitaRow[]>();
      listaLocal.forEach(r => {
        const k = r.lavoura_nome || "-";
        if (!porLavoura.has(k)) porLavoura.set(k, []);
        porLavoura.get(k)!.push(r);
      });
      const lavourasOrdenadas = Array.from(porLavoura.keys()).sort((a, b) => a.localeCompare(b, "pt-BR"));

      lavourasOrdenadas.forEach(lav => {
        body.push(makeLavouraRow(lav, porLavoura.get(lav)!));
      });

      body.push(sumRow(local, listaLocal));
      subtotalRows.push(body.length - 1);
    });

    body.push(sumRow(`${params.tipoProdutorLabel} ===>`, listaCultura));
    boldRows.push(body.length - 1);

    body.push(sumRow("LOCAL ENTREGA -->", listaCultura));
    boldRows.push(body.length - 1);
  });

  body.push(sumRow("TOTAL GERAL -->", params.rows));
  boldRows.push(body.length - 1);

  autoTable(doc, {
    startY: 48,
    head: [[
      "LAVOURA",
      { content: "Qtd", styles: { halign: "right" } },
      { content: "Kgs.Bruto", styles: { halign: "right" } },
      { content: "%Imp.", styles: { halign: "right" } },
      { content: "Kgs.Imp.", styles: { halign: "right" } },
      { content: "%Umid.", styles: { halign: "right" } },
      { content: "%Desc.", styles: { halign: "right" } },
      { content: "Kgs.Umid.", styles: { halign: "right" } },
      { content: "%Avar.", styles: { halign: "right" } },
      { content: "Kgs.Avar.", styles: { halign: "right" } },
      { content: "%Outr.", styles: { halign: "right" } },
      { content: "Kgs.Outr.", styles: { halign: "right" } },
      { content: "Kgs.Desc.", styles: { halign: "right" } },
      { content: "Kgs.Liquido", styles: { halign: "right" } },
      { content: "SACOS", styles: { halign: "right" } },
      { content: "HA", styles: { halign: "right" } },
      { content: "MÉDIA", styles: { halign: "right" } },
    ]],
    body,
    styles: { fontSize: 7, cellPadding: 1 },
    headStyles: { fillColor: [66, 66, 66], textColor: 255, fontSize: 7.5 },
    columnStyles: {
      0: { halign: "left", cellWidth: 42 },
      1: { halign: "right" },
      2: { halign: "right" }, 3: { halign: "right" }, 4: { halign: "right" },
      5: { halign: "right" }, 6: { halign: "right" }, 7: { halign: "right" },
      8: { halign: "right" }, 9: { halign: "right" }, 10: { halign: "right" },
      11: { halign: "right" }, 12: { halign: "right" }, 13: { halign: "right" },
      14: { halign: "right" }, 15: { halign: "right" }, 16: { halign: "right" },
    },
    didParseCell: (d) => {
      if (d.section !== "body") return;
      if (groupHeaderRows.includes(d.row.index)) {
        d.cell.styles.fontStyle = "bold";
        d.cell.styles.fillColor = [220, 230, 241];
      } else if (boldRows.includes(d.row.index)) {
        d.cell.styles.fontStyle = "bold";
        d.cell.styles.fillColor = [200, 200, 200];
      } else if (subtotalRows.includes(d.row.index)) {
        d.cell.styles.fontStyle = "bold";
        d.cell.styles.fillColor = [235, 235, 235];
      }
    },
  });

  desenharRodapeBrand(doc);
  downloadPdf(doc, "resumo_colheita_lavoura.pdf");
}


