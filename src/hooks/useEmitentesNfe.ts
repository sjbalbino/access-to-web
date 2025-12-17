import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface EmitenteNfe {
  id: string;
  granja_id: string | null;
  ambiente: number | null;
  serie_nfe: number | null;
  numero_atual_nfe: number | null;
  serie_nfce: number | null;
  numero_atual_nfce: number | null;
  crt: number | null;
  aliq_icms_padrao: number | null;
  aliq_pis_padrao: number | null;
  aliq_cofins_padrao: number | null;
  aliq_ibs_padrao: number | null;
  aliq_cbs_padrao: number | null;
  aliq_is_padrao: number | null;
  api_provider: string | null;
  api_consumer_key: string | null;
  api_consumer_secret: string | null;
  api_access_token: string | null;
  api_access_token_secret: string | null;
  api_configurada: boolean | null;
  certificado_nome: string | null;
  certificado_validade: string | null;
  ativo: boolean | null;
  created_at: string;
  updated_at: string;
  granja?: {
    id: string;
    razao_social: string;
    nome_fantasia: string | null;
    cnpj: string | null;
  };
}

export type EmitenteNfeInsert = Omit<EmitenteNfe, "id" | "created_at" | "updated_at" | "granja">;
export type EmitenteNfeUpdate = Partial<EmitenteNfeInsert>;

export function useEmitentesNfe() {
  const queryClient = useQueryClient();

  const { data: emitentes = [], isLoading, error } = useQuery({
    queryKey: ["emitentes-nfe"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("emitentes_nfe")
        .select(`
          *,
          granja:granjas(id, razao_social, nome_fantasia, cnpj)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as EmitenteNfe[];
    },
  });

  const createEmitente = useMutation({
    mutationFn: async (emitente: EmitenteNfeInsert) => {
      const { data, error } = await supabase
        .from("emitentes_nfe")
        .insert(emitente)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["emitentes-nfe"] });
      toast.success("Emitente NF-e criado com sucesso!");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar emitente: ${error.message}`);
    },
  });

  const updateEmitente = useMutation({
    mutationFn: async ({ id, ...emitente }: EmitenteNfeUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("emitentes_nfe")
        .update(emitente)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["emitentes-nfe"] });
      toast.success("Emitente NF-e atualizado com sucesso!");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar emitente: ${error.message}`);
    },
  });

  const deleteEmitente = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("emitentes_nfe").delete().eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["emitentes-nfe"] });
      toast.success("Emitente NF-e excluído com sucesso!");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao excluir emitente: ${error.message}`);
    },
  });

  return {
    emitentes,
    isLoading,
    error,
    createEmitente,
    updateEmitente,
    deleteEmitente,
  };
}
