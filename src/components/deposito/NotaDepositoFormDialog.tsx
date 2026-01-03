import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, FileText, Trash2, Loader2, CheckCircle2, XCircle, Check } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { useSafras } from "@/hooks/useSafras";
import { useGranjas } from "@/hooks/useGranjas";
import { useSaldosDeposito, useInscricoesComSaldo } from "@/hooks/useSaldosDeposito";
import { useInscricoesCompletas } from "@/hooks/useInscricoesCompletas";
import { useProdutos } from "@/hooks/useProdutos";
import { useCfops } from "@/hooks/useCfops";
import { useInscricaoEmitentePrincipal } from "@/hooks/useInscricaoEmitentePrincipal";
import { formatNumber, formatCpfCnpj } from "@/lib/formatters";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { NotaReferenciadaForm, NotaReferenciadaTemp } from "@/components/deposito/NotaReferenciadaForm";
import { useFocusNfe } from "@/hooks/useFocusNfe";
import type { NotaFiscalData, NotaFiscalItemData } from "@/lib/focusNfeMapper";

type EmissionStep = "idle" | "validating" | "creating" | "sending" | "processing" | "success" | "error";

interface EmissionStatus {
  step: EmissionStep;
  message: string;
  progress: number;
  details?: string;
}

interface NotaDepositoFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function NotaDepositoFormDialog({ open, onOpenChange, onSuccess }: NotaDepositoFormDialogProps) {
  // Filtros
  const [granjaId, setGranjaId] = useState<string>("");
  const [safraId, setSafraId] = useState<string>("");
  const [inscricaoId, setInscricaoId] = useState<string>("");
  
  // Dados da NFe a gerar
  const [produtoId, setProdutoId] = useState<string>("");
  const [quantidadeKg, setQuantidadeKg] = useState<string>("");
  
  // Notas referenciadas (temporárias até gerar a NFe)
  const [notasReferenciadas, setNotasReferenciadas] = useState<NotaReferenciadaTemp[]>([]);
  const [showNotaForm, setShowNotaForm] = useState(false);
  const [deleteNotaIndex, setDeleteNotaIndex] = useState<number | null>(null);
  
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Estado do painel de progresso
  const [isEmissionDialogOpen, setIsEmissionDialogOpen] = useState(false);
  const [emissionStatus, setEmissionStatus] = useState<EmissionStatus>({
    step: "idle",
    message: "",
    progress: 0,
  });

  const { emitirNfe, pollStatus } = useFocusNfe();

  const { data: safras = [] } = useSafras();
  const { data: granjas = [] } = useGranjas();
  const { data: produtos = [] } = useProdutos();
  const { cfops } = useCfops();
  const { data: todasInscricoes = [] } = useInscricoesCompletas();

  // Buscar inscrições com saldo disponível
  const { data: inscricoesComSaldo = [] } = useInscricoesComSaldo({
    safraId: safraId || undefined,
    granjaId: granjaId || undefined,
  });

  // Buscar saldos por produto para a inscrição selecionada
  const { data: saldos = [], isLoading: loadingSaldos } = useSaldosDeposito({
    inscricaoProdutorId: inscricaoId || undefined,
    safraId: safraId || undefined,
  });

  // Dados da inscrição selecionada
  const inscricaoSelecionada = useMemo(() => {
    return todasInscricoes.find(i => i.id === inscricaoId);
  }, [todasInscricoes, inscricaoId]);

  // CFOP 1905
  const cfop1905 = useMemo(() => {
    return cfops.find(c => c.codigo === '1905');
  }, [cfops]);

  // Buscar inscrição emitente principal da granja (sócio com is_emitente_principal = true)
  const { data: inscricaoPrincipal } = useInscricaoEmitentePrincipal(granjaId || undefined);

  // Emitente derivado da inscrição principal
  const emitente = inscricaoPrincipal?.emitente;

  // Granja selecionada
  const granjaSelecionada = useMemo(() => {
    return granjas.find(g => g.id === granjaId);
  }, [granjas, granjaId]);

  // Safra selecionada
  const safraSelecionada = useMemo(() => {
    return safras.find(s => s.id === safraId);
  }, [safras, safraId]);

  // Saldo disponível para o produto selecionado
  const saldoProduto = useMemo(() => {
    if (!produtoId) return null;
    return saldos.find(s => s.produto_id === produtoId);
  }, [saldos, produtoId]);

