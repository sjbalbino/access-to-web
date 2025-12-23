import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface InscricaoCompleta {
  id: string;
  produtor_id: string | null;
  inscricao_estadual: string | null;
  cpf_cnpj: string | null;
  tipo: string | null;
  ativa: boolean | null;
  granja_id: string | null;
  granja: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  cep: string | null;
  telefone: string | null;
  email: string | null;
  produtores?: {
    id: string;
    nome: string;
    tipo_produtor: string | null;
  } | null;
  granjas?: {
    id: string;
    razao_social: string;
  } | null;
}

export function useInscricoesCompletas() {
  return useQuery({
    queryKey: ['inscricoes_completas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inscricoes_produtor')
        .select(`
          id,
          produtor_id,
          inscricao_estadual,
          cpf_cnpj,
          tipo,
          ativa,
          granja_id,
          granja,
          logradouro,
          numero,
          complemento,
          bairro,
          cidade,
          uf,
          cep,
          telefone,
          email,
          produtores:produtor_id(id, nome, tipo_produtor),
          granjas:granja_id(id, razao_social)
        `)
        .order('inscricao_estadual');
      
      if (error) throw error;
      return data as InscricaoCompleta[];
    },
  });
}
