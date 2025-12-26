import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, CheckCircle2, XCircle, AlertCircle, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useFocusNfe } from "@/hooks/useFocusNfe";
import type { NotaFiscalData, NotaFiscalItemData } from "@/lib/focusNfeMapper";
import { DevolucaoDeposito, useUpdateDevolucao } from "@/hooks/useDevolucoes";
import { formatNumber } from "@/lib/formatters";

interface EmitirNfeDevolucaoDialogProps {
  devolucao: DevolucaoDeposito | null;
  onClose: () => void;
  onSuccess: () => void;
}

type EmissionStep = "idle" | "loading_data" | "creating_nfe" | "creating_item" | "sending" | "polling" | "success" | "error";

interface EmissionStatus {
  step: EmissionStep;
  message: string;
  progress: number;
  details?: string;
  notaFiscalId?: string;
}

export function EmitirNfeDevolucaoDialog({
  devolucao,
  onClose,
  onSuccess,
}: EmitirNfeDevolucaoDialogProps) {
  const navigate = useNavigate();
  const [status, setStatus] = useState<EmissionStatus>({
    step: "idle",
    message: "",
    progress: 0,
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const updateDevolucao = useUpdateDevolucao();
  const focusNfe = useFocusNfe();

  const cleanDigits = (value: string | null | undefined, maxLen?: number): string | null => {
    if (!value) return null;
    const digits = value.replace(/\D/g, "");
    const trimmed = maxLen ? digits.slice(0, maxLen) : digits;
    return trimmed.length ? trimmed : null;
  };

  const handleEmitir = async () => {
    if (!devolucao) return;

    setIsProcessing(true);
    setStatus({ step: "loading_data", message: "Carregando dados...", progress: 10 });

    try {
      // 1. Buscar dados completos necessários para a NFe
      setStatus({ step: "loading_data", message: "Buscando dados da devolução...", progress: 15 });

      // Buscar inscrição do emitente com dados completos
      const { data: inscricaoEmitente, error: inscricaoEmitenteError } = await supabase
        .from("inscricoes_produtor")
        .select(`
          *,
          produtores(nome),
          granjas(id, razao_social, nome_fantasia)
        `)
        .eq("id", devolucao.inscricao_emitente_id)
        .single();

      if (inscricaoEmitenteError || !inscricaoEmitente) {
        throw new Error("Inscrição do emitente não encontrada");
      }

      // Buscar inscrição do produtor (destinatário) com dados completos
      const { data: inscricaoProdutor, error: inscricaoProdutorError } = await supabase
        .from("inscricoes_produtor")
        .select(`
          *,
          produtores(nome)
        `)
        .eq("id", devolucao.inscricao_produtor_id)
        .single();

      if (inscricaoProdutorError || !inscricaoProdutor) {
        throw new Error("Inscrição do produtor (destinatário) não encontrada");
      }

      // Buscar emitente pela granja
      const { data: emitente, error: emitenteError } = await supabase
        .from("emitentes_nfe")
        .select("*")
        .eq("granja_id", devolucao.granja_id)
        .eq("ativo", true)
        .single();

      if (emitenteError || !emitente) {
        throw new Error("Configuração de API (Emitente) não encontrada para esta granja. Cadastre um emitente.");
      }

      if (!emitente.api_configurada) {
        throw new Error("Configure a API do emitente antes de emitir NFe.");
      }

      // Buscar CFOP 5906 - Retorno de mercadoria depositada em depósito fechado ou armazém geral
      const ufDestino = inscricaoProdutor.uf;
      const ufEmitente = inscricaoEmitente.uf;
      const cfopCodigo = ufDestino === ufEmitente ? "5906" : "6906";

      const { data: cfop, error: cfopError } = await supabase
        .from("cfops")
        .select("*")
        .eq("codigo", cfopCodigo)
        .eq("ativo", true)
        .single();

      if (cfopError || !cfop) {
        throw new Error(`CFOP ${cfopCodigo} não encontrado ou inativo. Cadastre o CFOP de retorno de depósito.`);
      }

      // Buscar produto completo
      const { data: produto, error: produtoError } = await supabase
        .from("produtos")
        .select("*, unidades_medida(*)")
        .eq("id", devolucao.produto_id)
        .single();

      if (produtoError || !produto) {
        throw new Error("Produto da devolução não encontrado.");
      }

      setStatus({ step: "creating_nfe", message: "Verificando numeração...", progress: 25 });

      // 2. Buscar próximo número de NFe disponível para o emitente/série
      const serieNfe = emitente.serie_nfe || 1;
      
      // Buscar o maior número já usado para este emitente/série
      const { data: ultimaNfe } = await supabase
        .from("notas_fiscais")
        .select("numero")
        .eq("emitente_id", emitente.id)
        .eq("serie", serieNfe)
        .not("numero", "is", null)
        .order("numero", { ascending: false })
        .limit(1)
        .single();

      // Usar o maior entre: último número no banco OU numero_atual_nfe do emitente
      const ultimoNumeroUsado = Math.max(
        ultimaNfe?.numero || 0,
        emitente.numero_atual_nfe || 0
      );
      const proximoNumero = ultimoNumeroUsado + 1;

      console.log("Próximo número NFe:", proximoNumero, "Série:", serieNfe);

      // IMPORTANTE: Atualizar numero_atual_nfe ANTES de criar a nota para reservar o número
      const { error: updateNumeroError } = await supabase
        .from("emitentes_nfe")
        .update({ numero_atual_nfe: proximoNumero })
        .eq("id", emitente.id);

      if (updateNumeroError) {
        console.warn("Aviso: não foi possível atualizar numero_atual_nfe:", updateNumeroError.message);
      }

      setStatus({ step: "creating_nfe", message: "Criando nota fiscal...", progress: 30 });

      // 3. Criar a nota fiscal
      const valorTotal = devolucao.valor_total || (devolucao.quantidade_kg * (devolucao.valor_unitario || 0));
      const kgNota = devolucao.quantidade_kg;

      // Montar informações complementares
      const infoComplementarParts: string[] = [];
      infoComplementarParts.push(`Devolução de Depósito Cód. ${devolucao.codigo}`);
      if (devolucao.taxa_armazenagem && devolucao.taxa_armazenagem > 0) {
        infoComplementarParts.push(`Taxa de Armazenagem: ${devolucao.taxa_armazenagem}% (${formatNumber(devolucao.kg_taxa_armazenagem || 0, 3)} kg)`);
      }
      if (devolucao.observacao) {
        infoComplementarParts.push(`Obs: ${devolucao.observacao}`);
      }

      const notaFiscalData = {
        emitente_id: emitente.id,
        granja_id: devolucao.granja_id,
        inscricao_produtor_id: devolucao.inscricao_emitente_id,
        natureza_operacao: cfop.natureza_operacao || "RETORNO DE MERCADORIA DEPOSITADA",
        data_emissao: new Date().toISOString().split("T")[0],
        operacao: 1, // Saída
        finalidade: 1, // Normal
        cfop_id: cfop.id,
        numero: proximoNumero,
        serie: serieNfe,
        // Destinatário = Produtor
        dest_tipo: (inscricaoProdutor.cpf_cnpj?.length || 0) > 11 ? "PJ" : "PF",
        dest_cpf_cnpj: cleanDigits(inscricaoProdutor.cpf_cnpj, 14),
        dest_nome: inscricaoProdutor.produtores?.nome || "PRODUTOR",
        dest_ie: cleanDigits(inscricaoProdutor.inscricao_estadual, 14),
        dest_email: inscricaoProdutor.email || null,
        dest_telefone: cleanDigits(inscricaoProdutor.telefone, 14),
        dest_logradouro: inscricaoProdutor.logradouro,
        dest_numero: inscricaoProdutor.numero,
        dest_complemento: inscricaoProdutor.complemento,
        dest_bairro: inscricaoProdutor.bairro,
        dest_cidade: inscricaoProdutor.cidade,
        dest_uf: inscricaoProdutor.uf,
        dest_cep: cleanDigits(inscricaoProdutor.cep, 8),
        ind_consumidor_final: 0,
        ind_presenca: 9, // Não se aplica
        modalidade_frete: 9, // Sem frete
        forma_pagamento: 1, // A prazo
        tipo_pagamento: "90", // Sem pagamento
        info_complementar: infoComplementarParts.join(". ") + ".",
        status: "rascunho",
        total_produtos: valorTotal,
        total_nota: valorTotal,
        valor_pagamento: valorTotal,
        volumes_quantidade: 1,
        volumes_especie: "GRANEL",
        volumes_peso_bruto: kgNota,
        volumes_peso_liquido: kgNota,
      };

      const { data: notaFiscal, error: nfError } = await supabase
        .from("notas_fiscais")
        .insert(notaFiscalData)
        .select()
        .single();

      if (nfError || !notaFiscal) {
        throw new Error(`Erro ao criar nota fiscal: ${nfError?.message}`);
      }

      setStatus({ step: "creating_item", message: "Adicionando item à nota...", progress: 45, notaFiscalId: notaFiscal.id });

      // 4. Criar o item da nota fiscal
      const itemData = {
        nota_fiscal_id: notaFiscal.id,
        numero_item: 1,
        produto_id: produto.id,
        codigo: produto.codigo || "0001",
        descricao: produto.nome,
        ncm: produto.ncm || "10019100",
        cfop: cfop.codigo,
        unidade: produto.unidades_medida?.sigla || produto.unidades_medida?.codigo || "KG",
        quantidade: kgNota,
        valor_unitario: devolucao.valor_unitario || 0,
        valor_total: valorTotal,
        valor_desconto: 0,
        origem: 0, // Nacional
        cst_icms: produto.cst_icms || cfop.cst_icms_padrao || emitente.cst_icms_padrao || "00",
        aliq_icms: emitente.aliq_icms_padrao || 0,
        base_icms: valorTotal,
        valor_icms: valorTotal * ((emitente.aliq_icms_padrao || 0) / 100),
        cst_pis: produto.cst_pis || cfop.cst_pis_padrao || emitente.cst_pis_padrao || "01",
        aliq_pis: emitente.aliq_pis_padrao || 0,
        base_pis: valorTotal,
        valor_pis: valorTotal * ((emitente.aliq_pis_padrao || 0) / 100),
        cst_cofins: produto.cst_cofins || cfop.cst_cofins_padrao || emitente.cst_cofins_padrao || "01",
        aliq_cofins: emitente.aliq_cofins_padrao || 0,
        base_cofins: valorTotal,
        valor_cofins: valorTotal * ((emitente.aliq_cofins_padrao || 0) / 100),
      };

      const { error: itemError } = await supabase
        .from("notas_fiscais_itens")
        .insert(itemData);

      if (itemError) {
        throw new Error(`Erro ao criar item da nota: ${itemError.message}`);
      }

      setStatus({ step: "sending", message: "Enviando para SEFAZ...", progress: 60, notaFiscalId: notaFiscal.id });

      // 5. Preparar dados para emissão
      const notaDataForEmission: NotaFiscalData = {
        id: notaFiscal.id,
        data_emissao: notaFiscalData.data_emissao,
        natureza_operacao: notaFiscalData.natureza_operacao,
        operacao: notaFiscalData.operacao,
        finalidade: notaFiscalData.finalidade,
        ind_consumidor_final: notaFiscalData.ind_consumidor_final,
        ind_presenca: notaFiscalData.ind_presenca,
        modalidade_frete: notaFiscalData.modalidade_frete,
        forma_pagamento: notaFiscalData.forma_pagamento,
        info_complementar: notaFiscalData.info_complementar,
        info_fisco: null,
        dest_cpf_cnpj: notaFiscalData.dest_cpf_cnpj,
        dest_nome: notaFiscalData.dest_nome,
        dest_ie: notaFiscalData.dest_ie,
        dest_logradouro: notaFiscalData.dest_logradouro,
        dest_numero: notaFiscalData.dest_numero,
        dest_bairro: notaFiscalData.dest_bairro,
        dest_cidade: notaFiscalData.dest_cidade,
        dest_uf: notaFiscalData.dest_uf,
        dest_cep: notaFiscalData.dest_cep,
        dest_tipo: notaFiscalData.dest_tipo,
        dest_email: notaFiscalData.dest_email,
        dest_telefone: notaFiscalData.dest_telefone,
        inscricaoProdutor: {
          cpf_cnpj: inscricaoEmitente.cpf_cnpj,
          inscricao_estadual: inscricaoEmitente.inscricao_estadual,
          logradouro: inscricaoEmitente.logradouro,
          numero: inscricaoEmitente.numero,
          complemento: inscricaoEmitente.complemento,
          bairro: inscricaoEmitente.bairro,
          cidade: inscricaoEmitente.cidade,
          uf: inscricaoEmitente.uf,
          cep: inscricaoEmitente.cep,
          produtorNome: inscricaoEmitente.produtores?.nome || null,
          granjaNome: inscricaoEmitente.granjas?.razao_social || inscricaoEmitente.granjas?.nome_fantasia || null,
        },
        emitente: { crt: emitente.crt },
      };

      const itensDataForEmission: NotaFiscalItemData[] = [{
        numero_item: itemData.numero_item,
        codigo: itemData.codigo,
        descricao: itemData.descricao,
        ncm: itemData.ncm,
        cfop: itemData.cfop,
        unidade: itemData.unidade,
        quantidade: itemData.quantidade,
        valor_unitario: itemData.valor_unitario,
        valor_total: itemData.valor_total,
        valor_desconto: itemData.valor_desconto,
        origem: itemData.origem,
        cst_icms: itemData.cst_icms,
        modalidade_bc_icms: 3,
        base_icms: itemData.base_icms,
        aliq_icms: itemData.aliq_icms,
        valor_icms: itemData.valor_icms,
        cst_pis: itemData.cst_pis,
        base_pis: itemData.base_pis,
        aliq_pis: itemData.aliq_pis,
        valor_pis: itemData.valor_pis,
        cst_cofins: itemData.cst_cofins,
        base_cofins: itemData.base_cofins,
        aliq_cofins: itemData.aliq_cofins,
        valor_cofins: itemData.valor_cofins,
        cst_ipi: null,
        base_ipi: null,
        aliq_ipi: null,
        valor_ipi: null,
        valor_frete: null,
        valor_seguro: null,
        valor_outros: null,
        cst_ibs: null,
        base_ibs: null,
        aliq_ibs: null,
        valor_ibs: null,
        cclass_trib_ibs: null,
        cst_cbs: null,
        base_cbs: null,
        aliq_cbs: null,
        valor_cbs: null,
        cclass_trib_cbs: null,
        cst_is: null,
        base_is: null,
        aliq_is: null,
        valor_is: null,
      }];

      // 6. Emitir a NFe
      const emitResult = await focusNfe.emitirNfe(notaFiscal.id, notaDataForEmission, itensDataForEmission);

      if (!emitResult.success) {
        setStatus({
          step: "error",
          message: "Erro ao emitir NFe",
          progress: 100,
          details: emitResult.error || "Erro desconhecido",
          notaFiscalId: notaFiscal.id,
        });
        return;
      }

      setStatus({ step: "polling", message: "Aguardando autorização da SEFAZ...", progress: 75, notaFiscalId: notaFiscal.id });

      // 7. Polling para aguardar autorização
      const ref = emitResult.ref;
      if (ref) {
        const pollResult = await focusNfe.pollStatus(ref, notaFiscal.id, 30, 3000);
        const finalStatus = (pollResult.data as Record<string, unknown>)?.status as string;

        if (finalStatus === "autorizado" || finalStatus === "autorizada") {
          // Atualizar devolução com nota_fiscal_id e status
          await updateDevolucao.mutateAsync({
            id: devolucao.id,
            nota_fiscal_id: notaFiscal.id,
            status: "nfe_emitida",
          });

          setStatus({
            step: "success",
            message: "NFe autorizada com sucesso!",
            progress: 100,
            notaFiscalId: notaFiscal.id,
          });

          toast.success("NFe emitida e autorizada com sucesso!");
          onSuccess();
        } else {
          const motivo = (pollResult.data as Record<string, unknown>)?.mensagem_sefaz as string ||
            (pollResult.data as Record<string, unknown>)?.motivo_status as string ||
            "NFe não foi autorizada";

          setStatus({
            step: "error",
            message: "NFe rejeitada pela SEFAZ",
            progress: 100,
            details: motivo,
            notaFiscalId: notaFiscal.id,
          });
        }
      } else {
        setStatus({
          step: "success",
          message: "NFe enviada para processamento",
          progress: 100,
          details: "Verifique o status no módulo de notas fiscais",
          notaFiscalId: notaFiscal.id,
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro desconhecido";
      setStatus({
        step: "error",
        message: "Erro ao emitir NFe",
        progress: 100,
        details: message,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOpenNfe = () => {
    if (status.notaFiscalId) {
      navigate(`/notas-fiscais/${status.notaFiscalId}`);
    }
  };

  const getStepIcon = () => {
    switch (status.step) {
      case "success":
        return <CheckCircle2 className="h-12 w-12 text-green-500" />;
      case "error":
        return <XCircle className="h-12 w-12 text-destructive" />;
      default:
        return <Loader2 className="h-12 w-12 text-primary animate-spin" />;
    }
  };

  if (!devolucao) return null;

  return (
    <Dialog open={!!devolucao} onOpenChange={() => !isProcessing && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Emitir NF-e - Devolução #{devolucao.codigo}</DialogTitle>
        </DialogHeader>

        <div className="py-6">
          {status.step === "idle" ? (
            <div className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Emissão Automática - CFOP 5906</AlertTitle>
                <AlertDescription>
                  Será criada uma NF-e de retorno de mercadoria depositada.
                  A nota será transmitida automaticamente à SEFAZ.
                </AlertDescription>
              </Alert>

              <div className="text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Quantidade:</span>
                  <span className="font-medium">{formatNumber(devolucao.quantidade_kg, 3)} kg</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Valor:</span>
                  <span className="font-medium">
                    {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(devolucao.valor_total || 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Produtor:</span>
                  <span className="font-medium">{devolucao.inscricao_produtor?.produtores?.nome || "-"}</span>
                </div>
                {(devolucao.taxa_armazenagem || 0) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Taxa Armazenagem:</span>
                    <span className="font-medium">{formatNumber(devolucao.kg_taxa_armazenagem || 0, 3)} kg ({devolucao.taxa_armazenagem}%)</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex flex-col items-center gap-4">
                {getStepIcon()}
                <div className="text-center">
                  <p className="font-medium">{status.message}</p>
                  {status.details && (
                    <p className="text-sm text-muted-foreground mt-1">{status.details}</p>
                  )}
                </div>
              </div>

              {status.step !== "success" && status.step !== "error" && (
                <Progress value={status.progress} className="h-2" />
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          {status.step === "idle" && (
            <>
              <Button variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button onClick={handleEmitir} disabled={isProcessing}>
                Emitir NFe
              </Button>
            </>
          )}

          {status.step === "success" && (
            <Button onClick={onClose}>
              Fechar
            </Button>
          )}

          {status.step === "error" && (
            <>
              <Button variant="outline" onClick={onClose}>
                Fechar
              </Button>
              {status.notaFiscalId && (
                <Button onClick={handleOpenNfe}>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Abrir NFe
                </Button>
              )}
            </>
          )}

          {status.step !== "idle" && status.step !== "success" && status.step !== "error" && (
            <Button disabled>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Processando...
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