  const handleAddNotaReferenciada = (nota: NotaReferenciadaTemp) => {
    setNotasReferenciadas(prev => [...prev, nota]);
    setShowNotaForm(false);
  };

  const handleRemoveNotaReferenciada = () => {
    if (deleteNotaIndex !== null) {
      setNotasReferenciadas(prev => prev.filter((_, i) => i !== deleteNotaIndex));
      setDeleteNotaIndex(null);
    }
  };

  const handleCloseEmissionDialog = () => {
    if (emissionStatus.step === "success" || emissionStatus.step === "error" || emissionStatus.step === "idle") {
      setIsEmissionDialogOpen(false);
      setEmissionStatus({ step: "idle", message: "", progress: 0 });
      
      if (emissionStatus.step === "success") {
        // Limpar formulário e fechar dialog principal
        resetForm();
        onOpenChange(false);
        onSuccess();
      }
    }
  };

  const resetForm = () => {
    setGranjaId("");
    setSafraId("");
    setInscricaoId("");
    setProdutoId("");
    setQuantidadeKg("");
    setNotasReferenciadas([]);
  };

  const getStepStatus = (step: EmissionStep): "pending" | "active" | "completed" | "error" => {
    const steps: EmissionStep[] = ["validating", "creating", "sending", "processing"];
    const currentIndex = steps.indexOf(emissionStatus.step);
    const stepIndex = steps.indexOf(step);

    if (emissionStatus.step === "error") {
      if (stepIndex <= currentIndex) return "error";
      return "pending";
    }
    if (emissionStatus.step === "success") return "completed";
    if (stepIndex < currentIndex) return "completed";
    if (stepIndex === currentIndex) return "active";
    return "pending";
  };

