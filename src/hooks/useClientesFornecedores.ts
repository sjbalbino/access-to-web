import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type ClienteFornecedor = {
  id: string;
  empresa_id: string | null;
  tipo: string;
  tipo_pessoa: string | null;
  codigo: string | null;
  nome: string;
  nome_fantasia: string | null;
  cpf_cnpj: string | null;
  inscricao_estadual: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  cep: string | null;
  telefone: string | null;
  celular: string | null;
  email: string | null;
  contato: string | null;
  observacoes: string | null;
  ativo: boolean | null;
  created_at: string;
  updated_at: string;
};

export type ClienteFornecedorInsert = Partial<Omit<ClienteFornecedor, 'id' | 'created_at' | 'updated_at'>> & { nome: string; tipo: string };

export function useClientesFornecedores() {
  return useQuery({
    queryKey: ['clientes_fornecedores'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clientes_fornecedores')
        .select('*')
        .order('nome');
      if (error) throw error;
      return data as ClienteFornecedor[];
    },
  });
}

export function useCreateClienteFornecedor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (clienteFornecedor: ClienteFornecedorInsert) => {
      const { data, error } = await supabase
        .from('clientes_fornecedores')
        .insert(clienteFornecedor)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes_fornecedores'] });
      toast.success('Cliente/Fornecedor criado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao criar cliente/fornecedor: ' + error.message);
    },
  });
}

export function useUpdateClienteFornecedor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...clienteFornecedor }: Partial<ClienteFornecedor> & { id: string }) => {
      const { data, error } = await supabase
        .from('clientes_fornecedores')
        .update(clienteFornecedor)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes_fornecedores'] });
      toast.success('Cliente/Fornecedor atualizado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar cliente/fornecedor: ' + error.message);
    },
  });
}

export function useDeleteClienteFornecedor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('clientes_fornecedores')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes_fornecedores'] });
      toast.success('Cliente/Fornecedor excluído com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao excluir cliente/fornecedor: ' + error.message);
    },
  });
}
