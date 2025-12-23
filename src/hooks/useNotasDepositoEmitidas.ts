import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface NotaDepositoEmitida {
  id: string;
  nota_fiscal_id: string | null;
  granja_id: string | null;
  inscricao_produtor_id: string | null;
  safra_id: string | null;
  produto_id: string | null;
  quantidade_kg: number;
  data_emissao: string | null;
  created_at: string;
  // Joins
  nota_fiscal?: { numero: number | null; serie: number | null; status: string | null } | null;
  granja?: { razao_social: string; nome_fantasia: string | null } | null;
  inscricao_produtor?: { inscricao_estadual: string | null; cpf_cnpj: string | null; granja: string | null; produtores?: { nome: string } | null } | null;
  safra?: { nome: string } | null;
  produto?: { nome: string } | null;
}

export type NotaDepositoInput = Omit<NotaDepositoEmitida, 'id' | 'created_at' | 'nota_fiscal' | 'granja' | 'inscricao_produtor' | 'safra' | 'produto'>;

export function useNotasDepositoEmitidas(filters?: {
  inscricaoProdutorId?: string;
  safraId?: string;
  produtoId?: string;
  granjaId?: string;
}) {
  return useQuery({
    queryKey: ['notas_deposito_emitidas', filters],
    queryFn: async () => {
      let query = supabase
        .from('notas_deposito_emitidas')
        .select(`
          *,
          nota_fiscal:notas_fiscais(numero, serie, status),
          granja:granjas(razao_social, nome_fantasia),
          inscricao_produtor:inscricoes_produtor(inscricao_estadual, cpf_cnpj, granja, produtores(nome)),
          safra:safras(nome),
          produto:produtos(nome)
        `)
        .order('created_at', { ascending: false });

      if (filters?.inscricaoProdutorId) {
        query = query.eq('inscricao_produtor_id', filters.inscricaoProdutorId);
      }
      if (filters?.safraId) {
        query = query.eq('safra_id', filters.safraId);
      }
      if (filters?.produtoId) {
        query = query.eq('produto_id', filters.produtoId);
      }
      if (filters?.granjaId) {
        query = query.eq('granja_id', filters.granjaId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as NotaDepositoEmitida[];
    },
  });
}

export function useCreateNotaDepositoEmitida() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (nota: NotaDepositoInput) => {
      const { data, error } = await supabase
        .from('notas_deposito_emitidas')
        .insert(nota)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notas_deposito_emitidas'] });
      queryClient.invalidateQueries({ queryKey: ['saldos_deposito'] });
      toast({
        title: 'Nota de depósito registrada',
        description: 'A nota de depósito foi registrada com sucesso.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao registrar nota de depósito',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteNotaDepositoEmitida() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('notas_deposito_emitidas')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notas_deposito_emitidas'] });
      queryClient.invalidateQueries({ queryKey: ['saldos_deposito'] });
      toast({
        title: 'Registro excluído',
        description: 'O registro de nota de depósito foi excluído com sucesso.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao excluir registro',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
