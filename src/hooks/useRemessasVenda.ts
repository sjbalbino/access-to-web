import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface RemessaVenda {
  id: string;
  contrato_venda_id: string;
  codigo: number | null;
  data_remessa: string;
  placa_id: string | null;
  peso_bruto: number | null;
  peso_tara: number | null;
  peso_liquido: number | null;
  variedade_id: string | null;
  silo_id: string | null;
  ph: number | null;
  umidade: number | null;
  impureza: number | null;
  kg_remessa: number | null;
  kg_desconto_umidade: number | null;
  kg_desconto_impureza: number | null;
  kg_nota: number | null;
  sacos: number | null;
  preco_kg: number | null;
  valor_remessa: number | null;
  valor_nota: number | null;
  transportadora_id: string | null;
  motorista: string | null;
  nota_fiscal_id: string | null;
  romaneio: number | null;
  balanceiro: string | null;
  status: string | null;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
  // Joins
  placa?: { id: string; placa: string } | null;
  variedade?: { id: string; nome: string } | null;
  silo?: { id: string; nome: string } | null;
  transportadora?: { id: string; nome: string } | null;
  nota_fiscal?: { id: string; numero: number | null; status: string | null; chave_acesso: string | null } | null;
}

export type RemessaVendaInsert = Omit<RemessaVenda, "id" | "created_at" | "updated_at" | "placa" | "variedade" | "silo" | "transportadora" | "nota_fiscal">;
export type RemessaVendaUpdate = Partial<RemessaVendaInsert>;

export function useRemessasVenda(contratoId: string | undefined) {
  return useQuery({
    queryKey: ["remessas_venda", contratoId],
    queryFn: async () => {
      if (!contratoId) return [];

      const { data, error } = await supabase
        .from("remessas_venda")
        .select(`
          *,
          placa:placas(id, placa),
          variedade:produtos(id, nome),
          silo:silos(id, nome),
          transportadora:transportadoras(id, nome),
          nota_fiscal:notas_fiscais(id, numero, status, chave_acesso)
        `)
        .eq("contrato_venda_id", contratoId)
        .order("codigo", { ascending: true });

      if (error) throw error;
      return data as RemessaVenda[];
    },
    enabled: !!contratoId,
  });
}

export function useRemessaVenda(id: string | undefined) {
  return useQuery({
    queryKey: ["remessa_venda", id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from("remessas_venda")
        .select(`
          *,
          placa:placas(id, placa),
          variedade:produtos(id, nome),
          silo:silos(id, nome),
          transportadora:transportadoras(id, nome),
          nota_fiscal:notas_fiscais(id, numero, status, chave_acesso)
        `)
        .eq("id", id)
        .single();

      if (error) throw error;
      return data as RemessaVenda;
    },
    enabled: !!id,
  });
}

export function useProximoCodigoRemessa(contratoId: string | undefined) {
  return useQuery({
    queryKey: ["proximo_codigo_remessa", contratoId],
    queryFn: async () => {
      if (!contratoId) return 1;

      const { data } = await supabase
        .from("remessas_venda")
        .select("codigo")
        .eq("contrato_venda_id", contratoId)
        .order("codigo", { ascending: false })
        .limit(1);

      return (data?.[0]?.codigo || 0) + 1;
    },
    enabled: !!contratoId,
  });
}

export function useTotaisContrato(contratoId: string | undefined) {
  return useQuery({
    queryKey: ["totais_contrato", contratoId],
    queryFn: async () => {
      if (!contratoId) return { total_carregado_kg: 0, total_valor: 0 };

      const { data } = await supabase
        .from("remessas_venda")
        .select("kg_nota, valor_nota")
        .eq("contrato_venda_id", contratoId)
        .neq("status", "cancelada");

      const total_carregado_kg = data?.reduce((acc, r) => acc + (Number(r.kg_nota) || 0), 0) || 0;
      const total_valor = data?.reduce((acc, r) => acc + (Number(r.valor_nota) || 0), 0) || 0;

      return { total_carregado_kg, total_valor };
    },
    enabled: !!contratoId,
  });
}

export function useCreateRemessaVenda() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (remessa: RemessaVendaInsert) => {
      const { data, error } = await supabase
        .from("remessas_venda")
        .insert(remessa)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["remessas_venda", variables.contrato_venda_id] });
      queryClient.invalidateQueries({ queryKey: ["totais_contrato", variables.contrato_venda_id] });
      queryClient.invalidateQueries({ queryKey: ["contratos_venda"] });
      queryClient.invalidateQueries({ queryKey: ["contrato_venda", variables.contrato_venda_id] });
      queryClient.invalidateQueries({ queryKey: ["proximo_codigo_remessa", variables.contrato_venda_id] });
      toast.success("Remessa cadastrada com sucesso!");
    },
    onError: (error) => {
      toast.error(`Erro ao criar remessa: ${error.message}`);
    },
  });
}

export function useUpdateRemessaVenda() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...remessa }: RemessaVendaUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("remessas_venda")
        .update(remessa)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["remessas_venda", data.contrato_venda_id] });
      queryClient.invalidateQueries({ queryKey: ["remessa_venda", data.id] });
      queryClient.invalidateQueries({ queryKey: ["totais_contrato", data.contrato_venda_id] });
      queryClient.invalidateQueries({ queryKey: ["contratos_venda"] });
      queryClient.invalidateQueries({ queryKey: ["contrato_venda", data.contrato_venda_id] });
      toast.success("Remessa atualizada com sucesso!");
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar remessa: ${error.message}`);
    },
  });
}

export function useDeleteRemessaVenda() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, contratoId }: { id: string; contratoId: string }) => {
      const { error } = await supabase
        .from("remessas_venda")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return { contratoId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["remessas_venda", result.contratoId] });
      queryClient.invalidateQueries({ queryKey: ["totais_contrato", result.contratoId] });
      queryClient.invalidateQueries({ queryKey: ["contratos_venda"] });
      queryClient.invalidateQueries({ queryKey: ["contrato_venda", result.contratoId] });
      toast.success("Remessa excluída com sucesso!");
    },
    onError: (error) => {
      toast.error(`Erro ao excluir remessa: ${error.message}`);
    },
  });
}

// Função utilitária para calcular descontos de umidade
export function calcularDescontoUmidade(
  pesoLiquido: number, 
  umidadeAtual: number, 
  umidadeBase: number = 14
): number {
  if (umidadeAtual <= umidadeBase) return 0;
  
  // Fórmula padrão: (Umidade Atual - Umidade Base) / (100 - Umidade Base) * Peso
  const fatorDesconto = (umidadeAtual - umidadeBase) / (100 - umidadeBase);
  return pesoLiquido * fatorDesconto;
}

// Função utilitária para calcular descontos de impureza
export function calcularDescontoImpureza(
  pesoLiquido: number, 
  impurezaAtual: number, 
  impurezaBase: number = 1
): number {
  if (impurezaAtual <= impurezaBase) return 0;
  
  // Desconto direto: (Impureza Atual - Impureza Base) / 100 * Peso
  const percentualDesconto = (impurezaAtual - impurezaBase) / 100;
  return pesoLiquido * percentualDesconto;
}
