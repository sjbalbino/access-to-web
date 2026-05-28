import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface VerificacaoEmpresaResult {
  success: boolean;
  habilitada?: boolean;
  habilitada_producao?: boolean;
  habilitada_homologacao?: boolean;
  ambiente?: number | null;
  ambiente_label?: string;
  cpf_cnpj?: string;
  nome?: string | null;
  codigo?: string;
  mensagem?: string;
  error?: string;
  detalhes?: unknown;
}

export function useFocusNfeVerificarEmpresa() {
  const [isLoading, setIsLoading] = useState(false);

  const verificar = async (params: {
    emitente_id: string;
    cpf_cnpj?: string | null;
    inscricao_produtor_id?: string | null;
  }): Promise<VerificacaoEmpresaResult> => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "focus-nfe-verificar-empresa",
        { body: params },
      );
      if (error) throw new Error(error.message);
      return data as VerificacaoEmpresaResult;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro desconhecido";
      toast.error("Erro ao verificar empresa na Focus NFe", { description: msg });
      return { success: false, error: msg };
    } finally {
      setIsLoading(false);
    }
  };

  return { verificar, isLoading };
}
