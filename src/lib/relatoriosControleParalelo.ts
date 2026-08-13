import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format, parseISO } from "date-fns";
import { desenharCabecalhoBrand, desenharRodapeBrand } from "./pdfBrand";
import { entregarRelatorio } from "./relatorioViewer";
import { labelTipo, type DocumentoControle, type DocumentoTipo } from "@/hooks/useControleParalelo";

/**
 * Geradores de PDF exclusivos do módulo Controle Paralelo.
 * Nenhum gerador existente é reaproveitado ou alterado.
 */

const nf = (v: number, dec = 0) =>
  new Intl.NumberFormat("pt-BR", { minimumFractionDigits: dec, maximumFractionDigits: dec }).format(v || 0);

const brl = (v: number) => `R$ ${nf(v, 2)}`;

const dataBr = (v: string | null): string => {
  if (!v) return "-";
  try {
    return format(parseISO(v.length > 10 ? v : `${v}T00:00:00`), "dd/MM/yyyy");
  } catch {
    return v;
  }
};

export type Orientacao = "landscape" | "portrait";
export type TamanhoPagina = "a4" | "a3" | "letter" | "legal";

export interface RelatorioControleOpcoes {
  conjuntoNome: string;
  subtitulo?: string;
  orientacao: Orientacao;
  tamanho: TamanhoPagina;
  /** Quando verdadeiro, o PDF é a relação dos itens marcados (conferência). */
  somenteMarcados?: boolean;
}

interface Bloco {
  tipo: DocumentoTipo;
  docs: DocumentoControle[];
}

function desenharTitulo(doc: jsPDF, yPos: number, titulo: string, linhas: string[]): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text(titulo, pageWidth / 2, yPos, { align: "center" });
  let y = yPos + 6;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  linhas.filter(Boolean).forEach((l) => {
    doc.text(l, pageWidth / 2, y, { align: "center" });
    y += 4.5;
  });
  return y + 2;
}

function desenharBloco(doc: jsPDF, startY: number, bloco: Bloco): number {
  const totalKg = bloco.docs.reduce((s, d) => s + d.quantidade_kg, 0);
  const totalValor = bloco.docs.reduce((s, d) => s + d.valor, 0);
  const temValor = bloco.docs.some((d) => d.valor > 0);

  const head = [["Data", "Referência", "Produtor / Inscrição", "Contraparte", "Produto", "Local", "Qtde (kg)", "Sacos"]];
  if (temValor) head[0].push("Valor");

  const body = bloco.docs.map((d) => {
    const row: (string | number)[] = [
      dataBr(d.data),
      d.referencia,
      d.produtor,
      d.contraparte,
      d.produto,
      d.local,
      nf(d.quantidade_kg),
      nf(Math.round(d.quantidade_kg / 60)),
    ];
    if (temValor) row.push(brl(d.valor));
    return row;
  });

  const footRow: (string | number)[] = [
    "",
    "",
    "",
    "",
    "",
    `TOTAL (${bloco.docs.length})`,
    nf(totalKg),
    nf(Math.round(totalKg / 60)),
  ];
  if (temValor) footRow.push(brl(totalValor));

  autoTable(doc, {
    startY,
    head,
    body,
    foot: [footRow],
    theme: "grid",
    styles: { fontSize: 7.5, cellPadding: 1.4 },
    headStyles: { fillColor: [34, 87, 51], textColor: 255, fontStyle: "bold", halign: "center" },
    footStyles: { fillColor: [235, 235, 235], textColor: 20, fontStyle: "bold" },
    columnStyles: {
      0: { halign: "center", cellWidth: 20 },
      1: { halign: "left" },
      6: { halign: "right" },
      7: { halign: "right" },
      8: { halign: "right" },
    },
    margin: { left: 8, right: 8, bottom: 16 },
    didDrawPage: () => {
      /* cabeçalho aplicado ao final em todas as páginas */
    },
  });

  return (doc as any).lastAutoTable.finalY + 8;
}

