import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface CnpjData {
  cnpj: string;
  razao_social: string;
  nome_fantasia: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
  cep: string;
  telefone: string;
  email: string;
  situacao_cadastral: string;
  data_situacao_cadastral: string;
  natureza_juridica: string;
  porte: string;
  capital_social: number;
  atividade_principal: string;
}

export function formatCnpj(value: string): string {
  const numbers = value.replace(/\D/g, '');
  return numbers
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
    .substring(0, 18);
}

export function useCnpjLookup() {
  const [isLoading, setIsLoading] = useState(false);

  const fetchCnpj = async (cnpj: string): Promise<CnpjData | null> => {
    const cnpjLimpo = cnpj.replace(/\D/g, '');
    
    if (cnpjLimpo.length !== 14) {
      return null;
    }

    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('consulta-cnpj', {
        body: { cnpj: cnpjLimpo }
      });

      if (error) {
        console.error('Erro ao consultar CNPJ:', error);
        toast.error('Erro ao consultar CNPJ');
        return null;
      }

      if (data.error) {
        toast.error(data.error);
        return null;
      }

      toast.success('Dados do CNPJ carregados com sucesso!');
      return data as CnpjData;
    } catch (error) {
      console.error('Erro ao consultar CNPJ:', error);
      toast.error('Erro ao consultar CNPJ');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return { isLoading, fetchCnpj };
}
