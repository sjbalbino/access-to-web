import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ContratoVenda {
  id: string;
  granja_id: string | null;
  numero: number;
  safra_id: string | null;
  produto_id: string | null;
  data_contrato: string;
  nota_venda: string | null;
  numero_contrato_comprador: string | null;
  inscricao_produtor_id: string | null;
  comprador_id: string | null;
  tipo_venda: string | null;
  quantidade_kg: number | null;
  quantidade_sacos: number | null;
  preco_kg: number | null;
  valor_total: number | null;
  local_entrega_nome: string | null;
  local_entrega_cnpj_cpf: string | null;
  local_entrega_ie: string | null;
  local_entrega_logradouro: string | null;
  local_entrega_numero: string | null;
  local_entrega_complemento: string | null;
  local_entrega_bairro: string | null;
  local_entrega_cidade: string | null;
  local_entrega_uf: string | null;
  local_entrega_cep: string | null;
  corretor: string | null;
  percentual_comissao: number | null;
  valor_comissao: number | null;
  data_pagamento_comissao: string | null;
  modalidade_frete: number | null;
  venda_entrega_futura: boolean | null;
  a_fixar: boolean | null;
  fechada: boolean | null;
  data_recebimento: string | null;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
  // Joins
  safra?: { id: string; nome: string } | null;
  produto?: { id: string; nome: string } | null;
  comprador?: { id: string; nome: string; cpf_cnpj: string | null } | null;
  inscricao_produtor?: { 
    id: string; 
    granja: string | null; 
    inscricao_estadual: string | null;
    produtor?: { id: string; nome: string } | null;
  } | null;
  // Calculated
  total_carregado_kg?: number;
  saldo_kg?: number;
}

export type ContratoVendaInsert = Partial<Omit<ContratoVenda, "id" | "created_at" | "updated_at" | "safra" | "produto" | "comprador" | "inscricao_produtor" | "total_carregado_kg" | "saldo_kg">> & { numero: number; data_contrato: string };
export type ContratoVendaUpdate = Partial<ContratoVendaInsert>;

interface ContratoVendaFiltros {
  safra_id?: string;
  comprador_id?: string;
  numero?: number;
}

export function useContratosVenda(filtros?: ContratoVendaFiltros) {
  return useQuery({
    queryKey: ["contratos_venda", filtros],
    queryFn: async () => {
      let query = supabase
        .from("contratos_venda")
        .select(`
          *,
          safra:safras(id, nome),
          produto:produtos(id, nome),
          comprador:clientes_fornecedores(id, nome, cpf_cnpj),
          inscricao_produtor:inscricoes_produtor(
            id, granja, inscricao_estadual,
            produtor:produtores(id, nome)
          )
        `)
        .order("numero", { ascending: false });

      if (filtros?.safra_id) {
        query = query.eq("safra_id", filtros.safra_id);
      }
      if (filtros?.comprador_id) {
        query = query.eq("comprador_id", filtros.comprador_id);
      }
      if (filtros?.numero) {
        query = query.eq("numero", filtros.numero);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Buscar totais de remessas para cada contrato
      const contratosComTotais = await Promise.all(
        (data || []).map(async (contrato) => {
          const { data: remessas } = await supabase
            .from("remessas_venda")
            .select("kg_nota")
            .eq("contrato_venda_id", contrato.id)
            .neq("status", "cancelada");

          const total_carregado_kg = remessas?.reduce((acc, r) => acc + (Number(r.kg_nota) || 0), 0) || 0;
          const saldo_kg = (Number(contrato.quantidade_kg) || 0) - total_carregado_kg;

          return {
            ...contrato,
            total_carregado_kg,
            saldo_kg,
          };
        })
      );

      return contratosComTotais as ContratoVenda[];
    },
  });
}

export function useContratoVenda(id: string | undefined) {
  return useQuery({
    queryKey: ["contrato_venda", id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from("contratos_venda")
        .select(`
          *,
          safra:safras(id, nome),
          produto:produtos(id, nome),
          comprador:clientes_fornecedores(id, nome, cpf_cnpj),
          inscricao_produtor:inscricoes_produtor(
            id, granja, inscricao_estadual,
            produtor:produtores(id, nome)
          )
        `)
        .eq("id", id)
        .single();

      if (error) throw error;

      // Buscar totais de remessas
      const { data: remessas } = await supabase
        .from("remessas_venda")
        .select("kg_nota")
        .eq("contrato_venda_id", id)
        .neq("status", "cancelada");

      const total_carregado_kg = remessas?.reduce((acc, r) => acc + (Number(r.kg_nota) || 0), 0) || 0;
      const saldo_kg = (Number(data.quantidade_kg) || 0) - total_carregado_kg;

      return {
        ...data,
        total_carregado_kg,
        saldo_kg,
      } as ContratoVenda;
    },
    enabled: !!id,
  });
}

export function useProximoNumeroContrato(safraId?: string) {
  return useQuery({
    queryKey: ["proximo_numero_contrato", safraId],
    queryFn: async () => {
      let query = supabase
        .from("contratos_venda")
        .select("numero")
        .order("numero", { ascending: false })
        .limit(1);

      if (safraId) {
        query = query.eq("safra_id", safraId);
      }

      const { data } = await query;
      return (data?.[0]?.numero || 0) + 1;
    },
  });
}

export function useCreateContratoVenda() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (contrato: ContratoVendaInsert) => {
      const { data, error } = await supabase
        .from("contratos_venda")
        .insert(contrato)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contratos_venda"] });
      queryClient.invalidateQueries({ queryKey: ["proximo_numero_contrato"] });
      toast.success("Contrato de venda criado com sucesso!");
    },
    onError: (error) => {
      toast.error(`Erro ao criar contrato: ${error.message}`);
    },
  });
}

export function useUpdateContratoVenda() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...contrato }: ContratoVendaUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("contratos_venda")
        .update(contrato)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["contratos_venda"] });
      queryClient.invalidateQueries({ queryKey: ["contrato_venda", variables.id] });
      toast.success("Contrato atualizado com sucesso!");
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar contrato: ${error.message}`);
    },
  });
}

export function useDeleteContratoVenda() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("contratos_venda")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contratos_venda"] });
      toast.success("Contrato excluído com sucesso!");
    },
    onError: (error) => {
      toast.error(`Erro ao excluir contrato: ${error.message}`);
    },
  });
}
