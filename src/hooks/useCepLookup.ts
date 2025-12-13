import { useState, useCallback } from "react";
import { toast } from "sonner";

interface CepData {
  logradouro: string;
  bairro: string;
  localidade: string;
  uf: string;
  erro?: boolean;
}

interface UseCepLookupReturn {
  isLoading: boolean;
  fetchCep: (cep: string) => Promise<CepData | null>;
}

export function useCepLookup(): UseCepLookupReturn {
  const [isLoading, setIsLoading] = useState(false);

  const fetchCep = useCallback(async (cep: string): Promise<CepData | null> => {
    // Remove non-numeric characters
    const cleanCep = cep.replace(/\D/g, "");

    // Validate CEP format (8 digits)
    if (cleanCep.length !== 8) {
      return null;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      
      if (!response.ok) {
        throw new Error("Erro ao buscar CEP");
      }

      const data: CepData = await response.json();

      if (data.erro) {
        toast.error("CEP não encontrado");
        return null;
      }

      return data;
    } catch (error) {
      toast.error("Erro ao buscar CEP. Verifique sua conexão.");
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { isLoading, fetchCep };
}

// Helper to format CEP with mask (00000-000)
export function formatCep(cep: string): string {
  const cleanCep = cep.replace(/\D/g, "");
  if (cleanCep.length <= 5) {
    return cleanCep;
  }
  return `${cleanCep.slice(0, 5)}-${cleanCep.slice(5, 8)}`;
}
