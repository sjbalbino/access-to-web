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

  const consultarDestinatarias = async (inscricaoId: string) => {
    setIsLoading(true);
    try {
      const result = await invokeAction({ action: "consultar", inscricaoId });
      const raw: any[] = Array.isArray(result.data) ? result.data : [];
      const items: NfeRecebida[] = raw.map((r) => {
        const chave = r.chave ?? r.chave_nfe ?? r.chaveNFe ?? "";
        const cd = String(chave || "").replace(/\D/g, "");
        const serieFromChave = cd.length === 44 ? String(parseInt(cd.slice(22, 25), 10)) : "";
        const numeroFromChave = cd.length === 44 ? String(parseInt(cd.slice(25, 34), 10)) : "";
        return {
          chave,
          nome: r.nome ?? r.emitente_nome ?? r.razao_social_emitente ?? r.emitente_razao_social ?? r.emitente?.nome ?? "",
          cnpj: r.cnpj ?? r.cnpj_emitente ?? r.emitente_cnpj ?? r.cnpj_cpf_emitente ?? r.emitente?.cnpj ?? "",
          valor: Number(r.valor ?? r.valor_total ?? r.valor_nfe ?? r.valor_total_nota ?? 0),
          data_emissao: r.data_emissao ?? r.dataEmissao ?? r.data_emissao_nfe ?? r.dh_emissao ?? "",
          situacao: r.situacao ?? r.status ?? "",
          tipo_nfe: r.tipo_nfe ?? r.tipo ?? "",
          numero: String(r.numero ?? r.numero_nfe ?? r.numero_nfe_recebida ?? r.numero_nota ?? numeroFromChave ?? ""),
          serie: String(r.serie ?? r.serie_nfe ?? r.serie_nota ?? serieFromChave ?? ""),
          manifestacao_destinatario: r.manifestacao_destinatario ?? r.ultima_manifestacao ?? undefined,
        };
      });
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
  const consultarPorChave = async (inscricaoId: string, chave: string) => {
    setIsLoading(true);
    try {
      const cleanChave = (chave || "").replace(/\D/g, "");
      if (cleanChave.length !== 44) {
        toast.error("Chave de acesso inválida", { description: "A chave deve conter 44 dígitos." });
        return [];
      }
      const result = await invokeAction({ action: "consultar_chave", inscricaoId, chave: cleanChave });
      const raw: any[] = Array.isArray(result.data) ? result.data : [];
      const items: NfeRecebida[] = raw.map((r) => {
        const chave = r.chave ?? r.chave_nfe ?? r.chaveNFe ?? cleanChave;
        const cd = String(chave || "").replace(/\D/g, "");
        const serieFromChave = cd.length === 44 ? String(parseInt(cd.slice(22, 25), 10)) : "";
        const numeroFromChave = cd.length === 44 ? String(parseInt(cd.slice(25, 34), 10)) : "";
        return {
          chave,
          nome: r.nome ?? r.emitente_nome ?? r.razao_social_emitente ?? r.emitente_razao_social ?? r.emitente?.nome ?? "",
          cnpj: r.cnpj ?? r.cnpj_emitente ?? r.emitente_cnpj ?? r.cnpj_cpf_emitente ?? r.emitente?.cnpj ?? "",
          valor: Number(r.valor ?? r.valor_total ?? r.valor_nfe ?? r.valor_total_nota ?? 0),
          data_emissao: r.data_emissao ?? r.dataEmissao ?? r.data_emissao_nfe ?? r.dh_emissao ?? "",
          situacao: r.situacao ?? r.status ?? "",
          tipo_nfe: r.tipo_nfe ?? r.tipo ?? "",
          numero: String(r.numero ?? r.numero_nfe ?? r.numero_nfe_recebida ?? r.numero_nota ?? numeroFromChave ?? ""),
          serie: String(r.serie ?? r.serie_nfe ?? r.serie_nota ?? serieFromChave ?? ""),
          manifestacao_destinatario: r.manifestacao_destinatario ?? r.ultima_manifestacao ?? undefined,
        };
      });
      setNfesRecebidas(items);
      if (items.length === 0) {
        toast.info("NF-e não encontrada para esta chave.");
      } else {
        toast.success("NF-e encontrada!");
      }
      return items;
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Erro desconhecido";
      toast.error("Erro ao consultar por chave", { description: msg });
      return [];
    } finally {
      setIsLoading(false);
    }
  };


  const manifestar = async (inscricaoId: string, chave: string, tipo: string) => {
    setIsLoading(true);
    try {
      await invokeAction({ action: "manifestar", inscricaoId, chave, tipo });
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

  const downloadXml = async (inscricaoId: string, chave: string): Promise<string | null> => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("focus-nfe-mde", {
        body: { action: "download_xml", inscricaoId, chave },
      });
      if (error) throw new Error(error.message);
      if (!data?.success) throw new Error(data?.error || "Erro ao baixar XML");

      const xmlText = data.xml;

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

  const downloadDanfe = async (inscricaoId: string, chave: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("focus-nfe-mde", {
        body: { action: "download_danfe", inscricaoId, chave },
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
    consultarPorChave,
    manifestar,
    downloadXml,
    downloadDanfe,
  };
}
