import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type Produto = {
  id: string;
  granja_id: string | null;
  tipo: string;
  codigo: string | null;
  nome: string;
  descricao: string | null;
  unidade_medida_id: string | null;
  estoque_minimo: number | null;
  estoque_atual: number | null;
  preco_custo: number | null;
  preco_venda: number | null;
  fornecedor_id: string | null;
  ativo: boolean | null;
  created_at: string;
  updated_at: string;
  // Novos campos NFe
  codigo_barras: string | null;
  grupo: string | null;
  artigo_nfe: string | null;
  preco_prazo: number | null;
  estoque_maximo: number | null;
  tempo_maximo: number | null;
  qtd_venda: number | null;
  cod_fornecedor: string | null;
  peso_saco: number | null;
  produto_residuo_id: string | null;
  ncm: string | null;
  cst_pis: string | null;
  cst_cofins: string | null;
  cst_icms: string | null;
  cst_ipi: string | null;
  natureza_receita: string | null;
  observacao_tributaria: string | null;
};

export type ProdutoInsert = Omit<Produto, 'id' | 'created_at' | 'updated_at'>;

export function useProdutos() {
  return useQuery({
    queryKey: ['produtos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('produtos')
        .select(`
          *,
          unidade_medida:unidades_medida(id, codigo, descricao, sigla),
          fornecedor:clientes_fornecedores(id, nome)
        `)
        .order('nome');
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateProduto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (produto: ProdutoInsert) => {
      const { data, error } = await supabase
        .from('produtos')
        .insert(produto)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['produtos'] });
      toast.success('Produto criado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao criar produto: ' + error.message);
    },
  });
}

export function useUpdateProduto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...produto }: Partial<Produto> & { id: string }) => {
      const { data, error } = await supabase
        .from('produtos')
        .update(produto)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['produtos'] });
      toast.success('Produto atualizado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar produto: ' + error.message);
    },
  });
}

export function useDeleteProduto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('produtos')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['produtos'] });
      toast.success('Produto excluído com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao excluir produto: ' + error.message);
    },
  });
}
