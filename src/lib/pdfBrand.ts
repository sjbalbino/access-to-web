import type jsPDF from "jspdf";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";

export interface PdfBrand {
  tenantNome: string | null;
  tenantFantasia: string | null;
  cnpj: string | null;
  cidadeUf: string | null;
  logoDataUrl: string | null;
}

export const SISTEMA_NOME = "AgroGestão – Sistema de Gerenciamento Agropecuário";
export const DESENVOLVEDORA = "Dygitus Informática - Desenvolvimento de Sistemas - Cel: (55) 99141-1755";

let cachedBrand: PdfBrand | null = null;
let inflight: Promise<PdfBrand> | null = null;

const FALLBACK: PdfBrand = {
  tenantNome: null,
  tenantFantasia: null,
  cnpj: null,
  cidadeUf: null,
  logoDataUrl: null,
};

function formatCnpj(cnpj: string | null): string | null {
  if (!cnpj) return null;
  const s = cnpj.replace(/\D/g, "");
  if (s.length !== 14) return cnpj;
  return `${s.slice(0, 2)}.${s.slice(2, 5)}.${s.slice(5, 8)}/${s.slice(8, 12)}-${s.slice(12)}`;
}

/** Busca (e cacheia) os dados de marca do tenant atual. */
export async function loadPdfBrand(force = false): Promise<PdfBrand> {
  if (!force && cachedBrand) return cachedBrand;
  if (!force && inflight) return inflight;

  inflight = (async () => {
    try {
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes?.user?.id;
      if (!uid) return FALLBACK;

      const { data: profile } = await supabase
        .from("profiles")
        .select("tenant_id")
        .eq("id", uid)
        .maybeSingle();

      const tenantId = profile?.tenant_id;
      if (!tenantId) return FALLBACK;

      const { data: tenant } = await supabase
        .from("tenants")
        .select("razao_social, nome_fantasia, cnpj, cidade, uf, logo_url")
        .eq("id", tenantId)
        .maybeSingle();

      if (!tenant) return FALLBACK;
      const brand: PdfBrand = {
        tenantNome: tenant.razao_social ?? null,
        tenantFantasia: tenant.nome_fantasia ?? null,
        cnpj: formatCnpj(tenant.cnpj ?? null),
        cidadeUf: tenant.cidade && tenant.uf ? `${tenant.cidade}/${tenant.uf}` : (tenant.cidade || tenant.uf || null),
        logoDataUrl: (tenant as any).logo_url ?? null,
      };
      cachedBrand = brand;
      return brand;
    } catch {
      return FALLBACK;
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

/** Invalida o cache (chamar quando o tenant atualizar seus dados). */
export function invalidatePdfBrand() {
  cachedBrand = null;
}

/** Devolve o brand cacheado (síncrono). Se ainda não carregado, retorna fallback. */
export function getBrandSync(): PdfBrand {
  return cachedBrand ?? FALLBACK;
}

/**
 * Desenha o cabeçalho padrão de relatório na página atual e devolve o Y (mm) onde o conteúdo pode começar.
 * Deve ser chamado no início de cada gerador de PDF.
 */
export function desenharCabecalhoBrand(doc: jsPDF, brand: PdfBrand = getBrandSync()): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = 10;
  const topY = 8;
  const bandHeight = 18;

  // Linha divisória inferior
  doc.setDrawColor(200);
  doc.setLineWidth(0.3);
  doc.line(marginX, topY + bandHeight, pageWidth - marginX, topY + bandHeight);

  // Logo à esquerda
  let textLeftX = marginX;
  if (brand.logoDataUrl) {
    try {
      const fmt = brand.logoDataUrl.startsWith("data:image/jpeg") || brand.logoDataUrl.startsWith("data:image/jpg")
        ? "JPEG"
        : "PNG";
      doc.addImage(brand.logoDataUrl, fmt, marginX, topY, 22, bandHeight - 2, undefined, "FAST");
      textLeftX = marginX + 26;
    } catch {
      // Ignora logo inválido
    }
  }

  // Bloco esquerdo — dados do contratante
  doc.setTextColor(30);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  const nomeEmp = brand.tenantFantasia || brand.tenantNome || "";
  doc.text(nomeEmp.substring(0, 60), textLeftX, topY + 5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  const linha2 = [brand.cnpj ? `CNPJ: ${brand.cnpj}` : null, brand.cidadeUf].filter(Boolean).join("  •  ");
  if (linha2) doc.text(linha2, textLeftX, topY + 10);
  if (brand.tenantFantasia && brand.tenantNome && brand.tenantFantasia !== brand.tenantNome) {
    doc.text(brand.tenantNome.substring(0, 80), textLeftX, topY + 14);
  }

  // Bloco direito — sistema + data
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(SISTEMA_NOME, pageWidth - marginX, topY + 5, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(
    `Emitido em ${nowDateTimeSP("dd/MM/yyyy 'às' HH:mm")}`,
    pageWidth - marginX,
    topY + 10,
    { align: "right" }
  );

  doc.setTextColor(0);
  return topY + bandHeight + 4; // Y inicial do conteúdo
}

/**
 * Aplica cabeçalho em TODAS as páginas do documento (chamar no fim do gerador,
 * quando não é possível reservar espaço no início — para relatórios simples,
 * prefira usar `desenharCabecalhoBrand` no começo).
 */
export function aplicarCabecalhoEmTodasPaginas(doc: jsPDF, brand: PdfBrand = getBrandSync()) {
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    desenharCabecalhoBrand(doc, brand);
  }
}

/**
 * Rodapé padrão em todas as páginas: assinatura da desenvolvedora à esquerda,
 * data/hora no centro e paginação à direita.
 */
export function desenharRodapeBrand(doc: jsPDF) {
  const total = doc.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setDrawColor(220);
    doc.setLineWidth(0.2);
    doc.line(10, pageHeight - 12, pageWidth - 10, pageHeight - 12);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(90);
    doc.text(DESENVOLVEDORA, 10, pageHeight - 6);
    doc.text(
      nowDateTimeSP(),
      pageWidth / 2,
      pageHeight - 6,
      { align: "center" }
    );
    doc.text(`Página ${i} de ${total}`, pageWidth - 10, pageHeight - 6, { align: "right" });
    doc.setTextColor(0);
  }
}
