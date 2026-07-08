import jsPDF from "jspdf";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";

// Romaneio para impressora térmica de 80 colunas (bobina 80mm)
// Largura: 80mm | Área imprimível ~72mm | Fonte monoespaçada Courier
// Altura dinâmica (calculada em duas passadas)

const PAGE_W = 80;                 // mm - bobina 80mm
const MARGIN_X = 3;                // margem lateral
const CONTENT_W = PAGE_W - MARGIN_X * 2;
const COLS = 42;                   // ~42 caracteres por linha em Courier 8pt

const fmtNum = (v: number | null | undefined, dec = 0) => {
  if (v === null || v === undefined || isNaN(Number(v))) return "0";
  const n = Number(v);
  const r = dec === 0 ? Math.round(n) : n;
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec,
  }).format(r);
};

const fmtDate = (d: string | null | undefined) => {
  if (!d) return "";
  try {
    return format(parseISO(d.length <= 10 ? `${d}T12:00:00` : d), "dd/MM/yyyy", { locale: ptBR });
  } catch {
    return d;
  }
};

const fmtDateHora = (d: string | null | undefined, hora: string | null | undefined) => {
  const data = fmtDate(d);
  const h = hora ? hora.slice(0, 5) : "";
  return h ? `${data} ${h}` : data;
};

