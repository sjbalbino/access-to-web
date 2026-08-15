import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Módulo Controle Gerencial.
 *
 * Camada de dados totalmente isolada dos módulos existentes: apenas LÊ as tabelas
 * de origem (transferências, compras, vendas, depósitos e devoluções) e GRAVA nas
 * tabelas novas `controle_conjuntos` / `controle_marcacoes`.
 * Nenhum saldo, extrato ou relatório existente é afetado.
 */

export type DocumentoTipo =
  | "transferencia_deposito"
  | "compra_cereal"
  | "contrato_venda"
  | "remessa_venda"
  | "nota_deposito"
  | "devolucao_deposito";

/** Tipo marcável pelo usuário (remessa_venda NÃO é marcável: segue o contrato). */
export type DocumentoTipoMarcavel = Exclude<DocumentoTipo, "remessa_venda">;

const LABELS: Record<DocumentoTipo, { label: string; plural: string }> = {
  transferencia_deposito: { label: "Transferência", plural: "Transferências de Depósito" },
  compra_cereal: { label: "Compra", plural: "Compras de Cereais" },
  contrato_venda: { label: "Contrato", plural: "Contratos de Venda" },
  remessa_venda: { label: "Remessa", plural: "Remessas de Venda (derivadas dos contratos)" },
  nota_deposito: { label: "Nota de Depósito", plural: "Notas de Depósito" },
  devolucao_deposito: { label: "Devolução", plural: "Devoluções de Depósito" },
};

/** Tipos que o usuário marca manualmente (abas de marcação). */
export const TIPOS_DOCUMENTO: { tipo: DocumentoTipoMarcavel; label: string; plural: string }[] = [
  "transferencia_deposito",
  "compra_cereal",
  "contrato_venda",
].map((t) => ({ tipo: t as DocumentoTipoMarcavel, ...LABELS[t as DocumentoTipo] }));

/** Tipos disponíveis nos relatórios do Controle Gerencial. */
export const TIPOS_RELATORIO: { tipo: DocumentoTipoMarcavel; label: string; plural: string }[] = [
  "transferencia_deposito",
  "compra_cereal",
  "contrato_venda",
].map((t) => ({ tipo: t as DocumentoTipoMarcavel, ...LABELS[t as DocumentoTipo] }));



export function labelTipo(tipo: DocumentoTipo): string {
  return LABELS[tipo]?.plural ?? tipo;
}


export interface ControleConjunto {
  id: string;
  tenant_id: string;
  nome: string;
  descricao: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface ControleMarcacao {
  id: string;
  conjunto_id: string;
  documento_tipo: DocumentoTipoMarcavel;
  documento_id: string;
  observacao: string | null;
  created_at: string;
}

/** Documento normalizado, usado tanto na marcação quanto nos relatórios do módulo. */
export interface DocumentoControle {
  id: string;
  tipo: DocumentoTipo;
  data: string | null;
  referencia: string;
  produtor: string;
  contraparte: string;
  produto: string;
  local: string;
  quantidade_kg: number;
  valor: number;
  safra: string;
  safra_id: string | null;
  /** Preenchido apenas em remessas: contrato de origem (usado para herdar a marcação). */
  contrato_id?: string | null;

}

export interface DocumentoFiltros {
  safraId?: string;
  dataInicial?: string;
  dataFinal?: string;
  busca?: string;
}

// ==================== CONJUNTOS ====================

export function useControleConjuntos(apenasAtivos = false) {
  return useQuery({
    queryKey: ["controle_conjuntos", apenasAtivos],
    queryFn: async () => {
      let query = supabase.from("controle_conjuntos").select("*").order("nome");
      if (apenasAtivos) query = query.eq("ativo", true);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as ControleConjunto[];
    },
  });
}

export function useControleConjunto(id: string | undefined) {
  return useQuery({
    queryKey: ["controle_conjuntos", "detalhe", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("controle_conjuntos")
        .select("*")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as ControleConjunto | null;
    },
  });
}

export type ConjuntoInput = { nome: string; descricao?: string | null; ativo?: boolean };

export function useSaveConjunto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: ConjuntoInput & { id?: string }) => {
      if (id) {
        const { data, error } = await supabase
          .from("controle_conjuntos")
          .update(input)
          .eq("id", id)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
      const { data, error } = await supabase
        .from("controle_conjuntos")
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, vars) => {
      queryClient.invalidateQueries({ queryKey: ["controle_conjuntos"] });
      toast.success(vars.id ? "Conjunto atualizado!" : "Conjunto criado!");
    },
    onError: (error: any) => toast.error("Erro ao salvar conjunto: " + error.message),
  });
}

