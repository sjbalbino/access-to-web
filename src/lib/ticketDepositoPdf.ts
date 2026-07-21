import jsPDF from "jspdf";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatDateSP, formatTimeSP, nowDateTimeSP } from "./datetime";
import { supabase } from "@/integrations/supabase/client";
import { loadPdfBrand } from "./pdfBrand";

// Ticket de Depósito (Romaneio de Colheita) — impressora térmica 80mm
// Compatível com bobina de 80 colunas / ~72mm imprimíveis (Courier 8pt)

const PAGE_W = 80;
const MARGIN_X = 3;
const COLS = 42; // ~42 chars por linha em Courier 8pt

const fmtNum = (v: number | null | undefined, dec = 0) => {
  if (v === null || v === undefined || isNaN(Number(v))) return "0";
  const n = Number(v);
  const val = dec === 0 ? Math.round(n) : n;
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec,
  }).format(val);
};

const fmtDate = (d: string | null | undefined) => {
  if (!d) return "";
  return formatDateSP(d);
};

const fmtHora = (d: string | null | undefined) => {
  if (!d) return "";
  return formatTimeSP(d);
};

// Formata uma linha com label à esquerda e valor à direita, preenchendo com espaços
const row2 = (l: string, r: string): string => {
  const total = COLS;
  const space = Math.max(1, total - l.length - r.length);
  return l + " ".repeat(space) + r;
};

// Formata "Label: valor" com quebra automática
const kv = (label: string, value: string): string[] => {
  const line = `${label} ${value}`;
  if (line.length <= COLS) return [line];
  const pad = " ".repeat(Math.min(label.length + 1, 4));
  const out = [label];
  let v = value;
  while (v.length > 0) {
    const chunk = v.slice(0, COLS - pad.length);
    out.push(pad + chunk);
    v = v.slice(chunk.length);
  }
  return out;
};

