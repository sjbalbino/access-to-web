import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useSilos } from '@/hooks/useSilos';
import { useInscricoesSocio } from '@/hooks/useInscricoesSocio';
import { useInscricoesComSaldo } from '@/hooks/useSaldosDeposito';
import { useProdutosSementes } from '@/hooks/useProdutosSementes';
import { useGranjas } from '@/hooks/useGranjas';
import { useSafras } from '@/hooks/useSafras';
import { useCfops } from '@/hooks/useCfops';
import { useInscricaoEmitentePrincipal } from '@/hooks/useInscricaoEmitentePrincipal';
import { useInscricoesCompletas } from '@/hooks/useInscricoesCompletas';
import { useCreateCompraCereal, useUpdateCompraCereal, type CompraCereal } from '@/hooks/useComprasCereais';
import { useFocusNfe } from '@/hooks/useFocusNfe';
import { NotaReferenciadaForm, NotaReferenciadaTemp } from '@/components/deposito/NotaReferenciadaForm';
import { useNotasReferenciadasCompra, useSyncNotasReferenciadasCompra } from '@/hooks/useCompraCereaisNotasReferenciadas';
import { toast } from 'sonner';
import { toast as toastHook } from '@/hooks/use-toast';
import { CurrencyInput } from '@/components/ui/currency-input';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import type { NotaFiscalData, NotaFiscalItemData } from '@/lib/focusNfeMapper';
import { Plus, Trash2, Loader2, CheckCircle2, XCircle, Check, Send } from 'lucide-react';

type EmissionStep = "idle" | "validating" | "saving" | "creating" | "sending" | "processing" | "success" | "error";

interface EmissionStatus {
  step: EmissionStep;
  message: string;
  progress: number;
  details?: string;
}

interface CompraDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  compra?: CompraCereal | null;
}

