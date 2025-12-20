import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface NcmResult {
  codigo: string;
  descricao: string;
}

export function useNcmSearch() {
  const [results, setResults] = useState<NcmResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const searchNcm = async (query: string) => {
    if (!query || query.length < 2) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    
    try {
      // Busca no banco de dados na tabela ncm
      const { data, error } = await supabase
        .from('ncm')
        .select('codigo, descricao')
        .eq('ativo', true)
        .or(`codigo.ilike.%${query}%,descricao.ilike.%${query}%`)
        .order('codigo')
        .limit(20);

      if (error) {
        console.error('Erro ao buscar NCM:', error);
        setResults([]);
        return;
      }

      setResults(data || []);
    } catch (err) {
      console.error('Erro na busca de NCM:', err);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  return { results, isLoading, searchNcm };
}
