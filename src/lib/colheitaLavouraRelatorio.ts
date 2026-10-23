import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format, parseISO } from "date-fns";
import type { Colheita } from "@/hooks/useColheitas";
import type { RelatorioPayload, RelatorioSheet } from "@/lib/relatorioViewer";

/** Relatório da Colheita por Lavoura (modelo legado): Local de entrega → Produtor → Tipo, com acumulados. */
export type ColheitaRel = Colheita & { romaneio?: number | null };

export interface ColheitaLavouraInfo {
  lavoura: string;
  granja: string;
  safra: string;
  haPlantado: number;
}

const KG_SACO = 60;
const n = (v: number | null | undefined) => Number(v ?? 0);
const kg = (v: number) => Math.round(v).toLocaleString("pt-BR");
const dec = (v: number, d = 2) => v.toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d });
const dataBR = (d: string | null) => (d ? format(parseISO(d.length === 10 ? `${d}T00:00:00` : d), "dd/MM/yyyy") : "");

interface Tot { cargas: number; bruto: number; tara: number; liq: number; kImp: number; kUmi: number; kAv: number; kOut: number; kDesc: number; final: number; sImp: number; sUmi: number; sPh: number }
const zero = (): Tot => ({ cargas: 0, bruto: 0, tara: 0, liq: 0, kImp: 0, kUmi: 0, kAv: 0, kOut: 0, kDesc: 0, final: 0, sImp: 0, sUmi: 0, sPh: 0 });
function somar(t: Tot, c: ColheitaRel) {
  const liq = n(c.producao_kg);
  t.cargas++; t.bruto += n(c.peso_bruto); t.tara += n(c.peso_tara); t.liq += liq;
  t.kImp += n(c.kg_impureza); t.kUmi += n(c.kg_umidade); t.kAv += n(c.kg_avariados); t.kOut += n(c.kg_outros);
  t.kDesc += n(c.kg_desconto_total); t.final += n(c.producao_liquida_kg);
  // médias ponderadas pelo peso líquido de cada carga
  t.sImp += n(c.impureza) * liq; t.sUmi += n(c.umidade) * liq; t.sPh += n(c.ph) * liq;
}
const media = (s: number, t: Tot) => (t.liq ? s / t.liq : 0);

function agrupar<T>(itens: T[], chave: (i: T) => string) {
  const m = new Map<string, T[]>();
  itens.forEach((i) => { const k = chave(i); if (!m.has(k)) m.set(k, []); m.get(k)!.push(i); });
  return m;
}

const nomeLocal = (c: ColheitaRel, granja: string) => c.local_entrega_terceiro?.nome ?? granja;
const nomeProdutor = (c: ColheitaRel) => {
  const ie = c.inscricao_produtor?.inscricao_estadual?.replace(/\D/g, "") ?? "";
  const nome = (c.inscricao_produtor?.produtores?.nome ?? "SEM PRODUTOR").toUpperCase();
  return ie ? `${ie} - ${nome}` : nome;
};
const nomeTipo = (c: ColheitaRel) => (c.tipo_colheita ?? "industria").toUpperCase();

function linhaTotal(rot: string, t: Tot, comCargas = true) {
  return [
    { content: rot, colSpan: 2 }, comCargas ? String(t.cargas) : "", kg(t.bruto), kg(t.tara), kg(t.liq),
    dec(media(t.sImp, t)), kg(t.kImp), dec(media(t.sUmi, t)), "", kg(t.kUmi), "", kg(t.kAv), "", kg(t.kOut),
    kg(t.kDesc), kg(t.final), kg(t.final / KG_SACO), "", "", "", dec(media(t.sPh, t)), "",
  ];
}