export function CompraDialog({ open, onOpenChange, compra }: CompraDialogProps) {
  // Internal selection states
  const [granjaId, setGranjaId] = useState('');
  const [safraId, setSafraId] = useState('');
  const [produtoId, setProdutoId] = useState('');
  
  const [dataCompra, setDataCompra] = useState(new Date().toISOString().split('T')[0]);
  const [siloId, setSiloId] = useState('');
  const [inscricaoCompradorId, setInscricaoCompradorId] = useState('');
  const [inscricaoVendedorId, setInscricaoVendedorId] = useState('');
  const [quantidadeKg, setQuantidadeKg] = useState(0);
  const [valorUnitarioKg, setValorUnitarioKg] = useState(0);
  const [valorTotal, setValorTotal] = useState(0);
  const [observacao, setObservacao] = useState('');

  // Notas referenciadas
  const [notasReferenciadas, setNotasReferenciadas] = useState<NotaReferenciadaTemp[]>([]);
  const [showNotaForm, setShowNotaForm] = useState(false);

  // Estado de emissão
  const [isEmitting, setIsEmitting] = useState(false);
  const [emissionStatus, setEmissionStatus] = useState<EmissionStatus>({
    step: "idle",
    message: "",
    progress: 0,
  });

  const { data: granjas } = useGranjas();
  const { data: safras } = useSafras();
  const { data: produtos } = useProdutosSementes();
  const { data: silos } = useSilos();
  const { data: inscricoesSocio } = useInscricoesSocio();
  const { data: inscricoesComSaldo } = useInscricoesComSaldo({ 
    safraId, 
    granjaId 
  });
  const { data: todasInscricoes } = useInscricoesCompletas();
  const { cfops } = useCfops();
  const { data: inscricaoPrincipal } = useInscricaoEmitentePrincipal(granjaId || undefined);
  const { emitirNfe, pollStatus } = useFocusNfe();

  const createCompra = useCreateCompraCereal();
  const updateCompra = useUpdateCompraCereal();
  const syncNotasReferenciadas = useSyncNotasReferenciadasCompra();
  
  // Carregar notas referenciadas existentes da compra
  const { data: notasExistentes } = useNotasReferenciadasCompra(compra?.id);

  const isEditing = !!compra;
  const emitente = inscricaoPrincipal?.emitente;

  // Dados do comprador selecionado
  const inscricaoComprador = useMemo(() => {
    return todasInscricoes?.find(i => i.id === inscricaoCompradorId);
  }, [todasInscricoes, inscricaoCompradorId]);

  // Dados do vendedor selecionado
  const inscricaoVendedor = useMemo(() => {
    return todasInscricoes?.find(i => i.id === inscricaoVendedorId);
  }, [todasInscricoes, inscricaoVendedorId]);

  // Granja selecionada
  const granjaSelecionada = useMemo(() => {
    return granjas?.find(g => g.id === granjaId);
  }, [granjas, granjaId]);

  // Safra selecionada
  const safraSelecionada = useMemo(() => {
    return safras?.find(s => s.id === safraId);
  }, [safras, safraId]);

  // CFOP para compra (1102 = dentro do estado, 2102 = fora do estado)
  const cfopCompra = useMemo(() => {
    if (!inscricaoPrincipal?.uf || !inscricaoVendedor?.uf) return null;
    const mesmoEstado = inscricaoPrincipal.uf === inscricaoVendedor.uf;
    const codigoCfop = mesmoEstado ? '1102' : '2102';
    return cfops.find(c => c.codigo === codigoCfop);
  }, [cfops, inscricaoPrincipal?.uf, inscricaoVendedor?.uf]);

  // Carregar notas referenciadas existentes quando abrir edição
  useEffect(() => {
    if (notasExistentes && notasExistentes.length > 0) {
      const notas: NotaReferenciadaTemp[] = notasExistentes.map(n => ({
        tipo: n.tipo as 'nfe' | 'nfp',
        chave_nfe: n.chave_nfe || undefined,
        nfp_uf: n.nfp_uf || undefined,
        nfp_aamm: n.nfp_aamm || undefined,
        nfp_cnpj: n.nfp_cnpj || undefined,
        nfp_cpf: n.nfp_cpf || undefined,
        nfp_ie: n.nfp_ie || undefined,
        nfp_serie: n.nfp_serie ? parseInt(n.nfp_serie, 10) : undefined,
        nfp_numero: n.nfp_numero ? parseInt(n.nfp_numero, 10) : undefined,
      }));
      setNotasReferenciadas(notas);
    }
  }, [notasExistentes]);

  useEffect(() => {
    if (compra) {
      setGranjaId(compra.granja_id || '');
      setSafraId(compra.safra_id || '');
      setProdutoId(compra.produto_id || '');
      setDataCompra(compra.data_compra || new Date().toISOString().split('T')[0]);
      setSiloId(compra.silo_id || '');
      setInscricaoCompradorId(compra.inscricao_comprador_id || '');
      setInscricaoVendedorId(compra.inscricao_vendedor_id || '');
      setQuantidadeKg(compra.quantidade_kg || 0);
      setValorUnitarioKg(compra.valor_unitario_kg || 0);
      setValorTotal(compra.valor_total || 0);
      setObservacao(compra.observacao || '');
      // Notas referenciadas são carregadas pelo useEffect acima (notasExistentes)
      if (!compra.id) {
        setNotasReferenciadas([]);
      }
    } else {
      resetForm();
    }
  }, [compra, open]);

  useEffect(() => {
    setValorTotal(quantidadeKg * valorUnitarioKg);
  }, [quantidadeKg, valorUnitarioKg]);

  // Reset vendedor when granja/safra changes (only in new mode)
  useEffect(() => {
    if (!isEditing) {
      setInscricaoVendedorId('');
    }
  }, [granjaId, safraId, isEditing]);

  const resetForm = () => {
    setGranjaId('');
    setSafraId('');
    setProdutoId('');
    setDataCompra(new Date().toISOString().split('T')[0]);
    setSiloId('');
    setInscricaoCompradorId('');
    setInscricaoVendedorId('');
    setQuantidadeKg(0);
    setValorUnitarioKg(0);
    setValorTotal(0);
    setObservacao('');
    setNotasReferenciadas([]);
    setEmissionStatus({ step: "idle", message: "", progress: 0 });
  };

  const handleAddNotaReferenciada = (nota: NotaReferenciadaTemp) => {
    setNotasReferenciadas(prev => [...prev, nota]);
    setShowNotaForm(false);
  };

  const handleRemoveNotaReferenciada = (index: number) => {
    setNotasReferenciadas(prev => prev.filter((_, i) => i !== index));
  };

  const validateForm = (): boolean => {
    if (!granjaId || !safraId || !produtoId) {
      toast.error('Selecione Granja, Safra e Produto');
      return false;
    }
    if (!inscricaoCompradorId || !inscricaoVendedorId || quantidadeKg <= 0) {
      toast.error('Preencha todos os campos obrigatórios');
      return false;
    }
    return true;
  };

  const getDadosCompra = () => ({
    granja_id: granjaId,
    safra_id: safraId,
    produto_id: produtoId,
    inscricao_comprador_id: inscricaoCompradorId,
    inscricao_vendedor_id: inscricaoVendedorId,
    silo_id: siloId || null,
    data_compra: dataCompra,
    quantidade_kg: quantidadeKg,
    valor_unitario_kg: valorUnitarioKg,
    valor_total: valorTotal,
    observacao,
  });

  // Converter notas temp para formato de input para sincronização
  const notasParaSync = () => notasReferenciadas.map(n => ({
    tipo: n.tipo,
    chave_nfe: n.tipo === 'nfe' ? n.chave_nfe : null,
    nfp_uf: n.tipo === 'nfp' ? n.nfp_uf : null,
    nfp_aamm: n.tipo === 'nfp' ? n.nfp_aamm : null,
    nfp_cnpj: n.tipo === 'nfp' ? n.nfp_cnpj : null,
    nfp_cpf: n.tipo === 'nfp' ? n.nfp_cpf : null,
    nfp_ie: n.tipo === 'nfp' ? n.nfp_ie : null,
    nfp_modelo: n.tipo === 'nfp' ? '04' : null,
    nfp_serie: n.tipo === 'nfp' ? String(n.nfp_serie || '') : null,
    nfp_numero: n.tipo === 'nfp' ? String(n.nfp_numero || '') : null,
  }));

  // Apenas salvar a compra (com notas referenciadas)
  const handleSubmit = async () => {
    if (!validateForm()) return;

    const dados = getDadosCompra();

    try {
      let compraId: string;
      
      if (isEditing && compra) {
        await updateCompra.mutateAsync({ id: compra.id, ...dados });
        compraId = compra.id;
        toast.success('Compra atualizada com sucesso!');
      } else {
        const novaCompra = await createCompra.mutateAsync(dados);
        compraId = novaCompra.id;
        toast.success('Compra registrada com sucesso!');
      }
      
      // Sincronizar notas referenciadas
      await syncNotasReferenciadas.mutateAsync({
        compraId,
        notas: notasParaSync(),
      });
      
      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error('Erro ao salvar compra:', error);
    }
  };

  const getStepStatus = (step: EmissionStep): "pending" | "active" | "completed" | "error" => {
    const steps: EmissionStep[] = ["validating", "saving", "creating", "sending", "processing"];
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

  // Salvar + Emitir NF-e
  const handleSubmitAndEmit = async () => {
    if (!validateForm()) return;

    // Validações extras para emissão
    if (!emitente) {
      toastHook({
        title: "Emitente não configurado",
        description: "Configure um emitente de NFe para esta granja.",
        variant: "destructive",
      });
      return;
    }

    if (!inscricaoPrincipal) {
      toastHook({
        title: "Inscrição do emitente não configurada",
        description: "Defina uma inscrição estadual como emitente principal para esta granja.",
        variant: "destructive",
      });
      return;
    }

    if (!inscricaoPrincipal.cpf_cnpj || !inscricaoPrincipal.inscricao_estadual) {
      toastHook({
        title: "Dados do emitente incompletos",
        description: "A inscrição do emitente principal precisa ter CPF/CNPJ e Inscrição Estadual.",
        variant: "destructive",
      });
      return;
    }

    if (!cfopCompra) {
      toastHook({
        title: "CFOP não encontrado",
        description: "O CFOP 1102/2102 não está cadastrado no sistema.",
        variant: "destructive",
      });
      return;
    }

    setIsEmitting(true);
    setEmissionStatus({ step: "validating", message: "Validando dados...", progress: 5 });

    try {
      const dados = getDadosCompra();
      let compraId: string;

      // Step 1: Salvar compra
      setEmissionStatus({ step: "saving", message: "Salvando compra...", progress: 15 });
      
      if (isEditing && compra) {
        await updateCompra.mutateAsync({ id: compra.id, ...dados });
        compraId = compra.id;
      } else {
        const novaCompra = await createCompra.mutateAsync(dados);
        compraId = novaCompra.id;
      }

      // Step 2: Buscar dados necessários
      const produto = produtos?.find(p => p.id === produtoId);
      const proximoNumero = (emitente.numero_atual_nfe || 0) + 1;

      // Montar informações complementares
      const infoComplementar = (() => {
        const partes: string[] = [];
        
        if (safraSelecionada?.nome) {
          partes.push(`Safra: ${safraSelecionada.nome}`);
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
        
        return partes.join(" | ") || null;
      })();

      // Step 3: Criar nota fiscal
      setEmissionStatus({ step: "creating", message: "Criando nota fiscal...", progress: 30 });

      const { data: notaFiscal, error: notaError } = await supabase
        .from('notas_fiscais')
        .insert({
          granja_id: granjaId,
          emitente_id: emitente.id,
          cfop_id: cfopCompra.id,
          natureza_operacao: cfopCompra.natureza_operacao || 'COMPRA PARA COMERCIALIZACAO',
          numero: proximoNumero,
          serie: emitente.serie_nfe || 1,
          data_emissao: new Date().toISOString(),
          data_saida_entrada: new Date().toISOString(),
          operacao: 0, // Entrada
          finalidade: 1, // Normal
          info_complementar: infoComplementar,
          // Destinatário (VENDEDOR - produtor que está vendendo)
          dest_tipo: inscricaoVendedor?.cpf_cnpj && inscricaoVendedor.cpf_cnpj.replace(/\D/g, '').length > 11 ? 'juridica' : 'fisica',
          dest_cpf_cnpj: inscricaoVendedor?.cpf_cnpj,
          dest_nome: inscricaoVendedor?.produtores?.nome || inscricaoVendedor?.granja,
          dest_ie: inscricaoVendedor?.inscricao_estadual,
          dest_logradouro: inscricaoVendedor?.logradouro,
          dest_numero: inscricaoVendedor?.numero,
          dest_complemento: inscricaoVendedor?.complemento,
          dest_bairro: inscricaoVendedor?.bairro,
          dest_cidade: inscricaoVendedor?.cidade,
          dest_uf: inscricaoVendedor?.uf,
          dest_cep: inscricaoVendedor?.cep?.replace(/\D/g, '') || null,
          dest_telefone: inscricaoVendedor?.telefone,
          dest_email: inscricaoVendedor?.email,
          // Totais
          total_produtos: valorTotal,
          total_nota: valorTotal,
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
          cfop: cfopCompra.codigo,
          unidade: 'KG',
          quantidade: quantidadeKg,
          valor_unitario: valorUnitarioKg,
          valor_total: valorTotal,
          origem: 0,
          cst_icms: cfopCompra.cst_icms_padrao || '41',
          cst_pis: cfopCompra.cst_pis_padrao || '08',
          cst_cofins: cfopCompra.cst_cofins_padrao || '08',
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

      // Step 4: Enviar à SEFAZ
      setEmissionStatus({ step: "sending", message: "Enviando para SEFAZ...", progress: 50 });

      // Montar dados para emissão
      const notaDataParaEmissao: NotaFiscalData = {
        id: notaFiscal.id,
        data_emissao: new Date().toISOString(),
        natureza_operacao: cfopCompra.natureza_operacao || 'COMPRA PARA COMERCIALIZACAO',
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
        // Destinatário (VENDEDOR)
        dest_cpf_cnpj: inscricaoVendedor?.cpf_cnpj || null,
        dest_nome: inscricaoVendedor?.produtores?.nome || inscricaoVendedor?.granja || null,
        dest_ie: inscricaoVendedor?.inscricao_estadual || null,
        dest_logradouro: inscricaoVendedor?.logradouro || null,
        dest_numero: inscricaoVendedor?.numero || null,
        dest_bairro: inscricaoVendedor?.bairro || null,
        dest_cidade: inscricaoVendedor?.cidade || null,
        dest_uf: inscricaoVendedor?.uf || null,
        dest_cep: inscricaoVendedor?.cep?.replace(/\D/g, '') || null,
        dest_telefone: inscricaoVendedor?.telefone || null,
        dest_email: inscricaoVendedor?.email || null,
        dest_tipo: inscricaoVendedor?.cpf_cnpj && inscricaoVendedor.cpf_cnpj.replace(/\D/g, '').length > 11 ? '1' : '0',
        // Emitente (COMPRADOR - sócio principal da granja)
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
        cfop: cfopCompra.codigo,
        unidade: 'KG',
        quantidade: quantidadeKg,
        valor_unitario: valorUnitarioKg,
        valor_total: valorTotal,
        origem: 0,
        cst_icms: cfopCompra.cst_icms_padrao || '41',
        modalidade_bc_icms: 0,
        base_icms: 0,
        aliq_icms: 0,
        valor_icms: 0,
        cst_pis: cfopCompra.cst_pis_padrao || '08',
        base_pis: 0,
        aliq_pis: 0,
        valor_pis: 0,
        cst_cofins: cfopCompra.cst_cofins_padrao || '08',
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
        // Step 5: Polling de status
        setEmissionStatus({ step: "processing", message: "Aguardando retorno da SEFAZ...", progress: 70 });
        
        const statusResult = await pollStatus(String(resultEmissao.data.ref), notaFiscal.id, 30, 3000);
        
        if (statusResult.success && statusResult.data?.status === "autorizado") {
          // Atualizar compra com nota_fiscal_id e status
          await supabase
            .from('compras_cereais')
            .update({ 
              nota_fiscal_id: notaFiscal.id, 
              status: 'faturada' 
            })
            .eq('id', compraId);

          setEmissionStatus({
            step: "success",
            message: "NF-e Autorizada!",
            progress: 100,
            details: `Protocolo: ${String(statusResult.data?.protocolo || "N/A")}`,
          });
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
    } catch (error: any) {
      console.error('Erro na emissão:', error);
      setEmissionStatus({
        step: "error",
        message: "Erro ao processar",
        progress: 100,
        details: error.message || "Tente novamente.",
      });
    } finally {
      setIsEmitting(false);
    }
  };

  const handleCloseDialog = () => {
    if (isEmitting) return;
    
    if (emissionStatus.step === "success") {
      onOpenChange(false);
      resetForm();
    } else {
      onOpenChange(false);
    }
  };

  const produtoSelecionado = produtos?.find(p => p.id === produtoId);

  // Verificar se já tem NF-e emitida (não pode emitir novamente)
  const jaTemNfe = isEditing && compra?.nota_fiscal_id;

  return (
    <>
      <Dialog open={open} onOpenChange={handleCloseDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Editar Compra' : 'Nova Compra de Cereais'}</DialogTitle>
            {!isEditing && (
              <DialogDescription>
                Registre a compra e emita a NF-e de entrada diretamente
              </DialogDescription>
            )}
          </DialogHeader>

          {/* Painel de progresso durante emissão */}
          {emissionStatus.step !== "idle" && (
            <Card className="mb-4">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  {emissionStatus.step === "success" ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : emissionStatus.step === "error" ? (
                    <XCircle className="h-5 w-5 text-destructive" />
                  ) : (
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  )}
                  Emissão de NF-e
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Progress value={emissionStatus.progress} />
                  <p className="text-xs text-center text-muted-foreground">
                    {emissionStatus.progress}%
                  </p>
                </div>

                <div className="space-y-2">
                  {[
                    { step: "validating" as EmissionStep, label: "Validando dados" },
                    { step: "saving" as EmissionStep, label: "Salvando compra" },
                    { step: "creating" as EmissionStep, label: "Criando nota fiscal" },
                    { step: "sending" as EmissionStep, label: "Enviando para SEFAZ" },
                    { step: "processing" as EmissionStep, label: "Aguardando retorno" },
                  ].map(({ step, label }) => {
                    const status = getStepStatus(step);
                    return (
                      <div key={step} className="flex items-center gap-3">
                        <div className={cn(
                          "w-5 h-5 rounded-full flex items-center justify-center text-xs",
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
                            <span>•</span>
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

                {emissionStatus.step === "success" && (
                  <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <AlertTitle className="text-green-600">NF-e Autorizada!</AlertTitle>
                    <AlertDescription>
                      {emissionStatus.details}
                    </AlertDescription>
                  </Alert>
                )}

                {emissionStatus.step === "error" && (
                  <Alert variant="destructive">
                    <XCircle className="h-4 w-4" />
                    <AlertTitle>Erro na Emissão</AlertTitle>
                    <AlertDescription>
                      <p>{emissionStatus.message}</p>
                      {emissionStatus.details && (
                        <p className="text-xs mt-1 opacity-80">{emissionStatus.details}</p>
                      )}
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          )}

          {/* Formulário principal - esconder durante emissão em progresso */}
          {(emissionStatus.step === "idle" || emissionStatus.step === "success" || emissionStatus.step === "error") && (
            <div className="grid gap-4 py-4">
              {/* Granja, Safra, Produto selection */}
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Granja *</Label>
                  <Select value={granjaId} onValueChange={setGranjaId} disabled={isEmitting}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {granjas?.map(g => (
                        <SelectItem key={g.id} value={g.id}>{g.razao_social}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Safra *</Label>
                  <Select value={safraId} onValueChange={setSafraId} disabled={isEmitting}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {safras?.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Produto *</Label>
                  <Select value={produtoId} onValueChange={setProdutoId} disabled={isEmitting}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {produtos?.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Info do Produto selecionado */}
              {produtoSelecionado && (
                <div className="p-3 bg-muted rounded-lg">
                  <span className="text-sm text-muted-foreground">Produto selecionado: </span>
                  <span className="font-medium">{produtoSelecionado.nome}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Data da Compra</Label>
                  <Input
                    type="date"
                    value={dataCompra}
                    onChange={e => setDataCompra(e.target.value)}
                    disabled={isEmitting}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Silo</Label>
                  <Select value={siloId} onValueChange={setSiloId} disabled={isEmitting}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {silos?.map(s => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Comprador (Sócio) *</Label>
                <Select value={inscricaoCompradorId} onValueChange={setInscricaoCompradorId} disabled={isEmitting}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o comprador..." />
                  </SelectTrigger>
                  <SelectContent>
                    {inscricoesSocio?.map(i => (
                      <SelectItem key={i.id} value={i.id}>
                        {i.produtores?.nome} - IE: {i.inscricao_estadual}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Vendedor (Produtor com saldo) *</Label>
                <Select 
                  value={inscricaoVendedorId} 
                  onValueChange={setInscricaoVendedorId}
                  disabled={!granjaId || !safraId || isEmitting}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={!granjaId || !safraId ? "Selecione Granja e Safra primeiro" : "Selecione o vendedor..."} />
                  </SelectTrigger>
                  <SelectContent>
                    {inscricoesComSaldo?.map(i => (
                      <SelectItem key={i.id} value={i.id}>
                        {i.produtor_nome} - IE: {i.inscricao_estadual} ({i.total_depositado?.toLocaleString('pt-BR')} kg)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Quantidade (kg) *</Label>
                  <Input
                    type="number"
                    value={quantidadeKg || ''}
                    onChange={e => setQuantidadeKg(Number(e.target.value))}
                    min={0}
                    disabled={isEmitting}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Valor Unitário (R$/kg)</Label>
                  <CurrencyInput
                    value={valorUnitarioKg}
                    onChange={setValorUnitarioKg}
                    disabled={isEmitting}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Valor Total</Label>
                  <CurrencyInput
                    value={valorTotal}
                    onChange={setValorTotal}
                    disabled
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Observações</Label>
                <Textarea
                  value={observacao}
                  onChange={e => setObservacao(e.target.value)}
                  placeholder="Observações..."
                  rows={2}
                  disabled={isEmitting}
                />
              </div>

              {/* Seção de Notas Referenciadas */}
              {!jaTemNfe && (
                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium">
                        Notas do Produtor Vendedor (NFP/NFe) 
                        {notasReferenciadas.length > 0 && (
                          <Badge variant="secondary" className="ml-2">{notasReferenciadas.length}</Badge>
                        )}
                      </CardTitle>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowNotaForm(true)}
                        disabled={isEmitting}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Adicionar
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Se o produtor vendedor emitiu uma NFP ou NFe, adicione a referência aqui antes de emitir.
                    </p>
                  </CardHeader>
                  <CardContent>
                    {notasReferenciadas.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Nenhuma nota referenciada adicionada
                      </p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Tipo</TableHead>
                            <TableHead>Número/Chave</TableHead>
                            <TableHead className="w-20">Ações</TableHead>
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
                              <TableCell className="font-mono text-xs">
                                {nota.tipo === 'nfe' 
                                  ? nota.chave_nfe 
                                  : `${nota.nfp_numero}/${nota.nfp_serie} - ${nota.nfp_uf}`}
                              </TableCell>
                              <TableCell>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRemoveNotaReferenciada(index)}
                                  disabled={isEmitting}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            {emissionStatus.step === "success" ? (
              <Button onClick={handleCloseDialog}>
                Fechar
              </Button>
            ) : emissionStatus.step === "error" ? (
              <>
                <Button variant="outline" onClick={() => setEmissionStatus({ step: "idle", message: "", progress: 0 })}>
                  Voltar
                </Button>
                <Button onClick={handleCloseDialog}>
                  Fechar
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={handleCloseDialog} disabled={isEmitting}>
                  Cancelar
                </Button>
                <Button 
                  onClick={handleSubmit} 
                  disabled={createCompra.isPending || updateCompra.isPending || isEmitting}
                  variant="secondary"
                >
                  {isEditing ? 'Salvar' : 'Registrar Compra'}
                </Button>
                {!jaTemNfe && (
                  <Button 
                    onClick={handleSubmitAndEmit} 
                    disabled={createCompra.isPending || updateCompra.isPending || isEmitting}
                  >
                    {isEmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Processando...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        {isEditing ? 'Salvar e Emitir NF-e' : 'Registrar e Emitir NF-e'}
                      </>
                    )}
                  </Button>
                )}
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para adicionar nota referenciada */}
      <NotaReferenciadaForm
        open={showNotaForm}
        onOpenChange={setShowNotaForm}
        onAdd={handleAddNotaReferenciada}
        inscricao={inscricaoVendedor}
      />
    </>
  );
}
