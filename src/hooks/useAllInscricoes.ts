import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface InscricaoComProdutor {
  id: string;
  produtor_id: string | null;
  nome: string | null;
  nome_fantasia: string | null;
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
          nome,
          nome_fantasia,
          inscricao_estadual,
          tipo,
          ativa,
          granja_id,
          produtores:produtor_id(id, nome, tipo_produtor),
          granjas:granja_id(id, razao_social)
        `);
      
      if (error) throw error;
      const list = (data || []) as InscricaoComProdutor[];
      return list.sort((a, b) => {
        const na = (a.produtores?.nome || a.nome || a.nome_fantasia || a.inscricao_estadual || '').toString();
        const nb = (b.produtores?.nome || b.nome || b.nome_fantasia || b.inscricao_estadual || '').toString();
        return na.localeCompare(nb, 'pt-BR', { sensitivity: 'base' });
      });
    },
  });
}
