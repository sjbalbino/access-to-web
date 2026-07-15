import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface InscricaoCompleta {
  id: string;
  produtor_id: string | null;
  nome: string | null;
  nome_fantasia: string | null;
  inscricao_estadual: string | null;
  cpf_cnpj: string | null;
  tipo: string | null;
  ativa: boolean | null;
  emitente_id: string | null;
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
    ativo: boolean | null;
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
          nome,
          nome_fantasia,
          inscricao_estadual,
          cpf_cnpj,
          tipo,
          ativa,
          emitente_id,
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
          produtores:produtor_id(id, nome, tipo_produtor, ativo),
          granjas:granja_id(id, razao_social)
        `);
      
      if (error) throw error;
      const list = (data || []) as InscricaoCompleta[];
      return list.sort((a, b) => {
        const na = (a.produtores?.nome || a.nome || a.nome_fantasia || a.inscricao_estadual || '').toString();
        const nb = (b.produtores?.nome || b.nome || b.nome_fantasia || b.inscricao_estadual || '').toString();
        return na.localeCompare(nb, 'pt-BR', { sensitivity: 'base' });
      });
    },
  });
}
