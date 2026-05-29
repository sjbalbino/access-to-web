import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface EmitenteCredentials {
  emitente_id: string;
  granja_id: string | null;
  api_consumer_key: string | null;
  api_consumer_secret: string | null;
  api_access_token: string | null;
  api_access_token_homologacao: string | null;
  api_access_token_secret: string | null;
}

const EMPTY: Omit<EmitenteCredentials, "emitente_id" | "granja_id"> = {
  api_consumer_key: null,
  api_consumer_secret: null,
  api_access_token: null,
  api_access_token_homologacao: null,
  api_access_token_secret: null,
};

export function useEmitenteCredentials(emitenteId: string | null | undefined) {
  return useQuery({
    queryKey: ["emitente-credentials", emitenteId],
    enabled: !!emitenteId,
    queryFn: async () => {
      if (!emitenteId) return null;
      const { data, error } = await (supabase as any)
        .from("emitentes_nfe_credentials")
        .select("*")
        .eq("emitente_id", emitenteId)
        .maybeSingle();
      if (error) {
        // Sem permissão (operador/visualizador) — retornar vazio sem quebrar a UI
        return null;
      }
      return (data || null) as EmitenteCredentials | null;
    },
  });
}

export function useUpsertEmitenteCredentials() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      emitente_id: string;
      granja_id: string | null;
      api_consumer_key?: string | null;
      api_consumer_secret?: string | null;
      api_access_token?: string | null;
      api_access_token_secret?: string | null;
    }) => {
      // Buscar tenant_id pela granja
      let tenant_id: string | null = null;
      if (payload.granja_id) {
        const { data: g } = await supabase
          .from("granjas")
          .select("tenant_id")
          .eq("id", payload.granja_id)
          .maybeSingle();
        tenant_id = (g as any)?.tenant_id ?? null;
      }

      const row = {
        emitente_id: payload.emitente_id,
        granja_id: payload.granja_id,
        tenant_id,
        api_consumer_key: payload.api_consumer_key ?? null,
        api_consumer_secret: payload.api_consumer_secret ?? null,
        api_access_token: payload.api_access_token ?? null,
        api_access_token_secret: payload.api_access_token_secret ?? null,
      };

      const { error } = await (supabase as any)
        .from("emitentes_nfe_credentials")
        .upsert(row, { onConflict: "emitente_id" });

      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      queryClient.invalidateQueries({ queryKey: ["emitente-credentials", vars.emitente_id] });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao salvar credenciais da API: ${error.message}`);
    },
  });
}

export { EMPTY as EMPTY_EMITENTE_CREDENTIALS };
