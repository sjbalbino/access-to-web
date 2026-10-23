import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { format, parseISO } from "date-fns";

/** Linha de entrada de colheita (depósito) usada no controle de placas. */
export interface PlacaMovimento {
  placa: string;
  propriedade: "propria" | "terceiros" | string | null;
  granja: string;
  lavoura: string;
  data: string | null;
  romaneio: number | null;
  bruto: number;
  desconto: number;
  liquido: number;
  inscricao: string;
  produtor: string;
}

export interface PlacasFiltroInfo {
  safra: string;
  cultura: string;
  placa?: string;
  lavoura?: string;
}

const KG_SACO = 60;
const kg = (v: number) => Math.round(v).toLocaleString("pt-BR");
const sacos = (v: number) => Math.round(v / KG_SACO).toLocaleString("pt-BR");
const dataBR = (d: string | null) => (d ? format(parseISO(d.length === 10 ? `${d}T00:00:00` : d), "dd/MM/yyyy") : "");

interface Totais { bruto: number; desconto: number; liquido: number; cargas: number }
const zero = (): Totais => ({ bruto: 0, desconto: 0, liquido: 0, cargas: 0 });
function somar(t: Totais, m: PlacaMovimento) {
  t.bruto += m.bruto; t.desconto += m.desconto; t.liquido += m.liquido; t.cargas += 1;
}
const linhaTot = (rot: string, t: Totais) => [rot, kg(t.bruto), sacos(t.bruto), kg(t.desconto), kg(t.liquido), sacos(t.liquido)];

function agrupar<T>(itens: T[], chave: (i: T) => string): Map<string, T[]> {
  const m = new Map<string, T[]>();
  for (const i of itens) { const k = chave(i); if (!m.has(k)) m.set(k, []); m.get(k)!.push(i); }
  return new Map([...m.entries()].sort(([a], [b]) => a.localeCompare(b, "pt-BR")));
}

function cabecalho(doc: jsPDF, titulo: string, f: PlacasFiltroInfo) {
  const w = doc.internal.pageSize.getWidth();
  doc.setFontSize(8); doc.setFont("helvetica", "normal");
  doc.text("Sisagro - Recebimento de Grãos", 14, 12);
  doc.text(format(new Date(), "dd/MM/yyyy HH:mm"), w - 14, 12, { align: "right" });
  doc.setFontSize(13); doc.setFont("helvetica", "bold");
  doc.text(titulo, w / 2, 18, { align: "center" });
  doc.setFontSize(9);
  const partes = [`Safra: ${f.safra}`, `Cultura: ${f.cultura}`];
  if (f.placa) partes.push(`Placa: ${f.placa}`);
  if (f.lavoura) partes.push(`Lavoura: ${f.lavoura}`);
  doc.text(partes.join("    "), 14, 25);
}

const estilo = {
  styles: { fontSize: 7.5, cellPadding: 1.2 },
  headStyles: { fillColor: [46, 125, 50] as [number, number, number] },
  margin: { left: 14, right: 14 },
  // Cabeçalho segue o alinhamento da coluna (numéricos à direita, data/romaneio centralizados).
  didParseCell: (d: { section: string; cell: { styles: { halign?: string } }; column: { raw?: unknown }; table: { columns: { index: number }[] }; column_index?: number } & { column: { index: number } }) => {
    if (d.section !== "head") return;
    const cs = (d as unknown as { table: { settings: { columnStyles: Record<number, { halign?: string }> } } }).table.settings.columnStyles;
    const h = cs?.[d.column.index]?.halign;
    if (h) d.cell.styles.halign = h;
  },
};
const negrito = (row: (string | number)[]) =>
  row.map((c) => ({ content: String(c), styles: { fontStyle: "bold" as const } }));

/** 1. Extrato da Placa: por placa → lavoura → dia, com cada carga. */
export function gerarExtratoPlacaPdf(movs: PlacaMovimento[], f: PlacasFiltroInfo) {
  const doc = new jsPDF({ orientation: "landscape" });
  cabecalho(doc, "Extrato de Placas - Colheita por Lavoura", f);
  const body: unknown[][] = [];
  const geral = zero();
  for (const [placa, lp] of agrupar(movs, (m) => m.placa)) {
    body.push([{ content: `PLACA: ${placa}`, colSpan: 10, styles: { fontStyle: "bold", fillColor: [232, 245, 233] } }]);
    const tPlaca = zero();
    for (const [lav, ll] of agrupar(lp, (m) => m.lavoura)) {
      body.push([{ content: `Lavoura: ${lav}`, colSpan: 10, styles: { fontStyle: "bold" } }]);
      const tLav = zero();
      const ordenadas = [...ll].sort((a, b) => (a.data ?? "").localeCompare(b.data ?? "") || (a.romaneio ?? 0) - (b.romaneio ?? 0));
      for (const m of ordenadas) {
        somar(tLav, m); somar(tPlaca, m); somar(geral, m);
        body.push([dataBR(m.data), m.romaneio ?? "", kg(m.bruto), sacos(m.bruto), kg(m.desconto), kg(m.liquido), sacos(m.liquido), m.inscricao, m.produtor, m.granja]);
      }
      body.push(negrito([`Total lavoura (${tLav.cargas} cargas)`, "", kg(tLav.bruto), sacos(tLav.bruto), kg(tLav.desconto), kg(tLav.liquido), sacos(tLav.liquido), "", "", ""]));
    }
    body.push(negrito([`TOTAL PLACA ${placa} (${tPlaca.cargas})`, "", kg(tPlaca.bruto), sacos(tPlaca.bruto), kg(tPlaca.desconto), kg(tPlaca.liquido), sacos(tPlaca.liquido), "", "", ""]));
  }
  body.push(negrito([`TOTAL GERAL (${geral.cargas} cargas)`, "", kg(geral.bruto), sacos(geral.bruto), kg(geral.desconto), kg(geral.liquido), sacos(geral.liquido), "", "", ""]));
  autoTable(doc, {
    ...estilo, startY: 29,
    head: [["Data", "Romaneio", "Bruto", "Sacos", "Desc.", "Líquido", "Sc. Líq.", "Inscrição", "Produtor", "Granja/Local"]],
    body: body as never,
    columnStyles: { 0: { halign: "center" }, 1: { halign: "center" }, 2: { halign: "right" }, 3: { halign: "right" }, 4: { halign: "right" }, 5: { halign: "right" }, 6: { halign: "right" } },
  });
  doc.save(`extrato_placas_${f.safra.replace(/\W+/g, "_")}.pdf`);
}

