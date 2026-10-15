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

  /**
   * Exibe a mensagem em um popup que permanece aberto até o usuário fechar,
   * em vez de um aviso rápido (toast) que some sozinho da tela.
   */
  const notificar = (title: string, message: string, details?: string[]) => {
    setReturnMessage({ title, message, details });
  };

  /**
   * Escolhe a função de DF-e conforme o provedor fiscal do emitente da inscrição:
   * ACBr API Nuvem → acbr-api-dfe; demais (Focus NFe) → focus-nfe-mde.
   */
  const rotaDfe = async (inscricaoId: string): Promise<{ fn: string; inscricaoId: string }> => {
    // O DF-e é por CPF/CNPJ: se a IE selecionada não tem emitente ACBr, usa
    // outra IE do mesmo titular que tenha (ex.: titular com várias inscrições).
    // Consulta em dois passos: há duas ligações entre inscrições e emitentes
    // (emitente_id e inscricao_produtor_id), o que torna o join automático ambíguo.
    const ids = await getInscricoesDoTitular(inscricaoId);
    const { data: inscs, error: e1 } = await supabase
      .from("inscricoes_produtor")
      .select("id, emitente_id")
      .in("id", ids);
    if (e1) console.error("DF-e: falha ao ler inscrições do titular:", e1.message);
    const emitIds = Array.from(new Set(((inscs as any[]) || []).map((r) => r.emitente_id).filter(Boolean)));
    const { data: emits, error: e2 } = emitIds.length
      ? await supabase.from("emitentes_nfe").select("id, api_provider").in("id", emitIds)
      : { data: [], error: null };
    if (e2) console.error("DF-e: falha ao ler emitentes:", e2.message);
    const acbrEmit = new Set(((emits as any[]) || []).filter((e) => e.api_provider === "acbrapi").map((e) => e.id));
    const lista = ((inscs as any[]) || []) as Array<{ id: string; emitente_id: string | null }>;
    const ehAcbr = (r: { emitente_id: string | null }) => !!r.emitente_id && acbrEmit.has(r.emitente_id);
    const acbr = lista.find((r) => r.id === inscricaoId && ehAcbr(r)) ?? lista.find(ehAcbr);
    return acbr ? { fn: "acbr-api-dfe", inscricaoId: acbr.id } : { fn: "focus-nfe-mde", inscricaoId };
  };
  let rota: { fn: string; inscricaoId: string };

  const invokeAction = async (body: Record<string, unknown>) => {
    const rota = await rotaDfe(String(body.inscricaoId ?? ""));
    const fn = rota.fn;
    const { data, error } = await supabase.functions.invoke(fn, { body: { ...body, inscricaoId: rota.inscricaoId } });
    if (error) {
      // Extrai a mensagem real do corpo da resposta de erro
      const ctx = (error as { context?: Response }).context;
      let msg = error.message;
      try { const j = await ctx?.json(); if (j?.error) msg = j.error; } catch { /* ignore */ }
      throw new Error(msg);
    }
    if (data && !data.success) throw new Error(data.error || "Erro desconhecido");
    if (data?.warning) notificar("Aviso da SEFAZ", data.warning);
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
    // Preserva dados já gravados (nome do emitente e manifestação) quando a API
    // retorna esses campos vazios — o DFe só entrega os detalhes por ~90 dias.
    const existentes = await loadCache(inscricaoId);
    const anteriores = new Map(existentes.map((n) => [n.chave, n]));
    const rows = items.map((n) => {
      const anterior = anteriores.get(n.chave);
      return {
        tenant_id: tenantId,
        inscricao_id: inscricaoId,
        chave: n.chave,
        numero: n.numero || anterior?.numero || null,
        serie: n.serie || anterior?.serie || null,
        nome: n.nome || anterior?.nome || null,
        cnpj: n.cnpj || anterior?.cnpj || null,
        valor: n.valor || anterior?.valor || 0,
        data_emissao: n.data_emissao || anterior?.data_emissao || null,
        situacao: n.situacao || anterior?.situacao || null,
        tipo_nfe: n.tipo_nfe || anterior?.tipo_nfe || null,
        manifestacao_destinatario:
          n.manifestacao_destinatario || anterior?.manifestacao_destinatario || null,
      };
    });
    // Deduplica por chave: a SEFAZ pode devolver a mesma NF-e mais de uma vez
    // (resumo + completa / eventos). Chaves repetidas no mesmo upsert fazem o
    // banco rejeitar o lote inteiro e nada era gravado.
    const porChave = new Map<string, (typeof rows)[number]>();
    for (const r of rows) {
      if (!r.chave) continue;
      const ant = porChave.get(r.chave);
      porChave.set(r.chave, ant ? {
        ...ant,
        ...Object.fromEntries(Object.entries(r).filter(([, v]) => v !== null && v !== "" && v !== 0)),
      } as typeof r : r);
    }
    const unicos = Array.from(porChave.values());
    for (let i = 0; i < unicos.length; i += 500) {
      const { error } = await supabase
        .from("dfe_nfes_cache" as any)
        .upsert(unicos.slice(i, i + 500), { onConflict: "inscricao_id,chave" });
      if (error) {
        console.error("Falha ao gravar NF-es recebidas:", error.message);
        notificar("Não foi possível gravar as NF-es sincronizadas", error.message);
        return;
      }
    }
  };


  /**
   * Retorna os ids das inscrições do mesmo titular (mesmo CPF/CNPJ) dentro da
   * mesma empresa. As consultas de DFe na SEFAZ são feitas pelo documento do
   * titular, portanto as notas pertencem a ele e não a uma única IE.
   */
  const getInscricoesDoTitular = async (inscricaoId: string): Promise<string[]> => {
    const { data: atual } = await supabase
      .from("inscricoes_produtor")
      .select("id,cpf_cnpj,produtor_id")
      .eq("id", inscricaoId)
      .maybeSingle();
    const doc = (atual?.cpf_cnpj || "").replace(/\D/g, "");
    if (!doc) return [inscricaoId];
    const { data: irmas } = await supabase
      .from("inscricoes_produtor")
      .select("id,cpf_cnpj")
      .eq("produtor_id", atual?.produtor_id ?? "");
    const ids = ((irmas as any[]) || [])
      .filter((r) => (r.cpf_cnpj || "").replace(/\D/g, "") === doc)
      .map((r) => r.id as string);
    return ids.length > 0 ? Array.from(new Set([inscricaoId, ...ids])) : [inscricaoId];
  };

  const loadCache = async (inscricaoId: string): Promise<NfeRecebida[]> => {
    // As NF-es recebidas são distribuídas pela SEFAZ por CPF/CNPJ do titular,
    // então exibimos as notas de todas as inscrições do mesmo documento.
    const ids = await getInscricoesDoTitular(inscricaoId);
    const { data } = await supabase
      .from("dfe_nfes_cache" as any)
      .select("chave,numero,serie,nome,cnpj,valor,data_emissao,situacao,tipo_nfe,manifestacao_destinatario,inscricao_id")
      .in("inscricao_id", ids);
    const porChave = new Map<string, any>();
    ((data as any[]) || []).forEach((r) => {
      const anterior = porChave.get(r.chave);
      // Prioriza o registro da inscrição selecionada e o que tem manifestação
      const prefere =
        !anterior ||
        (r.inscricao_id === inscricaoId && !anterior.manifestacao_destinatario) ||
        (!anterior.manifestacao_destinatario && !!r.manifestacao_destinatario);
      if (prefere) porChave.set(r.chave, r);
    });
    return Array.from(porChave.values()).map((r) => ({
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
      manifestacao_destinatario:
        r.manifestacao_destinatario ??
        r.ultima_manifestacao ??
        r.manifesto ??
        r.tipo_manifestacao ??
        undefined,

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
      items.forEach((n) => {
        const anterior = byChave.get(n.chave);
        byChave.set(n.chave, {
          ...n,
          manifestacao_destinatario:
            n.manifestacao_destinatario || anterior?.manifestacao_destinatario,
        });
      }); // API prevalece, exceto quando omite a manifestação já confirmada
      const merged = Array.from(byChave.values()).sort((a, b) =>
        (b.data_emissao || "").localeCompare(a.data_emissao || "")
      );
      setNfesRecebidas(merged);
      if (merged.length === 0) {
        notificar("Sincronização concluída", "Nenhuma NF-e destinada encontrada.");
      } else {
        notificar(
          "Sincronização concluída",
          `${items.length} NF-e(s) retornada(s) pela SEFAZ.`,
          merged.length > items.length
            ? [`${merged.length} no total exibidas (incluindo ${merged.length - items.length} do cache local).`]
            : undefined
        );
      }
      return merged;
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Erro desconhecido";
      notificar("Erro ao consultar NF-es destinadas", msg);
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
        notificar("Chave de acesso inválida", "A chave deve conter 44 dígitos.");
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
        items.forEach((n) => {
          const anterior = byChave.get(n.chave);
          byChave.set(n.chave, {
            ...n,
            manifestacao_destinatario:
              n.manifestacao_destinatario || anterior?.manifestacao_destinatario,
          });
        });
        return Array.from(byChave.values()).sort((a, b) =>
          (b.data_emissao || "").localeCompare(a.data_emissao || "")
        );
      });
      if (items.length === 0) {
        notificar(
          "NF-e não encontrada para esta chave",
          result?.warning || "Confira o CNPJ/CPF do destinatário e o ambiente (produção × homologação). A SEFAZ pode levar alguns minutos para distribuir a NF-e."
        );
      } else {
        notificar(
          "Consulta por chave concluída",
          `${items.length} NF-e localizada(s) na SEFAZ e adicionada(s) à lista.`,
          ["Para baixar o XML, manifeste a NF-e (Ciência da Operação) e use a opção Importar."]
        );
      }
      return items;
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Erro desconhecido";
      notificar("Erro ao consultar por chave", msg);
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

      // Persiste imediatamente a manifestação: notas fora da janela do DFe
      // (~90 dias) não voltam na listagem geral e ficariam eternamente "pendentes".
      // Aplica em todas as inscrições do mesmo titular (a nota pode estar gravada em outra IE).
      const idsTitular = await getInscricoesDoTitular(inscricaoId);
      const { error: erroCache } = await supabase
        .from("dfe_nfes_cache" as any)
        .update({ manifestacao_destinatario: tipo })
        .in("inscricao_id", idsTitular)
        .eq("chave", chave);
      if (erroCache) {
        console.error("Falha ao gravar manifestação no cache do DFe:", erroCache.message);
      }

      setNfesRecebidas((prev) =>
        prev.map((n) => (n.chave === chave ? { ...n, manifestacao_destinatario: tipo } : n))
      );

      notificar("Manifestação registrada", `Manifestação "${labels[tipo] || tipo}" registrada com sucesso!`);
      return true;
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Erro desconhecido";
      notificar("Erro ao manifestar", msg);
      return false;

    } finally {
      setIsLoading(false);
    }
  };

  const downloadXml = async (inscricaoId: string, chave: string): Promise<string | null> => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke((rota = await rotaDfe(inscricaoId)).fn, {
        body: { action: "download_xml", inscricaoId: rota.inscricaoId, chave },
      });
      if (error) throw new Error(error.message);
      if (!data?.success) {
        const msg = data?.error || "Erro ao baixar XML";
        setReturnMessage({
          title: "Retorno do provedor fiscal",
          message: msg,
          details: [
            data?.situacao ? `Situação: ${data.situacao}` : null,
            data?.manifestacao_destinatario ? `Manifestação: ${data.manifestacao_destinatario}` : null,
            typeof data?.nfe_completa !== "undefined" ? `XML completo liberado: ${data.nfe_completa ? "Sim" : "Não"}` : null,
          ].filter(Boolean) as string[],
        });
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
      notificar("Erro ao baixar XML", msg);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const downloadDanfe = async (inscricaoId: string, chave: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke((rota = await rotaDfe(inscricaoId)).fn, {
        body: { action: "download_danfe", inscricaoId: rota.inscricaoId, chave },
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
      notificar("Erro ao baixar DANFe", msg);
    } finally {
      setIsLoading(false);
    }
  };

  const carregarCache = async (inscricaoId: string) => {
    if (!inscricaoId) return [] as NfeRecebida[];
    const cached = await loadCache(inscricaoId);
    const sorted = cached.sort((a, b) => (b.data_emissao || "").localeCompare(a.data_emissao || ""));
    setNfesRecebidas(sorted);
    return sorted;
  };

  return {
    isLoading,
    nfesRecebidas,
    returnMessage,
    clearReturnMessage: () => setReturnMessage(null),
    consultarDestinatarias,
    consultarPorChave,
    carregarCache,
    manifestar,
    downloadXml,
    downloadDanfe,
  };
}
