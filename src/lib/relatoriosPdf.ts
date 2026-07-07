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
}

export interface ExtratoTransferencia {
  data_transferencia: string;
  nome_outro: string | null;
  quantidade_kg: number;
}

export interface ExtratoDevolucao {
  data_devolucao: string;
  quantidade_kg: number;
  taxa_armazenagem: number | null;
  kg_taxa_armazenagem: number | null;
}

export interface ExtratoNotaDeposito {
  data_emissao: string | null;
  nota_fiscal_numero: string | null;
  quantidade_kg: number;
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

  // COLHEITAS
  if (data.colheitas.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.text("COLHEITAS", 14, yPos);
    const colheitasBody = data.colheitas.map(c => [
      formatDate(c.data_colheita),
      c.lavoura || "-",
      formatNumber(c.peso_bruto, 0),
      formatNumber(c.peso_tara, 0),
      formatNumber(c.producao_kg, 0),
      c.umidade != null ? formatNumber(c.umidade, 1) + "%" : "-",
      c.impureza != null ? formatNumber(c.impureza, 1) + "%" : "-",
      formatNumber(c.kg_desconto_total, 0),
      formatNumber(c.producao_liquida_kg, 0),
      toSacas(c.producao_liquida_kg),
    ]);
    autoTable(doc, {
      startY: yPos + 2,
      head: [[
        { content: "Data", styles: { halign: "center" } },
        "Lavoura",
        { content: "P.Bruto", styles: { halign: "right" } },
        { content: "Tara", styles: { halign: "right" } },
        { content: "Líquido", styles: { halign: "right" } },
        { content: "Umid.", styles: { halign: "right" } },
        { content: "Imp.", styles: { halign: "right" } },
        { content: "Desc.", styles: { halign: "right" } },
        { content: "Prod.Líq.(kg)", styles: { halign: "right" } },
        { content: "Sacas", styles: { halign: "right" } },
      ]],
      body: colheitasBody,
      styles: { fontSize: 7, cellPadding: 1.5 },
      headStyles: { fillColor: [66, 66, 66], textColor: 255 },
      columnStyles: {
        0: { halign: "center", cellWidth: 20 },
        1: { halign: "left", cellWidth: 32 },
        2: { halign: "right" }, 3: { halign: "right" }, 4: { halign: "right" },
        5: { halign: "right" }, 6: { halign: "right" }, 7: { halign: "right" }, 8: { halign: "right" }, 9: { halign: "right" },
      },
    });
    yPos = (doc as any).lastAutoTable.finalY + 5;
  }

  // TRANSFERÊNCIAS RECEBIDAS
  if (data.transferenciasRecebidas.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.text("TRANSFERÊNCIAS RECEBIDAS", 14, yPos);
    autoTable(doc, {
      startY: yPos + 2,
      head: [[
        { content: "Data", styles: { halign: "center" } },
        "Origem",
        { content: "Qtd (kg)", styles: { halign: "right" } },
        { content: "Sacas", styles: { halign: "right" } },
      ]],
      body: data.transferenciasRecebidas.map(t => [formatDate(t.data_transferencia), t.nome_outro || "-", formatNumber(t.quantidade_kg, 0), toSacas(t.quantidade_kg)]),
      styles: { fontSize: 7, cellPadding: 1.5 },
      headStyles: { fillColor: [66, 66, 66], textColor: 255 },
      columnStyles: { 0: { halign: "center", cellWidth: 25 }, 1: { halign: "left" }, 2: { halign: "right", cellWidth: 28 }, 3: { halign: "right", cellWidth: 24 } },
    });
    yPos = (doc as any).lastAutoTable.finalY + 5;
  }

  // TRANSFERÊNCIAS ENVIADAS
  if (data.transferenciasEnviadas.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.text("TRANSFERÊNCIAS ENVIADAS", 14, yPos);
    autoTable(doc, {
      startY: yPos + 2,
      head: [[
        { content: "Data", styles: { halign: "center" } },
        "Destino",
        { content: "Qtd (kg)", styles: { halign: "right" } },
        { content: "Sacas", styles: { halign: "right" } },
      ]],
      body: data.transferenciasEnviadas.map(t => [formatDate(t.data_transferencia), t.nome_outro || "-", formatNumber(t.quantidade_kg, 0), toSacas(t.quantidade_kg)]),
      styles: { fontSize: 7, cellPadding: 1.5 },
      headStyles: { fillColor: [66, 66, 66], textColor: 255 },
      columnStyles: { 0: { halign: "center", cellWidth: 25 }, 1: { halign: "left" }, 2: { halign: "right", cellWidth: 28 }, 3: { halign: "right", cellWidth: 24 } },
    });
    yPos = (doc as any).lastAutoTable.finalY + 5;
  }