/** Relatório de um único tipo de operação. */
export function gerarRelatorioControlePdf(
  tipo: DocumentoTipo,
  docs: DocumentoControle[],
  opcoes: RelatorioControleOpcoes
): void {
  const doc = new jsPDF({ orientation: opcoes.orientacao, format: opcoes.tamanho });
  let y = desenharCabecalhoBrand(doc);

  const titulo = opcoes.somenteMarcados
    ? `${labelTipo(tipo)} — Somente Lançamentos Marcados`
    : `${labelTipo(tipo)} — Desconsiderando Marcados`;

  y = desenharTitulo(doc, y, titulo, [
    `Conjunto de controle: ${opcoes.conjuntoNome}`,
    opcoes.subtitulo || "",
  ]);

  if (docs.length === 0) {
    doc.setFontSize(10);
    doc.text("Nenhum lançamento encontrado com os filtros informados.", 12, y + 6);
  } else {
    desenharBloco(doc, y, { tipo, docs });
  }

  desenharRodapeBrand(doc);
  entregarRelatorio(doc, `controle-${tipo}-${format(new Date(), "yyyyMMdd-HHmm")}.pdf`);
}

/** Relatório consolidado com todos os tipos, com subtotais por tipo. */
export function gerarConsolidadoControlePdf(
  blocos: Bloco[],
  opcoes: RelatorioControleOpcoes
): void {
  const doc = new jsPDF({ orientation: opcoes.orientacao, format: opcoes.tamanho });
  let y = desenharCabecalhoBrand(doc);

  y = desenharTitulo(
    doc,
    y,
    opcoes.somenteMarcados
      ? "Consolidado do Controle — Somente Marcados"
      : "Consolidado do Controle — Desconsiderando Marcados",
    [`Conjunto de controle: ${opcoes.conjuntoNome}`, opcoes.subtitulo || ""]
  );

  const comDados = blocos.filter((b) => b.docs.length > 0);

  if (comDados.length === 0) {
    doc.setFontSize(10);
    doc.text("Nenhum lançamento encontrado com os filtros informados.", 12, y + 6);
  } else {
    comDados.forEach((bloco) => {
      const pageHeight = doc.internal.pageSize.getHeight();
      if (y > pageHeight - 40) {
        doc.addPage();
        y = desenharCabecalhoBrand(doc);
      }
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text(labelTipo(bloco.tipo), 8, y);
      y = desenharBloco(doc, y + 2, bloco);
    });

    // Resumo geral por tipo
    const pageHeight = doc.internal.pageSize.getHeight();
    if (y > pageHeight - 50) {
      doc.addPage();
      y = desenharCabecalhoBrand(doc);
    }
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Resumo Geral por Tipo de Operação", 8, y);

    const totalGeralKg = comDados.reduce((s, b) => s + b.docs.reduce((x, d) => x + d.quantidade_kg, 0), 0);
    const totalGeralValor = comDados.reduce((s, b) => s + b.docs.reduce((x, d) => x + d.valor, 0), 0);

    autoTable(doc, {
      startY: y + 2,
      head: [["Tipo de Operação", "Lançamentos", "Qtde (kg)", "Sacos", "Valor"]],
      body: comDados.map((b) => {
        const kg = b.docs.reduce((s, d) => s + d.quantidade_kg, 0);
        const val = b.docs.reduce((s, d) => s + d.valor, 0);
        return [labelTipo(b.tipo), nf(b.docs.length), nf(kg), nf(Math.round(kg / 60)), brl(val)];
      }),
      foot: [[
        "TOTAL GERAL",
        nf(comDados.reduce((s, b) => s + b.docs.length, 0)),
        nf(totalGeralKg),
        nf(Math.round(totalGeralKg / 60)),
        brl(totalGeralValor),
      ]],
      theme: "grid",
      styles: { fontSize: 8, cellPadding: 1.6 },
      headStyles: { fillColor: [34, 87, 51], textColor: 255, fontStyle: "bold", halign: "center" },
      footStyles: { fillColor: [235, 235, 235], textColor: 20, fontStyle: "bold" },
      columnStyles: {
        1: { halign: "right" },
        2: { halign: "right" },
        3: { halign: "right" },
        4: { halign: "right" },
      },
      margin: { left: 8, right: 8, bottom: 16 },
    });
  }

  desenharRodapeBrand(doc);
  entregarRelatorio(doc, `controle-consolidado-${format(new Date(), "yyyyMMdd-HHmm")}.pdf`);
}