export function useDeleteConjunto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("controle_conjuntos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["controle_conjuntos"] });
      queryClient.invalidateQueries({ queryKey: ["controle_marcacoes"] });
      toast.success("Conjunto excluído!");
    },
    onError: (error: any) => toast.error("Erro ao excluir conjunto: " + error.message),
  });
}

// ==================== MARCAÇÕES ====================

export function useControleMarcacoes(conjuntoId: string | undefined) {
  return useQuery({
    queryKey: ["controle_marcacoes", conjuntoId],
    enabled: !!conjuntoId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("controle_marcacoes")
        .select("id, conjunto_id, documento_tipo, documento_id, observacao, created_at")
        .eq("conjunto_id", conjuntoId!);
      if (error) throw error;
      return (data ?? []) as ControleMarcacao[];
    },
  });
}

export function useToggleMarcacao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      conjuntoId: string;
      documentoTipo: DocumentoTipoMarcavel;

      documentoId: string;
      marcar: boolean;
    }) => {
      if (params.marcar) {
        const { error } = await supabase.from("controle_marcacoes").insert({
          conjunto_id: params.conjuntoId,
          documento_tipo: params.documentoTipo,
          documento_id: params.documentoId,
        });
        if (error && error.code !== "23505") throw error;
      } else {
        const { error } = await supabase
          .from("controle_marcacoes")
          .delete()
          .eq("conjunto_id", params.conjuntoId)
          .eq("documento_tipo", params.documentoTipo)
          .eq("documento_id", params.documentoId);
        if (error) throw error;
      }
    },
    onSuccess: (_d, vars) => {
      queryClient.invalidateQueries({ queryKey: ["controle_marcacoes", vars.conjuntoId] });
    },
    onError: (error: any) => toast.error("Erro ao alterar marcação: " + error.message),
  });
}

export function useMarcarLote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      conjuntoId: string;
      documentoTipo: DocumentoTipoMarcavel;
      documentoIds: string[];
      marcar: boolean;
    }) => {
      if (params.documentoIds.length === 0) return;
      if (params.marcar) {
        const rows = params.documentoIds.map((documento_id) => ({
          conjunto_id: params.conjuntoId,
          documento_tipo: params.documentoTipo,
          documento_id,
        }));
        const { error } = await supabase
          .from("controle_marcacoes")
          .upsert(rows, { onConflict: "conjunto_id,documento_tipo,documento_id", ignoreDuplicates: true });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("controle_marcacoes")
          .delete()
          .eq("conjunto_id", params.conjuntoId)
          .eq("documento_tipo", params.documentoTipo)
          .in("documento_id", params.documentoIds);
        if (error) throw error;
      }
    },
    onSuccess: (_d, vars) => {
      queryClient.invalidateQueries({ queryKey: ["controle_marcacoes", vars.conjuntoId] });
      toast.success(vars.marcar ? "Lançamentos marcados!" : "Marcações removidas!");
    },
    onError: (error: any) => toast.error("Erro na marcação em lote: " + error.message),
  });
}

// ==================== DOCUMENTOS DE ORIGEM (SOMENTE LEITURA) ====================

const nomeInscricao = (i: any): string => {
  if (!i) return "-";
  const nome = i?.produtores?.nome || i?.granja || "-";
  const ie = i?.inscricao_estadual ? ` (IE ${i.inscricao_estadual})` : "";
  return `${nome}${ie}`.toUpperCase();
};

const num = (v: any): number => (typeof v === "number" ? v : Number(v) || 0);

