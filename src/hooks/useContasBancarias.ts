import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ContaBancaria {
  id: string;
  tenant_id: string | null;
  codigo_legado: string | null;
  nome: string;
  banco_id: string | null;
  agencia: string | null;
  agencia_dv: string | null;
  conta: string | null;
  conta_dv: string | null;
  tipo: 'corrente' | 'poupanca' | 'investimento' | 'caixa' | 'outro';
  socio_produtor_id: string | null;
  granja_id: string | null;
  titular: string | null;
  cpf_cnpj_titular: string | null;
  pix_chave: string | null;
  pix_tipo: 'cpf' | 'cnpj' | 'email' | 'telefone' | 'aleatoria' | null;
  saldo_inicial: number;
  data_saldo_inicial: string | null;
  ativo: boolean;
  observacoes: string | null;
  banco?: { codigo: string; nome: string } | null;
  socio?: { nome: string } | null;
  granja?: { razao_social: string } | null;
}

export type ContaBancariaInput = Omit<ContaBancaria, 'id' | 'tenant_id' | 'banco' | 'socio' | 'granja'>;

interface Filtros {
  socioProdutorId?: string;
  granjaId?: string;
  ativo?: boolean;
  busca?: string;
}

export function useContasBancarias(filtros?: Filtros) {
  return useQuery({
    queryKey: ['contas_bancarias', filtros],
    queryFn: async () => {
      let q = supabase
        .from('contas_bancarias' as any)
        .select(`*,
          banco:banco_id(codigo, nome),
          socio:socio_produtor_id(nome),
          granja:granja_id(razao_social)
        `)
        .order('nome');
      if (filtros?.socioProdutorId) q = q.eq('socio_produtor_id', filtros.socioProdutorId);
      if (filtros?.granjaId) q = q.eq('granja_id', filtros.granjaId);
      if (typeof filtros?.ativo === 'boolean') q = q.eq('ativo', filtros.ativo);
      if (filtros?.busca) q = q.ilike('nome', `%${filtros.busca}%`);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as unknown as ContaBancaria[];
    },
  });
}

export function useCreateContaBancaria() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<ContaBancariaInput>) => {
      const { data, error } = await supabase
        .from('contas_bancarias' as any)
        .insert(input as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contas_bancarias'] });
      toast.success('Conta bancária criada!');
    },
    onError: (e: any) => toast.error('Erro: ' + e.message),
  });
}

export function useUpdateContaBancaria() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<ContaBancariaInput> & { id: string }) => {
      const { data, error } = await supabase
        .from('contas_bancarias' as any)
        .update(input as any)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contas_bancarias'] });
      toast.success('Conta bancária atualizada!');
    },
    onError: (e: any) => toast.error('Erro: ' + e.message),
  });
}

export function useDeleteContaBancaria() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('contas_bancarias' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contas_bancarias'] });
      toast.success('Conta bancária excluída!');
    },
    onError: (e: any) => toast.error('Erro: ' + e.message),
  });
}
