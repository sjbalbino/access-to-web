import { supabase } from "@/integrations/supabase/client";

/**
 * Vinculação automática de NF-e autorizada a registros de origem
 * (compras_cereais / devolucoes_deposito) que estejam pendentes.
 *
 * Usado quando a NF-e é emitida diretamente pela página de Notas Fiscais,
 * fora dos diálogos dedicados de emissão.
 */

const CFOP_COMPRA = new Set(["1101", "1102", "2101", "2102"]);
const CFOP_DEVOLUCAO = new Set(["1905", "2905"]);

export type TipoOrigemNfe = "compra_cereais" | "devolucao_deposito" | null;

export function detectarTipoOrigem(cfops: (string | null | undefined)[]): TipoOrigemNfe {
  const set = new Set(cfops.filter(Boolean).map((c) => String(c)));
  for (const c of set) {
    if (CFOP_COMPRA.has(c)) return "compra_cereais";
    if (CFOP_DEVOLUCAO.has(c)) return "devolucao_deposito";
  }
  return null;
}

interface VinculoResult {
  tipo: TipoOrigemNfe;
  candidatos: number;
  vinculadoId: string | null;
}

const DIAS_TOLERANCIA = 3;
const VALOR_TOLERANCIA = 0.01;

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

/**
 * Tenta vincular a NF-e autorizada a um registro de origem correspondente.
 * Só grava quando há exatamente 1 candidato (match não ambíguo).
 */
export async function vincularNfeAutorizada(notaId: string): Promise<VinculoResult> {
  // 1. Carrega nota + itens (para CFOPs)
  const { data: nota, error: eNota } = await supabase
    .from("notas_fiscais")
    .select("id, tenant_id, granja_id, dest_cpf_cnpj, total_nota, data_emissao, status")
    .eq("id", notaId)
    .maybeSingle();

  if (eNota || !nota) return { tipo: null, candidatos: 0, vinculadoId: null };

  const { data: itens } = await supabase
    .from("notas_fiscais_itens")
    .select("cfop")
    .eq("nota_fiscal_id", notaId);

  const tipo = detectarTipoOrigem((itens ?? []).map((i) => i.cfop));
  if (!tipo) return { tipo: null, candidatos: 0, vinculadoId: null };

  const cpfCnpj = nota.dest_cpf_cnpj;
  const total = Number(nota.total_nota ?? 0);
  const dataEmissao = nota.data_emissao ? new Date(nota.data_emissao) : new Date();

  const dIni = new Date(dataEmissao);
  dIni.setDate(dIni.getDate() - DIAS_TOLERANCIA);
  const dFim = new Date(dataEmissao);
  dFim.setDate(dFim.getDate() + DIAS_TOLERANCIA);

  if (!cpfCnpj || total <= 0) {
    return { tipo, candidatos: 0, vinculadoId: null };
  }

  if (tipo === "compra_cereais") {
    // Buscar candidatos pendentes com cpf_cnpj do vendedor batendo
    const { data: candidatos } = await supabase
      .from("compras_cereais")
      .select("id, valor_total, data_compra, inscricao_vendedor:inscricoes_produtor!inscricao_vendedor_id(cpf_cnpj)")
      .eq("granja_id", nota.granja_id)
      .eq("status", "pendente")
      .is("nota_fiscal_id", null)
      .gte("data_compra", isoDate(dIni))
      .lte("data_compra", isoDate(dFim));

    const match = (candidatos ?? []).filter((c: any) => {
      const cnpj = c.inscricao_vendedor?.cpf_cnpj?.replace(/\D/g, "");
      return cnpj === cpfCnpj && Math.abs(Number(c.valor_total ?? 0) - total) <= VALOR_TOLERANCIA;
    });

    if (match.length === 1) {
      const cid = match[0].id;
      await supabase
        .from("compras_cereais")
        .update({ nota_fiscal_id: notaId, status: "nfe_emitida" })
        .eq("id", cid);
      return { tipo, candidatos: 1, vinculadoId: cid };
    }
    return { tipo, candidatos: match.length, vinculadoId: null };
  }

  // devolucao_deposito
  const { data: candidatos } = await supabase
    .from("devolucoes_deposito")
    .select("id, valor_total, data_devolucao, inscricao_produtor:inscricoes_produtor!inscricao_produtor_id(cpf_cnpj)")
    .eq("granja_id", nota.granja_id)
    .eq("status", "pendente")
    .is("nota_fiscal_id", null)
    .gte("data_devolucao", isoDate(dIni))
    .lte("data_devolucao", isoDate(dFim));

  const match = (candidatos ?? []).filter((c: any) => {
    const cnpj = c.inscricao_produtor?.cpf_cnpj?.replace(/\D/g, "");
    return cnpj === cpfCnpj && Math.abs(Number(c.valor_total ?? 0) - total) <= VALOR_TOLERANCIA;
  });

  if (match.length === 1) {
    const did = match[0].id;
    await supabase
      .from("devolucoes_deposito")
      .update({ nota_fiscal_id: notaId, status: "nfe_emitida" })
      .eq("id", did);
    return { tipo, candidatos: 1, vinculadoId: did };
  }
  return { tipo, candidatos: match.length, vinculadoId: null };
}