  const handleGerarNfe = async () => {
    if (!granjaId || !inscricaoId || !produtoId || !quantidadeKg || !safraId) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    if (!cfop1905) {
      toast({
        title: "CFOP não encontrado",
        description: "O CFOP 1905 não está cadastrado no sistema.",
        variant: "destructive",
      });
      return;
    }

    if (!emitente) {
      toast({
        title: "Emitente não configurado",
        description: "Configure um emitente de NFe para esta granja.",
        variant: "destructive",
      });
      return;
    }

    if (!inscricaoPrincipal) {
      toast({
        title: "Inscrição do emitente não configurada",
        description: "Defina uma inscrição estadual como emitente principal para esta granja.",
        variant: "destructive",
      });
      return;
    }

    if (!inscricaoPrincipal.cpf_cnpj || !inscricaoPrincipal.inscricao_estadual) {
      toast({
        title: "Dados do emitente incompletos",
        description: "A inscrição do emitente principal precisa ter CPF/CNPJ e Inscrição Estadual.",
        variant: "destructive",
      });
      return;
    }

    const qtdKg = parseFloat(quantidadeKg);
    if (saldoProduto && qtdKg > saldoProduto.saldo_a_emitir_kg) {
      toast({
        title: "Quantidade inválida",
        description: `A quantidade informada (${formatNumber(qtdKg)} kg) é maior que o saldo disponível (${formatNumber(saldoProduto.saldo_a_emitir_kg)} kg).`,
        variant: "destructive",
      });
      return;
    }

    // Abrir diálogo de emissão e iniciar progresso
    setIsEmissionDialogOpen(true);
    setEmissionStatus({ step: "validating", message: "Validando dados...", progress: 10 });
    setIsGenerating(true);

    try {
      // Buscar produto selecionado
      const produto = produtos.find(p => p.id === produtoId);
      
      // Próximo número da nota
      const proximoNumero = (emitente.numero_atual_nfe || 0) + 1;

      // Montar informações complementares
      const infoComplementar = (() => {
        const partes: string[] = [];
        
        // Safra
        if (safraSelecionada?.nome) {
          partes.push(`Safra: ${safraSelecionada.nome}`);
        }
        
        // PRODUTO JÁ TESTADO POR [Emitente]
        const nomeEmitente = inscricaoPrincipal?.produtores?.nome || "";
        const cidadeEmitente = inscricaoPrincipal?.cidade || "";
        const cpfEmitente = inscricaoPrincipal?.cpf_cnpj || "";
        
        if (nomeEmitente) {
          partes.push(`PRODUTO JÁ TESTADO POR ${nomeEmitente} - ${cidadeEmitente} - CPF: ${cpfEmitente}`);
        }
        
        // Notas referenciadas
        if (notasReferenciadas.length > 0) {
          const refs = notasReferenciadas.map(n => {
            if (n.tipo === 'nfe') {
              return `NFe ${n.chave_nfe}`;
            } else {
              return `NFP ${n.nfp_numero}/${n.nfp_serie}`;
            }
          }).join(", ");
          partes.push(`Ref: ${refs}`);
        }
        
        return partes.join(" | ");
      })();

      setEmissionStatus({ step: "creating", message: "Criando nota fiscal...", progress: 25 });

      // Criar a nota fiscal
      const { data: notaFiscal, error: notaError } = await supabase
        .from('notas_fiscais')
        .insert({
          granja_id: granjaId,
          emitente_id: emitente.id,
          cfop_id: cfop1905.id,
          natureza_operacao: cfop1905.natureza_operacao || 'ENTRADA DE MERCADORIA RECEBIDA PARA DEPOSITO',
          numero: proximoNumero,
          serie: emitente.serie_nfe || 1,
          data_emissao: new Date().toISOString(),
          data_saida_entrada: new Date().toISOString(),
          operacao: 0, // Entrada
          finalidade: 1, // Normal
          inscricao_produtor_id: inscricaoId,
          info_complementar: infoComplementar || null,
          // Destinatário (produtor)
          dest_tipo: inscricaoSelecionada?.cpf_cnpj && inscricaoSelecionada.cpf_cnpj.length > 11 ? 'juridica' : 'fisica',
          dest_cpf_cnpj: inscricaoSelecionada?.cpf_cnpj,
          dest_nome: inscricaoSelecionada?.produtores?.nome || inscricaoSelecionada?.granja,
          dest_ie: inscricaoSelecionada?.inscricao_estadual,
          dest_logradouro: inscricaoSelecionada?.logradouro,
          dest_numero: inscricaoSelecionada?.numero,
          dest_complemento: inscricaoSelecionada?.complemento,
          dest_bairro: inscricaoSelecionada?.bairro,
          dest_cidade: inscricaoSelecionada?.cidade,
          dest_uf: inscricaoSelecionada?.uf,
          dest_cep: inscricaoSelecionada?.cep?.replace(/\D/g, '') || null,
          dest_telefone: inscricaoSelecionada?.telefone,
          dest_email: inscricaoSelecionada?.email,
          // Totais serão calculados pelo item
          total_produtos: qtdKg * 1, // Valor unitário de R$ 1,00 para depósito
          total_nota: qtdKg * 1,
          status: 'rascunho',
        })
        .select()
        .single();

      if (notaError) throw notaError;

      // Criar item da nota
      const { error: itemError } = await supabase
        .from('notas_fiscais_itens')
        .insert({
          nota_fiscal_id: notaFiscal.id,
          numero_item: 1,
          produto_id: produtoId,
          codigo: produto?.codigo || '',
          descricao: produto?.nome || 'Produto',
          ncm: produto?.ncm || '',
          cfop: cfop1905.codigo,
          unidade: 'KG',
          quantidade: qtdKg,
          valor_unitario: 1, // Valor simbólico para depósito
          valor_total: qtdKg,
          origem: 0,
          cst_icms: cfop1905.cst_icms_padrao || '41',
          cst_pis: cfop1905.cst_pis_padrao || '08',
          cst_cofins: cfop1905.cst_cofins_padrao || '08',
        });

      if (itemError) throw itemError;

      // Criar notas referenciadas
      if (notasReferenciadas.length > 0) {
        const notasParaInserir = notasReferenciadas.map(n => ({
          nota_fiscal_id: notaFiscal.id,
          tipo: n.tipo,
          chave_nfe: n.tipo === 'nfe' ? n.chave_nfe : null,
          nfp_uf: n.tipo === 'nfp' ? n.nfp_uf : null,
          nfp_aamm: n.tipo === 'nfp' ? n.nfp_aamm : null,
          nfp_cnpj: n.tipo === 'nfp' ? n.nfp_cnpj : null,
          nfp_cpf: n.tipo === 'nfp' ? n.nfp_cpf : null,
          nfp_ie: n.tipo === 'nfp' ? n.nfp_ie : null,
          nfp_modelo: n.tipo === 'nfp' ? '04' : null,
          nfp_serie: n.tipo === 'nfp' ? n.nfp_serie : null,
          nfp_numero: n.tipo === 'nfp' ? n.nfp_numero : null,
        }));

        const { error: refError } = await supabase
          .from('notas_fiscais_referenciadas')
          .insert(notasParaInserir);

        if (refError) throw refError;
      }

      // Incrementar número atual da NF-e no emitente
      await supabase
        .from("emitentes_nfe")
        .update({ numero_atual_nfe: proximoNumero })
        .eq("id", emitente.id);

      toast({
        title: "NFe criada com sucesso",
        description: `Nota fiscal ${proximoNumero} criada. Iniciando transmissão à SEFAZ...`,
      });

      // Dados para registrar nota de depósito emitida APÓS autorização
      const dadosNotaDeposito = {
        nota_fiscal_id: notaFiscal.id,
        granja_id: granjaId,
        inscricao_produtor_id: inscricaoId,
        safra_id: safraId,
        produto_id: produtoId,
        quantidade_kg: qtdKg,
        data_emissao: new Date().toISOString().split('T')[0],
      };

      // Montar dados para emissão via hook
      const notaDataParaEmissao: NotaFiscalData = {
        id: notaFiscal.id,
        data_emissao: new Date().toISOString(),
        natureza_operacao: cfop1905.natureza_operacao || 'ENTRADA DE MERCADORIA RECEBIDA PARA DEPOSITO',
        operacao: 0,
        finalidade: 1,
        ind_consumidor_final: 0,
        ind_presenca: 9,
        modalidade_frete: 9,
        forma_pagamento: 0,
        numero: proximoNumero,
        serie: emitente.serie_nfe || 1,
        info_complementar: infoComplementar,
        info_fisco: null,
        // Destinatário (produtor parceiro depositante)
        dest_cpf_cnpj: inscricaoSelecionada?.cpf_cnpj || null,
        dest_nome: inscricaoSelecionada?.produtores?.nome || inscricaoSelecionada?.granja || null,
        dest_ie: inscricaoSelecionada?.inscricao_estadual || null,
        dest_logradouro: inscricaoSelecionada?.logradouro || null,
        dest_numero: inscricaoSelecionada?.numero || null,
        dest_bairro: inscricaoSelecionada?.bairro || null,
        dest_cidade: inscricaoSelecionada?.cidade || null,
        dest_uf: inscricaoSelecionada?.uf || null,
        dest_cep: inscricaoSelecionada?.cep?.replace(/\D/g, '') || null,
        dest_telefone: inscricaoSelecionada?.telefone || null,
        dest_email: inscricaoSelecionada?.email || null,
        dest_tipo: inscricaoSelecionada?.cpf_cnpj && inscricaoSelecionada.cpf_cnpj.replace(/\D/g, '').length > 11 ? '1' : '0',
        // Emitente (sócio principal da granja)
        inscricaoProdutor: {
          cpf_cnpj: inscricaoPrincipal?.cpf_cnpj || null,
          inscricao_estadual: inscricaoPrincipal?.inscricao_estadual || null,
          logradouro: inscricaoPrincipal?.logradouro || null,
          numero: inscricaoPrincipal?.numero || null,
          complemento: inscricaoPrincipal?.complemento || null,
          bairro: inscricaoPrincipal?.bairro || null,
          cidade: inscricaoPrincipal?.cidade || null,
          uf: inscricaoPrincipal?.uf || null,
          cep: inscricaoPrincipal?.cep?.replace(/\D/g, '') || null,
          produtorNome: inscricaoPrincipal?.produtores?.nome || null,
          granjaNome: granjaSelecionada?.nome_fantasia || granjaSelecionada?.razao_social || null,
        },
        emitente: {
          crt: emitente.crt || 3,
        },
      };

      const itensParaEmissao: NotaFiscalItemData[] = [{
        numero_item: 1,
        codigo: produto?.codigo || '',
        descricao: produto?.nome || 'Produto',
        ncm: produto?.ncm || '',
        cfop: cfop1905.codigo,
        unidade: 'KG',
        quantidade: qtdKg,
        valor_unitario: 1,
        valor_total: qtdKg,
        origem: 0,
        cst_icms: cfop1905.cst_icms_padrao || '41',
        modalidade_bc_icms: 0,
        base_icms: 0,
        aliq_icms: 0,
        valor_icms: 0,
        cst_pis: cfop1905.cst_pis_padrao || '08',
        base_pis: 0,
        aliq_pis: 0,
        valor_pis: 0,
        cst_cofins: cfop1905.cst_cofins_padrao || '08',
        base_cofins: 0,
        aliq_cofins: 0,
        valor_cofins: 0,
        cst_ipi: '53',
        base_ipi: 0,
        aliq_ipi: 0,
        valor_ipi: 0,
        valor_desconto: 0,
        valor_frete: 0,
        valor_seguro: 0,
        valor_outros: 0,
        // Reforma tributária
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

      setEmissionStatus({ step: "sending", message: "Enviando para SEFAZ...", progress: 50 });

      // Emissão automática à SEFAZ usando o hook
      try {
        const resultEmissao = await emitirNfe(notaFiscal.id, notaDataParaEmissao, itensParaEmissao);

        if (!resultEmissao.success) {
          setEmissionStatus({
            step: "error",
            message: "Erro ao transmitir",
            progress: 100,
            details: resultEmissao.error || "Acesse Notas Fiscais para emitir manualmente.",
          });
          return;
        }

        if (resultEmissao.data?.ref) {
          setEmissionStatus({ step: "processing", message: "Aguardando retorno da SEFAZ...", progress: 70 });
          
          // Polling de status
          const statusResult = await pollStatus(String(resultEmissao.data.ref), notaFiscal.id, 30, 3000);
          
          if (statusResult.success && statusResult.data?.status === "autorizado") {
            // REGISTRAR NOTA DE DEPÓSITO APENAS APÓS AUTORIZAÇÃO
            try {
              await supabase.from('notas_deposito_emitidas').insert(dadosNotaDeposito);
            } catch (depositoErr) {
              console.error("Erro ao registrar nota de depósito:", depositoErr);
            }
            
            setEmissionStatus({
              step: "success",
              message: "NF-e Autorizada!",
              progress: 100,
              details: `Protocolo: ${String(statusResult.data?.protocolo || "N/A")}`,
            });

            // Limpar formulário
            setProdutoId("");
            setQuantidadeKg("");
            setNotasReferenciadas([]);
          } else if (statusResult.data?.status === "erro_autorizacao" || statusResult.data?.status === "rejeitado") {
            setEmissionStatus({
              step: "error",
              message: "NF-e Rejeitada",
              progress: 100,
              details: String(statusResult.data?.mensagem_sefaz || "Verifique os dados."),
            });
          } else {
            setEmissionStatus({
              step: "error",
              message: "Tempo esgotado",
              progress: 100,
              details: "Verifique o status no módulo de Notas Fiscais.",
            });
          }
        } else {
          setEmissionStatus({
            step: "error",
            message: "NF-e criada como rascunho",
            progress: 100,
            details: "Acesse Notas Fiscais para emitir.",
          });
        }
      } catch (emissaoErr: any) {
        setEmissionStatus({
          step: "error",
          message: "Erro na transmissão",
          progress: 100,
          details: "NF-e criada como rascunho. Emita manualmente.",
        });
      }
    } catch (error: any) {
      setEmissionStatus({
        step: "error",
        message: "Erro ao gerar NFe",
        progress: 100,
        details: error.message,
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova Nota de Depósito</DialogTitle>
            <DialogDescription>
              Emissão de contra-nota (CFOP 1905) para entrada de mercadoria recebida para depósito
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Filtros */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Selecione o Produtor</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Local (Granja) *</Label>
                    <Select value={granjaId} onValueChange={(v) => { setGranjaId(v); setInscricaoId(""); }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o local" />
                      </SelectTrigger>
                      <SelectContent>
                        {granjas.map((g) => (
                          <SelectItem key={g.id} value={g.id}>
                            {g.nome_fantasia || g.razao_social}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Safra *</Label>
                    <Select value={safraId} onValueChange={(v) => { setSafraId(v); setInscricaoId(""); }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a safra" />
                      </SelectTrigger>
                      <SelectContent>
                        {safras.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Inscrição Estadual *</Label>
                    <Select 
                      value={inscricaoId} 
                      onValueChange={setInscricaoId}
                      disabled={!granjaId || !safraId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={!granjaId || !safraId ? "Selecione local e safra" : "Selecione a inscrição"} />
                      </SelectTrigger>
                      <SelectContent>
                        {inscricoesComSaldo.map((i) => (
                          <SelectItem key={i.id} value={i.id}>
                            {i.inscricao_estadual || i.cpf_cnpj} - {i.produtor_nome || i.granja}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {inscricaoId && inscricaoSelecionada && (
              <>
                {/* Dados do Produtor */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Dados do Produtor</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <Label className="text-muted-foreground text-xs">Inscrição Estadual</Label>
                        <p className="font-medium">{inscricaoSelecionada.inscricao_estadual || "-"}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground text-xs">CPF/CNPJ</Label>
                        <p className="font-medium">{formatCpfCnpj(inscricaoSelecionada.cpf_cnpj) || "-"}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground text-xs">Nome</Label>
                        <p className="font-medium">{inscricaoSelecionada.produtores?.nome || inscricaoSelecionada.granja || "-"}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground text-xs">Cidade/UF</Label>
                        <p className="font-medium">
                          {inscricaoSelecionada.cidade ? `${inscricaoSelecionada.cidade}/${inscricaoSelecionada.uf}` : "-"}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Saldos por Variedade */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Saldos por Variedade</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {loadingSaldos ? (
                      <div className="text-center py-4 text-muted-foreground">Carregando saldos...</div>
                    ) : saldos.length === 0 ? (
                      <div className="text-center py-4 text-muted-foreground">
                        Nenhum saldo encontrado para esta inscrição/safra
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Variedade</TableHead>
                            <TableHead className="text-right">Depositado</TableHead>
                            <TableHead className="text-right">Transf. Receb.</TableHead>
                            <TableHead className="text-right">Notas Emitidas</TableHead>
                            <TableHead className="text-right">Saldo à Emitir</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {saldos.map((s) => (
                            <TableRow 
                              key={s.produto_id}
                              className={produtoId === s.produto_id ? "bg-accent" : ""}
                            >
                              <TableCell className="font-medium">{s.produto_nome}</TableCell>
                              <TableCell className="text-right">{formatNumber(s.depositado_kg)} kg</TableCell>
                              <TableCell className="text-right">{formatNumber(s.transferencias_recebidas_kg)} kg</TableCell>
                              <TableCell className="text-right">{formatNumber(s.notas_emitidas_kg)} kg</TableCell>
                              <TableCell className="text-right font-medium">
                                <Badge variant={s.saldo_a_emitir_kg > 0 ? "default" : "secondary"}>
                                  {formatNumber(s.saldo_a_emitir_kg)} kg
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>

                {/* Notas do Produtor a Referenciar */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-3">
                    <CardTitle className="text-base">Notas do Produtor a Referenciar</CardTitle>
                    <Button variant="outline" size="sm" onClick={() => setShowNotaForm(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar Nota
                    </Button>
                  </CardHeader>
                  <CardContent>
                    {notasReferenciadas.length === 0 ? (
                      <div className="text-center py-4 text-muted-foreground">
                        Nenhuma nota referenciada adicionada
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Tipo</TableHead>
                            <TableHead>Número/Série</TableHead>
                            <TableHead>Chave/Dados</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {notasReferenciadas.map((nota, index) => (
                            <TableRow key={index}>
                              <TableCell>
                                <Badge variant={nota.tipo === 'nfe' ? 'default' : 'secondary'}>
                                  {nota.tipo === 'nfe' ? 'NFe' : 'NFP'}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {nota.tipo === 'nfe' 
                                  ? '-' 
                                  : `${nota.nfp_numero}/${nota.nfp_serie}`
                                }
                              </TableCell>
                              <TableCell className="font-mono text-xs">
                                {nota.tipo === 'nfe' 
                                  ? nota.chave_nfe 
                                  : `UF: ${nota.nfp_uf} | AAMM: ${nota.nfp_aamm} | IE: ${nota.nfp_ie}`
                                }
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                  onClick={() => setDeleteNotaIndex(index)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>

                {/* Dados da Contra-Nota */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Dados da Contra-Nota (NFe CFOP 1905)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Variedade *</Label>
                        <Select value={produtoId} onValueChange={setProdutoId}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione a variedade" />
                          </SelectTrigger>
                          <SelectContent>
                            {saldos.filter(s => s.saldo_a_emitir_kg > 0).map((s) => (
                              <SelectItem key={s.produto_id} value={s.produto_id}>
                                {s.produto_nome} (Saldo: {formatNumber(s.saldo_a_emitir_kg)} kg)
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Quantidade (kg) *</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          max={saldoProduto?.saldo_a_emitir_kg}
                          value={quantidadeKg}
                          onChange={(e) => setQuantidadeKg(e.target.value)}
                          placeholder="0,00"
                        />
                        {saldoProduto && (
                          <p className="text-xs text-muted-foreground">
                            Máximo disponível: {formatNumber(saldoProduto.saldo_a_emitir_kg)} kg
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label>Valor Total</Label>
                        <Input
                          type="text"
                          value={quantidadeKg ? `R$ ${formatNumber(parseFloat(quantidadeKg))}` : "R$ 0,00"}
                          disabled
                          className="bg-muted"
                        />
                        <p className="text-xs text-muted-foreground">Valor simbólico (R$ 1,00/kg)</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleGerarNfe}
              disabled={isGenerating || !produtoId || !quantidadeKg || !inscricaoId}
            >
              {isGenerating ? "Gerando..." : "Gerar NFe"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para adicionar nota referenciada */}
      <NotaReferenciadaForm
        open={showNotaForm}
        onOpenChange={setShowNotaForm}
        onAdd={handleAddNotaReferenciada}
        inscricao={inscricaoSelecionada}
      />

      {/* Confirmação de exclusão de nota referenciada */}
      <AlertDialog open={deleteNotaIndex !== null} onOpenChange={() => setDeleteNotaIndex(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover nota referenciada?</AlertDialogTitle>
            <AlertDialogDescription>
              A nota será removida da lista de referências.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveNotaReferenciada}>Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Painel de Progresso da Emissão */}
      <Dialog open={isEmissionDialogOpen} onOpenChange={handleCloseEmissionDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {emissionStatus.step === "success" ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : emissionStatus.step === "error" ? (
                <XCircle className="h-5 w-5 text-destructive" />
              ) : (
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              )}
              Emissão de NF-e
            </DialogTitle>
            <DialogDescription>
              Acompanhe o progresso da emissão da nota fiscal
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Progress bar */}
            <div className="space-y-2">
              <Progress value={emissionStatus.progress} />
              <p className="text-sm text-center text-muted-foreground">
                {emissionStatus.progress}%
              </p>
            </div>

            {/* Steps */}
            <div className="space-y-3">
              {[
                { step: "validating" as EmissionStep, label: "Validando dados" },
                { step: "creating" as EmissionStep, label: "Criando nota fiscal" },
                { step: "sending" as EmissionStep, label: "Enviando para SEFAZ" },
                { step: "processing" as EmissionStep, label: "Aguardando retorno" },
              ].map(({ step, label }) => {
                const status = getStepStatus(step);
                return (
                  <div key={step} className="flex items-center gap-3">
                    <div className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center",
                      status === "completed" && "bg-green-500 text-white",
                      status === "active" && "bg-primary text-primary-foreground",
                      status === "pending" && "bg-muted text-muted-foreground",
                      status === "error" && "bg-destructive text-destructive-foreground"
                    )}>
                      {status === "completed" ? (
                        <Check className="h-3 w-3" />
                      ) : status === "active" ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : status === "error" ? (
                        <XCircle className="h-3 w-3" />
                      ) : (
                        <span className="text-xs">•</span>
                      )}
                    </div>
                    <span className={cn(
                      "text-sm",
                      status === "active" && "font-medium",
                      status === "pending" && "text-muted-foreground"
                    )}>
                      {label}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Status message */}
            <div className="pt-2">
              {emissionStatus.step === "success" && (
                <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertTitle className="text-green-600">NF-e Autorizada!</AlertTitle>
                  <AlertDescription>
                    {emissionStatus.details || "A nota fiscal foi autorizada com sucesso pela SEFAZ."}
                  </AlertDescription>
                </Alert>
              )}
              {emissionStatus.step === "error" && (
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertTitle>Erro na Emissão</AlertTitle>
                  <AlertDescription>
                    <div className="space-y-1">
                      <p>{emissionStatus.message}</p>
                      {emissionStatus.details && (
                        <p className="text-xs opacity-80">{emissionStatus.details}</p>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              )}
              {emissionStatus.step !== "success" && emissionStatus.step !== "error" && emissionStatus.step !== "idle" && (
                <p className="text-sm text-center text-muted-foreground">
                  {emissionStatus.message}
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            {(emissionStatus.step === "success" || emissionStatus.step === "error") && (
              <Button onClick={handleCloseEmissionDialog}>
                Fechar
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
