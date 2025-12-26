import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface CompraCereal {
  id: string;
  codigo: number;
  granja_id: string;
  safra_id: string;
  inscricao_comprador_id: string;
  inscricao_vendedor_id: string;
  produto_id: string;
  silo_id: string | null;
  data_compra: string;
  quantidade_kg: number;
  valor_unitario_kg: number;
  valor_total: number;
  devolucao_id: string | null;
  nota_fiscal_id: string | null;
  status: string;
  observacao: string | null;
  created_at: string;
  updated_at: string;
  // Joins
  granja?: { id: string; razao_social: string };
  safra?: { id: string; nome: string };
  inscricao_comprador?: {
    id: string;
    inscricao_estadual: string | null;
    cpf_cnpj: string | null;
    granja: string | null;
    produtores?: { nome: string };
  };
  inscricao_vendedor?: {
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

export type CompraCerealInput = Partial<Omit<CompraCereal, 'id' | 'codigo' | 'created_at' | 'updated_at' | 'granja' | 'safra' | 'inscricao_comprador' | 'inscricao_vendedor' | 'produto' | 'silo' | 'nota_fiscal'>> & {
  granja_id: string;
  safra_id: string;
  produto_id: string;
  inscricao_comprador_id: string;
  inscricao_vendedor_id: string;
  quantidade_kg: number;
  data_compra: string;
};

interface CompraFilters {
  granjaId?: string;
  safraId?: string;
  produtoId?: string;
}

export function useComprasCereais(filters?: CompraFilters) {
  return useQuery({
    queryKey: ['compras_cereais', filters],
    queryFn: async () => {
      let query = supabase
        .from('compras_cereais')
        .select(`
          *,
          granja:granjas(id, razao_social),
          safra:safras(id, nome),
          inscricao_comprador:inscricoes_produtor!compras_cereais_inscricao_comprador_id_fkey(
            id, inscricao_estadual, cpf_cnpj, granja,
            produtores(nome)
          ),
          inscricao_vendedor:inscricoes_produtor!compras_cereais_inscricao_vendedor_id_fkey(
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
      return data as CompraCereal[];
    },
  });
}

export function useCompraCereal(id: string | null) {
  return useQuery({
    queryKey: ['compra_cereal', id],
    queryFn: async () => {
      if (!id) return null;
      
      const { data, error } = await supabase
        .from('compras_cereais')
        .select(`
          *,
          granja:granjas(id, razao_social),
          safra:safras(id, nome),
          inscricao_comprador:inscricoes_produtor!compras_cereais_inscricao_comprador_id_fkey(
            id, inscricao_estadual, cpf_cnpj, granja,
            produtores(nome)
          ),
          inscricao_vendedor:inscricoes_produtor!compras_cereais_inscricao_vendedor_id_fkey(
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
      return data as CompraCereal;
    },
    enabled: !!id,
  });
}

export function useProximoCodigoCompra() {
  return useQuery({
    queryKey: ['proximo_codigo_compra'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('compras_cereais')
        .select('codigo')
        .order('codigo', { ascending: false })
        .limit(1);

      if (error) throw error;
      return (data?.[0]?.codigo || 0) + 1;
    },
  });
}

export function useCreateCompraCereal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (compra: CompraCerealInput) => {
      const { data, error } = await supabase
        .from('compras_cereais')
        .insert(compra)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compras_cereais'] });
      queryClient.invalidateQueries({ queryKey: ['proximo_codigo_compra'] });
      queryClient.invalidateQueries({ queryKey: ['saldo_socio'] });
      toast({
        title: 'Sucesso',
        description: 'Compra registrada com sucesso.',
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

export function useUpdateCompraCereal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...compra }: Partial<CompraCerealInput> & { id: string }) => {
      const { data, error } = await supabase
        .from('compras_cereais')
        .update(compra)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compras_cereais'] });
      queryClient.invalidateQueries({ queryKey: ['compra_cereal'] });
      queryClient.invalidateQueries({ queryKey: ['saldo_socio'] });
      toast({
        title: 'Sucesso',
        description: 'Compra atualizada com sucesso.',
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

export function useDeleteCompraCereal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('compras_cereais')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compras_cereais'] });
      queryClient.invalidateQueries({ queryKey: ['proximo_codigo_compra'] });
      queryClient.invalidateQueries({ queryKey: ['saldo_socio'] });
      toast({
        title: 'Sucesso',
        description: 'Compra excluída com sucesso.',
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
