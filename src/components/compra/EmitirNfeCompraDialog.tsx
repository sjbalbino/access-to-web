import { useState, useEffect } from "react";
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
import { Loader2, CheckCircle2, XCircle, AlertCircle, ExternalLink, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useFocusNfe } from "@/hooks/useFocusNfe";
import type { NotaFiscalData, NotaFiscalItemData } from "@/lib/focusNfeMapper";
import { CompraCereal, useUpdateCompraCereal } from "@/hooks/useComprasCereais";
import { formatNumber, formatCpf, formatCnpj } from "@/lib/formatters";
import { NotaReferenciadaForm, NotaReferenciadaTemp } from "@/components/deposito/NotaReferenciadaForm";

interface EmitirNfeCompraDialogProps {
  compra: CompraCereal | null;
  onClose: () => void;
  onSuccess: () => void;
}

type EmissionStep = "idle" | "loading_data" | "creating_nfe" | "creating_item" | "creating_ref" | "sending" | "polling" | "success" | "error";

interface EmissionStatus {
  step: EmissionStep;
  message: string;
  progress: number;
  details?: string;
  notaFiscalId?: string;
}

export function EmitirNfeCompraDialog({
  compra,
  onClose,
  onSuccess,
}: EmitirNfeCompraDialogProps) {
  const navigate = useNavigate();
  const [status, setStatus] = useState<EmissionStatus>({
    step: "idle",
    message: "",
    progress: 0,
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const updateCompra = useUpdateCompraCereal();
  const focusNfe = useFocusNfe();
  
  // Estado para notas referenciadas
  const [notasReferenciadas, setNotasReferenciadas] = useState<NotaReferenciadaTemp[]>([]);
  const [showNotaReferenciadaForm, setShowNotaReferenciadaForm] = useState(false);
  const [inscricaoVendedorData, setInscricaoVendedorData] = useState<{
    cpf_cnpj?: string | null;
    inscricao_estadual?: string | null;
    uf?: string | null;
  } | null>(null);

  // Buscar dados do vendedor quando o dialog abrir
  useEffect(() => {
    if (compra) {
      supabase
        .from("inscricoes_produtor")
        .select("cpf_cnpj, inscricao_estadual, uf")
        .eq("id", compra.inscricao_vendedor_id)
        .single()
        .then(({ data }) => {
          if (data) {
            setInscricaoVendedorData(data);
          }
        });
    } else {
      setNotasReferenciadas([]);
      setInscricaoVendedorData(null);
    }
  }, [compra]);

  const handleAddNotaReferenciada = (nota: NotaReferenciadaTemp) => {
    setNotasReferenciadas(prev => [...prev, nota]);
  };

  const handleRemoveNotaReferenciada = (index: number) => {
    setNotasReferenciadas(prev => prev.filter((_, i) => i !== index));
  };

  const cleanDigits = (value: string | null | undefined, maxLen?: number): string | null => {
    if (!value) return null;
    const digits = value.replace(/\D/g, "");
    const trimmed = maxLen ? digits.slice(0, maxLen) : digits;
    return trimmed.length ? trimmed : null;
  };

  const handleEmitir = async () => {
    if (!compra) return;

    setIsProcessing(true);
    setStatus({ step: "loading_data", message: "Carregando dados...", progress: 10 });

    try {
      // 1. Buscar dados completos necessários para a NFe
      setStatus({ step: "loading_data", message: "Buscando dados da compra...", progress: 15 });

      // Buscar inscrição do COMPRADOR (é quem EMITE a NFe de entrada)
      const { data: inscricaoComprador, error: inscricaoCompradorError } = await supabase
        .from("inscricoes_produtor")
        .select(`
          *,
          produtores(nome),
          granjas(id, razao_social, nome_fantasia)
        `)
        .eq("id", compra.inscricao_comprador_id)
        .single();

      if (inscricaoCompradorError || !inscricaoComprador) {
        throw new Error("Inscrição do comprador não encontrada");
      }

      // Buscar inscrição do VENDEDOR (é o REMETENTE/fornecedor)
      const { data: inscricaoVendedor, error: inscricaoVendedorError } = await supabase
        .from("inscricoes_produtor")
        .select(`
          *,
          produtores(nome)
        `)
        .eq("id", compra.inscricao_vendedor_id)
        .single();

      if (inscricaoVendedorError || !inscricaoVendedor) {
        throw new Error("Inscrição do vendedor (remetente) não encontrada");
      }

      // Buscar emitente pela granja do comprador
      const { data: emitente, error: emitenteError } = await supabase
        .from("emitentes_nfe")
        .select("*")
        .eq("granja_id", compra.granja_id)
        .eq("ativo", true)
        .single();

      if (emitenteError || !emitente) {
        throw new Error("Configuração de API (Emitente) não encontrada para esta granja. Cadastre um emitente.");
      }

      if (!emitente.api_configurada) {
        throw new Error("Configure a API do emitente antes de emitir NFe.");
      }

      // Buscar CFOP 1102 (estadual) ou 2102 (interestadual) - Compra para comercialização
      const ufVendedor = inscricaoVendedor.uf;
      const ufComprador = inscricaoComprador.uf;
      const cfopCodigo = ufVendedor === ufComprador ? "1102" : "2102";

      const { data: cfop, error: cfopError } = await supabase
        .from("cfops")
        .select("*")
        .eq("codigo", cfopCodigo)
        .eq("ativo", true)
        .single();

      if (cfopError || !cfop) {
        throw new Error(`CFOP ${cfopCodigo} não encontrado ou inativo. Cadastre o CFOP de compra para comercialização.`);
      }

      // Buscar produto completo
      const { data: produto, error: produtoError } = await supabase
        .from("produtos")
        .select("*, unidades_medida(*)")
        .eq("id", compra.produto_id)
        .single();

      if (produtoError || !produto) {
        throw new Error("Produto da compra não encontrado.");
      }

      setStatus({ step: "creating_nfe", message: "Verificando numeração...", progress: 25 });

      // 2. Buscar próximo número de NFe disponível para o emitente/série
      const serieNfe = emitente.serie_nfe || 1;
      
      const { data: ultimaNfe } = await supabase
        .from("notas_fiscais")
        .select("numero")
        .eq("emitente_id", emitente.id)
        .eq("serie", serieNfe)
        .not("numero", "is", null)
        .order("numero", { ascending: false })
        .limit(1)
        .single();

      const ultimoNumeroUsado = Math.max(
        ultimaNfe?.numero || 0,
        emitente.numero_atual_nfe || 0
      );
      const proximoNumero = ultimoNumeroUsado + 1;

      console.log("Próximo número NFe:", proximoNumero, "Série:", serieNfe);

      // Reservar o número
      const { error: updateNumeroError } = await supabase
        .from("emitentes_nfe")
        .update({ numero_atual_nfe: proximoNumero })
        .eq("id", emitente.id);

      if (updateNumeroError) {
        console.warn("Aviso: não foi possível atualizar numero_atual_nfe:", updateNumeroError.message);
      }

      setStatus({ step: "creating_nfe", message: "Criando nota fiscal...", progress: 30 });

      // 3. Criar a nota fiscal
      const valorTotal = compra.valor_total;
      const kgNota = compra.quantidade_kg;

      // Montar informações complementares
      const infoComplementarParts: string[] = [];
      infoComplementarParts.push(`Compra de Cereais Cód. ${compra.codigo}`);
      if (compra.observacao) {
        infoComplementarParts.push(`Obs: ${compra.observacao}`);
      }

      const notaFiscalData = {
        emitente_id: emitente.id,
        granja_id: compra.granja_id,
        inscricao_produtor_id: compra.inscricao_comprador_id,
        natureza_operacao: cfop.natureza_operacao || "COMPRA PARA COMERCIALIZACAO",
        data_emissao: new Date().toISOString().split("T")[0],
        operacao: 0, // ENTRADA (compra)
        finalidade: 1, // Normal
        cfop_id: cfop.id,
        numero: proximoNumero,
        serie: serieNfe,
        // Remetente/Fornecedor = Vendedor (produtor que vendeu)
        dest_tipo: (inscricaoVendedor.cpf_cnpj?.length || 0) > 11 ? "PJ" : "PF",
        dest_cpf_cnpj: cleanDigits(inscricaoVendedor.cpf_cnpj, 14),
        dest_nome: inscricaoVendedor.produtores?.nome || "PRODUTOR",
        dest_ie: cleanDigits(inscricaoVendedor.inscricao_estadual, 14),
        dest_email: inscricaoVendedor.email || null,
        dest_telefone: cleanDigits(inscricaoVendedor.telefone, 14),
        dest_logradouro: inscricaoVendedor.logradouro,
        dest_numero: inscricaoVendedor.numero,
        dest_complemento: inscricaoVendedor.complemento,
        dest_bairro: inscricaoVendedor.bairro,
        dest_cidade: inscricaoVendedor.cidade,
        dest_uf: inscricaoVendedor.uf,
        dest_cep: cleanDigits(inscricaoVendedor.cep, 8),
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
        valor_unitario: compra.valor_unitario_kg,
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

      // 5. Criar notas referenciadas (NFP/NFe do vendedor)
      if (notasReferenciadas.length > 0) {
        setStatus({ step: "creating_ref", message: "Adicionando notas referenciadas...", progress: 50, notaFiscalId: notaFiscal.id });
        
        for (const notaRef of notasReferenciadas) {
          const notaRefData = {
            nota_fiscal_id: notaFiscal.id,
            tipo: notaRef.tipo,
            chave_nfe: notaRef.tipo === 'nfe' ? notaRef.chave_nfe : null,
            nfp_uf: notaRef.tipo === 'nfp' ? notaRef.nfp_uf : null,
            nfp_aamm: notaRef.tipo === 'nfp' ? notaRef.nfp_aamm : null,
            nfp_cnpj: notaRef.tipo === 'nfp' ? notaRef.nfp_cnpj : null,
            nfp_cpf: notaRef.tipo === 'nfp' ? notaRef.nfp_cpf : null,
            nfp_ie: notaRef.tipo === 'nfp' ? notaRef.nfp_ie : null,
            nfp_modelo: notaRef.tipo === 'nfp' ? '04' : null,
            nfp_serie: notaRef.tipo === 'nfp' ? notaRef.nfp_serie : null,
            nfp_numero: notaRef.tipo === 'nfp' ? notaRef.nfp_numero : null,
          };
          
          const { error: refError } = await supabase
            .from("notas_fiscais_referenciadas")
            .insert(notaRefData);
          
          if (refError) {
            console.warn("Aviso: erro ao inserir nota referenciada:", refError.message);
          }
        }
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
          cpf_cnpj: inscricaoComprador.cpf_cnpj,
          inscricao_estadual: inscricaoComprador.inscricao_estadual,
          logradouro: inscricaoComprador.logradouro,
          numero: inscricaoComprador.numero,
          complemento: inscricaoComprador.complemento,
          bairro: inscricaoComprador.bairro,
          cidade: inscricaoComprador.cidade,
          uf: inscricaoComprador.uf,
          cep: inscricaoComprador.cep,
          produtorNome: inscricaoComprador.produtores?.nome || null,
          granjaNome: inscricaoComprador.granjas?.razao_social || inscricaoComprador.granjas?.nome_fantasia || null,
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
          // Atualizar compra com nota_fiscal_id e status
          await updateCompra.mutateAsync({
            id: compra.id,
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

  return (
    <Dialog open={!!compra} onOpenChange={(open) => !open && !isProcessing && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Emitir NF-e - Compra #{compra?.codigo}</DialogTitle>
        </DialogHeader>

        {compra && (
          <div className="py-4">
            {status.step === "idle" ? (
              <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Emissão Automática - CFOP 1102/2102</AlertTitle>
                  <AlertDescription>
                    Será criada uma NF-e de <strong>entrada (compra)</strong> para comercialização.
                  </AlertDescription>
                </Alert>

                <div className="grid gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Quantidade:</span>
                    <span className="font-medium">{formatNumber(compra.quantidade_kg, 3)} kg</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Valor Unitário:</span>
                    <span className="font-medium">R$ {formatNumber(compra.valor_unitario_kg, 4)}/kg</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Valor Total:</span>
                    <span className="font-medium">R$ {formatNumber(compra.valor_total, 2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Vendedor:</span>
                    <span className="font-medium">{compra.inscricao_vendedor?.produtores?.nome}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Comprador:</span>
                    <span className="font-medium">{compra.inscricao_comprador?.produtores?.nome}</span>
                  </div>
                </div>

                {/* Seção de Notas Referenciadas */}
                <div className="border-t pt-4 mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm">Notas Referenciadas (NFP/NFe do Vendedor)</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowNotaReferenciadaForm(true)}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Adicionar
                    </Button>
                  </div>
                  
                  {notasReferenciadas.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-2">
                      Nenhuma nota referenciada adicionada
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {notasReferenciadas.map((nota, index) => (
                        <div key={index} className="flex items-center justify-between bg-muted rounded-md px-3 py-2 text-sm">
                          <div className="flex-1 min-w-0">
                            {nota.tipo === 'nfe' ? (
                              <span className="font-mono text-xs truncate block">
                                NFe: {nota.chave_nfe?.substring(0, 20)}...
                              </span>
                            ) : (
                              <span>
                                NFP: {nota.nfp_uf} - Série {nota.nfp_serie} Nº {nota.nfp_numero}
                                {nota.nfp_cpf && ` (${formatCpf(nota.nfp_cpf)})`}
                                {nota.nfp_cnpj && ` (${formatCnpj(nota.nfp_cnpj)})`}
                              </span>
                            )}
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveNotaReferenciada(index)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
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
        )}

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

          {(status.step === "success" || status.step === "error") && (
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
        </DialogFooter>
      </DialogContent>

      {/* Dialog para adicionar nota referenciada */}
      <NotaReferenciadaForm
        open={showNotaReferenciadaForm}
        onOpenChange={setShowNotaReferenciadaForm}
        onAdd={handleAddNotaReferenciada}
        inscricao={inscricaoVendedorData}
      />
    </Dialog>
  );
}