/**
 * PostgREST limita cada resposta a 1.000 linhas. Como os relatórios gerenciais
 * precisam da base completa, paginamos explicitamente até esgotar os registros.
 * `build` deve retornar uma query nova a cada chamada (com ordenação estável).
 */
const PAGINA_SUPABASE = 1000;

async function fetchAllRows(build: () => any): Promise<any[]> {
  const todos: any[] = [];
  for (let inicio = 0; ; inicio += PAGINA_SUPABASE) {
    const { data, error } = await build().range(inicio, inicio + PAGINA_SUPABASE - 1);
    if (error) throw error;
    const lote = data ?? [];
    todos.push(...lote);
    if (lote.length < PAGINA_SUPABASE) break;
  }
  return todos;
}

async function buscarTransferencias(f: DocumentoFiltros): Promise<DocumentoControle[]> {
  const data = await fetchAllRows(() => {
    let q = supabase
      .from("transferencias_deposito")
      .select(`
        id, codigo, data_transferencia, quantidade_kg, safra_id,
        safra:safras(nome),
        produto:produtos(nome),
        inscricao_origem:inscricoes_produtor!transferencias_deposito_inscricao_origem_id_fkey(inscricao_estadual, granja, produtores(nome)),
        inscricao_destino:inscricoes_produtor!transferencias_deposito_inscricao_destino_id_fkey(inscricao_estadual, granja, produtores(nome)),
        local_saida:locais_entrega!transferencias_deposito_local_saida_id_fkey(nome),
        local_entrada:locais_entrega!transferencias_deposito_local_entrada_id_fkey(nome)
      `)
      .order("data_transferencia", { ascending: false })
      .order("id", { ascending: true });
    if (f.safraId) q = q.eq("safra_id", f.safraId);
    if (f.dataInicial) q = q.gte("data_transferencia", f.dataInicial);
    if (f.dataFinal) q = q.lte("data_transferencia", f.dataFinal);
    return q;
  });
  return (data ?? []).map((r: any) => ({
    id: r.id,
    tipo: "transferencia_deposito" as DocumentoTipo,
    data: r.data_transferencia,
    referencia: r.codigo ? `Nº ${r.codigo}` : "-",
    produtor: nomeInscricao(r.inscricao_origem),
    contraparte: nomeInscricao(r.inscricao_destino),
    produto: r.produto?.nome ?? "-",
    local: [r.local_saida?.nome, r.local_entrada?.nome].filter(Boolean).join(" → ") || "-",
    quantidade_kg: num(r.quantidade_kg),
    valor: 0,
    safra: r.safra?.nome ?? "-",
    safra_id: r.safra_id ?? null,
  }));
}

async function buscarCompras(f: DocumentoFiltros): Promise<DocumentoControle[]> {
  const data = await fetchAllRows(() => {
    let q = supabase
      .from("compras_cereais")
      .select(`
        id, codigo, data_compra, quantidade_kg, valor_total, safra_id,
        safra:safras(nome),
        produto:produtos(nome),
        inscricao_vendedor:inscricoes_produtor!compras_cereais_inscricao_vendedor_id_fkey(inscricao_estadual, granja, produtores(nome)),
        inscricao_comprador:inscricoes_produtor!compras_cereais_inscricao_comprador_id_fkey(inscricao_estadual, granja, produtores(nome)),
        local_entrega:locais_entrega(nome)
      `)
      .order("data_compra", { ascending: false })
      .order("id", { ascending: true });
    if (f.safraId) q = q.eq("safra_id", f.safraId);
    if (f.dataInicial) q = q.gte("data_compra", f.dataInicial);
    if (f.dataFinal) q = q.lte("data_compra", f.dataFinal);
    return q;
  });
  return (data ?? []).map((r: any) => ({
    id: r.id,
    tipo: "compra_cereal" as DocumentoTipo,
    data: r.data_compra,
    referencia: r.codigo ? `Nº ${r.codigo}` : "-",
    produtor: nomeInscricao(r.inscricao_vendedor),
    contraparte: nomeInscricao(r.inscricao_comprador),
    produto: r.produto?.nome ?? "-",
    local: r.local_entrega?.nome ?? "-",
    quantidade_kg: num(r.quantidade_kg),
    valor: num(r.valor_total),
    safra: r.safra?.nome ?? "-",
    safra_id: r.safra_id ?? null,
  }));
}

