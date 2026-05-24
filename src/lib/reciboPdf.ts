import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format, parseISO } from "date-fns";

const fmtBR = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// Conversão de número para extenso (R$)
function porExtenso(valor: number): string {
  const unidades = ["", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove"];
  const dez19 = ["dez", "onze", "doze", "treze", "quatorze", "quinze", "dezesseis", "dezessete", "dezoito", "dezenove"];
  const dezenas = ["", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"];
  const centenas = ["", "cento", "duzentos", "trezentos", "quatrocentos", "quinhentos", "seiscentos", "setecentos", "oitocentos", "novecentos"];

  function ate999(n: number): string {
    if (n === 0) return "";
    if (n === 100) return "cem";
    const c = Math.floor(n / 100);
    const r = n % 100;
    const parts: string[] = [];
    if (c) parts.push(centenas[c]);
    if (r) {
      if (r < 10) parts.push(unidades[r]);
      else if (r < 20) parts.push(dez19[r - 10]);
      else {
        const d = Math.floor(r / 10);
        const u = r % 10;
        parts.push(u ? `${dezenas[d]} e ${unidades[u]}` : dezenas[d]);
      }
    }
    return parts.join(" e ");
  }

  const inteiro = Math.floor(valor);
  const centavos = Math.round((valor - inteiro) * 100);

  const milhao = Math.floor(inteiro / 1_000_000);
  const milhar = Math.floor((inteiro % 1_000_000) / 1000);
  const resto = inteiro % 1000;

  const partes: string[] = [];
  if (milhao) partes.push(`${milhao === 1 ? "um milhão" : `${ate999(milhao)} milhões`}`);
  if (milhar) partes.push(`${milhar === 1 ? "mil" : `${ate999(milhar)} mil`}`);
  if (resto) partes.push(ate999(resto));

  let texto = partes.join(" e ") || "zero";
  texto += inteiro === 1 ? " real" : " reais";

  if (centavos > 0) {
    texto += ` e ${ate999(centavos)} ${centavos === 1 ? "centavo" : "centavos"}`;
  }
  return texto;
}

export interface ReciboData {
  numero: string;
  data_pagamento: string; // YYYY-MM-DD
  valor_total: number;
  valor_pago: number;
  juros: number;
  multa: number;
  desconto: number;
  forma_pagamento?: string | null;
  documento?: string | null;
  parcela?: string | null;
  observacoes?: string | null;
  // Emitente (granja)
  emitente: {
    razao_social?: string | null;
    cnpj?: string | null;
    endereco?: string | null;
    cidade?: string | null;
    uf?: string | null;
  };
  // Pagador (cliente)
  pagador: {
    nome?: string | null;
    cpf_cnpj?: string | null;
  };
  // Referência
  contrato_numero?: string | null;
}

export function gerarReciboPDF(d: ReciboData) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;

  // Cabeçalho emitente
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(d.emitente.razao_social || "Emitente", margin, 18);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  if (d.emitente.cnpj) doc.text(`CNPJ: ${d.emitente.cnpj}`, margin, 24);
  const endereco = [d.emitente.endereco, d.emitente.cidade && `${d.emitente.cidade}${d.emitente.uf ? "/" + d.emitente.uf : ""}`]
    .filter(Boolean).join(" — ");
  if (endereco) doc.text(endereco, margin, 29);

  // Caixa do título
  doc.setDrawColor(0);
  doc.setLineWidth(0.4);
  doc.rect(margin, 36, pageWidth - margin * 2, 14);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(`RECIBO Nº ${d.numero}`, margin + 4, 45);
  doc.setFontSize(12);
  doc.text(fmtBR(d.valor_total), pageWidth - margin - 4, 45, { align: "right" });

  // Corpo
  let y = 60;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const refParts: string[] = [];
  if (d.documento) refParts.push(`Documento ${d.documento}`);
  if (d.parcela) refParts.push(`Parcela ${d.parcela}`);
  if (d.contrato_numero) refParts.push(`Contrato Nº ${d.contrato_numero}`);
  const referencia = refParts.length ? `, referente a ${refParts.join(" — ")}` : "";

  const texto =
    `Recebemos de ${d.pagador.nome || "—"}` +
    (d.pagador.cpf_cnpj ? `, inscrito no CPF/CNPJ sob nº ${d.pagador.cpf_cnpj},` : ",") +
    ` a importância de ${fmtBR(d.valor_total)} (${porExtenso(d.valor_total)})` +
    referencia +
    `, conforme detalhamento abaixo. Para clareza, firmamos o presente recibo dando plena, geral e irrevogável quitação do valor recebido.`;

  const linhas = doc.splitTextToSize(texto, pageWidth - margin * 2);
  doc.text(linhas, margin, y);
  y += linhas.length * 5 + 4;

  // Tabela detalhe
  autoTable(doc, {
    startY: y,
    head: [["Data Pgto.", "Valor", "Juros", "Multa", "Desconto", "Total", "Forma"]],
    body: [[
      format(parseISO(d.data_pagamento), "dd/MM/yyyy"),
      fmtBR(d.valor_pago),
      fmtBR(d.juros),
      fmtBR(d.multa),
      fmtBR(d.desconto),
      fmtBR(d.valor_total),
      d.forma_pagamento || "-",
    ]],
    styles: { fontSize: 9, halign: "right" },
    headStyles: { fillColor: [60, 100, 60], halign: "center" },
    columnStyles: { 0: { halign: "center" }, 6: { halign: "left" } },
    margin: { left: margin, right: margin },
  });

  let yPos = (doc as any).lastAutoTable.finalY + 8;

  if (d.observacoes) {
    doc.setFontSize(9);
    doc.text(`Obs.: ${d.observacoes}`, margin, yPos);
    yPos += 8;
  }

  // Local e data
  const localData = `${d.emitente.cidade || ""}${d.emitente.uf ? "/" + d.emitente.uf : ""}, ${format(parseISO(d.data_pagamento), "dd/MM/yyyy")}`;
  yPos += 20;
  doc.setFontSize(10);
  doc.text(localData, pageWidth - margin, yPos, { align: "right" });

  // Assinatura
  yPos += 25;
  doc.setLineWidth(0.3);
  doc.line(pageWidth / 2 - 50, yPos, pageWidth / 2 + 50, yPos);
  doc.setFontSize(9);
  doc.text(d.emitente.razao_social || "Emitente", pageWidth / 2, yPos + 5, { align: "center" });

  // Abrir em nova aba
  const blobUrl = doc.output("bloburl");
  window.open(blobUrl, "_blank");
}
