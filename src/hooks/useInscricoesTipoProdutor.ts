import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface InscricaoTipoProdutor {
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
    nome_fantasia: string | null;
  } | null;
}

/**
 * Hook para buscar inscrições de produtores do tipo "produtor" (depositantes/parceiros).
 * Filtra por produtores.tipo_produtor = 'produtor' ao invés de inscricoes.tipo.
 */
export function useInscricoesTipoProdutor() {
  return useQuery({
    queryKey: ['inscricoes_tipo_produtor'],
    queryFn: async () => {
      // Primeiro buscar os produtores que são do tipo "produtor" (depositantes)
      const { data: produtoresTipo, error: errorProdutores } = await supabase
        .from('produtores')
        .select('id')
        .eq('tipo_produtor', 'produtor');
      
      if (errorProdutores) throw errorProdutores;
      
      const produtorIds = produtoresTipo?.map(p => p.id) || [];
      
      if (produtorIds.length === 0) {
        return [] as InscricaoTipoProdutor[];
      }
      
      // Buscar inscrições desses produtores
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
          granjas:granja_id(id, razao_social, nome_fantasia)
        `)
        .in('produtor_id', produtorIds)
        .eq('ativa', true)
        .order('inscricao_estadual');
      
      if (error) throw error;
      return (data || []) as InscricaoTipoProdutor[];
    },
  });
}
