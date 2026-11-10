import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTenant } from '@/hooks/useTenants';
import { definirEmpresaCabecalhoPdf } from '@/lib/pdfCabecalhoPadrao';

/** Mantém o nome da empresa ativa disponível para o cabeçalho dos PDFs. */
export function CabecalhoPdfSync() {
  const { profile } = useAuth();
  const { data: tenant } = useTenant(profile?.tenant_id ?? null);
  useEffect(() => {
    definirEmpresaCabecalhoPdf(tenant ? (tenant.nome_fantasia ? `${tenant.razao_social} (${tenant.nome_fantasia})` : tenant.razao_social) : '');
  }, [tenant]);
  return null;
}
