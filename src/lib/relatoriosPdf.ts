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

export interface ExtratoCompra {
  data_compra: string;
  contraparte: string | null;
  quantidade_kg: number;
  nfe: string | null;
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
  comprasAdquiridas?: ExtratoCompra[]; // sócio como comprador (entrada)
  comprasVendidas?: ExtratoCompra[];    // sócio como vendedor (saída)
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

  // Trunca textos longos para garantir uma única linha por célula
  const trunc = (s: string, n: number) => {
    const t = (s || "").trim();
    return t.length > n ? t.slice(0, n - 1) + "…" : t;
  };

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
      styles: { fontSize: 7, cellPadding: 1.2, overflow: "ellipsize" },
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
      trunc(localOf(c.local_entrega), 18),
      formatDate(c.data_colheita),
      trunc(c.lavoura || "-", 20),
      trunc(c.variedade || "-", 26),
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
      0: { halign: "left", cellWidth: 24, overflow: "ellipsize" },
      1: { halign: "center", cellWidth: 18 },
      2: { halign: "left", cellWidth: 26, overflow: "ellipsize" },
      3: { halign: "left", cellWidth: 34, overflow: "ellipsize" },
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

  // COMPRAS DE CEREAIS — como COMPRADOR (entrada)
  const comprasAdq = data.comprasAdquiridas || [];
  renderSection<ExtratoCompra>(
    "COMPRAS DE CEREAIS (Sócio Comprador)",
    comprasAdq,
    (c) => localOf(c.local_entrega),
    (c) => [
      localOf(c.local_entrega),
      formatDate(c.data_compra),
      c.contraparte || "-",
      c.nfe || "-",
      formatNumber(c.quantidade_kg, 0),
      toSacas(c.quantidade_kg),
    ],
    2,
    (list) => {
      const tot = sumBy(list, "quantidade_kg");
      return [formatNumber(tot, 0), toSacas(tot)];
    },
    [
      "Local",
      { content: "Data", styles: { halign: "center" } },
      "Vendedor",
      "NFe",
      { content: "Qtd (kg)", styles: { halign: "right" } },
      { content: "Sacas", styles: { halign: "right" } },
    ],
    { 0: { halign: "left", cellWidth: 30 }, 1: { halign: "center", cellWidth: 25 }, 2: { halign: "left" }, 3: { halign: "left", cellWidth: 22 }, 4: { halign: "right", cellWidth: 28 }, 5: { halign: "right", cellWidth: 24 } },
    4,
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
  const totalCompAdq = (data.comprasAdquiridas || []).reduce((s, c) => s + (c.quantidade_kg || 0), 0);
  // Kg de Taxa de Armazenagem é crédito do sócio recebedor da taxa, não sai do estoque do produtor.
  const saldo = totalColheitas + totalRecebidas + totalCompAdq - totalEnviadas - totalDevolucoes;


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
    ["(+) Compras Adquiridas", fmtKgSc(totalCompAdq)],
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

// ==================== EXTRATO DE DEPÓSITOS POR PRODUTOR ====================

export interface RelExtratoDepRow {
  local_nome: string;
  inscricao_id: string;
  inscricao_estadual: string;
  inscricao_nome: string;      // "MARCIO GRINGS - BOA VISTA DO INCRA"
  data_colheita: string | null;
  romaneio: string;
  tipo_colheita: string;
  peso_bruto: number;
  peso_tara: number;
  peso_liquido: number;        // bruto - tara
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
  ph: number;
  variedade: string;
}

export interface RelExtratoDepParams {
  produtorNome: string;
  safraNome: string;
  culturaNome: string;
  filtroInscricao: string | null; // rótulo quando individual; null = geral
  orientation?: "portrait" | "landscape";
  format?: "a4" | "a3" | "letter" | "legal";
  rows: RelExtratoDepRow[];
}

export function gerarExtratoDepositosProdutorPdf(params: RelExtratoDepParams): void {
  const doc = new jsPDF({
    orientation: params.orientation || "landscape",
    format: params.format || "a4",
  });
  const pageWidth = doc.internal.pageSize.getWidth();
  desenharCabecalhoBrand(doc);

  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("EXTRATO DE DEPÓSITOS", pageWidth / 2, 34, { align: "center" });

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Produtor: ${params.produtorNome}`, 14, 41);
  doc.text(`Safra: ${params.safraNome}`, pageWidth / 2, 41, { align: "center" });
  doc.text(`Cultura: ${params.culturaNome}`, pageWidth - 14, 41, { align: "right" });
  if (params.filtroInscricao) {
    doc.text(`Filtro por IE: ${params.filtroInscricao}`, 14, 46);
  }

  const numCols = 20; // total de colunas
  const spacerCells = (label: string): any[] => {
    const arr: any[] = new Array(numCols).fill("");
    arr[0] = label;
    return arr;
  };

  const rows = params.rows;
  const body: any[] = [];
  const groupHeaderRows: number[] = []; // Local
  const subgroupHeaderRows: number[] = []; // Inscrição
  const dayTotalRows: number[] = [];
  const inscTotalRows: number[] = [];
  const localTotalRows: number[] = [];
  const totalGeralRows: number[] = [];

  // Média ponderada (impureza/umidade) usando produção líquida como peso
  const mediaPond = (list: RelExtratoDepRow[], fn: (r: RelExtratoDepRow) => number): number => {
    const totPeso = list.reduce((a, r) => a + (r.producao_liquida_kg || 0), 0);
    if (totPeso <= 0) return 0;
    const acc = list.reduce((a, r) => a + (fn(r) || 0) * (r.producao_liquida_kg || 0), 0);
    return acc / totPeso;
  };

  const somaRow = (label: string, list: RelExtratoDepRow[]): any[] => {
    const s = (fn: (r: RelExtratoDepRow) => number) => list.reduce((a, r) => a + (fn(r) || 0), 0);
    return [
      label,
      String(list.length),
      "",
      formatNumber(s(r => r.peso_bruto), 0),
      formatNumber(s(r => r.peso_tara), 0),
      formatNumber(s(r => r.peso_liquido), 0),
      formatNumber(mediaPond(list, r => r.perc_impureza), 2),
      formatNumber(s(r => r.kg_impureza), 0),
      formatNumber(mediaPond(list, r => r.perc_umidade), 2),
      "",
      formatNumber(s(r => r.kg_umidade), 0),
      formatNumber(s(r => r.kg_avariados), 0),
      formatNumber(s(r => r.kg_outros), 0),
      formatNumber(s(r => r.kg_desconto_total), 0),
      formatNumber(s(r => r.producao_liquida_kg), 0),
      formatNumber(s(r => r.total_sacos), 0),
      "",
      "",
      "",
      "",
    ];
  };

  // Ordenar por Local -> Inscrição (por IE) -> Data -> Romaneio
  const rowsOrdenadas = [...rows].sort((a, b) => {
    const l = a.local_nome.localeCompare(b.local_nome, "pt-BR");
    if (l !== 0) return l;
    const ie = a.inscricao_estadual.localeCompare(b.inscricao_estadual, "pt-BR");
    if (ie !== 0) return ie;
    const d = (a.data_colheita || "").localeCompare(b.data_colheita || "");
    if (d !== 0) return d;
    return (a.romaneio || "").localeCompare(b.romaneio || "", "pt-BR", { numeric: true });
  });

  // Agrupamento Local -> Inscrição -> Data
  const porLocal = new Map<string, RelExtratoDepRow[]>();
  rowsOrdenadas.forEach(r => {
    if (!porLocal.has(r.local_nome)) porLocal.set(r.local_nome, []);
    porLocal.get(r.local_nome)!.push(r);
  });

  porLocal.forEach((listaLocal, local) => {
    body.push(spacerCells(`Local Entrega: ${local}`));
    groupHeaderRows.push(body.length - 1);

    const porInsc = new Map<string, RelExtratoDepRow[]>();
    listaLocal.forEach(r => {
      const k = r.inscricao_id;
      if (!porInsc.has(k)) porInsc.set(k, []);
      porInsc.get(k)!.push(r);
    });

    porInsc.forEach((listaInsc) => {
      const first = listaInsc[0];
      body.push(spacerCells(`Inscrição: ${first.inscricao_estadual}   Nome: ${first.inscricao_nome}`));
      subgroupHeaderRows.push(body.length - 1);

      let acumKg = 0;
      let acumSc = 0;

      const porData = new Map<string, RelExtratoDepRow[]>();
      listaInsc.forEach(r => {
        const k = r.data_colheita || "";
        if (!porData.has(k)) porData.set(k, []);
        porData.get(k)!.push(r);
      });

      porData.forEach((rowsDia, data) => {
        rowsDia.forEach(r => {
          acumKg += r.producao_liquida_kg || 0;
          acumSc += r.total_sacos || 0;
          body.push([
            formatDate(r.data_colheita),
            r.romaneio || "",
            r.tipo_colheita || "",
            formatNumber(r.peso_bruto, 0),
            formatNumber(r.peso_tara, 0),
            formatNumber(r.peso_liquido, 0),
            r.perc_impureza ? formatNumber(r.perc_impureza, 2) : "",
            r.kg_impureza ? formatNumber(r.kg_impureza, 0) : "",
            r.perc_umidade ? formatNumber(r.perc_umidade, 2) : "",
            r.perc_desconto ? formatNumber(r.perc_desconto, 2) : "",
            r.kg_umidade ? formatNumber(r.kg_umidade, 0) : "",
            r.kg_avariados ? formatNumber(r.kg_avariados, 0) : "0",
            r.kg_outros ? formatNumber(r.kg_outros, 0) : "0",
            formatNumber(r.kg_desconto_total, 0),
            formatNumber(r.producao_liquida_kg, 0),
            formatNumber(r.total_sacos, 0),
            formatNumber(acumKg, 0),
            formatNumber(acumSc, 0),
            r.ph ? formatNumber(r.ph, 2) : "0,00",
            r.variedade || "",
          ]);
        });
        const totDia = somaRow(`Total do Dia --> ${formatDate(data)}`, rowsDia);
        body.push(totDia);
        dayTotalRows.push(body.length - 1);
      });

      const totInsc = somaRow(`Total Inscrição --> ${first.inscricao_estadual}`, listaInsc);
      body.push(totInsc);
      inscTotalRows.push(body.length - 1);
    });

    const totLocal = somaRow(`Total Local Entrega --> ${local}`, listaLocal);
    body.push(totLocal);
    localTotalRows.push(body.length - 1);
  });

  const totGeral = somaRow(`TOTAL GERAL --->`, rowsOrdenadas);
  body.push(totGeral);
  totalGeralRows.push(body.length - 1);

  autoTable(doc, {
    startY: params.filtroInscricao ? 51 : 46,
    head: [[
      { content: "Data", styles: { halign: "center" } },
      { content: "Roma.", styles: { halign: "center" } },
      { content: "Tipo", styles: { halign: "center" } },
      { content: "Bruto", styles: { halign: "right" } },
      { content: "Tara", styles: { halign: "right" } },
      { content: "Líquido", styles: { halign: "right" } },
      { content: "%Imp", styles: { halign: "right" } },
      { content: "Kg.Imp", styles: { halign: "right" } },
      { content: "%Um", styles: { halign: "right" } },
      { content: "%Um.Dsc", styles: { halign: "right" } },
      { content: "Kg.Um", styles: { halign: "right" } },
      { content: "Avar", styles: { halign: "right" } },
      { content: "Out.", styles: { halign: "right" } },
      { content: "Kg.Desc.", styles: { halign: "right" } },
      { content: "Líq.Final", styles: { halign: "right" } },
      { content: "Sacos", styles: { halign: "right" } },
      { content: "Acum.Kg", styles: { halign: "right" } },
      { content: "Acum.Sc", styles: { halign: "right" } },
      { content: "PH", styles: { halign: "right" } },
      { content: "Variedade", styles: { halign: "left" } },
    ]],
    body,
    styles: { fontSize: 6.5, cellPadding: 1 },
    headStyles: { fillColor: [66, 66, 66], textColor: 255, fontSize: 7 },
    columnStyles: {
      0: { halign: "center" },
      1: { halign: "center" },
      2: { halign: "center" },
      3: { halign: "right" }, 4: { halign: "right" }, 5: { halign: "right" },
      6: { halign: "right" }, 7: { halign: "right" }, 8: { halign: "right" },
      9: { halign: "right" }, 10: { halign: "right" }, 11: { halign: "right" },
      12: { halign: "right" }, 13: { halign: "right" }, 14: { halign: "right" },
      15: { halign: "right" }, 16: { halign: "right" }, 17: { halign: "right" },
      18: { halign: "right" }, 19: { halign: "left" },
    },
    didParseCell: (d) => {
      if (d.section !== "body") return;
      const idx = d.row.index;
      if (groupHeaderRows.includes(idx)) {
        d.cell.styles.fontStyle = "bold";
        d.cell.styles.fillColor = [200, 220, 240];
      } else if (subgroupHeaderRows.includes(idx)) {
        d.cell.styles.fontStyle = "bold";
        d.cell.styles.fillColor = [225, 235, 245];
      } else if (totalGeralRows.includes(idx)) {
        d.cell.styles.fontStyle = "bold";
        d.cell.styles.fillColor = [180, 180, 180];
      } else if (localTotalRows.includes(idx)) {
        d.cell.styles.fontStyle = "bold";
        d.cell.styles.fillColor = [205, 205, 205];
      } else if (inscTotalRows.includes(idx)) {
        d.cell.styles.fontStyle = "bold";
        d.cell.styles.fillColor = [225, 225, 225];
      } else if (dayTotalRows.includes(idx)) {
        d.cell.styles.fontStyle = "bold";
        d.cell.styles.fillColor = [240, 240, 240];
      }
    },
  });

  desenharRodapeBrand(doc);
  downloadPdf(doc, `extrato_depositos_${params.produtorNome.replace(/\s/g, "_")}.pdf`);
}


// ==================== EXTRATO DE MOVIMENTAÇÃO (livro-razão cronológico) ====================

export type MovOperacao =
  | "deposito"
  | "venda"
  | "compra"
  | "transf_entrada"
  | "transf_saida"
  | "devolucao";

export interface ExtratoMovRow {
  local_nome: string;
  inscricao_id: string;
  inscricao_estadual: string;
  inscricao_nome: string;
  data: string;
  operacao: MovOperacao;
  docto: string;
  tipo: string;
  variedade: string;
  kilos: number;
  sacos: number;
  nfe: string;
  contraparte: string;
}

export interface ExtratoMovParams {
  produtorNome: string;
  cpfCnpj: string | null;
  safraNome: string;
  filtroInscricao: string | null;
  orientation?: "portrait" | "landscape";
  format?: "a4" | "a3" | "letter" | "legal";
  rows: ExtratoMovRow[];
}

const OP_LABELS: Record<MovOperacao, { code: string; label: string }> = {
  deposito: { code: "1", label: "Deposito" },
  venda: { code: "2", label: "Venda" },
  transf_saida: { code: "4", label: "Transf.Saida" },
  transf_entrada: { code: "5", label: "Transf.Entrada" },
  devolucao: { code: "6", label: "Devolucao" },
  compra: { code: "7", label: "Compras" },
};

export function gerarExtratoMovimentacaoPdf(params: ExtratoMovParams): void {
  const doc = new jsPDF({
    orientation: params.orientation || "landscape",
    format: params.format || "a4",
  });
  const pageWidth = doc.internal.pageSize.getWidth();

  const trunc = (s: string, n: number) => {
    if (!s) return "";
    const str = String(s).trim();
    return str.length > n ? str.substring(0, n - 1) + "…" : str;
  };

  const drawTopBanner = (localCtx: string, inscCtx: string, cont: boolean) => {
    desenharCabecalhoBrand(doc);
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text(
      cont ? "EXTRATO DE MOVIMENTAÇÃO (cont.)" : "EXTRATO DE MOVIMENTAÇÃO",
      pageWidth / 2,
      34,
      { align: "center" },
    );
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`Produtor: ${params.produtorNome}`, 14, 41);
    if (params.cpfCnpj) doc.text(`CPF/CNPJ: ${params.cpfCnpj}`, pageWidth / 2, 41, { align: "center" });
    doc.text(`Safra: ${params.safraNome}`, pageWidth - 14, 41, { align: "right" });
    if (params.filtroInscricao) {
      doc.setFontSize(8);
      doc.text(`Filtro por IE: ${params.filtroInscricao}`, 14, 46);
    }
    if (cont) {
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      if (localCtx) doc.text(`Local: ${trunc(localCtx, 60)}`, 14, 50);
      if (inscCtx) doc.text(`Inscrição: ${trunc(inscCtx, 80)}`, pageWidth / 2, 50, { align: "center" });
      doc.setFont("helvetica", "normal");
    }
  };

  drawTopBanner("", "", false);

  const sorted = [...params.rows].sort((a, b) => {
    const l = a.local_nome.localeCompare(b.local_nome, "pt-BR");
    if (l !== 0) return l;
    const ie = (b.inscricao_estadual || "").localeCompare(a.inscricao_estadual || "", "pt-BR");
    if (ie !== 0) return ie;
    const da = (a.data || "").localeCompare(b.data || "");
    if (da !== 0) return da;
    return (a.docto || "").localeCompare(b.docto || "", "pt-BR", { numeric: true });
  });

  const numCols = 10;
  const body: any[] = [];
  const groupHeaderRows: number[] = [];
  const subgroupHeaderRows: number[] = [];
  const inscTotalRows: number[] = [];
  const localTotalRows: number[] = [];
  const totalGeralRows: number[] = [];
  // Contexto por índice de linha (para banner de continuação)
  const rowLocal: string[] = [];
  const rowInsc: string[] = [];

  const spacer = (label: string): any[] => [{ content: label, colSpan: numCols, styles: { fontStyle: "bold" } }];

  type ResumoAcc = { local: string; opLabel: string; produto: string; entradas: number; saidas: number; sacos: number };
  const resumoMap = new Map<string, ResumoAcc>();
  const addResumo = (r: ExtratoMovRow) => {
    const opLabel = OP_LABELS[r.operacao].label;
    const produto = (r.operacao === "venda" || r.operacao === "devolucao") ? "" : (r.variedade || "");
    const key = `${r.local_nome}|${opLabel}|${produto}`;
    const acc = resumoMap.get(key) || { local: r.local_nome, opLabel, produto, entradas: 0, saidas: 0, sacos: 0 };
    if (r.kilos >= 0) acc.entradas += r.kilos; else acc.saidas += r.kilos;
    acc.sacos += r.sacos;
    resumoMap.set(key, acc);
  };

  let currentLocal = "";
  let currentInsc = "";
  let currentLocalLabel = "";
  let currentInscLabel = "";
  let localKilos = 0, localSacos = 0;
  let inscKilos = 0, inscSacos = 0, inscSaldo = 0;
  let totalGeralKilos = 0, totalGeralSacos = 0;

  // Sacos dos totais são derivados do total em kg (evita resíduo de arredondamento por linha)
  const sacosDeKg = (kg: number) => Math.round(kg / 60);

  const flushInscTotal = () => {
    if (!currentInsc) return;
    body.push([
      { content: "Total da Inscrição -->", colSpan: 5, styles: { fontStyle: "bold", halign: "right" } },
      { content: formatNumber(inscKilos, 0), styles: { fontStyle: "bold", halign: "right" } },
      { content: formatNumber(sacosDeKg(inscKilos), 0), styles: { fontStyle: "bold", halign: "right" } },
      { content: "", colSpan: 3 },
    ]);
    inscTotalRows.push(body.length - 1);
    rowLocal.push(currentLocalLabel);
    rowInsc.push(currentInscLabel);
    inscKilos = 0; inscSacos = 0; inscSaldo = 0;
  };
  const flushLocalTotal = () => {
    if (!currentLocal) return;
    body.push([
      { content: "Total Local Entrega -->", colSpan: 5, styles: { fontStyle: "bold", halign: "right" } },
      { content: formatNumber(localKilos, 0), styles: { fontStyle: "bold", halign: "right" } },
      { content: formatNumber(sacosDeKg(localKilos), 0), styles: { fontStyle: "bold", halign: "right" } },
      { content: "", colSpan: 3 },
    ]);
    localTotalRows.push(body.length - 1);
    rowLocal.push(currentLocalLabel);
    rowInsc.push("");
    localKilos = 0; localSacos = 0;
  };


  sorted.forEach((r) => {
    if (r.local_nome !== currentLocal) {
      flushInscTotal();
      flushLocalTotal();
      currentLocal = r.local_nome;
      currentLocalLabel = r.local_nome;
      currentInsc = "";
      currentInscLabel = "";
      body.push(spacer(`Local Entrega:  ${r.local_nome}`));
      groupHeaderRows.push(body.length - 1);
      rowLocal.push(currentLocalLabel);
      rowInsc.push("");
    }
    if (r.inscricao_id !== currentInsc) {
      flushInscTotal();
      currentInsc = r.inscricao_id;
      currentInscLabel = `${r.inscricao_estadual} — ${r.inscricao_nome}`;
      body.push(spacer(`Inscrição:  ${r.inscricao_estadual}   —   ${r.inscricao_nome}`));
      subgroupHeaderRows.push(body.length - 1);
      rowLocal.push(currentLocalLabel);
      rowInsc.push(currentInscLabel);
    }

    inscSaldo += r.kilos;
    inscKilos += r.kilos;
    inscSacos += r.sacos;
    localKilos += r.kilos;
    localSacos += r.sacos;
    totalGeralKilos += r.kilos;
    totalGeralSacos += r.sacos;
    addResumo(r);

    const op = OP_LABELS[r.operacao];
    body.push([
      { content: formatDate(r.data), styles: { halign: "center" } },
      `${op.code} ${op.label}`,
      { content: r.docto || "", styles: { halign: "right" } },
      trunc(r.tipo || "", 12),
      trunc(r.variedade || "", 22),
      { content: formatNumber(r.kilos, 0), styles: { halign: "right" } },
      { content: formatNumber(r.sacos, 0), styles: { halign: "right" } },
      { content: formatNumber(inscSaldo, 0), styles: { halign: "right" } },
      { content: r.nfe || "", styles: { halign: "right" } },
      trunc(r.contraparte || "", 42),
    ]);
    rowLocal.push(currentLocalLabel);
    rowInsc.push(currentInscLabel);
  });
  flushInscTotal();
  flushLocalTotal();

  body.push([
    { content: "Total do Produtor -->", colSpan: 5, styles: { fontStyle: "bold", halign: "right" } },
    { content: formatNumber(totalGeralKilos, 0), styles: { fontStyle: "bold", halign: "right" } },
    { content: formatNumber(sacosDeKg(totalGeralKilos), 0), styles: { fontStyle: "bold", halign: "right" } },
    { content: "", colSpan: 3 },
  ]);

  totalGeralRows.push(body.length - 1);
  rowLocal.push("");
  rowInsc.push("");

  // Contexto ativo enquanto autoTable desenha as células (para banner de páginas seguintes)
  let ctxLocal = "";
  let ctxInsc = "";
  let pageDrawn = 1;

  autoTable(doc, {
    startY: 54,
    margin: { top: 54, left: 10, right: 10, bottom: 14 },
    head: [[
      { content: "Data", styles: { halign: "center" } },
      "Operação",
      { content: "Docto", styles: { halign: "right" } },
      "Tipo",
      "Variedade",
      { content: "Kilos", styles: { halign: "right" } },
      { content: "Sacos", styles: { halign: "right" } },
      { content: "Saldo", styles: { halign: "right" } },
      { content: "NFe", styles: { halign: "right" } },
      "Comprador/Vendedor",
    ]],
    body,
    styles: { fontSize: 7, cellPadding: 1, overflow: "ellipsize", valign: "middle" },
    headStyles: { fillColor: [66, 66, 66], textColor: 255, fontSize: 7.5 },
    rowPageBreak: "avoid",
    columnStyles: {
      0: { cellWidth: 18, halign: "center" },
      1: { cellWidth: 22 },
      2: { cellWidth: 14, halign: "right" },
      3: { cellWidth: 18 },
      4: { cellWidth: 34, overflow: "linebreak" },
      5: { cellWidth: 20, halign: "right" },
      6: { cellWidth: 14, halign: "right" },
      7: { cellWidth: 22, halign: "right" },
      8: { cellWidth: 18, halign: "right" },
      9: { cellWidth: "auto", overflow: "ellipsize" },
    },
    didParseCell: (d) => {
      if (d.section !== "body") return;
      const idx = d.row.index;
      if (groupHeaderRows.includes(idx)) {
        d.cell.styles.fillColor = [220, 235, 245];
        d.cell.styles.fontStyle = "bold";
      } else if (subgroupHeaderRows.includes(idx)) {
        d.cell.styles.fillColor = [235, 245, 235];
        d.cell.styles.fontStyle = "bold";
      } else if (inscTotalRows.includes(idx)) {
        d.cell.styles.fillColor = [245, 245, 245];
        d.cell.styles.fontStyle = "bold";
      } else if (localTotalRows.includes(idx)) {
        d.cell.styles.fillColor = [230, 230, 230];
        d.cell.styles.fontStyle = "bold";
      } else if (totalGeralRows.includes(idx)) {
        d.cell.styles.fillColor = [210, 210, 210];
        d.cell.styles.fontStyle = "bold";
      }
    },
    didDrawCell: (d) => {
      if (d.section !== "body" || d.column.index !== 0) return;
      const idx = d.row.index;
      if (rowLocal[idx]) ctxLocal = rowLocal[idx];
      if (rowInsc[idx]) ctxInsc = rowInsc[idx];
    },
    didDrawPage: (data) => {
      if (data.pageNumber === pageDrawn) return;
      pageDrawn = data.pageNumber;
      drawTopBanner(ctxLocal, ctxInsc, true);
    },
  });

  // ============ RESUMO GERAL ============
  let yPos = (doc as any).lastAutoTable.finalY + 6;
  const pageHeight = doc.internal.pageSize.getHeight();
  if (yPos > pageHeight - 60) {
    doc.addPage();
    yPos = 20;
  }

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("RESUMO GERAL", pageWidth / 2, yPos, { align: "center" });
  yPos += 4;

  const porLocal = new Map<string, ResumoAcc[]>();
  Array.from(resumoMap.values()).forEach((r) => {
    const arr = porLocal.get(r.local) || [];
    arr.push(r);
    porLocal.set(r.local, arr);
  });

  const resumoBody: any[] = [];
  const localHeaderIdx: number[] = [];
  const localTotIdx: number[] = [];
  let grandEntradas = 0, grandSaidas = 0;

  Array.from(porLocal.entries())
    .sort(([a], [b]) => a.localeCompare(b, "pt-BR"))
    .forEach(([local, items]) => {
      resumoBody.push([{ content: `Local Entrega:   ${local}`, colSpan: 5, styles: { fontStyle: "bold" } }]);
      localHeaderIdx.push(resumoBody.length - 1);

      let ent = 0, sai = 0;
      items
        .sort((a, b) => a.opLabel.localeCompare(b.opLabel, "pt-BR") || a.produto.localeCompare(b.produto, "pt-BR"))
        .forEach((r) => {
          ent += r.entradas; sai += r.saidas;
          resumoBody.push([
            "",
            r.opLabel,
            r.produto,
            { content: formatNumber(r.entradas, 0), styles: { halign: "right" } },
            { content: formatNumber(r.saidas, 0), styles: { halign: "right" } },
          ]);
        });
      resumoBody.push([
        { content: "Total do Local -->", colSpan: 3, styles: { fontStyle: "bold", halign: "right" } },
        { content: formatNumber(ent, 0), styles: { fontStyle: "bold", halign: "right" } },
        { content: formatNumber(sai, 0), styles: { fontStyle: "bold", halign: "right" } },
      ]);
      localTotIdx.push(resumoBody.length - 1);
      resumoBody.push([
        { content: "Saldo do Local -->", colSpan: 3, styles: { fontStyle: "bold", halign: "right" } },
        { content: formatNumber(ent + sai, 0), colSpan: 2, styles: { fontStyle: "bold", halign: "right" } },
      ]);
      localTotIdx.push(resumoBody.length - 1);

      grandEntradas += ent; grandSaidas += sai;
    });

  resumoBody.push([
    { content: "Total Geral -->", colSpan: 3, styles: { fontStyle: "bold", halign: "right" } },
    { content: formatNumber(grandEntradas, 0), styles: { fontStyle: "bold", halign: "right" } },
    { content: formatNumber(grandSaidas, 0), styles: { fontStyle: "bold", halign: "right" } },
  ]);
  const gTot1 = resumoBody.length - 1;
  resumoBody.push([
    { content: "Saldo Geral -->", colSpan: 3, styles: { fontStyle: "bold", halign: "right" } },
    { content: formatNumber(grandEntradas + grandSaidas, 0), colSpan: 2, styles: { fontStyle: "bold", halign: "right" } },
  ]);
  const gTot2 = resumoBody.length - 1;

  autoTable(doc, {
    startY: yPos + 2,
    head: [[
      "",
      "Operação",
      "Produto",
      { content: "Entradas", styles: { halign: "right" } },
      { content: "Saídas", styles: { halign: "right" } },
    ]],
    body: resumoBody,
    styles: { fontSize: 8, cellPadding: 1.5 },
    headStyles: { fillColor: [66, 66, 66], textColor: 255 },
    columnStyles: {
      0: { cellWidth: 14 },
      1: { cellWidth: 40 },
      2: { cellWidth: "auto" },
      3: { cellWidth: 32, halign: "right" },
      4: { cellWidth: 32, halign: "right" },
    },
    didParseCell: (d) => {
      if (d.section !== "body") return;
      const idx = d.row.index;
      if (localHeaderIdx.includes(idx)) {
        d.cell.styles.fillColor = [220, 235, 245];
        d.cell.styles.fontStyle = "bold";
      } else if (localTotIdx.includes(idx)) {
        d.cell.styles.fillColor = [235, 235, 235];
        d.cell.styles.fontStyle = "bold";
      } else if (idx === gTot1 || idx === gTot2) {
        d.cell.styles.fillColor = [210, 210, 210];
        d.cell.styles.fontStyle = "bold";
      }
    },
  });

  desenharRodapeBrand(doc);
  downloadPdf(doc, `extrato_movimentacao_${params.produtorNome.replace(/\s/g, "_")}.pdf`);
}

