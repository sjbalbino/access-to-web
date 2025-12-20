import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface NotaFiscal {
  id: string;
  tenant_id: string | null;
  emitente_id: string | null;
  granja_id: string | null;
  uuid_api: string | null;
  numero: number | null;
  serie: number | null;
  modelo: string | null;
  chave_acesso: string | null;
  protocolo: string | null;
  status: string | null;
  motivo_status: string | null;
  data_emissao: string | null;
  data_saida_entrada: string | null;
  operacao: number | null;
  natureza_operacao: string;
  finalidade: number | null;
  cfop_id: string | null;
  dest_tipo: string | null;
  dest_cpf_cnpj: string | null;
  dest_nome: string | null;
  dest_ie: string | null;
  dest_email: string | null;
  dest_telefone: string | null;
  dest_logradouro: string | null;
  dest_numero: string | null;
  dest_complemento: string | null;
  dest_bairro: string | null;
  dest_cidade: string | null;
  dest_uf: string | null;
  dest_cep: string | null;
  ind_consumidor_final: number | null;
  ind_presenca: number | null;
  total_produtos: number | null;
  total_frete: number | null;
  total_seguro: number | null;
  total_desconto: number | null;
  total_outros: number | null;
  total_nota: number | null;
  total_icms: number | null;
  total_pis: number | null;
  total_cofins: number | null;
  total_ipi: number | null;
  total_ibs: number | null;
  total_cbs: number | null;
  total_is: number | null;
  modalidade_frete: number | null;
  forma_pagamento: number | null;
  tipo_pagamento: string | null;
  valor_pagamento: number | null;
  colheita_id: string | null;
  cliente_fornecedor_id: string | null;
  produtor_id: string | null;
  inscricao_produtor_id: string | null;
  xml_url: string | null;
  danfe_url: string | null;
  info_complementar: string | null;
  info_fisco: string | null;
  observacoes: string | null;
  // Transport fields
  transp_nome: string | null;
  transp_cpf_cnpj: string | null;
  transp_ie: string | null;
  transp_endereco: string | null;
  transp_cidade: string | null;
  transp_uf: string | null;
  veiculo_placa: string | null;
  veiculo_uf: string | null;
  veiculo_rntc: string | null;
  volumes_quantidade: number | null;
  volumes_especie: string | null;
  volumes_marca: string | null;
  volumes_numeracao: string | null;
  volumes_peso_bruto: number | null;
  volumes_peso_liquido: number | null;
  created_at: string;
  updated_at: string;
  cfop?: {
    id: string;
    codigo: string;
    descricao: string;
  };
  granja?: {
    id: string;
    razao_social: string;
    nome_fantasia: string | null;
  };
}

export interface NotaFiscalItem {
  id: string;
  nota_fiscal_id: string;
  numero_item: number;
  produto_id: string | null;
  codigo: string | null;
  descricao: string;
  ncm: string | null;
  cfop: string | null;
  unidade: string;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
  valor_desconto: number | null;
  origem: number | null;
  cst_icms: string | null;
  base_icms: number | null;
  aliq_icms: number | null;
  valor_icms: number | null;
  cst_pis: string | null;
  base_pis: number | null;
  aliq_pis: number | null;
  valor_pis: number | null;
  cst_cofins: string | null;
  base_cofins: number | null;
  aliq_cofins: number | null;
  valor_cofins: number | null;
  cst_ipi: string | null;
  base_ipi: number | null;
  aliq_ipi: number | null;
  valor_ipi: number | null;
  // Reforma Tributária (NT 2025.002)
  cst_ibs: string | null;
  base_ibs: number | null;
  aliq_ibs: number | null;
  valor_ibs: number | null;
  cclass_trib_ibs: string | null;
  cst_cbs: string | null;
  base_cbs: number | null;
  aliq_cbs: number | null;
  valor_cbs: number | null;
  cclass_trib_cbs: string | null;
  cst_is: string | null;
  base_is: number | null;
  aliq_is: number | null;
  valor_is: number | null;
  info_adicional: string | null;
  created_at: string;
}

export type NotaFiscalInsert = Omit<NotaFiscal, "id" | "created_at" | "updated_at" | "cfop" | "granja">;
export type NotaFiscalUpdate = Partial<NotaFiscalInsert>;
export type NotaFiscalItemInsert = Omit<NotaFiscalItem, "id" | "created_at">;

export function useNotasFiscais() {
  const queryClient = useQueryClient();

  const { data: notasFiscais = [], isLoading, error } = useQuery({
    queryKey: ["notas-fiscais"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notas_fiscais")
        .select(`
          *,
          cfop:cfops(id, codigo, descricao),
          granja:granjas(id, razao_social, nome_fantasia)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as NotaFiscal[];
    },
  });

  const createNotaFiscal = useMutation({
    mutationFn: async (nota: NotaFiscalInsert) => {
      const { data, error } = await supabase
        .from("notas_fiscais")
        .insert(nota)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notas-fiscais"] });
      toast.success("Nota fiscal criada com sucesso!");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar nota fiscal: ${error.message}`);
    },
  });

  const updateNotaFiscal = useMutation({
    mutationFn: async ({ id, ...nota }: NotaFiscalUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("notas_fiscais")
        .update(nota)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notas-fiscais"] });
      toast.success("Nota fiscal atualizada com sucesso!");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar nota fiscal: ${error.message}`);
    },
  });

  const deleteNotaFiscal = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("notas_fiscais").delete().eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notas-fiscais"] });
      toast.success("Nota fiscal excluída com sucesso!");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao excluir nota fiscal: ${error.message}`);
    },
  });

  return {
    notasFiscais,
    isLoading,
    error,
    createNotaFiscal,
    updateNotaFiscal,
    deleteNotaFiscal,
  };
}

export function useNotaFiscalItens(notaFiscalId: string | null) {
  const queryClient = useQueryClient();

  const { data: itens = [], isLoading, error } = useQuery({
    queryKey: ["notas-fiscais-itens", notaFiscalId],
    queryFn: async () => {
      if (!notaFiscalId) return [];
      
      const { data, error } = await supabase
        .from("notas_fiscais_itens")
        .select("*")
        .eq("nota_fiscal_id", notaFiscalId)
        .order("numero_item", { ascending: true });

      if (error) throw error;
      return data as NotaFiscalItem[];
    },
    enabled: !!notaFiscalId,
  });

  const createItem = useMutation({
    mutationFn: async (item: NotaFiscalItemInsert) => {
      const { data, error } = await supabase
        .from("notas_fiscais_itens")
        .insert(item)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notas-fiscais-itens", notaFiscalId] });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao adicionar item: ${error.message}`);
    },
  });

  const updateItem = useMutation({
    mutationFn: async ({ id, ...item }: Partial<NotaFiscalItemInsert> & { id: string }) => {
      const { data, error } = await supabase
        .from("notas_fiscais_itens")
        .update(item)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notas-fiscais-itens", notaFiscalId] });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar item: ${error.message}`);
    },
  });

  const deleteItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("notas_fiscais_itens").delete().eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notas-fiscais-itens", notaFiscalId] });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao excluir item: ${error.message}`);
    },
  });

  return {
    itens,
    isLoading,
    error,
    createItem,
    updateItem,
    deleteItem,
  };
}
