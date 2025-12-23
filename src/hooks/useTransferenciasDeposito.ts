import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface TransferenciaDeposito {
  id: string;
  codigo: number;
  data_transferencia: string;
  granja_origem_id: string | null;
  inscricao_origem_id: string | null;
  granja_destino_id: string | null;
  inscricao_destino_id: string | null;
  safra_id: string | null;
  produto_id: string | null;
  silo_id: string | null;
  quantidade_kg: number;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
  // Joins
  granja_origem?: { razao_social: string; nome_fantasia: string | null } | null;
  granja_destino?: { razao_social: string; nome_fantasia: string | null } | null;
  inscricao_origem?: { inscricao_estadual: string | null; cpf_cnpj: string | null; granja: string | null; produtores?: { nome: string } | null } | null;
  inscricao_destino?: { inscricao_estadual: string | null; cpf_cnpj: string | null; granja: string | null; produtores?: { nome: string } | null } | null;
  safra?: { nome: string } | null;
  produto?: { nome: string } | null;
  silo?: { nome: string } | null;
}

export type TransferenciaInput = Omit<TransferenciaDeposito, 'id' | 'codigo' | 'created_at' | 'updated_at' | 'granja_origem' | 'granja_destino' | 'inscricao_origem' | 'inscricao_destino' | 'safra' | 'produto' | 'silo'>;

export function useTransferenciasDeposito(filters?: {
  safraId?: string;
  produtoId?: string;
  siloId?: string;
  granjaId?: string;
}) {
  return useQuery({
    queryKey: ['transferencias_deposito', filters],
    queryFn: async () => {
      let query = supabase
        .from('transferencias_deposito')
        .select(`
          *,
          granja_origem:granjas!transferencias_deposito_granja_origem_id_fkey(razao_social, nome_fantasia),
          granja_destino:granjas!transferencias_deposito_granja_destino_id_fkey(razao_social, nome_fantasia),
          inscricao_origem:inscricoes_produtor!transferencias_deposito_inscricao_origem_id_fkey(inscricao_estadual, cpf_cnpj, granja, produtores(nome)),
          inscricao_destino:inscricoes_produtor!transferencias_deposito_inscricao_destino_id_fkey(inscricao_estadual, cpf_cnpj, granja, produtores(nome)),
          safra:safras(nome),
          produto:produtos(nome),
          silo:silos(nome)
        `)
        .order('codigo', { ascending: false });

      if (filters?.safraId) {
        query = query.eq('safra_id', filters.safraId);
      }
      if (filters?.produtoId) {
        query = query.eq('produto_id', filters.produtoId);
      }
      if (filters?.siloId) {
        query = query.eq('silo_id', filters.siloId);
      }
      if (filters?.granjaId) {
        query = query.or(`granja_origem_id.eq.${filters.granjaId},granja_destino_id.eq.${filters.granjaId}`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as TransferenciaDeposito[];
    },
  });
}

export function useCreateTransferenciaDeposito() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (transferencia: TransferenciaInput) => {
      const { data, error } = await supabase
        .from('transferencias_deposito')
        .insert(transferencia)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transferencias_deposito'] });
      queryClient.invalidateQueries({ queryKey: ['saldos_deposito'] });
      toast({
        title: 'Transferência registrada',
        description: 'A transferência foi registrada com sucesso.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao registrar transferência',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateTransferenciaDeposito() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...transferencia }: TransferenciaInput & { id: string }) => {
      const { data, error } = await supabase
        .from('transferencias_deposito')
        .update(transferencia)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transferencias_deposito'] });
      queryClient.invalidateQueries({ queryKey: ['saldos_deposito'] });
      toast({
        title: 'Transferência atualizada',
        description: 'A transferência foi atualizada com sucesso.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao atualizar transferência',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteTransferenciaDeposito() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('transferencias_deposito')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transferencias_deposito'] });
      queryClient.invalidateQueries({ queryKey: ['saldos_deposito'] });
      toast({
        title: 'Transferência excluída',
        description: 'A transferência foi excluída com sucesso.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao excluir transferência',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
