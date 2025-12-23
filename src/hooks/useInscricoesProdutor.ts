import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface InscricaoProdutor {
  id: string;
  produtor_id: string | null;
  tipo: string | null;
  inscricao_estadual: string | null;
  cpf_cnpj: string | null;
  cep: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  telefone: string | null;
  email: string | null;
  granja: string | null;
  granja_id: string | null;
  ativa: boolean | null;
  emitente_id: string | null;
  conta_bancaria: string | null;
  created_at: string;
  updated_at: string;
  emitente?: {
    id: string;
    ambiente: number | null;
    serie_nfe: number | null;
    api_configurada: boolean | null;
    certificado_nome: string | null;
    certificado_validade: string | null;
    granja?: {
      id: string;
      razao_social: string;
      nome_fantasia: string | null;
    } | null;
  } | null;
}

export type InscricaoInput = Omit<InscricaoProdutor, 'id' | 'created_at' | 'updated_at' | 'emitente'>;

export function useInscricoesByProdutor(produtorId: string | undefined) {
  return useQuery({
    queryKey: ['inscricoes_produtor', produtorId],
    queryFn: async () => {
      if (!produtorId) return [];
      const { data, error } = await supabase
        .from('inscricoes_produtor')
        .select(`
          *,
          emitente:emitentes_nfe(
            id,
            ambiente,
            serie_nfe,
            api_configurada,
            certificado_nome,
            certificado_validade,
            granja:granjas(id, razao_social, nome_fantasia)
          )
        `)
        .eq('produtor_id', produtorId)
        .order('inscricao_estadual');
      
      if (error) throw error;
      return data as InscricaoProdutor[];
    },
    enabled: !!produtorId,
  });
}

export function useCreateInscricao() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (inscricao: InscricaoInput) => {
      const { data, error } = await supabase
        .from('inscricoes_produtor')
        .insert(inscricao)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['inscricoes_produtor', variables.produtor_id] });
      toast({
        title: 'Inscrição cadastrada',
        description: 'A inscrição estadual foi cadastrada com sucesso.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao cadastrar',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateInscricao() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...inscricao }: InscricaoInput & { id: string }) => {
      const { data, error } = await supabase
        .from('inscricoes_produtor')
        .update(inscricao)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['inscricoes_produtor', variables.produtor_id] });
      toast({
        title: 'Inscrição atualizada',
        description: 'A inscrição estadual foi atualizada com sucesso.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao atualizar',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteInscricao() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, produtorId }: { id: string; produtorId: string }) => {
      const { error } = await supabase
        .from('inscricoes_produtor')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return produtorId;
    },
    onSuccess: (produtorId) => {
      queryClient.invalidateQueries({ queryKey: ['inscricoes_produtor', produtorId] });
      toast({
        title: 'Inscrição excluída',
        description: 'A inscrição estadual foi excluída com sucesso.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao excluir',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
