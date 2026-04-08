import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface NfeRecebida {
  chave: string;
  nome: string;
  cnpj: string;
  valor: number;
  data_emissao: string;
  situacao: string;
  tipo_nfe: string;
  numero: string;
  serie: string;
  manifestacao_destinatario?: string;
}

export function useMde() {
  const [isLoading, setIsLoading] = useState(false);
  const [nfesRecebidas, setNfesRecebidas] = useState<NfeRecebida[]>([]);

  const invokeAction = async (body: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke("focus-nfe-mde", { body });
    if (error) throw new Error(error.message);
    if (data && !data.success) throw new Error(data.error || "Erro desconhecido");
    return data;
  };

  const consultarDestinatarias = async (granjaId: string) => {
    setIsLoading(true);
    try {
      const result = await invokeAction({ action: "consultar", granjaId });
      const items: NfeRecebida[] = Array.isArray(result.data) ? result.data : [];
      setNfesRecebidas(items);
      if (items.length === 0) {
        toast.info("Nenhuma NF-e destinada encontrada.");
      } else {
        toast.success(`${items.length} NF-e(s) encontrada(s).`);
      }
      return items;
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Erro desconhecido";
      toast.error("Erro ao consultar NF-es destinadas", { description: msg });
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  const manifestar = async (granjaId: string, chave: string, tipo: string) => {
    setIsLoading(true);
    try {
      await invokeAction({ action: "manifestar", granjaId, chave, tipo });
      const labels: Record<string, string> = {
        ciencia: "Ciência da Operação",
        confirmacao: "Confirmação da Operação",
        desconhecimento: "Desconhecimento da Operação",
        nao_realizada: "Operação Não Realizada",
      };
      toast.success(`Manifestação "${labels[tipo] || tipo}" registrada com sucesso!`);
      return true;
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Erro desconhecido";
      toast.error("Erro ao manifestar", { description: msg });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const downloadXml = async (granjaId: string, chave: string): Promise<string | null> => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("focus-nfe-mde", {
        body: { action: "download_xml", granjaId, chave },
      });
      if (error) throw new Error(error.message);

      // The response is XML text
      const xmlText = typeof data === "string" ? data : new TextDecoder().decode(data);

      // Trigger download
      const blob = new Blob([xmlText], { type: "application/xml" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `nfe_${chave}.xml`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => window.URL.revokeObjectURL(url), 3000);

      toast.success("Download do XML iniciado");
      return xmlText;
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Erro desconhecido";
      toast.error("Erro ao baixar XML", { description: msg });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const downloadDanfe = async (granjaId: string, chave: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("focus-nfe-mde", {
        body: { action: "download_danfe", granjaId, chave },
      });
      if (error) throw new Error(error.message);

      const blob = new Blob([data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `danfe_${chave}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => window.URL.revokeObjectURL(url), 3000);

      toast.success("Download do DANFe iniciado");
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Erro desconhecido";
      toast.error("Erro ao baixar DANFe", { description: msg });
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    nfesRecebidas,
    consultarDestinatarias,
    manifestar,
    downloadXml,
    downloadDanfe,
  };
}