/** 2/3. Resumo por placa — por Granja (com totais Próprias/Terceiros) ou geral. */
function linhasResumo(movs: PlacaMovimento[]) {
  const linhas: string[][] = [];
  const proprias = zero(), terceiros = zero(), total = zero();
  for (const [placa, lp] of agrupar(movs, (m) => m.placa)) {
    const t = zero(); lp.forEach((m) => { somar(t, m); somar(total, m); somar(lp[0].propriedade === "propria" ? proprias : terceiros, m); });
    linhas.push(linhaTot(placa, t));
  }
  return { linhas, proprias, terceiros, total };
}

export function gerarResumoPlacasPdf(movs: PlacaMovimento[], f: PlacasFiltroInfo, porGranja: boolean) {
  const doc = new jsPDF();
  cabecalho(doc, porGranja ? "Resumo de Placas por Granja/Local" : "Resumo Geral de Placas", f);
  const body: unknown[][] = [];
  const geral = zero();
  const grupos = porGranja ? agrupar(movs, (m) => m.granja) : new Map([["", movs]]);
  for (const [granja, lg] of grupos) {
    if (porGranja) body.push([{ content: granja, colSpan: 6, styles: { fontStyle: "bold", fillColor: [232, 245, 233] } }]);
    const r = linhasResumo(lg);
    body.push(...r.linhas);
    if (r.proprias.cargas) body.push(negrito(linhaTot("PRÓPRIAS", r.proprias)));
    if (r.terceiros.cargas) body.push(negrito(linhaTot("TERCEIROS", r.terceiros)));
    if (porGranja) body.push(negrito(linhaTot("TOTAL GRANJA ===>", r.total)));
    lg.forEach((m) => somar(geral, m));
  }
  body.push(negrito(linhaTot("TOTAL GERAL ===>", geral)));
  autoTable(doc, {
    ...estilo, startY: 29,
    head: [["Placa", "Bruto", "Sacos", "Desc.", "Líquido", "Sc. Líq."]],
    body: body as never,
    columnStyles: { 1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "right" }, 4: { halign: "right" }, 5: { halign: "right" } },
  });
  doc.save(`resumo_placas_${f.safra.replace(/\W+/g, "_")}.pdf`);
}

/** Excel: planilha detalhada + resumo por placa. */
export function exportarPlacasExcel(movs: PlacaMovimento[], f: PlacasFiltroInfo) {
  const det = movs.map((m) => ({
    Placa: m.placa, Tipo: m.propriedade === "propria" ? "Própria" : "Terceiros", "Granja/Local": m.granja,
    Lavoura: m.lavoura, Data: dataBR(m.data), Romaneio: m.romaneio ?? "",
    "Bruto (kg)": Math.round(m.bruto), Sacos: Math.round(m.bruto / KG_SACO), "Desconto (kg)": Math.round(m.desconto),
    "Líquido (kg)": Math.round(m.liquido), "Sacos Líq.": Math.round(m.liquido / KG_SACO), Inscrição: m.inscricao, Produtor: m.produtor,
  }));
  const res = [...agrupar(movs, (m) => m.placa)].map(([placa, lp]) => {
    const t = zero(); lp.forEach((m) => somar(t, m));
    return { Placa: placa, Tipo: lp[0].propriedade === "propria" ? "Própria" : "Terceiros", Cargas: t.cargas,
      "Bruto (kg)": Math.round(t.bruto), Sacos: Math.round(t.bruto / KG_SACO), "Desconto (kg)": Math.round(t.desconto),
      "Líquido (kg)": Math.round(t.liquido), "Sacos Líq.": Math.round(t.liquido / KG_SACO) };
  });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(det), "Extrato");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(res), "Resumo");
  XLSX.writeFile(wb, `controle_placas_${f.safra.replace(/\W+/g, "_")}.xlsx`);
}