async function buscarContratos(f: DocumentoFiltros): Promise<DocumentoControle[]> {
  const data = await fetchAllRows(() => {
    let q = supabase
      .from("contratos_venda")
      .select(`
        id, numero, numero_contrato_comprador, data_contrato, quantidade_kg, valor_total, safra_id,
        local_entrega_nome,
        safra:safras(nome),
        produto:produtos(nome),
        comprador:clientes_fornecedores(nome, nome_fantasia),
        inscricao_produtor:inscricoes_produtor(inscricao_estadual, granja, produtores(nome))
      `)
      .order("data_contrato", { ascending: false })
      .order("id", { ascending: true });
    if (f.safraId) q = q.eq("safra_id", f.safraId);
    if (f.dataInicial) q = q.gte("data_contrato", f.dataInicial);
    if (f.dataFinal) q = q.lte("data_contrato", f.dataFinal);
    return q;
  });
  return (data ?? []).map((r: any) => ({
    id: r.id,
    tipo: "contrato_venda" as DocumentoTipo,
    data: r.data_contrato,
    referencia: [r.numero, r.numero_contrato_comprador].filter(Boolean).join(" / ") || "-",
    produtor: nomeInscricao(r.inscricao_produtor),
    contraparte: (r.comprador?.nome ?? "-").toUpperCase(),
    produto: r.produto?.nome ?? "-",
    local: r.local_entrega_nome ?? "-",
    quantidade_kg: num(r.quantidade_kg),
    valor: num(r.valor_total),
    safra: r.safra?.nome ?? "-",
    safra_id: r.safra_id ?? null,
  }));
}

async function buscarRemessas(f: DocumentoFiltros): Promise<DocumentoControle[]> {
  let q = supabase
    .from("remessas_venda")
    .select(`
      id, codigo, data_remessa, kg_nota, kg_remessa, valor_nota, valor_remessa, local_entrega_nome,
      contrato_venda_id,
      variedade:produtos(nome),
      contrato:contratos_venda(
        id, numero, safra_id,

        safra:safras(nome),
        comprador:clientes_fornecedores(nome),
        inscricao_produtor:inscricoes_produtor(inscricao_estadual, granja, produtores(nome))
      )
    `)
    .order("data_remessa", { ascending: false });
  if (f.dataInicial) q = q.gte("data_remessa", f.dataInicial);
  if (f.dataFinal) q = q.lte("data_remessa", f.dataFinal);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? [])
    .filter((r: any) => !f.safraId || r.contrato?.safra_id === f.safraId)
    .map((r: any) => ({
      id: r.id,
      tipo: "remessa_venda" as DocumentoTipo,
      data: r.data_remessa,
      referencia: [r.codigo ? `Nº ${r.codigo}` : null, r.contrato?.numero ? `Contrato ${r.contrato.numero}` : null]
        .filter(Boolean)
        .join(" • ") || "-",
      produtor: nomeInscricao(r.contrato?.inscricao_produtor),
      contraparte: (r.contrato?.comprador?.nome ?? "-").toUpperCase(),
      produto: r.variedade?.nome ?? "-",
      local: r.local_entrega_nome ?? "-",
      quantidade_kg: num(r.kg_nota) || num(r.kg_remessa),
      valor: num(r.valor_nota) || num(r.valor_remessa),
      safra: r.contrato?.safra?.nome ?? "-",
      safra_id: r.contrato?.safra_id ?? null,
      contrato_id: r.contrato?.id ?? r.contrato_venda_id ?? null,

    }));
}