export async function gerarTicketDepositoPdf(colheitaId: string): Promise<void> {
  // Carrega dados completos da colheita
  const { data: c, error } = await supabase
    .from("colheitas")
    .select(`
      *,
      safras (nome),
      silos (nome),
      placas (placa),
      semente:produtos!colheitas_variedade_id_fkey (nome),
      inscricao_produtor:inscricoes_produtor!colheitas_inscricao_produtor_id_fkey (
        inscricao_estadual, cpf_cnpj, cidade, uf,
        produtores:produtor_id (nome)
      ),
      local_entrega_terceiro:locais_entrega!colheitas_local_entrega_terceiro_id_fkey (nome)
    `)
    .eq("id", colheitaId)
    .maybeSingle();

  if (error || !c) {
    throw new Error("Colheita não encontrada");
  }

  const brand = await loadPdfBrand();

  // Balanceiro pode estar em observacoes ("Balanceiro: X")
  let balanceiro = "";
  if (c.observacoes) {
    const m = String(c.observacoes).match(/Balanceiro:\s*(.+)/i);
    if (m) balanceiro = m[1].trim();
  }

  const pesoBruto = Number(c.peso_bruto || 0);
  const pesoTara = Number(c.peso_tara || 0);
  const pesoLiq = pesoBruto - pesoTara;

  const lines: Array<{ text: string; bold?: boolean; center?: boolean }> = [];
  const add = (text = "", opts: { bold?: boolean; center?: boolean } = {}) =>
    lines.push({ text, ...opts });
  const sep = () => lines.push({ text: "-".repeat(COLS) });
  const addKv = (l: string, v: string) => kv(l, v || "-").forEach((t) => add(t));

  // Cabeçalho — dados do tenant
  const nomeEmp = (brand.tenantFantasia || brand.tenantNome || "").toUpperCase();
  if (nomeEmp) add(nomeEmp.slice(0, COLS), { bold: true, center: true });
  if (brand.cnpj) add(`CNPJ: ${brand.cnpj}`, { center: true });
  if (brand.cidadeUf) add(brand.cidadeUf, { center: true });
  sep();

  // Título + Nº ticket
  add(row2("Ticket de Depósito", `Nº: ${c.codigo || String(c.id).slice(0, 8).toUpperCase()}`), { bold: true });
  sep();

  // Loc. Entrega
  const locEntrega = c.local_entrega_terceiro?.nome || c.silos?.nome || "-";
  addKv("Loc.Entrega:", locEntrega);
  sep();

  // Data | Safra | Tipo
  add(row2("Data", row2("Safra", "Tipo").slice("Data".length + 1)), { bold: true });
  const dataStr = fmtDate(c.data_colheita);
  const safraStr = String(c.safras?.nome || "-");
  const tipoStr = String(c.tipo_colheita || "-").toUpperCase();
  // Três colunas: data (10), safra (meio), tipo (direita)
  const linhaDados = (() => {
    const left = dataStr.padEnd(12);
    const right = tipoStr;
    const middleSpace = COLS - left.length - right.length;
    const middle = safraStr.length > middleSpace - 1
      ? safraStr.slice(0, middleSpace - 1) + " "
      : safraStr.padEnd(middleSpace);
    return left + middle + right;
  })();
  add(linhaDados);

  // Variedade
  add("Variedade");
  add(String(c.semente?.nome || "-").toUpperCase());

  // Produtor
  add("Produtor");
  const produtorNome = String(c.inscricao_produtor?.produtores?.nome || "-").toUpperCase();
  const cidUfProd = [c.inscricao_produtor?.cidade, c.inscricao_produtor?.uf].filter(Boolean).join(" - ").toUpperCase();
  add(cidUfProd ? `${produtorNome} - ${cidUfProd}` : produtorNome);

  // Inscrição | CPF | Placa (header)
  add(row2("Inscrição", row2("CPF:", "Placa").slice("Inscrição".length + 1)), { bold: true });
  const insc = String(c.inscricao_produtor?.inscricao_estadual || "-");
  const cpf = String(c.inscricao_produtor?.cpf_cnpj || "-");
  const placa = String(c.placas?.placa || "-");
  const linhaInsc = (() => {
    const left = insc.padEnd(14);
    const right = placa;
    const middleSpace = COLS - left.length - right.length;
    const middle = cpf.length > middleSpace - 1
      ? cpf.slice(0, middleSpace - 1) + " "
      : cpf.padEnd(middleSpace);
    return left + middle + right;
  })();
  add(linhaInsc);
  sep();

  // Pesagem — 3 colunas: label (esq), kilos (dir na col meio), horário (dir no fim)
  const HORA_W = 7; // "HH:mm" + folga
  const row3 = (label: string, kilos: string, hora: string): string => {
    const rightBlock = kilos + " ".repeat(Math.max(1, HORA_W - hora.length)) + hora;
    const space = Math.max(1, COLS - label.length - rightBlock.length);
    return label + " ".repeat(space) + rightBlock;
  };
  add(row3("Pesagem", "Kilos", "Horário"), { bold: true });
  const horaEntrada = fmtHora(c.created_at);
  const horaSaida = fmtHora(c.updated_at);
  add(row3("  Peso Entrada:", fmtNum(pesoBruto), horaEntrada));
  add(row3("  Peso Saída:", fmtNum(pesoTara), horaSaida));
  add(row3("  Peso Bruto:", fmtNum(pesoLiq), ""));
  sep();

  // Classificação
  add(row2("Classificação", "Kgs."), { bold: true });
  const impPct = Number(c.impureza || 0);
  const impDescPct = Number(c.impureza || 0); // sem coluna separada de desconto de impureza
  add(row2("  Impureza:", `${fmtNum(impPct, 2)}  ${fmtNum(impDescPct, 2)} %   ${fmtNum(c.kg_impureza)}`));
  add(row2("  Umidade:", `${fmtNum(c.umidade, 1)}  ${fmtNum(c.percentual_desconto, 2)} %   ${fmtNum(c.kg_umidade)}`));
  add(row2("  Avariados:", `${fmtNum(c.percentual_avariados, 2)}  ${fmtNum(c.percentual_avariados, 2)} %   ${fmtNum(c.kg_avariados)}`));
  add(row2("  Outros:", `${fmtNum(c.percentual_outros, 2)}  ${fmtNum(c.percentual_outros, 2)} %   ${fmtNum(c.kg_outros)}`));
  add(row2("  Total Desc.:", fmtNum(c.kg_desconto_total)));
  const pctDescTotal = pesoLiq > 0 ? (Number(c.kg_desconto_total || 0) / pesoLiq) * 100 : 0;
  add(row2("  % Desc.:", `${fmtNum(pctDescTotal, 2)} %   PH  ${fmtNum(c.ph, 2)}`));
  sep();

  // Líquido final
  add(row2("Líquido:", `${fmtNum(c.producao_liquida_kg)} kgs   ${fmtNum(c.total_sacos)} scs`), { bold: true });
  sep();

  // Balanceiro
  add(`Balanceiro: ${balanceiro || "-"}`);

  // Assinatura
  add("_".repeat(COLS - 4), { center: true });
  add("Recebedor", { center: true });
  add(
    `Emitido: ${nowDateTimeSP()}`,
    { center: true }
  );

  // Remove linhas vazias finais para não gerar espaço em branco
  while (lines.length && lines[lines.length - 1].text.trim() === "") lines.pop();

  // Renderiza
  const lineH = 3.4;
  const topPad = 3;
  const bottomPad = 2;
  const pageH = topPad + lines.length * lineH + bottomPad;

  const doc = new jsPDF({
    unit: "mm",
    format: [PAGE_W, pageH],
    orientation: "portrait",
  });
  doc.setFont("courier", "normal");
  doc.setFontSize(8);

  let y = topPad;
  for (const l of lines) {
    doc.setFont("courier", l.bold ? "bold" : "normal");
    if (l.center) {
      doc.text(l.text, PAGE_W / 2, y, { align: "center" });
    } else {
      doc.text(l.text, MARGIN_X, y);
    }
    y += lineH;
  }

  // Abre em preview interno (dialog) via evento global
  const arrayBuffer = doc.output("arraybuffer");
  const pdfData = new Uint8Array(arrayBuffer);
  const filename = `ticket_deposito_${c.codigo || c.id}.pdf`;
  const previewText = lines.map((line) => line.text).join("\n");
  const { openTicketDepositoPreview } = await import("@/components/shared/TicketDepositoPreview");
  openTicketDepositoPreview({ pdfData, filename, previewText });
}
