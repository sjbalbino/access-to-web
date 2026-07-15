import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface InscricaoSocio {
  id: string;
  produtor_id: string | null;
  nome_fantasia: string | null;
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
  emitente_id: string | null;
  is_emitente_principal: boolean | null;
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
 * Hook para buscar inscrições de produtores que podem ser emitentes de NF-e.
 * Retorna todas as inscrições ativas; a UI filtra por `emitente_id` para mostrar
 * apenas as que têm emitente NF-e vinculado (pelo CPF/CNPJ do produtor/sócio).
 */
export function useInscricoesSocio() {
  return useQuery({
    queryKey: ['inscricoes_socio_emitentes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inscricoes_produtor')
        .select(`
          id,
          produtor_id,
          nome_fantasia,
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
          emitente_id,
          is_emitente_principal,
          produtores:produtor_id(id, nome, tipo_produtor),
          granjas:granja_id(id, razao_social, nome_fantasia)
        `)
        .eq('ativa', true);

      if (error) throw error;
      const list = (data || []) as InscricaoSocio[];
      return list.sort((a, b) => {
        const na = (a.produtores?.nome || a.nome_fantasia || a.inscricao_estadual || '').toString();
        const nb = (b.produtores?.nome || b.nome_fantasia || b.inscricao_estadual || '').toString();
        return na.localeCompare(nb, 'pt-BR', { sensitivity: 'base' });
      });
    },
  });
}
