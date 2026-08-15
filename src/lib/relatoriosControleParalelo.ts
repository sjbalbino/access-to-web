import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format, parseISO } from "date-fns";
import { desenharCabecalhoBrand, desenharRodapeBrand } from "./pdfBrand";
import { entregarRelatorio, setPendingSheets, type RelatorioSheet } from "./relatorioViewer";
import { labelTipo, type DocumentoControle, type DocumentoTipo } from "@/hooks/useControleParalelo";

/**
 * Geradores de PDF exclusivos do módulo Controle Gerencial.
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

/** Ordena os lançamentos por data crescente (mais antigo primeiro). */
function ordenarPorData(docs: DocumentoControle[]): DocumentoControle[] {
  return [...docs].sort((a, b) => String(a.data ?? "").localeCompare(String(b.data ?? "")));
}

function desenharBloco(doc: jsPDF, startY: number, bloco: Bloco): number {
  const docs = ordenarPorData(bloco.docs);
  const totalKg = docs.reduce((s, d) => s + d.quantidade_kg, 0);
  const totalValor = docs.reduce((s, d) => s + d.valor, 0);
  const temValor = docs.some((d) => d.valor > 0);

  const head = [["Data", "Referência", "Produtor / Inscrição", "Contraparte", "Produto", "Local", "Qtde (kg)", "Sacos"]];
  if (temValor) head[0].push("Valor");

  const body = docs.map((d) => {
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
    `TOTAL (${docs.length})`,
    nf(totalKg),
    nf(Math.round(totalKg / 60)),
  ];
  if (temValor) footRow.push(brl(totalValor));

  autoTable(doc, {
    startY,
    head,
    body,
    foot: [footRow],
    // Totalizador apenas no final da tabela (sem totais por página)
    showFoot: "lastPage",
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

/** Resumo por produto, impresso no final do relatório. */
function desenharResumoProduto(doc: jsPDF, startY: number, docs: DocumentoControle[], titulo = "Resumo por Produto"): number {
  const comProduto = docs.filter((d) => (d.produto ?? "").trim() && d.produto !== "-");
  if (comProduto.length === 0) return startY;

  /** Só exibe a coluna de valor quando os lançamentos possuem valor financeiro (compras/contratos). */
  const incluirValor = comProduto.some((d) => (d.valor ?? 0) > 0);

  const mapa = new Map<string, { qtd: number; kg: number; valor: number }>();
  comProduto.forEach((d) => {
    const chave = d.produto.trim();
    const atual = mapa.get(chave) ?? { qtd: 0, kg: 0, valor: 0 };
    atual.qtd += 1;
    atual.kg += d.quantidade_kg;
    atual.valor += d.valor ?? 0;
    mapa.set(chave, atual);
  });

  const linhas = [...mapa.entries()].sort((a, b) => a[0].localeCompare(b[0], "pt-BR"));
  const totalKg = linhas.reduce((s, [, v]) => s + v.kg, 0);
  const totalQtd = linhas.reduce((s, [, v]) => s + v.qtd, 0);
  const totalValor = linhas.reduce((s, [, v]) => s + v.valor, 0);

  const pageHeight = doc.internal.pageSize.getHeight();
  let y = startY;
  if (y > pageHeight - 45) {
    doc.addPage();
    y = desenharCabecalhoBrand(doc);
  }

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(titulo, 8, y);

  autoTable(doc, {
    startY: y + 2,
    head: [["Produto", "Lançamentos", "Qtde (kg)", "Sacos", ...(incluirValor ? ["Valor Total"] : [])]],
    body: linhas.map(([produto, v]) => [
      produto,
      nf(v.qtd),
      nf(v.kg),
      nf(Math.round(v.kg / 60)),
      ...(incluirValor ? [brl(v.valor)] : []),
    ]),
    foot: [[
      "TOTAL",
      nf(totalQtd),
      nf(totalKg),
      nf(Math.round(totalKg / 60)),
      ...(incluirValor ? [brl(totalValor)] : []),
    ]],
    showFoot: "lastPage",
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
    didParseCell: (data) => {
      if (data.section === "foot" && data.column.index > 0) {
        data.cell.styles.halign = "right";
      }
    },
    margin: { left: 8, right: 8, bottom: 16 },
  });


  return (doc as any).lastAutoTable.finalY + 8;
}


/* ============================================================
 * Estruturas tabulares para exportação Excel (valores numéricos crus)
 * ============================================================ */

/** Limite do Excel para nome de planilha. */
const nomeSheet = (s: string) => s.replace(/[\\/?*[\]:]/g, "-").substring(0, 31);

function sheetLancamentos(tipo: DocumentoTipo, docs: DocumentoControle[]): RelatorioSheet {
  const ordenados = ordenarPorData(docs);
  const temValor = ordenados.some((d) => (d.valor ?? 0) > 0);

  const header = ["Data", "Referência", "Produtor / Inscrição", "Contraparte", "Produto", "Local", "Qtde (kg)", "Sacos"];
  if (temValor) header.push("Valor (R$)");

  const rows = ordenados.map((d) => {
    const row: (string | number)[] = [
      dataBr(d.data),
      d.referencia,
      d.produtor,
      d.contraparte,
      d.produto,
      d.local,
      Math.round(d.quantidade_kg),
      Math.round(d.quantidade_kg / 60),
    ];
    if (temValor) row.push(Number((d.valor ?? 0).toFixed(2)));
    return row;
  });

  const totalKg = ordenados.reduce((s, d) => s + d.quantidade_kg, 0);
  const totalValor = ordenados.reduce((s, d) => s + (d.valor ?? 0), 0);
  const totalRow: (string | number)[] = [
    "",
    "",
    "",
    "",
    "",
    `TOTAL (${ordenados.length})`,
    Math.round(totalKg),
    Math.round(totalKg / 60),
  ];
  if (temValor) totalRow.push(Number(totalValor.toFixed(2)));
  rows.push(totalRow);

  return { name: nomeSheet(labelTipo(tipo)), header, rows };
}

function sheetResumoProduto(docs: DocumentoControle[], nome: string): RelatorioSheet | null {
  const comProduto = docs.filter((d) => (d.produto ?? "").trim() && d.produto !== "-");
  if (comProduto.length === 0) return null;

  const incluirValor = comProduto.some((d) => (d.valor ?? 0) > 0);
  const mapa = new Map<string, { qtd: number; kg: number; valor: number }>();
  comProduto.forEach((d) => {
    const chave = d.produto.trim();
    const atual = mapa.get(chave) ?? { qtd: 0, kg: 0, valor: 0 };
    atual.qtd += 1;
    atual.kg += d.quantidade_kg;
    atual.valor += d.valor ?? 0;
    mapa.set(chave, atual);
  });

  const linhas = [...mapa.entries()].sort((a, b) => a[0].localeCompare(b[0], "pt-BR"));
  const header = ["Produto", "Lançamentos", "Qtde (kg)", "Sacos", ...(incluirValor ? ["Valor Total (R$)"] : [])];
  const rows: (string | number)[][] = linhas.map(([produto, v]) => [
    produto,
    v.qtd,
    Math.round(v.kg),
    Math.round(v.kg / 60),
    ...(incluirValor ? [Number(v.valor.toFixed(2))] : []),
  ]);
  const totalKg = linhas.reduce((s, [, v]) => s + v.kg, 0);
  rows.push([
    "TOTAL",
    linhas.reduce((s, [, v]) => s + v.qtd, 0),
    Math.round(totalKg),
    Math.round(totalKg / 60),
    ...(incluirValor ? [Number(linhas.reduce((s, [, v]) => s + v.valor, 0).toFixed(2))] : []),
  ]);

  return { name: nomeSheet(nome), header, rows };
}

/** Relatório de um único tipo de operação. */
export function gerarRelatorioControlePdf(
  tipo: DocumentoTipo,
  docs: DocumentoControle[],
  opcoes: RelatorioControleOpcoes
): void {
  const doc = new jsPDF({ orientation: opcoes.orientacao, format: opcoes.tamanho });
  let y = desenharCabecalhoBrand(doc);

  const titulo = labelTipo(tipo);

  y = desenharTitulo(doc, y, titulo, [
    `Conjunto de controle: ${opcoes.conjuntoNome}`,
    opcoes.subtitulo || "",
  ]);

  if (docs.length === 0) {
    doc.setFontSize(10);
    doc.text("Nenhum lançamento encontrado com os filtros informados.", 12, y + 6);
  } else {
    y = desenharBloco(doc, y, { tipo, docs });
    if (tipo !== "compra_cereal") {
      desenharResumoProduto(doc, y, docs);
    }
  }



  if (docs.length > 0) {
    const sheets: RelatorioSheet[] = [sheetLancamentos(tipo, docs)];
    if (tipo !== "compra_cereal") {
      const resumo = sheetResumoProduto(docs, "Resumo por Produto");
      if (resumo) sheets.push(resumo);
    }
    setPendingSheets(sheets);
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
    "Consolidado do Controle",
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
      showFoot: "lastPage",
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

    // Resumo geral por produto (todos os tipos, exceto compras de cereais)
    const todosDocs = comDados
      .flatMap((b) => b.docs)
      .filter((d) => d.tipo !== "compra_cereal");
    if (todosDocs.length > 0) {
      desenharResumoProduto(doc, (doc as any).lastAutoTable.finalY + 8, todosDocs, "Resumo Geral por Produto");
    }

  }


  desenharRodapeBrand(doc);
  entregarRelatorio(doc, `controle-consolidado-${format(new Date(), "yyyyMMdd-HHmm")}.pdf`);
}
