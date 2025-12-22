import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { mapNotaToFocusNfe, validateNotaForEmission, type NotaFiscalData, type NotaFiscalItemData } from "@/lib/focusNfeMapper";

export interface FocusNfeResult {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
  details?: Record<string, unknown>;
  ref?: string;
}

export function useFocusNfe() {
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const emitirNfe = async (
    notaFiscalId: string,
    notaData: NotaFiscalData,
    itens: NotaFiscalItemData[]
  ): Promise<FocusNfeResult> => {
    setIsLoading(true);
    setStatus("validando");

    try {
      // Validar dados
      const validationErrors = validateNotaForEmission(notaData, itens);
      if (validationErrors.length > 0) {
        toast.error("Erros de validação", {
          description: validationErrors.join("\n"),
        });
        return {
          success: false,
          error: "Erros de validação",
          details: { errors: validationErrors },
        };
      }

      setStatus("mapeando");

      // Buscar numero e serie da nota fiscal do banco para garantir que estamos usando os valores corretos
      const { data: notaCompleta, error: notaError } = await supabase
        .from("notas_fiscais")
        .select("numero, serie")
        .eq("id", notaFiscalId)
        .single();

      if (notaError) {
        console.warn("Aviso: não foi possível buscar numero/serie da nota:", notaError.message);
      }

      // Garantir que notaData tenha numero e serie do banco
      const notaDataComNumero: NotaFiscalData = {
        ...notaData,
        numero: notaCompleta?.numero ?? notaData.numero,
        serie: notaCompleta?.serie ?? notaData.serie,
      };

      console.log("Emitindo NFe com numero:", notaDataComNumero.numero, "serie:", notaDataComNumero.serie);

      // Mapear para formato Focus NFe
      const focusNfeData = mapNotaToFocusNfe(notaDataComNumero, itens);

      setStatus("enviando");

      // Enviar para edge function
      const { data, error } = await supabase.functions.invoke("focus-nfe-emitir", {
        body: {
          notaFiscalId,
          notaData: focusNfeData,
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data.success) {
        setStatus("erro");
        toast.error("Erro ao emitir NF-e", {
          description: data.error || "Erro desconhecido",
        });
        return data;
      }

      setStatus("processando");
      toast.success("NF-e enviada para processamento", {
        description: "Aguarde a autorização da SEFAZ",
      });

      return data;
    } catch (error) {
      setStatus("erro");
      const message = error instanceof Error ? error.message : "Erro desconhecido";
      toast.error("Erro ao emitir NF-e", { description: message });
      return { success: false, error: message };
    } finally {
      setIsLoading(false);
    }
  };

  const consultarNfe = async (
    ref: string,
    notaFiscalId?: string
  ): Promise<FocusNfeResult> => {
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("focus-nfe-consultar", {
        body: { ref, notaFiscalId },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data.success && data.data) {
        setStatus(data.data.status);
      }

      return data;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro desconhecido";
      toast.error("Erro ao consultar NF-e", { description: message });
      return { success: false, error: message };
    } finally {
      setIsLoading(false);
    }
  };

  const cancelarNfe = async (
    ref: string,
    notaFiscalId: string,
    justificativa: string
  ): Promise<FocusNfeResult> => {
    setIsLoading(true);

    try {
      if (justificativa.length < 15) {
        toast.error("Justificativa deve ter no mínimo 15 caracteres");
        return {
          success: false,
          error: "Justificativa deve ter no mínimo 15 caracteres",
        };
      }

      const { data, error } = await supabase.functions.invoke("focus-nfe-cancelar", {
        body: { ref, notaFiscalId, justificativa },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data.success) {
        toast.success("NF-e cancelada com sucesso");
        setStatus("cancelada");
      } else {
        toast.error("Erro ao cancelar NF-e", {
          description: data.error,
        });
      }

      return data;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro desconhecido";
      toast.error("Erro ao cancelar NF-e", { description: message });
      return { success: false, error: message };
    } finally {
      setIsLoading(false);
    }
  };

  const emitirCartaCorrecao = async (
    ref: string,
    notaFiscalId: string,
    correcao: string
  ): Promise<FocusNfeResult> => {
    setIsLoading(true);

    try {
      if (correcao.length < 15) {
        toast.error("Correção deve ter no mínimo 15 caracteres");
        return {
          success: false,
          error: "Correção deve ter no mínimo 15 caracteres",
        };
      }

      const { data, error } = await supabase.functions.invoke(
        "focus-nfe-carta-correcao",
        {
          body: { ref, notaFiscalId, correcao },
        }
      );

      if (error) {
        throw new Error(error.message);
      }

      if (data.success) {
        toast.success("Carta de correção emitida com sucesso");
      } else {
        toast.error("Erro ao emitir carta de correção", {
          description: data.error,
        });
      }

      return data;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro desconhecido";
      toast.error("Erro ao emitir carta de correção", { description: message });
      return { success: false, error: message };
    } finally {
      setIsLoading(false);
    }
  };

  const downloadArquivo = async (
    ref: string,
    tipo: "xml" | "danfe" | "xml_cancelamento",
    notaFiscalId: string
  ): Promise<void> => {
    setIsLoading(true);

    // Abrir janela ANTES do await para evitar bloqueio de pop-up
    let pdfWindow: Window | null = null;
    if (tipo === "danfe") {
      pdfWindow = window.open("", "_blank");
      if (pdfWindow) {
        pdfWindow.document.write(
          '<html><head><title>Carregando DANFE...</title></head><body style="margin:0;display:flex;justify-content:center;align-items:center;height:100vh;font-family:sans-serif;background:#f5f5f5;"><p>Carregando DANFE...</p></body></html>'
        );
      }
    }

    try {
      const { data, error } = await supabase.functions.invoke("focus-nfe-download", {
        body: { ref, tipo, notaFiscalId },
      });

      if (error) {
        throw new Error(error.message);
      }

      // Se retornou erro no JSON
      if (data && typeof data === "object" && "error" in data) {
        throw new Error(data.error as string);
      }

      // Criar blob
      const blob = new Blob([data], {
        type: tipo === "danfe" ? "application/pdf" : "application/xml",
      });

      const url = window.URL.createObjectURL(blob);

      // Para PDF (DANFE), atualizar a janela já aberta; para XML, fazer download
      if (tipo === "danfe") {
        if (pdfWindow) {
          pdfWindow.location.href = url;
          toast.success("DANFE aberto em nova aba");
        } else {
          // Fallback se janela foi bloqueada - fazer download
          const a = document.createElement("a");
          a.href = url;
          a.download = `danfe_${ref}.pdf`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          toast.success("Download do DANFE iniciado");
        }
      } else {
        const a = document.createElement("a");
        a.href = url;
        a.download =
          tipo === "xml_cancelamento"
            ? `nfe_cancelamento_${ref}.xml`
            : `nfe_${ref}.xml`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        toast.success("Download iniciado");
      }

      // Revogar URL após um delay para permitir visualização/download
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
      }, 5000);
    } catch (error) {
      // Fechar janela em branco se houver erro
      if (pdfWindow) {
        pdfWindow.close();
      }
      const message = error instanceof Error ? error.message : "Erro desconhecido";
      toast.error("Erro ao baixar arquivo", { description: message });
    } finally {
      setIsLoading(false);
    }
  };

  // Polling para acompanhar status
  const pollStatus = async (
    ref: string,
    notaFiscalId: string,
    maxAttempts = 20,
    intervalMs = 5000
  ): Promise<FocusNfeResult> => {
    let attempts = 0;

    const poll = async (): Promise<FocusNfeResult> => {
      attempts++;
      const result = await consultarNfe(ref, notaFiscalId);

      if (!result.success) {
        return result;
      }

      const currentStatus = (result.data as Record<string, unknown>)?.status as string;

      // Status finais (incluindo erro_autorizacao)
      if (["autorizado", "autorizada", "cancelado", "cancelada", "rejeitado", "rejeitada", "erro_autorizacao"].includes(currentStatus)) {
        if (currentStatus === "autorizado" || currentStatus === "autorizada") {
          toast.success("NF-e autorizada pela SEFAZ!");
        } else if (currentStatus === "rejeitado" || currentStatus === "rejeitada" || currentStatus === "erro_autorizacao") {
          const motivo = (result.data as Record<string, unknown>)?.mensagem_sefaz as string || 
                         (result.data as Record<string, unknown>)?.motivo_status as string;
          toast.error("NF-e rejeitada pela SEFAZ", { description: motivo });
        }
        return result;
      }

      // Continuar polling se ainda está processando
      if (attempts < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, intervalMs));
        return poll();
      }

      return result;
    };

    return poll();
  };

  return {
    isLoading,
    status,
    emitirNfe,
    consultarNfe,
    cancelarNfe,
    emitirCartaCorrecao,
    downloadArquivo,
    pollStatus,
  };
}
