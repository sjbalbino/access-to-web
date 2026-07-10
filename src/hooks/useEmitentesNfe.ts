import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface EmitenteNfe {
  id: string;
  inscricao_produtor_id: string | null;
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
  cst_icms_padrao: string | null;
  cst_pis_padrao: string | null;
  cst_cofins_padrao: string | null;
  cst_ipi_padrao: string | null;
  cst_ibs_padrao: string | null;
  cst_cbs_padrao: string | null;
  cst_is_padrao: string | null;
  api_provider: string | null;
  // Credenciais (token) ficam em emitentes_nfe_credentials
  api_configurada: boolean | null;
  certificado_nome: string | null;
  certificado_validade: string | null;
  ativo: boolean | null;
  email_emitente: string | null;
  email_contador: string | null;
  created_at: string;
  updated_at: string;
  granja?: {
    id: string;
    razao_social: string;
    nome_fantasia: string | null;
  } | null;
  inscricao?: {
    id: string;
    cpf_cnpj: string | null;
    inscricao_estadual: string | null;
    nome: string | null;
    nome_fantasia: string | null;
    tipo: string | null;
    uf: string | null;
    cidade: string | null;
    produtores?: {
      id: string;
      nome: string;
    } | null;
  } | null;
}

export type EmitenteNfeInsert = Omit<EmitenteNfe, "id" | "created_at" | "updated_at" | "granja" | "inscricao">;
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
          granja:granjas(id, razao_social, nome_fantasia),
          inscricao:inscricoes_produtor!emitentes_nfe_inscricao_produtor_id_fkey(
            id, cpf_cnpj, inscricao_estadual, nome, nome_fantasia, tipo, uf, cidade,
            produtores:produtor_id(id, nome)
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as unknown as EmitenteNfe[];
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

      // Vincular a inscrição ao emitente recém-criado (1:1)
      if (data && emitente.inscricao_produtor_id) {
        await supabase
          .from("inscricoes_produtor")
          .update({ emitente_id: data.id })
          .eq("id", emitente.inscricao_produtor_id);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["emitentes-nfe"] });
      queryClient.invalidateQueries({ queryKey: ["inscricoes_produtor"] });
      queryClient.invalidateQueries({ queryKey: ["inscricao_emitente_principal"] });
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

      // Garantir vínculo inscricao → emitente
      if (emitente.inscricao_produtor_id) {
        await supabase
          .from("inscricoes_produtor")
          .update({ emitente_id: id })
          .eq("id", emitente.inscricao_produtor_id);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["emitentes-nfe"] });
      queryClient.invalidateQueries({ queryKey: ["inscricoes_produtor"] });
      queryClient.invalidateQueries({ queryKey: ["inscricao_emitente_principal"] });
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
      queryClient.invalidateQueries({ queryKey: ["inscricoes_produtor"] });
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
