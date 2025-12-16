import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface InscricaoComProdutor {
  id: string;
  produtor_id: string | null;
  inscricao_estadual: string | null;
  tipo: string | null;
  ativa: boolean | null;
  granja_id: string | null;
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

export function useAllInscricoes() {
  return useQuery({
    queryKey: ['all_inscricoes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inscricoes_produtor')
        .select(`
          id,
          produtor_id,
          inscricao_estadual,
          tipo,
          ativa,
          granja_id,
          produtores:produtor_id(id, nome, tipo_produtor),
          granjas:granja_id(id, razao_social)
        `)
        .order('inscricao_estadual');
      
      if (error) throw error;
      return data as InscricaoComProdutor[];
    },
  });
}
