import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ColheitaPendente {
  id: string;
  controle_lavoura_id: string | null;
  safra_id: string | null;
  lavoura_id: string;
  data_colheita: string | null;
  peso_bruto: number | null;
  peso_tara: number | null;
  placa_id: string | null;
  motorista: string | null;
  tipo_colheita: string | null;
  variedade_id: string | null;
  created_at: string;
  lavouras?: { id: string; nome: string } | null;
  placas?: { id: string; placa: string } | null;
}

export interface ColheitaEntradaInput {
  controle_lavoura_id: string;
  safra_id: string;
  lavoura_id: string;
  data_colheita: string;
  peso_bruto: number;
  placa_id: string | null;
  motorista: string | null;
  tipo_colheita: string;
  variedade_id: string | null;
  silo_id: string | null;
  inscricao_produtor_id: string | null;
  local_entrega_terceiro_id: string | null;
  observacoes: string | null;
}

export interface ColheitaSaidaInput {
  id: string;
  peso_tara: number;
  producao_kg: number;
  impureza: number;
  kg_impureza: number;
  umidade: number;
  percentual_desconto: number;
  kg_umidade: number;
  percentual_avariados: number;
  kg_avariados: number;
  percentual_outros: number;
  kg_outros: number;
  kg_desconto_total: number;
  producao_liquida_kg: number;
  total_sacos: number;
  ph: number | null;
}

// Buscar colheitas pendentes (com peso_bruto mas sem peso_tara)
export function useColheitasPendentes(safraId: string | null) {
  return useQuery({
    queryKey: ["colheitas_pendentes", safraId],
    queryFn: async () => {
      if (!safraId) return [];
      
      const { data, error } = await supabase
        .from("colheitas")
        .select(`
          id,
          controle_lavoura_id,
          safra_id,
          lavoura_id,
          data_colheita,
          peso_bruto,
          peso_tara,
          placa_id,
          motorista,
          tipo_colheita,
          variedade_id,
          created_at,
          lavouras (id, nome),
          placas (id, placa)
        `)
        .eq("safra_id", safraId)
        .gt("peso_bruto", 0)
        .or("peso_tara.is.null,peso_tara.eq.0")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as ColheitaPendente[];
    },
    enabled: !!safraId,
    refetchInterval: 10000, // Atualiza a cada 10 segundos
  });
}

// Criar entrada de colheita (apenas peso bruto)
export function useCreateColheitaEntrada() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (input: ColheitaEntradaInput) => {
      const { data, error } = await supabase
        .from("colheitas")
        .insert({
          controle_lavoura_id: input.controle_lavoura_id,
          safra_id: input.safra_id,
          lavoura_id: input.lavoura_id,
          data_colheita: input.data_colheita,
          peso_bruto: input.peso_bruto,
          placa_id: input.placa_id,
          motorista: input.motorista,
          tipo_colheita: input.tipo_colheita,
          variedade_id: input.variedade_id,
          silo_id: input.silo_id,
          inscricao_produtor_id: input.inscricao_produtor_id,
          local_entrega_terceiro_id: input.local_entrega_terceiro_id,
          observacoes: input.observacoes,
          // Campos zerados para entrada parcial
          peso_tara: 0,
          producao_kg: 0,
          producao_liquida_kg: 0,
          impureza: 0,
          umidade: 0,
          kg_impureza: 0,
          kg_umidade: 0,
          kg_desconto_total: 0,
          total_sacos: 0,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["colheitas_pendentes"] });
      queryClient.invalidateQueries({ queryKey: ["colheitas"] });
    },
    onError: (error) => {
      toast.error("Erro ao registrar entrada: " + error.message);
    },
  });
}

// Atualizar colheita com dados de saída
export function useUpdateColheitaSaida() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (input: ColheitaSaidaInput) => {
      const { id, ...updateData } = input;
      
      const { data, error } = await supabase
        .from("colheitas")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["colheitas_pendentes"] });
      queryClient.invalidateQueries({ queryKey: ["colheitas"] });
    },
    onError: (error) => {
      toast.error("Erro ao registrar saída: " + error.message);
    },
  });
}
