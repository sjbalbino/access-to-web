import { useMemo } from 'react';
import { useSilos } from './useSilos';

/**
 * Retorna o ID do silo padrão. Se `granjaId` for informado, prioriza o padrão daquela granja;
 * caso não haja, cai para qualquer silo padrão ativo cadastrado.
 */
export function useSiloPadraoId(granjaId?: string | null): string | null {
  const { data: silos } = useSilos();
  return useMemo(() => {
    if (!silos) return null;
    const ativos = (silos as any[]).filter((s) => s.ativo !== false && s.is_padrao === true);
    if (granjaId) {
      const daGranja = ativos.find((s) => s.granja_id === granjaId);
      if (daGranja) return daGranja.id;
    }
    return ativos[0]?.id ?? null;
  }, [silos, granjaId]);
}
