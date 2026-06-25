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

export interface MdeReturnMessage {
  title: string;
  message: string;
  details?: string[];
}

export function useMde() {
  const [isLoading, setIsLoading] = useState(false);
  const [nfesRecebidas, setNfesRecebidas] = useState<NfeRecebida[]>([]);
  const [returnMessage, setReturnMessage] = useState<MdeReturnMessage | null>(null);

  const invokeAction = async (body: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke("focus-nfe-mde", { body });
    if (error) throw new Error(error.message);
    if (data && !data.success) throw new Error(data.error || "Erro desconhecido");
    return data;
  };

  const getTenantFromInscricao = async (inscricaoId: string): Promise<string | null> => {
    const { data } = await supabase
      .from("inscricoes_produtor")
      .select("granjas(tenant_id)")
      .eq("id", inscricaoId)
      .maybeSingle();
    return ((data?.granjas as any)?.tenant_id as string) ?? null;
  };

  const upsertCache = async (inscricaoId: string, items: NfeRecebida[]) => {
    if (items.length === 0) return;
    const tenantId = await getTenantFromInscricao(inscricaoId);
    if (!tenantId) return;
    const rows = items.map((n) => ({
      tenant_id: tenantId,
      inscricao_id: inscricaoId,
      chave: n.chave,
      numero: n.numero || null,
      serie: n.serie || null,
      nome: n.nome || null,
      cnpj: n.cnpj || null,
      valor: n.valor || 0,
      data_emissao: n.data_emissao || null,
      situacao: n.situacao || null,
      tipo_nfe: n.tipo_nfe || null,
      manifestacao_destinatario: n.manifestacao_destinatario || null,
    }));
    await supabase
      .from("dfe_nfes_cache" as any)
      .upsert(rows, { onConflict: "inscricao_id,chave" });
  };

  const loadCache = async (inscricaoId: string): Promise<NfeRecebida[]> => {
    const { data } = await supabase
      .from("dfe_nfes_cache" as any)
      .select("chave,numero,serie,nome,cnpj,valor,data_emissao,situacao,tipo_nfe,manifestacao_destinatario")
      .eq("inscricao_id", inscricaoId);
    return ((data as any[]) || []).map((r) => ({
      chave: r.chave,
      nome: r.nome ?? "",
      cnpj: r.cnpj ?? "",
      valor: Number(r.valor ?? 0),
      data_emissao: r.data_emissao ?? "",
      situacao: r.situacao ?? "",
      tipo_nfe: r.tipo_nfe ?? "",
      numero: r.numero ?? "",
      serie: r.serie ?? "",
      manifestacao_destinatario: r.manifestacao_destinatario ?? undefined,
    }));
  };

  const mapRaw = (r: any, fallbackChave = ""): NfeRecebida => {
    const chave = r.chave ?? r.chave_nfe ?? r.chaveNFe ?? fallbackChave;
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
  };

  const consultarDestinatarias = async (inscricaoId: string) => {
    setIsLoading(true);
    try {
      const result = await invokeAction({ action: "consultar", inscricaoId });
      const raw: any[] = Array.isArray(result.data) ? result.data : [];
      const items: NfeRecebida[] = raw.map((r) => mapRaw(r));
      // Atualiza cache com o que veio da SEFAZ
      await upsertCache(inscricaoId, items);
      // Merge com cache (NFes consultadas por chave que já saíram da janela do DFe)
      const cached = await loadCache(inscricaoId);
      const byChave = new Map<string, NfeRecebida>();
      cached.forEach((n) => byChave.set(n.chave, n));
      items.forEach((n) => byChave.set(n.chave, n)); // API prevalece
      const merged = Array.from(byChave.values()).sort((a, b) =>
        (b.data_emissao || "").localeCompare(a.data_emissao || "")
      );
      setNfesRecebidas(merged);
      if (merged.length === 0) {
        toast.info("Nenhuma NF-e destinada encontrada.");
      } else {
        toast.success(
          `${items.length} NF-e(s) retornada(s) pela SEFAZ.`,
          merged.length > items.length
            ? { description: `${merged.length} no total exibidas (incluindo ${merged.length - items.length} do cache local).` }
            : undefined
        );
      }
      return merged;
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
      const items: NfeRecebida[] = raw.map((r) => mapRaw(r, cleanChave));
      // Persiste no cache para aparecer na próxima sincronização
      await upsertCache(inscricaoId, items);
      // Merge no estado atual sem perder o que já estava listado
      setNfesRecebidas((prev) => {
        const byChave = new Map<string, NfeRecebida>();
        prev.forEach((n) => byChave.set(n.chave, n));
        items.forEach((n) => byChave.set(n.chave, n));
        return Array.from(byChave.values()).sort((a, b) =>
          (b.data_emissao || "").localeCompare(a.data_emissao || "")
        );
      });
      if (items.length === 0) {
        toast.info("NF-e não encontrada para esta chave.", {
          description: result?.warning || "Confira o CNPJ/CPF do destinatário e o ambiente (produção × homologação). A SEFAZ pode levar alguns minutos para distribuir a NF-e.",
        });
      } else {
        toast.success(
          `${items.length} NF-e localizada(s) na SEFAZ e adicionada(s) à lista.`,
          { description: "Para baixar o XML, manifeste a NF-e (Ciência da Operação) e use a opção Importar." }
        );
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
      if (!data?.success) {
        const msg = data?.error || "Erro ao baixar XML";
        setReturnMessage({
          title: "Retorno da Focus NFe",
          message: msg,
          details: [
            data?.situacao ? `Situação: ${data.situacao}` : null,
            data?.manifestacao_destinatario ? `Manifestação: ${data.manifestacao_destinatario}` : null,
            typeof data?.nfe_completa !== "undefined" ? `XML completo liberado: ${data.nfe_completa ? "Sim" : "Não"}` : null,
          ].filter(Boolean) as string[],
        });
        toast.error("XML completo não disponível", { description: "Leia o retorno completo na janela aberta." });
        return null;
      }

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
      setReturnMessage({
        title: "Retorno da Focus NFe",
        message: msg,
      });
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
    returnMessage,
    clearReturnMessage: () => setReturnMessage(null),
    consultarDestinatarias,
    consultarPorChave,
    manifestar,
    downloadXml,
    downloadDanfe,
  };
}
