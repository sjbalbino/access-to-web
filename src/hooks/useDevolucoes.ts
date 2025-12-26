import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface DevolucaoDeposito {
  id: string;
  codigo: number;
  granja_id: string;
  safra_id: string;
  inscricao_emitente_id: string;
  inscricao_produtor_id: string;
  produto_id: string;
  silo_id: string | null;
  data_devolucao: string;
  quantidade_kg: number;
  valor_unitario: number;
  valor_total: number;
  taxa_armazenagem: number;
  kg_taxa_armazenagem: number;
  inscricao_recebe_taxa_id: string | null;
  nota_fiscal_id: string | null;
  status: string;
  observacao: string | null;
  created_at: string;
  updated_at: string;
  // Joins
  granja?: { id: string; razao_social: string };
  safra?: { id: string; nome: string };
  inscricao_emitente?: {
    id: string;
    inscricao_estadual: string | null;
    cpf_cnpj: string | null;
    granja: string | null;
    produtores?: { nome: string };
  };
  inscricao_produtor?: {
    id: string;
    inscricao_estadual: string | null;
    cpf_cnpj: string | null;
    granja: string | null;
    produtores?: { nome: string };
  };
  produto?: { id: string; nome: string };
  silo?: { id: string; nome: string };
  nota_fiscal?: { id: string; numero: number; status: string };
}

export type DevolucaoInput = Partial<Omit<DevolucaoDeposito, 'id' | 'codigo' | 'created_at' | 'updated_at' | 'granja' | 'safra' | 'inscricao_emitente' | 'inscricao_produtor' | 'produto' | 'silo' | 'nota_fiscal'>> & {
  granja_id: string;
  safra_id: string;
  produto_id: string;
  inscricao_emitente_id: string;
  inscricao_produtor_id: string;
  quantidade_kg: number;
  data_devolucao: string;
};

interface DevolucaoFilters {
  granjaId?: string;
  safraId?: string;
  produtoId?: string;
}

export function useDevolucoes(filters?: DevolucaoFilters) {
  return useQuery({
    queryKey: ['devolucoes_deposito', filters],
    queryFn: async () => {
      let query = supabase
        .from('devolucoes_deposito')
        .select(`
          *,
          granja:granjas(id, razao_social),
          safra:safras(id, nome),
          inscricao_emitente:inscricoes_produtor!devolucoes_deposito_inscricao_emitente_id_fkey(
            id, inscricao_estadual, cpf_cnpj, granja,
            produtores(nome)
          ),
          inscricao_produtor:inscricoes_produtor!devolucoes_deposito_inscricao_produtor_id_fkey(
            id, inscricao_estadual, cpf_cnpj, granja,
            produtores(nome)
          ),
          produto:produtos(id, nome),
          silo:silos(id, nome),
          nota_fiscal:notas_fiscais(id, numero, status)
        `)
        .order('codigo', { ascending: false });

      if (filters?.granjaId) {
        query = query.eq('granja_id', filters.granjaId);
      }
      if (filters?.safraId) {
        query = query.eq('safra_id', filters.safraId);
      }
      if (filters?.produtoId) {
        query = query.eq('produto_id', filters.produtoId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as DevolucaoDeposito[];
    },
  });
}

export function useDevolucao(id: string | null) {
  return useQuery({
    queryKey: ['devolucao_deposito', id],
    queryFn: async () => {
      if (!id) return null;
      
      const { data, error } = await supabase
        .from('devolucoes_deposito')
        .select(`
          *,
          granja:granjas(id, razao_social),
          safra:safras(id, nome),
          inscricao_emitente:inscricoes_produtor!devolucoes_deposito_inscricao_emitente_id_fkey(
            id, inscricao_estadual, cpf_cnpj, granja,
            produtores(nome)
          ),
          inscricao_produtor:inscricoes_produtor!devolucoes_deposito_inscricao_produtor_id_fkey(
            id, inscricao_estadual, cpf_cnpj, granja,
            produtores(nome)
          ),
          produto:produtos(id, nome),
          silo:silos(id, nome),
          nota_fiscal:notas_fiscais(id, numero, status)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as DevolucaoDeposito;
    },
    enabled: !!id,
  });
}

export function useProximoCodigoDevolucao() {
  return useQuery({
    queryKey: ['proximo_codigo_devolucao'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('devolucoes_deposito')
        .select('codigo')
        .order('codigo', { ascending: false })
        .limit(1);

      if (error) throw error;
      return (data?.[0]?.codigo || 0) + 1;
    },
  });
}

export function useCreateDevolucao() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (devolucao: DevolucaoInput) => {
      const { data, error } = await supabase
        .from('devolucoes_deposito')
        .insert(devolucao)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devolucoes_deposito'] });
      queryClient.invalidateQueries({ queryKey: ['proximo_codigo_devolucao'] });
      queryClient.invalidateQueries({ queryKey: ['saldo_disponivel_produtor'] });
      toast({
        title: 'Sucesso',
        description: 'Devolução criada com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateDevolucao() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...devolucao }: Partial<DevolucaoInput> & { id: string }) => {
      const { data, error } = await supabase
        .from('devolucoes_deposito')
        .update(devolucao)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devolucoes_deposito'] });
      queryClient.invalidateQueries({ queryKey: ['devolucao_deposito'] });
      queryClient.invalidateQueries({ queryKey: ['saldo_disponivel_produtor'] });
      toast({
        title: 'Sucesso',
        description: 'Devolução atualizada com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteDevolucao() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('devolucoes_deposito')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devolucoes_deposito'] });
      queryClient.invalidateQueries({ queryKey: ['proximo_codigo_devolucao'] });
      queryClient.invalidateQueries({ queryKey: ['saldo_disponivel_produtor'] });
      toast({
        title: 'Sucesso',
        description: 'Devolução excluída com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