  // DEVOLUÇÕES
  if (data.devolucoes.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.text("DEVOLUÇÕES", 14, yPos);
    autoTable(doc, {
      startY: yPos + 2,
      head: [[
        { content: "Data", styles: { halign: "center" } },
        { content: "Qtd (kg)", styles: { halign: "right" } },
        { content: "Sacas", styles: { halign: "right" } },
        { content: "Taxa Armaz. (%)", styles: { halign: "right" } },
        { content: "Kg Taxa", styles: { halign: "right" } },
        { content: "Sacas Taxa", styles: { halign: "right" } },
      ]],
      body: data.devolucoes.map(d => [
        formatDate(d.data_devolucao),
        formatNumber(d.quantidade_kg, 0),
        toSacas(d.quantidade_kg),
        d.taxa_armazenagem != null ? formatNumber(d.taxa_armazenagem, 2) + "%" : "-",
        formatNumber(d.kg_taxa_armazenagem, 0),
        toSacas(d.kg_taxa_armazenagem),
      ]),
      styles: { fontSize: 7, cellPadding: 1.5 },
      headStyles: { fillColor: [66, 66, 66], textColor: 255 },
      columnStyles: { 0: { halign: "center", cellWidth: 25 }, 1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "right" }, 4: { halign: "right" }, 5: { halign: "right" } },
    });
    yPos = (doc as any).lastAutoTable.finalY + 5;
  }

  // NOTAS DE DEPÓSITO
  if (data.notasDeposito.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.text("NOTAS DE DEPÓSITO", 14, yPos);
    autoTable(doc, {
      startY: yPos + 2,
      head: [[
        { content: "Data", styles: { halign: "center" } },
        "Nota Fiscal",
        { content: "Qtd (kg)", styles: { halign: "right" } },
        { content: "Sacas", styles: { halign: "right" } },
      ]],
      body: data.notasDeposito.map(n => [formatDate(n.data_emissao), n.nota_fiscal_numero || "-", formatNumber(n.quantidade_kg, 0), toSacas(n.quantidade_kg)]),
      styles: { fontSize: 7, cellPadding: 1.5 },
      headStyles: { fillColor: [66, 66, 66], textColor: 255 },
      columnStyles: { 0: { halign: "center", cellWidth: 25 }, 1: { halign: "left" }, 2: { halign: "right", cellWidth: 28 }, 3: { halign: "right", cellWidth: 24 } },
    });
    yPos = (doc as any).lastAutoTable.finalY + 5;
  }

  const totalColheitas = data.colheitas.reduce((s, c) => s + (c.producao_liquida_kg || 0), 0);
  const totalRecebidas = data.transferenciasRecebidas.reduce((s, t) => s + t.quantidade_kg, 0);
  const totalEnviadas = data.transferenciasEnviadas.reduce((s, t) => s + t.quantidade_kg, 0);
  const totalDevolucoes = data.devolucoes.reduce((s, d) => s + d.quantidade_kg, 0);
  const totalKgTaxa = data.devolucoes.reduce((s, d) => s + (d.kg_taxa_armazenagem || 0), 0);
  const saldo = totalColheitas + totalRecebidas - totalEnviadas - totalDevolucoes - totalKgTaxa;

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
    ["(-) Kg Taxa Armazenagem", fmtKgSc(totalKgTaxa)],
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
  comprador_nome: string | null;
  produto_nome: string | null;
  quantidade_kg: number | null;
  preco_kg: number | null;
  valor_total: number | null;
  total_carregado_kg: number | null;
  saldo_kg: number | null;
}

export function gerarRelatorioVendasPdf(contratos: RelContratoVenda[], filtrosTexto: string): void {
  const doc = new jsPDF({ orientation: "landscape" });
  const pageWidth = doc.internal.pageSize.getWidth();
  desenharCabecalhoBrand(doc);

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("RELATÓRIO DE VENDAS", pageWidth / 2, 34, { align: "center" });
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(filtrosTexto, pageWidth / 2, 40, { align: "center" });

  const sc = (kg: number | null) => formatNumber((Number(kg) || 0) / 60, 1);
  const body = contratos.map(c => [
    c.numero.toString(),
    formatDate(c.data_contrato),
    c.comprador_nome || "-",
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

  const totContratado = contratos.reduce((s, c) => s + (c.quantidade_kg || 0), 0);
  const totCarregado = contratos.reduce((s, c) => s + (c.total_carregado_kg || 0), 0);
  const totSaldo = contratos.reduce((s, c) => s + (c.saldo_kg || 0), 0);
  const totValor = contratos.reduce((s, c) => s + (c.valor_total || 0), 0);

  body.push([
    "TOTAL", "", "", "",
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
      "Comprador", "Produto",
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
      0: { halign: "right", cellWidth: 10 },
      1: { halign: "center", cellWidth: 20 },
      2: { halign: "left", cellWidth: 45 },
      3: { halign: "left", cellWidth: 25 },
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
  downloadPdf(doc, "relatorio_vendas.pdf");
}
