import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Cfop {
  id: string;
  codigo: string;
  descricao: string;
  natureza_operacao: string | null;
  tipo: string | null;
  aplicacao: string | null;
  ativo: boolean | null;
  incidencia_icms: boolean | null;
  incidencia_pis_cofins: boolean | null;
  incidencia_ibs_cbs: boolean | null;
  cst_icms_padrao: string | null;
  cst_pis_padrao: string | null;
  cst_cofins_padrao: string | null;
  cst_ipi_padrao: string | null;
  cst_ibs_padrao: string | null;
  cst_cbs_padrao: string | null;
  cst_is_padrao: string | null;
  created_at: string;
  updated_at: string;
}

export type CfopInsert = Omit<Cfop, "id" | "created_at" | "updated_at">;
export type CfopUpdate = Partial<CfopInsert>;

export function useCfops() {
  const queryClient = useQueryClient();

  const { data: cfops = [], isLoading, error } = useQuery({
    queryKey: ["cfops"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cfops")
        .select("*")
        .order("codigo", { ascending: true });

      if (error) throw error;
      return data as Cfop[];
    },
  });

  const createCfop = useMutation({
    mutationFn: async (cfop: CfopInsert) => {
      const { data, error } = await supabase
        .from("cfops")
        .insert(cfop)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cfops"] });
      toast.success("CFOP criado com sucesso!");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar CFOP: ${error.message}`);
    },
  });

  const updateCfop = useMutation({
    mutationFn: async ({ id, ...cfop }: CfopUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("cfops")
        .update(cfop)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cfops"] });
      toast.success("CFOP atualizado com sucesso!");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar CFOP: ${error.message}`);
    },
  });

  const deleteCfop = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("cfops").delete().eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cfops"] });
      toast.success("CFOP excluído com sucesso!");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao excluir CFOP: ${error.message}`);
    },
  });

  return {
    cfops,
    isLoading,
    error,
    createCfop,
    updateCfop,
    deleteCfop,
  };
}