export function gerarColheitaLavouraPdf(colheitas: ColheitaRel[], info: ColheitaLavouraInfo): RelatorioPayload {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const ordenadas = [...colheitas].sort((a, b) => (a.data_colheita ?? "").localeCompare(b.data_colheita ?? "") || n(a.romaneio) - n(b.romaneio));
  const mediaHa = (t: Tot) => (info.haPlantado > 0 ? t.final / KG_SACO / info.haPlantado : 0);
  const linhaMedia = (t: Tot) => [{ content: `MÉDIA Sc/Ha: ${dec(mediaHa(t))}`, colSpan: 23, styles: { fontStyle: "italic" } }];
  const grupo = (txt: string, fill: [number, number, number]) => [{ content: txt, colSpan: 23, styles: { fontStyle: "bold", fillColor: fill } }];
  const negrito = (row: unknown[]) => row.map((c) => (typeof c === "object" && c ? { ...(c as object), styles: { fontStyle: "bold" } } : { content: c, styles: { fontStyle: "bold" } }));

  const body: unknown[][] = [];
  const geral = zero();
  let acKg = 0;
  const excel: (string | number)[][] = [];

  for (const [local, lLoc] of agrupar(ordenadas, (c) => nomeLocal(c, info.granja))) {
    body.push(grupo(`LOCAL ENTREGA: ${local}`, [220, 237, 222]));
    const tLoc = zero();
    for (const [prod, lProd] of agrupar(lLoc, nomeProdutor)) {
      body.push(grupo(`PRODUTOR: ${prod}`, [240, 246, 241]));
      const tProd = zero();
      for (const [tipo, lTipo] of agrupar(lProd, nomeTipo)) {
        body.push(grupo(tipo, [250, 250, 250]));
        const tTipo = zero();
        let ultimaData = "";
        for (const c of lTipo) {
          [tTipo, tProd, tLoc, geral].forEach((t) => somar(t, c));
          acKg += n(c.producao_liquida_kg);
          const data = dataBR(c.data_colheita);
          body.push([
            data === ultimaData ? "" : data, c.placas?.placa ?? "", "", kg(n(c.peso_bruto)), kg(n(c.peso_tara)), kg(n(c.producao_kg)),
            dec(n(c.impureza)), kg(n(c.kg_impureza)), dec(n(c.umidade), 1), dec(n(c.percentual_desconto)), kg(n(c.kg_umidade)),
            dec(n(c.percentual_avariados)), kg(n(c.kg_avariados)), dec(n(c.percentual_outros)), kg(n(c.kg_outros)),
            kg(n(c.kg_desconto_total)), kg(n(c.producao_liquida_kg)), kg(n(c.producao_liquida_kg) / KG_SACO),
            kg(acKg), kg(acKg / KG_SACO), c.romaneio ?? "", dec(n(c.ph)), c.semente?.nome ?? "",
          ]);
          excel.push([local, prod, tipo, data, c.placas?.placa ?? "", n(c.peso_bruto), n(c.peso_tara), n(c.producao_kg),
            n(c.impureza), n(c.kg_impureza), n(c.umidade), n(c.percentual_desconto), n(c.kg_umidade), n(c.percentual_avariados),
            n(c.kg_avariados), n(c.percentual_outros), n(c.kg_outros), n(c.kg_desconto_total), n(c.producao_liquida_kg),
            Math.round(n(c.producao_liquida_kg) / KG_SACO), Math.round(acKg), Math.round(acKg / KG_SACO), c.romaneio ?? "", n(c.ph), c.semente?.nome ?? ""]);
          ultimaData = data;
        }
        body.push(negrito(linhaTotal(tipo, tTipo)));
      }
      body.push(negrito(linhaTotal("PRODUTOR --->", tProd)));
      body.push(linhaMedia(tProd));
    }
    body.push(negrito(linhaTotal("LOC. ENTREGA >", tLoc)));
    body.push(linhaMedia(tLoc));
  }
  body.push(negrito(linhaTotal("GERAL LAV. --->", geral)));
  body.push(linhaMedia(geral));

  const pageW = doc.internal.pageSize.getWidth();
  const cab = () => {
    doc.setFontSize(9); doc.setFont("helvetica", "bold");
    doc.text("Relatório da Colheita por Lavoura", pageW / 2, 10, { align: "center" });
    doc.setFont("helvetica", "normal"); doc.setFontSize(7.5);
    doc.text(`LAVOURA: ${info.lavoura}`, 8, 16);
    doc.text(`Granja: ${info.granja}`, pageW / 2, 16, { align: "center" });
    doc.text(`HA. Plantado: ${dec(info.haPlantado)}`, pageW - 8, 16, { align: "right" });
    doc.text(`Safra: ${info.safra}`, 8, 20);
    doc.text(format(new Date(), "dd/MM/yyyy HH:mm"), pageW - 8, 10, { align: "right" });
  };

  const direita = Object.fromEntries([...Array(20).keys()].slice(2).map((i) => [i, { halign: "right" }]));
  autoTable(doc, {
    startY: 23,
    margin: { left: 6, right: 6, top: 23 },
    styles: { fontSize: 5.6, cellPadding: 0.8, overflow: "linebreak" },
    headStyles: { fillColor: [46, 125, 50], fontSize: 5.6 },
    head: [[
      "Data", "Placa", "Cargas", "Bruto", "Tara", "Líquido", "Imp.%", "Kgs", "Umi.", "%Um.", "Kgs", "%Av.", "Kgs", "%Out.", "Kgs",
      "Kg.Desc.", "Líq.Final", "Sacos", "Acum. Kg", "Acum. Sc", "Rom.", "PH", "Variedade",
    ].map((h, i) => ({ content: h, styles: { halign: i === 0 || i === 20 ? "center" : i >= 2 && i <= 21 ? "right" : "left" } }))] as never,
    body: body as never,
    columnStyles: { ...direita, 0: { halign: "center" }, 20: { halign: "center" }, 21: { halign: "right" } } as never,
    didDrawPage: () => {
      cab();
      doc.setFontSize(7);
      doc.text(`Página ${doc.getNumberOfPages()}`, pageW - 8, doc.internal.pageSize.getHeight() - 5, { align: "right" });
    },
  });

  const sheets: RelatorioSheet[] = [{
    name: "Colheita",
    header: ["Local Entrega", "Produtor", "Tipo", "Data", "Placa", "Bruto", "Tara", "Líquido", "Imp. %", "Kg Imp.", "Umidade %",
      "% Desc. Um.", "Kg Um.", "% Avar.", "Kg Avar.", "% Outros", "Kg Outros", "Kg Desc.", "Líq. Final", "Sacos", "Acum. Kg", "Acum. Sacos", "Romaneio", "PH", "Variedade"],
    rows: excel,
  }];
  const arquivo = `colheita_lavoura_${info.lavoura}_${info.safra}`.replace(/\W+/g, "_");
  return { doc, filename: `${arquivo}.pdf`, sheets };
}
