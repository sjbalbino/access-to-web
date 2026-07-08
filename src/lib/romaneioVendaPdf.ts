import jsPDF from "jspdf";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";

// Formato "80 colunas" - relatório compacto de romaneio (uma remessa por página)
// Baseado no modelo do sistema legado SisGranja (Access)

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
  // Busca dados completos de vendedor (inscrição) e comprador
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

  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  doc.setFont("courier", "normal");

  const pageW = doc.internal.pageSize.getWidth();
  const marginX = 12;
  const contentW = pageW - marginX * 2;
  let y = 14;

  // Cabeçalho
  doc.setFont("courier", "bold");
  doc.setFontSize(12);
  doc.text("ROMANEIO SAIDA DE PRODUTOS", pageW / 2, y, { align: "center" });
  y += 5;
  doc.setFontSize(10);
  doc.text(`ROMANEIO Nº: ${remessa.romaneio ?? remessa.codigo ?? "-"}`, pageW / 2, y, {
    align: "center",
  });
  y += 6;

  // Bloco informações gerais
  doc.setFont("courier", "normal");
  doc.setFontSize(9);
  const boxTop = y;
  const rowH = 4.5;
  const drawBox = (h: number) => {
    doc.rect(marginX, boxTop, contentW, h);
  };

  const label = (t: string, x: number, yy: number) => {
    doc.setFont("courier", "bold");
    doc.text(t, x, yy);
    doc.setFont("courier", "normal");
  };

  // Linha 1: Data + Safra
  label("DATA:", marginX + 2, y + 3.5);
  doc.text(fmtDateHora(remessa.data_remessa, remessa.hora_remessa), marginX + 18, y + 3.5);
  label("Safra:", marginX + 90, y + 3.5);
  doc.text(String(contrato.safra?.nome || "-"), marginX + 105, y + 3.5);
  y += rowH;
  // Linha 2: Produto
  label("Produto:", marginX + 2, y + 3.5);
  doc.text(String(contrato.produto?.nome || "-"), marginX + 22, y + 3.5);
  y += rowH;
  // Linha 3: Tipo + Silo
  label("Tipo:", marginX + 2, y + 3.5);
  doc.text(String(contrato.tipo_venda || "-").toUpperCase(), marginX + 18, y + 3.5);
  label("Silo Armaz:", marginX + 90, y + 3.5);
  doc.text(String(remessa.silo?.nome || "-"), marginX + 115, y + 3.5);
  y += rowH;
  // Linha 4: Contrato
  label("CONTRATO:", marginX + 2, y + 3.5);
  doc.text(String(contrato.numero), marginX + 28, y + 3.5);
  y += rowH + 1;
  drawBox(y - boxTop);
  y += 2;

  // Função para blocos com título
  const bloco = (titulo: string, linhas: Array<[string, string, string?, string?]>) => {
    // Título centralizado com barra
    doc.setFont("courier", "bold");
    doc.setFontSize(9);
    const tw = doc.getTextWidth(titulo);
    doc.text(titulo, pageW / 2, y + 3.2, { align: "center" });
    // linha
    y += 4.5;
    const bTop = y;
    doc.setFont("courier", "normal");
    linhas.forEach(([l1, v1, l2, v2]) => {
      label(l1, marginX + 2, y + 3.5);
      doc.text(v1 || "-", marginX + 22, y + 3.5);
      if (l2) {
        label(l2, marginX + 90, y + 3.5);
        doc.text(v2 || "-", marginX + 112, y + 3.5);
      }
      y += rowH;
    });
    doc.rect(marginX, bTop, contentW, y - bTop);
    y += 1;
  };

  // VENDEDOR
  const vendedorNome =
    inscricao?.produtor?.nome || inscricao?.granja || inscricao?.nome || "-";
  bloco("VENDEDOR", [
    ["Nome:", vendedorNome],
    [
      "Endereço:",
      `${inscricao?.logradouro || ""}${inscricao?.numero ? ", " + inscricao.numero : ""}`,
    ],
    ["Bairro:", inscricao?.bairro || "-"],
    [
      "Cidade:",
      `${inscricao?.cidade || "-"}${inscricao?.uf ? "/" + inscricao.uf : ""}`,
      "CEP:",
      inscricao?.cep || "-",
    ],
    [
      "CPF/CNPJ:",
      inscricao?.cpf_cnpj || "-",
      "I.E.:",
      inscricao?.inscricao_estadual || "-",
    ],
  ]);

  // COMPRADOR
  bloco("COMPRADOR", [
    ["Nome:", comprador?.nome || "-"],
    [
      "Endereço:",
      `${comprador?.logradouro || ""}${comprador?.numero ? ", " + comprador.numero : ""}`,
    ],
    ["Bairro:", comprador?.bairro || "-"],
    [
      "Cidade:",
      `${comprador?.cidade || "-"}${comprador?.uf ? "/" + comprador.uf : ""}`,
      "CEP:",
      comprador?.cep || "-",
    ],
    [
      "CPF/CNPJ:",
      comprador?.cpf_cnpj || "-",
      "I.E.:",
      comprador?.inscricao_estadual || "-",
    ],
  ]);

  // LOCAL DE ENTREGA
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
  bloco("LOCAL DE ENTREGA", [
    ["Local:", le.nome || "-"],
    ["Endereço:", `${le.log || ""}${le.num ? ", " + le.num : ""}`],
    [
      "Cidade:",
      `${le.cidade || "-"}${le.uf ? "/" + le.uf : ""}`,
      "CEP:",
      le.cep || "-",
    ],
    ["CPF/CNPJ:", le.cnpj || "-", "I.E.:", le.ie || "-"],
  ]);

  // PESAGEM
  doc.setFont("courier", "bold");
  doc.text("PESAGEM", pageW / 2, y + 3.2, { align: "center" });
  y += 4.5;
  const pTop = y;
  doc.setFont("courier", "normal");
  const pesoBruto = Number(remessa.peso_bruto || 0);
  const pesoTara = Number(remessa.peso_tara || 0);
  const pesoLiq = pesoBruto - pesoTara;
  const linhasPes: Array<[string, string]> = [
    ["BRUTO:", `${fmtNum(pesoBruto)} Kgs.`],
    ["TARA:", `${fmtNum(pesoTara)} Kgs.`],
    ["LIQUIDO:", `${fmtNum(pesoLiq)} Kgs.`],
  ];
  linhasPes.forEach(([l, v]) => {
    label(l, marginX + 2, y + 3.5);
    doc.text(v, marginX + 30, y + 3.5);
    y += rowH;
  });
  doc.rect(marginX, pTop, contentW, y - pTop);
  y += 1;

  // DESCONTOS
  doc.setFont("courier", "bold");
  doc.text("DESCONTOS", pageW / 2, y + 3.2, { align: "center" });
  y += 4.5;
  const dTop = y;
  doc.setFont("courier", "normal");
  const kgDescUmid = Number(remessa.kg_desconto_umidade || 0);
  const kgDescImp = Number(remessa.kg_desconto_impureza || 0);
  const totalDesc = kgDescUmid + kgDescImp;
  const linhasDesc: Array<[string, string, string]> = [
    ["Umidade:", `${fmtNum(kgDescUmid)} Kgs.`, `${fmtNum(remessa.umidade, 1)} %`],
    ["Impureza:", `${fmtNum(kgDescImp)} Kgs.`, `${fmtNum(remessa.impureza, 1)} %`],
    ["Avariados:", "0 Kgs.", ""],
    ["Outros:", "0 Kgs.", ""],
  ];
  linhasDesc.forEach(([l, v, p]) => {
    label(l, marginX + 2, y + 3.5);
    doc.text(v, marginX + 30, y + 3.5);
    if (p) doc.text(p, marginX + 60, y + 3.5);
    y += rowH;
  });
  label("Total Desc:", marginX + 2, y + 3.5);
  doc.text(`${fmtNum(totalDesc)} Kgs.`, marginX + 30, y + 3.5);
  y += rowH;
  label("LIQUIDO:", marginX + 2, y + 3.5);
  doc.text(`${fmtNum(remessa.kg_remessa)} Kgs.`, marginX + 30, y + 3.5);
  label("SACOS:", marginX + 90, y + 3.5);
  doc.text(fmtNum(remessa.sacos_remessa || remessa.sacos), marginX + 112, y + 3.5);
  y += rowH;
  doc.rect(marginX, dTop, contentW, y - dTop);
  y += 1;

  // TRANSPORTADOR
  const t = remessa.transportadora;
  bloco("TRANSPORTADOR", [
    ["Nome:", t?.nome || "-"],
    ["End.:", t?.logradouro || "-"],
    ["Cidade:", t?.cidade || "-"],
    ["CPF/CNPJ:", t?.cpf_cnpj || "-", "I.E.:", t?.inscricao_estadual || "-"],
    [
      "Placa:",
      `${remessa.placa || "-"}${remessa.uf_placa ? "  UF: " + remessa.uf_placa : ""}`,
    ],
  ]);

  // Obs / Motorista
  y += 2;
  label("Obs:", marginX + 2, y + 3.5);
  y += rowH;
  const obs = String(remessa.observacoes || "");
  const obsBoxTop = y;
  if (obs) {
    const lines = doc.splitTextToSize(obs, contentW - 6);
    doc.text(lines, marginX + 3, y + 3.5);
    y += Math.max(rowH, lines.length * rowH);
  } else {
    y += rowH * 2;
  }
  doc.rect(marginX, obsBoxTop, contentW, y - obsBoxTop);

  y += 3;
  label("MOTORISTA:", marginX + 2, y + 3.5);
  doc.text(String(remessa.motorista || "-"), marginX + 30, y + 3.5);
  if (remessa.motorista_cpf) {
    doc.text(`CPF: ${remessa.motorista_cpf}`, marginX + 110, y + 3.5);
  }
  y += rowH + 8;

  // Assinaturas
  doc.line(marginX + 10, y, marginX + 80, y);
  doc.line(pageW - marginX - 80, y, pageW - marginX - 10, y);
  y += 4;
  doc.text(String(t?.nome || "Transportador"), marginX + 45, y, { align: "center" });
  doc.text("Recebedor", pageW - marginX - 45, y, { align: "center" });
  y += 4;
  doc.setFontSize(8);
  doc.text("Transportador", marginX + 45, y, { align: "center" });

  // Rodapé
  doc.setFontSize(7);
  doc.text(
    `Gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`,
    pageW / 2,
    doc.internal.pageSize.getHeight() - 8,
    { align: "center" }
  );

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