// Formata "Label: valor" em uma linha; se estourar, quebra
const kv = (label: string, value: string): string[] => {
  const line = `${label} ${value}`;
  if (line.length <= COLS) return [line];
  // quebra: label na 1ª linha, valor recuado
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

interface RomaneioContrato {
  id: string;
  numero: number | string;
  tipo_venda?: string | null;
  local_entrega_nome?: string | null;
  local_entrega_logradouro?: string | null;
  local_entrega_numero?: string | null;
  local_entrega_bairro?: string | null;
  local_entrega_cidade?: string | null;
  local_entrega_uf?: string | null;
  local_entrega_cep?: string | null;
  local_entrega_cnpj_cpf?: string | null;
  local_entrega_ie?: string | null;
  safra?: { nome?: string | null } | null;
  produto?: { nome?: string | null } | null;
  comprador_id?: string | null;
  inscricao_produtor_id?: string | null;
}

export async function gerarRomaneioVendaPdf(
  contrato: RomaneioContrato,
  remessa: any
): Promise<void> {
  const [inscricaoRes, compradorRes] = await Promise.all([
    contrato.inscricao_produtor_id
      ? supabase
          .from("inscricoes_produtor")
          .select("*, produtor:produtores(nome)")
          .eq("id", contrato.inscricao_produtor_id)
          .maybeSingle()
      : Promise.resolve({ data: null } as any),
    contrato.comprador_id
      ? supabase
          .from("clientes_fornecedores")
          .select("*")
          .eq("id", contrato.comprador_id)
          .maybeSingle()
      : Promise.resolve({ data: null } as any),
  ]);
  const inscricao: any = inscricaoRes.data;
  const comprador: any = compradorRes.data;

  // Monta todas as linhas primeiro (para calcular altura)
  const lines: Array<{ text: string; bold?: boolean; center?: boolean; sep?: boolean }> = [];
  const add = (text = "", opts: { bold?: boolean; center?: boolean } = {}) =>
    lines.push({ text, ...opts });
  const sep = () => lines.push({ text: "-".repeat(COLS), sep: true });
  const addKv = (l: string, v: string) => kv(l, v || "-").forEach((t) => add(t));

  add("ROMANEIO SAIDA DE PRODUTOS", { bold: true, center: true });
  add(`ROMANEIO Nº: ${remessa.romaneio ?? remessa.codigo ?? "-"}`, { center: true });
  sep();

  addKv("DATA:", fmtDateHora(remessa.data_remessa, remessa.hora_remessa));
  addKv("Safra:", String(contrato.safra?.nome || "-"));
  addKv("Produto:", String(contrato.produto?.nome || "-"));
  addKv("Tipo:", String(contrato.tipo_venda || "-").toUpperCase());
  addKv("Silo Armaz:", String(remessa.silo?.nome || "-"));
  addKv("CONTRATO:", String(contrato.numero));
  sep();

  add("VENDEDOR", { bold: true, center: true });
  const vendedorNome =
    inscricao?.produtor?.nome || inscricao?.granja || inscricao?.nome || "-";
  addKv("Nome:", vendedorNome);
  addKv(
    "End.:",
    `${inscricao?.logradouro || ""}${inscricao?.numero ? ", " + inscricao.numero : ""}`.trim() ||
      "-"
  );
  if (inscricao?.bairro) addKv("Bairro:", inscricao.bairro);
  addKv(
    "Cidade:",
    `${inscricao?.cidade || "-"}${inscricao?.uf ? "/" + inscricao.uf : ""}`
  );
  if (inscricao?.cep) addKv("CEP:", inscricao.cep);
  addKv("CPF/CNPJ:", inscricao?.cpf_cnpj || "-");
  addKv("I.E.:", inscricao?.inscricao_estadual || "-");
  sep();

  add("COMPRADOR", { bold: true, center: true });
  addKv("Nome:", comprador?.nome || "-");
  addKv(
    "End.:",
    `${comprador?.logradouro || ""}${comprador?.numero ? ", " + comprador.numero : ""}`.trim() ||
      "-"
  );
  if (comprador?.bairro) addKv("Bairro:", comprador.bairro);
  addKv(
    "Cidade:",
    `${comprador?.cidade || "-"}${comprador?.uf ? "/" + comprador.uf : ""}`
  );
  if (comprador?.cep) addKv("CEP:", comprador.cep);
  addKv("CPF/CNPJ:", comprador?.cpf_cnpj || "-");
  addKv("I.E.:", comprador?.inscricao_estadual || "-");
  sep();

  const le = {
    nome: remessa.local_entrega_nome || contrato.local_entrega_nome,
    log: remessa.local_entrega_logradouro || contrato.local_entrega_logradouro,
    num: remessa.local_entrega_numero || contrato.local_entrega_numero,
    bairro: remessa.local_entrega_bairro || contrato.local_entrega_bairro,
    cidade: remessa.local_entrega_cidade || contrato.local_entrega_cidade,
    uf: remessa.local_entrega_uf || contrato.local_entrega_uf,
    cep: remessa.local_entrega_cep || contrato.local_entrega_cep,
    cnpj: remessa.local_entrega_cnpj_cpf || contrato.local_entrega_cnpj_cpf,
    ie: remessa.local_entrega_ie || contrato.local_entrega_ie,
  };
  add("LOCAL DE ENTREGA", { bold: true, center: true });
  addKv("Local:", le.nome || "-");
  addKv(
    "End.:",
    `${le.log || ""}${le.num ? ", " + le.num : ""}`.trim() || "-"
  );
  addKv("Cidade:", `${le.cidade || "-"}${le.uf ? "/" + le.uf : ""}`);
  if (le.cep) addKv("CEP:", le.cep);
  addKv("CPF/CNPJ:", le.cnpj || "-");
  addKv("I.E.:", le.ie || "-");
  sep();

  add("PESAGEM", { bold: true, center: true });
  const pesoBruto = Number(remessa.peso_bruto || 0);
  const pesoTara = Number(remessa.peso_tara || 0);
  const pesoLiq = pesoBruto - pesoTara;
  addKv("BRUTO:", `${fmtNum(pesoBruto)} Kgs.`);
  addKv("TARA:", `${fmtNum(pesoTara)} Kgs.`);
  addKv("LIQUIDO:", `${fmtNum(pesoLiq)} Kgs.`);
  sep();

  add("DESCONTOS", { bold: true, center: true });
  const kgDescUmid = Number(remessa.kg_desconto_umidade || 0);
  const kgDescImp = Number(remessa.kg_desconto_impureza || 0);
  const totalDesc = kgDescUmid + kgDescImp;
  addKv("Umidade:", `${fmtNum(kgDescUmid)} Kgs. (${fmtNum(remessa.umidade, 1)}%)`);
  addKv("Impureza:", `${fmtNum(kgDescImp)} Kgs. (${fmtNum(remessa.impureza, 1)}%)`);
  addKv("Avariados:", "0 Kgs.");
  addKv("Outros:", "0 Kgs.");
  addKv("Total Desc:", `${fmtNum(totalDesc)} Kgs.`);
  addKv("LIQUIDO:", `${fmtNum(remessa.kg_remessa)} Kgs.`);
  addKv("SACOS:", fmtNum(remessa.sacos_remessa || remessa.sacos));
  sep();

  const t = remessa.transportadora;
  add("TRANSPORTADOR", { bold: true, center: true });
  addKv("Nome:", t?.nome || "-");
  if (t?.logradouro) addKv("End.:", t.logradouro);
  if (t?.cidade) addKv("Cidade:", t.cidade);
  addKv("CPF/CNPJ:", t?.cpf_cnpj || "-");
  if (t?.inscricao_estadual) addKv("I.E.:", t.inscricao_estadual);
  addKv(
    "Placa:",
    `${remessa.placa || "-"}${remessa.uf_placa ? " " + remessa.uf_placa : ""}`
  );
  addKv("MOTORISTA:", String(remessa.motorista || "-"));
  if (remessa.motorista_cpf) addKv("CPF Mot.:", remessa.motorista_cpf);
  sep();

  if (remessa.observacoes) {
    add("OBS:", { bold: true });
    const obs = String(remessa.observacoes);
    for (let i = 0; i < obs.length; i += COLS) add(obs.slice(i, i + COLS));
    sep();
  }

  // Assinaturas
  add("");
  add("");
  add("_".repeat(COLS - 4), { center: true });
  add(String(t?.nome || "Transportador"), { center: true });
  add("");
  add("_".repeat(COLS - 4), { center: true });
  add("Recebedor", { center: true });
  add("");
  add(
    `Emitido: ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR })}`,
    { center: true }
  );

  // Renderização
  const lineH = 3.4;      // mm entre linhas
  const topPad = 4;
  const bottomPad = 6;
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
    if (l.bold) doc.setFont("courier", "bold");
    else doc.setFont("courier", "normal");

    if (l.center) {
      doc.text(l.text, PAGE_W / 2, y, { align: "center" });
    } else {
      doc.text(l.text, MARGIN_X, y);
    }
    y += lineH;
  }

  const blob = doc.output("blob");
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `romaneio_${remessa.romaneio || remessa.codigo || remessa.id}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
