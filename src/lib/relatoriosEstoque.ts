import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const formatNumber = (value: number | null | undefined, decimals = 0): string => {
  if (value === null || value === undefined) return "0";
  return new Intl.NumberFormat("pt-BR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(value);
};

function addFooter(doc: jsPDF) {
  const pageCount = doc.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(
      `Gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })} - Página ${i} de ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: "center" }
    );
  }
}

function downloadPdf(doc: jsPDF, filename: string) {
  const pdfBlob = doc.output("blob");
  const pdfUrl = URL.createObjectURL(pdfBlob);
  const link = document.createElement("a");
  link.href = pdfUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(pdfUrl), 1000);
}

// ==================== SALDO DISPONÍVEL SAFRA ====================

export interface SaldoDisponivelRow {
  produtor_nome: string;
  local_entrega: string;
  tipo: string; // INDUST / SEMENT
  depositos_kg: number;
  compras_kg: number;
  vendas_kg: number;
  devolucoes_kg: number;
  tr_saida_kg: number;
  tr_entrada_kg: number;
  notas_deposito_kg: number;
  saldo_kg: number;
}

export interface SaldoDisponivelData {
  safraNome: string;
  tipoEntrega: string; // Particular, Arrendamentos, Terceiros, Todos
  pesoSaco: number;
  rows: SaldoDisponivelRow[];
}

export function gerarSaldoDisponivelPdf(data: SaldoDisponivelData): void {
  const doc = new jsPDF({ orientation: "landscape", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  let yPos = 12;

  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("Estoque Geral Disponível de Produtores", pageWidth / 2, yPos, { align: "center" });
  yPos += 6;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`SAFRA: ${data.safraNome}          Tipo de Entrega: ${data.tipoEntrega}`, pageWidth / 2, yPos, { align: "center" });
  yPos += 5;

  const ps = data.pesoSaco || 60;
  const toSacos = (kg: number) => Math.round(kg / ps);

  const body = data.rows.map(r => [
    r.produtor_nome,
    r.local_entrega,
    r.tipo,
    formatNumber(r.depositos_kg),
    formatNumber(toSacos(r.depositos_kg)),
    formatNumber(r.compras_kg),
    formatNumber(toSacos(r.compras_kg)),
    formatNumber(r.vendas_kg),
    formatNumber(toSacos(r.vendas_kg)),
    formatNumber(r.devolucoes_kg),
    formatNumber(toSacos(r.devolucoes_kg)),
    formatNumber(r.tr_saida_kg),
    formatNumber(toSacos(r.tr_saida_kg)),
    formatNumber(r.tr_entrada_kg),
    formatNumber(toSacos(r.tr_entrada_kg)),
    formatNumber(r.notas_deposito_kg),
    formatNumber(toSacos(r.notas_deposito_kg)),
    formatNumber(r.saldo_kg),
    formatNumber(toSacos(r.saldo_kg)),
  ]);

  // Totals row
  const totDep = data.rows.reduce((s, r) => s + r.depositos_kg, 0);
  const totComp = data.rows.reduce((s, r) => s + r.compras_kg, 0);
  const totVend = data.rows.reduce((s, r) => s + r.vendas_kg, 0);
  const totDev = data.rows.reduce((s, r) => s + r.devolucoes_kg, 0);
  const totTrS = data.rows.reduce((s, r) => s + r.tr_saida_kg, 0);
  const totTrE = data.rows.reduce((s, r) => s + r.tr_entrada_kg, 0);
  const totND = data.rows.reduce((s, r) => s + r.notas_deposito_kg, 0);
  const totSaldo = data.rows.reduce((s, r) => s + r.saldo_kg, 0);

  body.push([
    "TOTAL", "", "",
    formatNumber(totDep), formatNumber(toSacos(totDep)),
    formatNumber(totComp), formatNumber(toSacos(totComp)),
    formatNumber(totVend), formatNumber(toSacos(totVend)),
    formatNumber(totDev), formatNumber(toSacos(totDev)),
    formatNumber(totTrS), formatNumber(toSacos(totTrS)),
    formatNumber(totTrE), formatNumber(toSacos(totTrE)),
    formatNumber(totND), formatNumber(toSacos(totND)),
    formatNumber(totSaldo), formatNumber(toSacos(totSaldo)),
  ]);

  autoTable(doc, {
    startY: yPos,
    head: [[
      "Produtor", "Entrega", "Tipo",
      { content: "Depósitos", styles: { halign: "right" } },
      { content: "Sacos", styles: { halign: "right" } },
      { content: "Compras", styles: { halign: "right" } },
      { content: "Sacos", styles: { halign: "right" } },
      { content: "Vendas", styles: { halign: "right" } },
      { content: "Sacos", styles: { halign: "right" } },
      { content: "Devol.", styles: { halign: "right" } },
      { content: "Sacos", styles: { halign: "right" } },
      { content: "Tr.Saída", styles: { halign: "right" } },
      { content: "Sacos", styles: { halign: "right" } },
      { content: "Tr.Entr", styles: { halign: "right" } },
      { content: "Sacos", styles: { halign: "right" } },
      { content: "Entr.Arm.", styles: { halign: "right" } },
      { content: "Sacos", styles: { halign: "right" } },
      { content: "Saldo", styles: { halign: "right" } },
      { content: "Sacos", styles: { halign: "right" } },
    ]],
    body,
    styles: { fontSize: 6, cellPadding: 1 },
    headStyles: { fillColor: [66, 66, 66], textColor: 255, fontSize: 6 },
    columnStyles: {
      0: { halign: "left", cellWidth: 42 },
      1: { halign: "left", cellWidth: 22 },
      2: { halign: "left", cellWidth: 14 },
      3: { halign: "right" }, 4: { halign: "right" },
      5: { halign: "right" }, 6: { halign: "right" },
      7: { halign: "right" }, 8: { halign: "right" },
      9: { halign: "right" }, 10: { halign: "right" },
      11: { halign: "right" }, 12: { halign: "right" },
      13: { halign: "right" }, 14: { halign: "right" },
      15: { halign: "right" }, 16: { halign: "right" },
      17: { halign: "right" }, 18: { halign: "right" },
    },
    didParseCell: (data) => {
      if (data.row.index === body.length - 1 && data.section === "body") {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fillColor = [230, 230, 230];
      }
    },
  });

  addFooter(doc);
  downloadPdf(doc, `saldo_disponivel_${data.safraNome.replace(/\s/g, "_")}.pdf`);
}

// ==================== DEPÓSITOS GERAL ====================

export interface DepositoRow {
  produtor_nome: string;
  inscricao_estadual: string;
  data_emissao: string | null;
  quantidade_kg: number;
  nota_fiscal: string | null;
  status: string | null;
  produto_nome: string | null;
}

export interface DepositosGeralData {
  safraNome: string;
  produtoNome: string | null;
  rows: DepositoRow[];
}

export function gerarDepositosGeralPdf(data: DepositosGeralData): void {
  const doc = new jsPDF({ orientation: "landscape" });
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("RELATÓRIO DE NOTAS DE DEPÓSITO", pageWidth / 2, 15, { align: "center" });
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  const filtro = `Safra: ${data.safraNome}${data.produtoNome ? ` | Produto: ${data.produtoNome}` : ''}`;
  doc.text(filtro, pageWidth / 2, 22, { align: "center" });

  const formatDate = (d: string | null) => {
    if (!d) return "-";
    try { return format(new Date(d.split("T")[0] + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR }); } catch { return d; }
  };

  const body = data.rows.map(r => [
    r.produtor_nome,
    r.inscricao_estadual,
    r.produto_nome || "-",
    formatDate(r.data_emissao),
    formatNumber(r.quantidade_kg, 0),
    r.nota_fiscal || "-",
    r.status || "-",
  ]);

  const totalKg = data.rows.reduce((s, r) => s + r.quantidade_kg, 0);
  body.push(["TOTAL", "", "", "", formatNumber(totalKg, 0), "", ""]);

  autoTable(doc, {
    startY: 27,
    head: [[
      "Produtor", "IE", "Produto",
      { content: "Data", styles: { halign: "center" } },
      { content: "Qtde (kg)", styles: { halign: "right" } },
      "Nota Fiscal",
      "Status",
    ]],
    body,
    styles: { fontSize: 7, cellPadding: 1.5 },
    headStyles: { fillColor: [66, 66, 66], textColor: 255 },
    columnStyles: {
      0: { halign: "left", cellWidth: 55 },
      1: { halign: "left", cellWidth: 30 },
      2: { halign: "left", cellWidth: 30 },
      3: { halign: "center", cellWidth: 22 },
      4: { halign: "right", cellWidth: 25 },
      5: { halign: "left", cellWidth: 25 },
      6: { halign: "left", cellWidth: 22 },
    },
    didParseCell: (data) => {
      if (data.row.index === body.length - 1 && data.section === "body") {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fillColor = [230, 230, 230];
      }
    },
  });

  addFooter(doc);
  downloadPdf(doc, "relatorio_depositos.pdf");
}

// ==================== RESUMO PRODUTORES POR LOCAL ====================

export interface ResumoLocalRow {
  local_entrega: string;
  produtor_nome: string;
  depositos_kg: number;
  devolucoes_kg: number;
  tr_saida_kg: number;
  tr_entrada_kg: number;
  notas_deposito_kg: number;
  saldo_kg: number;
}

export interface ResumoLocalData {
  safraNome: string;
  produtoNome: string | null;
  pesoSaco: number;
  rows: ResumoLocalRow[];
}

export function gerarResumoProdutoresLocalPdf(data: ResumoLocalData): void {
  const doc = new jsPDF({ orientation: "landscape" });
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("RESUMO PRODUTORES POR LOCAL DE ENTREGA", pageWidth / 2, 15, { align: "center" });
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  const filtro = `Safra: ${data.safraNome}${data.produtoNome ? ` | Produto: ${data.produtoNome}` : ''}`;
  doc.text(filtro, pageWidth / 2, 22, { align: "center" });

  const ps = data.pesoSaco || 60;
  const toSacos = (kg: number) => Math.round(kg / ps);

  // Group by local_entrega
  const locais: Record<string, ResumoLocalRow[]> = {};
  data.rows.forEach(r => {
    const key = r.local_entrega || "Sem local definido";
    if (!locais[key]) locais[key] = [];
    locais[key].push(r);
  });

  let yPos = 27;

  Object.entries(locais).sort(([a], [b]) => a.localeCompare(b)).forEach(([local, rows]) => {
    // Check page break
    if (yPos > doc.internal.pageSize.getHeight() - 40) {
      doc.addPage();
      yPos = 15;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(`Local: ${local}`, 14, yPos);
    yPos += 2;

    const body = rows.map(r => [
      r.produtor_nome,
      formatNumber(r.depositos_kg), formatNumber(toSacos(r.depositos_kg)),
      formatNumber(r.devolucoes_kg), formatNumber(toSacos(r.devolucoes_kg)),
      formatNumber(r.tr_saida_kg), formatNumber(toSacos(r.tr_saida_kg)),
      formatNumber(r.tr_entrada_kg), formatNumber(toSacos(r.tr_entrada_kg)),
      formatNumber(r.notas_deposito_kg), formatNumber(toSacos(r.notas_deposito_kg)),
      formatNumber(r.saldo_kg), formatNumber(toSacos(r.saldo_kg)),
    ]);

    // Subtotal for this local
    const subDep = rows.reduce((s, r) => s + r.depositos_kg, 0);
    const subDev = rows.reduce((s, r) => s + r.devolucoes_kg, 0);
    const subTrS = rows.reduce((s, r) => s + r.tr_saida_kg, 0);
    const subTrE = rows.reduce((s, r) => s + r.tr_entrada_kg, 0);
    const subND = rows.reduce((s, r) => s + r.notas_deposito_kg, 0);
    const subSaldo = rows.reduce((s, r) => s + r.saldo_kg, 0);

    body.push([
      `Subtotal ${local}`,
      formatNumber(subDep), formatNumber(toSacos(subDep)),
      formatNumber(subDev), formatNumber(toSacos(subDev)),
      formatNumber(subTrS), formatNumber(toSacos(subTrS)),
      formatNumber(subTrE), formatNumber(toSacos(subTrE)),
      formatNumber(subND), formatNumber(toSacos(subND)),
      formatNumber(subSaldo), formatNumber(toSacos(subSaldo)),
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [[
        "Produtor",
        { content: "Depósitos", styles: { halign: "right" } },
        { content: "Sacos", styles: { halign: "right" } },
        { content: "Devol.", styles: { halign: "right" } },
        { content: "Sacos", styles: { halign: "right" } },
        { content: "Tr.Saída", styles: { halign: "right" } },
        { content: "Sacos", styles: { halign: "right" } },
        { content: "Tr.Entr", styles: { halign: "right" } },
        { content: "Sacos", styles: { halign: "right" } },
        { content: "N.Dep.", styles: { halign: "right" } },
        { content: "Sacos", styles: { halign: "right" } },
        { content: "Saldo", styles: { halign: "right" } },
        { content: "Sacos", styles: { halign: "right" } },
      ]],
      body,
      styles: { fontSize: 7, cellPadding: 1.5 },
      headStyles: { fillColor: [66, 66, 66], textColor: 255 },
      columnStyles: {
        0: { halign: "left", cellWidth: 55 },
        1: { halign: "right" }, 2: { halign: "right" },
        3: { halign: "right" }, 4: { halign: "right" },
        5: { halign: "right" }, 6: { halign: "right" },
        7: { halign: "right" }, 8: { halign: "right" },
        9: { halign: "right" }, 10: { halign: "right" },
        11: { halign: "right" }, 12: { halign: "right" },
      },
      didParseCell: (cellData) => {
        if (cellData.row.index === body.length - 1 && cellData.section === "body") {
          cellData.cell.styles.fontStyle = "bold";
          cellData.cell.styles.fillColor = [230, 230, 230];
        }
      },
    });

    yPos = (doc as any).lastAutoTable.finalY + 8;
  });

  addFooter(doc);
  downloadPdf(doc, `resumo_produtores_local_${data.safraNome.replace(/\s/g, "_")}.pdf`);
}