async function buscarNotasDeposito(f: DocumentoFiltros): Promise<DocumentoControle[]> {
  let q = supabase
    .from("notas_deposito_emitidas")
    .select(`
      id, data_emissao, quantidade_kg, safra_id,
      nota_fiscal:notas_fiscais(numero, serie),
      safra:safras(nome),
      produto:produtos(nome),
      inscricao_produtor:inscricoes_produtor(inscricao_estadual, granja, produtores(nome)),
      local_entrega:locais_entrega(nome)
    `)
    .order("data_emissao", { ascending: false, nullsFirst: false });
  if (f.safraId) q = q.eq("safra_id", f.safraId);
  if (f.dataInicial) q = q.gte("data_emissao", f.dataInicial);
  if (f.dataFinal) q = q.lte("data_emissao", f.dataFinal);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map((r: any) => ({
    id: r.id,
    tipo: "nota_deposito" as DocumentoTipo,
    data: r.data_emissao,
    referencia: r.nota_fiscal?.numero ? `NF ${r.nota_fiscal.numero}/${r.nota_fiscal.serie ?? ""}` : "-",
    produtor: nomeInscricao(r.inscricao_produtor),
    contraparte: "-",
    produto: r.produto?.nome ?? "-",
    local: r.local_entrega?.nome ?? "-",
    quantidade_kg: num(r.quantidade_kg),
    valor: 0,
    safra: r.safra?.nome ?? "-",
    safra_id: r.safra_id ?? null,
  }));
}

async function buscarDevolucoes(f: DocumentoFiltros): Promise<DocumentoControle[]> {
  let q = supabase
    .from("devolucoes_deposito")
    .select(`
      id, codigo, data_devolucao, quantidade_kg, valor_total, safra_id,
      safra:safras(nome),
      produto:produtos(nome),
      inscricao_produtor:inscricoes_produtor!devolucoes_deposito_inscricao_produtor_id_fkey(inscricao_estadual, granja, produtores(nome)),
      inscricao_emitente:inscricoes_produtor!devolucoes_deposito_inscricao_emitente_id_fkey(inscricao_estadual, granja, produtores(nome)),
      local_entrega:locais_entrega(nome)
    `)
    .order("data_devolucao", { ascending: false });
  if (f.safraId) q = q.eq("safra_id", f.safraId);
  if (f.dataInicial) q = q.gte("data_devolucao", f.dataInicial);
  if (f.dataFinal) q = q.lte("data_devolucao", f.dataFinal);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map((r: any) => ({
    id: r.id,
    tipo: "devolucao_deposito" as DocumentoTipo,
    data: r.data_devolucao,
    referencia: r.codigo ? `Nº ${r.codigo}` : "-",
    produtor: nomeInscricao(r.inscricao_produtor),
    contraparte: nomeInscricao(r.inscricao_emitente),
    produto: r.produto?.nome ?? "-",
    local: r.local_entrega?.nome ?? "-",
    quantidade_kg: num(r.quantidade_kg),
    valor: num(r.valor_total),
    safra: r.safra?.nome ?? "-",
    safra_id: r.safra_id ?? null,
  }));
}

export async function carregarDocumentos(
  tipo: DocumentoTipo,
  filtros: DocumentoFiltros
): Promise<DocumentoControle[]> {
  const fetchers: Record<DocumentoTipo, (f: DocumentoFiltros) => Promise<DocumentoControle[]>> = {
    transferencia_deposito: buscarTransferencias,
    compra_cereal: buscarCompras,
    contrato_venda: buscarContratos,
    remessa_venda: buscarRemessas,
    nota_deposito: buscarNotasDeposito,
    devolucao_deposito: buscarDevolucoes,
  };
  const rows = await fetchers[tipo](filtros);
  const busca = filtros.busca?.trim().toLowerCase();
  if (!busca) return rows;
  return rows.filter((r) =>
    [r.referencia, r.produtor, r.contraparte, r.produto, r.local]
      .join(" ")
      .toLowerCase()
      .includes(busca)
  );
}

export function useDocumentosControle(tipo: DocumentoTipo, filtros: DocumentoFiltros) {
  return useQuery({
    queryKey: ["controle_documentos", tipo, filtros],
    queryFn: () => carregarDocumentos(tipo, filtros),
  });
}
