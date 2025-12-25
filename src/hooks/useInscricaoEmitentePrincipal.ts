import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface InscricaoEmitentePrincipal {
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
  emitente_id: string | null;
  is_emitente_principal: boolean | null;
  produtores?: {
    id: string;
    nome: string;
    tipo_produtor: string | null;
  } | null;
  emitente?: {
    id: string;
    granja_id: string | null;
    ambiente: number | null;
    serie_nfe: number | null;
    numero_atual_nfe: number | null;
    api_configurada: boolean | null;
    api_access_token: string | null;
    cst_icms_padrao: string | null;
    cst_pis_padrao: string | null;
    cst_cofins_padrao: string | null;
    cst_ipi_padrao: string | null;
    cst_ibs_padrao: string | null;
    cst_cbs_padrao: string | null;
    cst_is_padrao: string | null;
  } | null;
}

export function useInscricaoEmitentePrincipal(granjaId: string | undefined) {
  return useQuery({
    queryKey: ['inscricao_emitente_principal', granjaId],
    queryFn: async () => {
      if (!granjaId) return null;
      
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
          emitente_id,
          is_emitente_principal,
          produtores:produtor_id(id, nome, tipo_produtor),
          emitente:emitente_id(id, granja_id, ambiente, serie_nfe, numero_atual_nfe, api_configurada, api_access_token, cst_icms_padrao, cst_pis_padrao, cst_cofins_padrao, cst_ipi_padrao, cst_ibs_padrao, cst_cbs_padrao, cst_is_padrao)
        `)
        .eq('granja_id', granjaId)
        .eq('is_emitente_principal', true)
        .maybeSingle();
      
      if (error) {
        console.error('Erro ao buscar inscrição emitente principal:', error);
        return null;
      }
      return data as InscricaoEmitentePrincipal | null;
    },
    enabled: !!granjaId,
  });
}
