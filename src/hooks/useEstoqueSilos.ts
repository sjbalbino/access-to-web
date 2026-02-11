import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type EstoqueSilo = {
  id: string;
  nome: string;
  codigo: string | null;
  tipo: string | null;
  capacidade_kg: number | null;
  ativo: boolean | null;
  granja_nome: string | null;
  estoque_kg: number;
  percentual: number;
};

export function useEstoqueSilos(safraId?: string) {
  return useQuery({
    queryKey: ['estoque-silos', safraId],
    queryFn: async () => {
      // Fetch silos with granja
      const { data: silos, error: silosError } = await supabase
        .from('silos')
        .select('id, nome, codigo, tipo, capacidade_kg, ativo, granja:granjas(razao_social)')
        .eq('ativo', true)
        .order('nome');
      if (silosError) throw silosError;

      // Fetch colheitas grouped by silo_id
      let colheitasQuery = supabase
        .from('colheitas')
        .select('silo_id, producao_liquida_kg');
      if (safraId) {
        colheitasQuery = colheitasQuery.eq('safra_id', safraId);
      }
      const { data: colheitas, error: colheitasError } = await colheitasQuery;
      if (colheitasError) throw colheitasError;

      // Aggregate stock per silo
      const estoqueMap = new Map<string, number>();
      colheitas?.forEach((c) => {
        if (c.silo_id && c.producao_liquida_kg) {
          estoqueMap.set(c.silo_id, (estoqueMap.get(c.silo_id) || 0) + c.producao_liquida_kg);
        }
      });

      return (silos || []).map((silo: any): EstoqueSilo => {
        const estoque_kg = estoqueMap.get(silo.id) || 0;
        const capacidade = silo.capacidade_kg || 0;
        const percentual = capacidade > 0 ? (estoque_kg / capacidade) * 100 : 0;
        return {
          id: silo.id,
          nome: silo.nome,
          codigo: silo.codigo,
          tipo: silo.tipo,
          capacidade_kg: silo.capacidade_kg,
          ativo: silo.ativo,
          granja_nome: silo.granja?.razao_social || null,
          estoque_kg,
          percentual: Math.min(percentual, 100),
        };
      });
    },
  });
}
