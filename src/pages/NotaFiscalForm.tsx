import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ArrowLeft, FileText, AlertCircle, Plus, Pencil, Trash2, Save, Send, Loader2, CheckCircle2, XCircle, Download } from "lucide-react";
import { useNotasFiscais, useNotaFiscalItens, NotaFiscalInsert, NotaFiscalItemInsert } from "@/hooks/useNotasFiscais";
import { useCfops } from "@/hooks/useCfops";
import { useEmitentesNfe } from "@/hooks/useEmitentesNfe";
import { useInscricoesParceria } from "@/hooks/useInscricoesParceria";
import { useClientesFornecedores } from "@/hooks/useClientesFornecedores";
import { useProdutores } from "@/hooks/useProdutores";
import { useProdutos } from "@/hooks/useProdutos";
import { useUnidadesMedida } from "@/hooks/useUnidadesMedida";
import { useAuth } from "@/contexts/AuthContext";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import { useFocusNfe } from "@/hooks/useFocusNfe";
import type { NotaFiscalData, NotaFiscalItemData } from "@/lib/focusNfeMapper";

const OPERACOES = [
  { value: 0, label: "Entrada" },
  { value: 1, label: "Saída" },
];

const FINALIDADES = [
  { value: 1, label: "Normal" },
  { value: 2, label: "Complementar" },
  { value: 3, label: "Ajuste" },
  { value: 4, label: "Devolução" },
];

const MODALIDADES_FRETE = [
  { value: 0, label: "Por conta do emitente" },
  { value: 1, label: "Por conta do destinatário" },
  { value: 2, label: "Por conta de terceiros" },
  { value: 9, label: "Sem frete" },
];

const FORMAS_PAGAMENTO = [
  { value: 0, label: "À vista" },
  { value: 1, label: "A prazo" },
];

const TIPOS_PAGAMENTO = [
  { value: "01", label: "Dinheiro" },
  { value: "02", label: "Cheque" },
  { value: "03", label: "Cartão de Crédito" },
  { value: "04", label: "Cartão de Débito" },
  { value: "05", label: "Crédito Loja" },
  { value: "10", label: "Vale Alimentação" },
  { value: "11", label: "Vale Refeição" },
  { value: "12", label: "Vale Presente" },
  { value: "13", label: "Vale Combustível" },
  { value: "14", label: "Duplicata Mercantil" },
  { value: "15", label: "Boleto Bancário" },
  { value: "16", label: "Depósito Bancário" },
  { value: "17", label: "PIX" },
  { value: "18", label: "Transferência bancária" },
  { value: "90", label: "Sem Pagamento" },
  { value: "99", label: "Outros" },
];

const UFS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS",
  "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC",
  "SP", "SE", "TO",
];

const formatCurrency = (value: number | null) => {
  if (!value) return "R$ 0,00";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

export default function NotaFiscalForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;

  const { notasFiscais, createNotaFiscal, updateNotaFiscal, isLoading: isLoadingNotas } = useNotasFiscais();
  const { itens, createItem, updateItem, deleteItem, isLoading: isLoadingItens } = useNotaFiscalItens(id || null);
  const { cfops } = useCfops();
  const { emitentes } = useEmitentesNfe();
  const inscricoesParceriaQuery = useInscricoesParceria();
  const inscricoesParceria = inscricoesParceriaQuery.data || [];
  const clientesQuery = useClientesFornecedores();
  const clientesFornecedores = clientesQuery.data || [];
  const produtoresQuery = useProdutores();
  const produtores = produtoresQuery.data || [];
  const produtosQuery = useProdutos();
  const produtos = produtosQuery.data || [];
  const unidadesQuery = useUnidadesMedida();
  const unidadesMedida = unidadesQuery.data || [];
  const { user } = useAuth();
  const focusNfe = useFocusNfe();

  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isEmitting, setIsEmitting] = useState(false);

  const existingNota = isEditing ? notasFiscais.find((n) => n.id === id) : null;

  const [formData, setFormData] = useState<Partial<NotaFiscalInsert>>({
    emitente_id: "",
    granja_id: "",
    inscricao_produtor_id: "",
    data_emissao: new Date().toISOString().slice(0, 10),
    operacao: 1,
    natureza_operacao: "",
    finalidade: 1,
    cfop_id: "",
    dest_tipo: "PJ",
    dest_cpf_cnpj: "",
    dest_nome: "",
    dest_ie: "",
    dest_email: "",
    dest_telefone: "",
    dest_logradouro: "",
    dest_numero: "",
    dest_complemento: "",
    dest_bairro: "",
    dest_cidade: "",
    dest_uf: "",
    dest_cep: "",
    ind_consumidor_final: 0,
    ind_presenca: 9,
    modalidade_frete: 9,
    forma_pagamento: 0,
    tipo_pagamento: "90",
    info_complementar: "",
    observacoes: "",
  });

  const [itemFormData, setItemFormData] = useState<Partial<NotaFiscalItemInsert>>({
    produto_id: "",
    codigo: "",
    descricao: "",
    ncm: "",
    cfop: "",
    unidade: "",
    quantidade: 1,
    valor_unitario: 0,
    valor_total: 0,
    valor_desconto: 0,
    origem: 0,
    cst_icms: "00",
    aliq_icms: 0,
    cst_pis: "01",
    aliq_pis: 1.65,
    cst_cofins: "01",
    aliq_cofins: 7.6,
  });

  // Load existing nota data
  useEffect(() => {
    if (existingNota) {
      setFormData({
        emitente_id: existingNota.emitente_id || "",
        granja_id: existingNota.granja_id || "",
        inscricao_produtor_id: existingNota.inscricao_produtor_id || "",
        data_emissao: existingNota.data_emissao ? existingNota.data_emissao.slice(0, 10) : "",
        operacao: existingNota.operacao || 1,
        natureza_operacao: existingNota.natureza_operacao || "",
        finalidade: existingNota.finalidade || 1,
        cfop_id: existingNota.cfop_id || "",
        dest_tipo: existingNota.dest_tipo || "PJ",
        dest_cpf_cnpj: existingNota.dest_cpf_cnpj || "",
        dest_nome: existingNota.dest_nome || "",
        dest_ie: existingNota.dest_ie || "",
        dest_email: existingNota.dest_email || "",
        dest_telefone: existingNota.dest_telefone || "",
        dest_logradouro: existingNota.dest_logradouro || "",
        dest_numero: existingNota.dest_numero || "",
        dest_complemento: existingNota.dest_complemento || "",
        dest_bairro: existingNota.dest_bairro || "",
        dest_cidade: existingNota.dest_cidade || "",
        dest_uf: existingNota.dest_uf || "",
        dest_cep: existingNota.dest_cep || "",
        ind_consumidor_final: existingNota.ind_consumidor_final || 0,
        ind_presenca: existingNota.ind_presenca || 9,
        modalidade_frete: existingNota.modalidade_frete || 9,
        forma_pagamento: existingNota.forma_pagamento || 0,
        tipo_pagamento: existingNota.tipo_pagamento || "90",
        info_complementar: existingNota.info_complementar || "",
        observacoes: existingNota.observacoes || "",
      });
    }
  }, [existingNota]);

  // Auto-fill natureza_operacao from CFOP
  useEffect(() => {
    if (formData.cfop_id) {
      const cfop = cfops.find((c) => c.id === formData.cfop_id);
      if (cfop?.natureza_operacao && !formData.natureza_operacao) {
        setFormData((prev) => ({
          ...prev,
          natureza_operacao: cfop.natureza_operacao || "",
        }));
      }
    }
  }, [formData.cfop_id, cfops]);

  // Auto-fill granja_id from emitente
  useEffect(() => {
    if (formData.emitente_id) {
      const emitente = emitentes.find((e) => e.id === formData.emitente_id);
      if (emitente?.granja_id) {
        setFormData((prev) => ({
          ...prev,
          granja_id: emitente.granja_id || "",
        }));
      }
    }
  }, [formData.emitente_id, emitentes]);

  // Calculate item total
  useEffect(() => {
    const total = (itemFormData.quantidade || 0) * (itemFormData.valor_unitario || 0);
    setItemFormData((prev) => ({
      ...prev,
      valor_total: total - (prev.valor_desconto || 0),
    }));
  }, [itemFormData.quantidade, itemFormData.valor_unitario, itemFormData.valor_desconto]);

  // Auto-fill item data from product
  const handleProductSelect = (produtoId: string) => {
    const produto = produtos.find((p) => p.id === produtoId);
    if (produto) {
      const unidade = unidadesMedida.find((u) => u.id === produto.unidade_medida_id);
      setItemFormData((prev) => ({
        ...prev,
        produto_id: produtoId,
        codigo: produto.codigo || "",
        descricao: produto.nome,
        ncm: produto.ncm || "",
        unidade: unidade?.sigla || unidade?.codigo || "UN",
        valor_unitario: produto.preco_venda || produto.preco_custo || 0,
      }));
    }
  };

  // Auto-fill destinatário from cliente/fornecedor
  const handleClienteSelect = (clienteId: string) => {
    const cliente = clientesFornecedores.find((c) => c.id === clienteId);
    if (cliente) {
      setFormData((prev) => ({
        ...prev,
        cliente_fornecedor_id: clienteId,
        dest_tipo: cliente.tipo_pessoa === "fisica" ? "PF" : "PJ",
        dest_cpf_cnpj: cliente.cpf_cnpj || "",
        dest_nome: cliente.nome,
        dest_ie: cliente.inscricao_estadual || "",
        dest_email: cliente.email || "",
        dest_telefone: cliente.telefone || cliente.celular || "",
        dest_logradouro: cliente.logradouro || "",
        dest_numero: cliente.numero || "",
        dest_complemento: cliente.complemento || "",
        dest_bairro: cliente.bairro || "",
        dest_cidade: cliente.cidade || "",
        dest_uf: cliente.uf || "",
        dest_cep: cliente.cep || "",
      }));
    }
  };

  const cleanDigits = (
    value: string | null | undefined,
    maxLen?: number
  ): string | null => {
    if (!value) return null;
    const digits = value.replace(/\D/g, "");
    const trimmed = maxLen ? digits.slice(0, maxLen) : digits;
    return trimmed.length ? trimmed : null;
  };

  // Remove mask from CEP (keep only digits)
  const cleanCep = (cep: string | null | undefined): string | null => cleanDigits(cep, 8);

  const handleSaveDraft = async () => {
    if (!formData.natureza_operacao) {
      toast.error("Natureza da operação é obrigatória");
      return;
    }

    const emitente = emitentes.find((e) => e.id === formData.emitente_id);
    const inscricao = inscricoesParceria.find((i) => i.id === formData.inscricao_produtor_id);
    const granjaId = formData.granja_id || inscricao?.granja_id || emitente?.granja_id || "";

    if (!formData.inscricao_produtor_id) {
      toast.error("Selecione uma Inscrição do Produtor");
      return;
    }

    if (!formData.emitente_id) {
      toast.error("Selecione uma configuração de API (Emitente)");
      return;
    }

    setIsSaving(true);
    try {
      const totals = calculateTotals();
      const notaData: NotaFiscalInsert = {
        ...formData,
        emitente_id: formData.emitente_id,
        granja_id: granjaId,
        inscricao_produtor_id: formData.inscricao_produtor_id,
        data_emissao: formData.data_emissao || null,
        dest_cpf_cnpj: cleanDigits(formData.dest_cpf_cnpj, 14),
        dest_ie: cleanDigits(formData.dest_ie, 14),
        dest_telefone: cleanDigits(formData.dest_telefone, 14),
        dest_cep: cleanCep(formData.dest_cep),
        status: "rascunho",
        total_produtos: totals.totalProdutos,
        total_nota: totals.totalNota,
        total_icms: totals.totalIcms,
        total_pis: totals.totalPis,
        total_cofins: totals.totalCofins,
        valor_pagamento: totals.totalNota,
      } as NotaFiscalInsert;

      if (isEditing) {
        await updateNotaFiscal.mutateAsync({ id, ...notaData });
        toast.success("Rascunho atualizado!");
      } else {
        const result = await createNotaFiscal.mutateAsync(notaData);
        navigate(`/notas-fiscais/${result.id}`);
        toast.success("Rascunho criado!");
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEmitirNfe = async () => {
    if (!id || itens.length === 0) {
      toast.error("Salve o rascunho e adicione itens antes de emitir");
      return;
    }

    const emitente = emitentes.find((e) => e.id === formData.emitente_id);
    const inscricao = inscricoesParceria.find((i) => i.id === formData.inscricao_produtor_id);

    if (!emitente) {
      toast.error("Selecione um emitente (configuração API)");
      return;
    }

    if (!emitente.api_configurada) {
      toast.error("Configure a API do emitente antes de emitir");
      return;
    }

    if (!inscricao) {
      toast.error("Selecione uma Inscrição do Produtor (Parceria)");
      return;
    }

     if (!inscricao.cpf_cnpj || !inscricao.inscricao_estadual) {
       toast.error("Dados do emitente incompletos", {
         description: "Preencha CPF/CNPJ e Inscrição Estadual na Inscrição do Produtor.",
       });
       return;
     }
 
     if (!formData.data_emissao) {
       toast.error("Data de emissão é obrigatória");
       return;
     }
 
     if (!inscricao.logradouro || !inscricao.cidade || !inscricao.uf) {
       toast.error("Endereço do emitente incompleto", {
         description: "Preencha logradouro, cidade e UF na Inscrição do Produtor.",
       });
       return;
     }
 
     setIsEmitting(true);
    try {
       const notaData: NotaFiscalData = {
         id,
         data_emissao: formData.data_emissao || null,
         natureza_operacao: formData.natureza_operacao || "",
         operacao: formData.operacao ?? 1,
         finalidade: formData.finalidade ?? 1,
         ind_consumidor_final: formData.ind_consumidor_final ?? 0,
         ind_presenca: formData.ind_presenca ?? 9,
         modalidade_frete: formData.modalidade_frete ?? 9,
         forma_pagamento: formData.forma_pagamento ?? 0,
         info_complementar: formData.info_complementar || null,
         info_fisco: null,
         dest_cpf_cnpj: formData.dest_cpf_cnpj || null,
         dest_nome: formData.dest_nome || null,
         dest_ie: formData.dest_ie || null,
         dest_logradouro: formData.dest_logradouro || null,
         dest_numero: formData.dest_numero || null,
         dest_bairro: formData.dest_bairro || null,
         dest_cidade: formData.dest_cidade || null,
         dest_uf: formData.dest_uf || null,
         dest_cep: formData.dest_cep || null,
         dest_tipo: formData.dest_tipo || null,
         dest_email: formData.dest_email || null,
         dest_telefone: formData.dest_telefone || null,
         inscricaoProdutor: {
           cpf_cnpj: inscricao.cpf_cnpj,
           inscricao_estadual: inscricao.inscricao_estadual,
           logradouro: inscricao.logradouro,
           numero: inscricao.numero,
           complemento: inscricao.complemento,
           bairro: inscricao.bairro,
           cidade: inscricao.cidade,
           uf: inscricao.uf,
           cep: inscricao.cep,
           produtorNome: inscricao.produtores?.nome || null,
           granjaNome: inscricao.granjas?.razao_social || inscricao.granjas?.nome_fantasia || null,
         },
         emitente: emitente ? { crt: emitente.crt } : undefined,
       };

      const itensData: NotaFiscalItemData[] = itens.map((item) => ({
        numero_item: item.numero_item,
        codigo: item.codigo,
        descricao: item.descricao,
        cfop: item.cfop,
        unidade: item.unidade,
        quantidade: item.quantidade,
        valor_unitario: item.valor_unitario,
        valor_total: item.valor_total,
        ncm: item.ncm,
        origem: item.origem,
        cst_icms: item.cst_icms,
        modalidade_bc_icms: (item as any).modalidade_bc_icms ?? null,
        base_icms: item.base_icms,
        aliq_icms: item.aliq_icms,
        valor_icms: item.valor_icms,
        cst_pis: item.cst_pis,
        base_pis: item.base_pis,
        aliq_pis: item.aliq_pis,
        valor_pis: item.valor_pis,
        cst_cofins: item.cst_cofins,
        base_cofins: item.base_cofins,
        aliq_cofins: item.aliq_cofins,
        valor_cofins: item.valor_cofins,
        cst_ipi: item.cst_ipi,
        base_ipi: item.base_ipi,
        aliq_ipi: item.aliq_ipi,
        valor_ipi: item.valor_ipi,
        valor_desconto: item.valor_desconto,
        valor_frete: (item as any).valor_frete ?? null,
        valor_seguro: (item as any).valor_seguro ?? null,
        valor_outros: (item as any).valor_outros ?? null,
      }));

      const result = await focusNfe.emitirNfe(id, notaData, itensData);

      if (result.success && result.ref) {
        // Start polling for status updates
        focusNfe.pollStatus(result.ref as string, id);
      }
    } catch (error) {
      console.error("Erro ao emitir:", error);
    } finally {
      setIsEmitting(false);
    }
  };

  const calculateTotals = () => {
    const totalProdutos = itens.reduce((acc, item) => acc + (item.valor_total || 0), 0);
    const totalDesconto = itens.reduce((acc, item) => acc + (item.valor_desconto || 0), 0);
    const totalIcms = itens.reduce((acc, item) => acc + (item.valor_icms || 0), 0);
    const totalPis = itens.reduce((acc, item) => acc + (item.valor_pis || 0), 0);
    const totalCofins = itens.reduce((acc, item) => acc + (item.valor_cofins || 0), 0);
    const totalNota = totalProdutos - totalDesconto;

    return { totalProdutos, totalDesconto, totalIcms, totalPis, totalCofins, totalNota };
  };

  const handleOpenItemDialog = (item?: any) => {
    if (item) {
      setSelectedItem(item);
      setItemFormData({
        produto_id: item.produto_id || "",
        codigo: item.codigo || "",
        descricao: item.descricao || "",
        ncm: item.ncm || "",
        cfop: item.cfop || "",
        unidade: item.unidade || "",
        quantidade: item.quantidade || 1,
        valor_unitario: item.valor_unitario || 0,
        valor_total: item.valor_total || 0,
        valor_desconto: item.valor_desconto || 0,
        origem: item.origem || 0,
        cst_icms: item.cst_icms || "00",
        aliq_icms: item.aliq_icms || 0,
        cst_pis: item.cst_pis || "01",
        aliq_pis: item.aliq_pis || 1.65,
        cst_cofins: item.cst_cofins || "01",
        aliq_cofins: item.aliq_cofins || 7.6,
      });
    } else {
      setSelectedItem(null);
      setItemFormData({
        produto_id: "",
        codigo: "",
        descricao: "",
        ncm: "",
        cfop: formData.cfop_id ? cfops.find((c) => c.id === formData.cfop_id)?.codigo || "" : "",
        unidade: "",
        quantidade: 1,
        valor_unitario: 0,
        valor_total: 0,
        valor_desconto: 0,
        origem: 0,
        cst_icms: "00",
        aliq_icms: 0,
        cst_pis: "01",
        aliq_pis: 1.65,
        cst_cofins: "01",
        aliq_cofins: 7.6,
      });
    }
    setIsItemDialogOpen(true);
  };

  const handleSaveItem = async () => {
    if (!itemFormData.descricao) {
      toast.error("Descrição do item é obrigatória");
      return;
    }
    if (!id) {
      toast.error("Salve o rascunho da nota primeiro");
      return;
    }

    const base = itemFormData.valor_total || 0;
    const itemData = {
      nota_fiscal_id: id,
      numero_item: selectedItem ? selectedItem.numero_item : itens.length + 1,
      produto_id: itemFormData.produto_id || null,
      codigo: itemFormData.codigo || null,
      descricao: itemFormData.descricao!,
      ncm: itemFormData.ncm || null,
      cfop: itemFormData.cfop || null,
      unidade: itemFormData.unidade || "UN",
      quantidade: itemFormData.quantidade || 1,
      valor_unitario: itemFormData.valor_unitario || 0,
      valor_total: itemFormData.valor_total || 0,
      valor_desconto: itemFormData.valor_desconto || 0,
      origem: itemFormData.origem || 0,
      cst_icms: itemFormData.cst_icms || null,
      base_icms: base,
      aliq_icms: itemFormData.aliq_icms || 0,
      valor_icms: base * ((itemFormData.aliq_icms || 0) / 100),
      cst_pis: itemFormData.cst_pis || null,
      base_pis: base,
      aliq_pis: itemFormData.aliq_pis || 0,
      valor_pis: base * ((itemFormData.aliq_pis || 0) / 100),
      cst_cofins: itemFormData.cst_cofins || null,
      base_cofins: base,
      aliq_cofins: itemFormData.aliq_cofins || 0,
      valor_cofins: base * ((itemFormData.aliq_cofins || 0) / 100),
    } as any;

    if (selectedItem) {
      await updateItem.mutateAsync({ id: selectedItem.id, ...itemData });
    } else {
      await createItem.mutateAsync(itemData);
    }
    setIsItemDialogOpen(false);
  };

  const totals = calculateTotals();

  if (isLoadingNotas) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <Spinner />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/notas-fiscais")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <PageHeader
            title={isEditing ? "Editar NF-e" : "Nova NF-e"}
            description="Emissão de Nota Fiscal Eletrônica (NT 2025.002)"
          />
        </div>

        {/* Alert based on API configuration and inscription */}
        {(() => {
          const emitente = emitentes.find((e) => e.id === formData.emitente_id);
          const inscricao = inscricoesParceria.find((i) => i.id === formData.inscricao_produtor_id);
          const apiConfigurada = emitente?.api_configurada;
          const inscricaoSelecionada = !!inscricao;
          
          if (apiConfigurada && inscricaoSelecionada) {
            return (
              <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertTitle className="text-green-600">Pronto para Emitir</AlertTitle>
                <AlertDescription>
                  Emitente: {inscricao.produtores?.nome} - IE: {inscricao.inscricao_estadual}. Clique em "Emitir NF-e" quando estiver pronto.
                </AlertDescription>
              </Alert>
            );
          }
          if (!inscricaoSelecionada) {
            return (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Selecione uma Inscrição do Produtor</AlertTitle>
                <AlertDescription>
                  Escolha uma inscrição do produtor (tipo Parceria) para definir os dados fiscais do emitente.
                </AlertDescription>
              </Alert>
            );
          }
          return (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>API não configurada</AlertTitle>
              <AlertDescription>
                Configure a API Focus NFe no emitente para emitir NF-e reais.
              </AlertDescription>
            </Alert>
          );
        })()}

        {/* Status Badge and Actions */}
        {existingNota && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Status:</span>
                <Badge variant={
                  existingNota.status === "autorizada" ? "default" :
                  existingNota.status === "rejeitada" || existingNota.status === "cancelada" || existingNota.status === "erro_autorizacao" ? "destructive" :
                  "secondary"
                }>
                  {existingNota.status}
                </Badge>
                {existingNota.protocolo && (
                  <span className="text-xs text-muted-foreground font-mono ml-2">
                    Protocolo: {existingNota.protocolo}
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                {existingNota.danfe_url && (
                  <Button variant="outline" size="sm" onClick={() => focusNfe.downloadArquivo(`nfe_${id}`, "danfe")}>
                    <Download className="h-4 w-4 mr-1" /> DANFE
                  </Button>
                )}
                {existingNota.xml_url && (
                  <Button variant="outline" size="sm" onClick={() => focusNfe.downloadArquivo(`nfe_${id}`, "xml")}>
                    <Download className="h-4 w-4 mr-1" /> XML
                  </Button>
                )}
              </div>
            </div>
            
            {existingNota.chave_acesso && (
              <div className="text-xs text-muted-foreground font-mono bg-muted/50 p-2 rounded">
                <span className="font-semibold">Chave de Acesso:</span> {existingNota.chave_acesso}
              </div>
            )}

            {/* Retorno SEFAZ */}
            {existingNota.motivo_status && (
              <Alert variant={
                existingNota.status === "autorizada" ? "default" : 
                existingNota.status === "rejeitada" || existingNota.status === "erro_autorizacao" ? "destructive" : 
                "default"
              }>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Retorno SEFAZ</AlertTitle>
                <AlertDescription className="mt-2">
                  <div className="font-mono text-sm whitespace-pre-wrap break-words">
                    {existingNota.motivo_status}
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* Emitente */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Emitente</CardTitle>
            <CardDescription>
              Selecione a inscrição do produtor (tipo Parceria) como emitente fiscal e a configuração de API
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="inscricao_produtor_id">Inscrição do Produtor (Parceria) *</Label>
                <Select
                  value={formData.inscricao_produtor_id || ""}
                  onValueChange={(value) => {
                    const inscricao = inscricoesParceria.find((i) => i.id === value);
                    setFormData({ 
                      ...formData, 
                      inscricao_produtor_id: value,
                      granja_id: inscricao?.granja_id || "",
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a inscrição" />
                  </SelectTrigger>
                  <SelectContent>
                    {inscricoesParceria.map((inscricao) => (
                      <SelectItem key={inscricao.id} value={inscricao.id}>
                        {inscricao.produtores?.nome} - IE: {inscricao.inscricao_estadual} ({inscricao.granjas?.razao_social || inscricao.granja})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="emitente_id">Configuração API (Emitente NF-e) *</Label>
                <Select
                  value={formData.emitente_id || ""}
                  onValueChange={(value) => setFormData({ ...formData, emitente_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o emitente" />
                  </SelectTrigger>
                  <SelectContent>
                    {emitentes.filter((e) => e.ativo).map((emitente) => (
                      <SelectItem key={emitente.id} value={emitente.id}>
                        {emitente.granja?.nome_fantasia || emitente.granja?.razao_social}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Operação */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Dados da Operação</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="operacao">Operação</Label>
                <Select
                  value={String(formData.operacao)}
                  onValueChange={(value) => setFormData({ ...formData, operacao: Number(value) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {OPERACOES.map((op) => (
                      <SelectItem key={op.value} value={String(op.value)}>
                        {op.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="finalidade">Finalidade</Label>
                <Select
                  value={String(formData.finalidade)}
                  onValueChange={(value) => setFormData({ ...formData, finalidade: Number(value) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FINALIDADES.map((fin) => (
                      <SelectItem key={fin.value} value={String(fin.value)}>
                        {fin.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="cfop_id">CFOP</Label>
                <Select
                  value={formData.cfop_id || ""}
                  onValueChange={(value) => setFormData({ ...formData, cfop_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o CFOP" />
                  </SelectTrigger>
                  <SelectContent>
                    {cfops
                      .filter((c) => c.ativo && (formData.operacao === 1 ? c.tipo === "saida" : c.tipo === "entrada"))
                      .map((cfop) => (
                        <SelectItem key={cfop.id} value={cfop.id}>
                          {cfop.codigo} - {cfop.descricao.substring(0, 60)}...
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="data_emissao">Data de Emissão *</Label>
                <Input
                  id="data_emissao"
                  type="date"
                  value={formData.data_emissao || ""}
                  onChange={(e) => setFormData({ ...formData, data_emissao: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="natureza_operacao">Natureza da Operação *</Label>
              <Input
                id="natureza_operacao"
                value={formData.natureza_operacao || ""}
                onChange={(e) => setFormData({ ...formData, natureza_operacao: e.target.value })}
                placeholder="Ex: Venda de Produção"
                maxLength={60}
              />
            </div>
          </CardContent>
        </Card>

        {/* Destinatário */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Destinatário</CardTitle>
            <CardDescription>
              Selecione um cliente/fornecedor existente ou preencha manualmente
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Importar de Cliente/Fornecedor</Label>
              <Select onValueChange={handleClienteSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione para importar dados" />
                </SelectTrigger>
                <SelectContent>
                  {clientesFornecedores.filter((c) => c.ativo).map((cliente) => (
                    <SelectItem key={cliente.id} value={cliente.id}>
                      {cliente.nome} {cliente.cpf_cnpj && `- ${cliente.cpf_cnpj}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dest_tipo">Tipo</Label>
                <Select
                  value={formData.dest_tipo || "PJ"}
                  onValueChange={(value) => setFormData({ ...formData, dest_tipo: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PF">Pessoa Física</SelectItem>
                    <SelectItem value="PJ">Pessoa Jurídica</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="dest_cpf_cnpj">{formData.dest_tipo === "PF" ? "CPF" : "CNPJ"}</Label>
                <Input
                  id="dest_cpf_cnpj"
                  value={formData.dest_cpf_cnpj || ""}
                  onChange={(e) => setFormData({ ...formData, dest_cpf_cnpj: e.target.value })}
                  maxLength={14}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dest_ie">Inscrição Estadual</Label>
                <Input
                  id="dest_ie"
                  value={formData.dest_ie || ""}
                  onChange={(e) => setFormData({ ...formData, dest_ie: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dest_nome">Nome/Razão Social</Label>
              <Input
                id="dest_nome"
                value={formData.dest_nome || ""}
                onChange={(e) => setFormData({ ...formData, dest_nome: e.target.value })}
                maxLength={60}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dest_email">E-mail</Label>
                <Input
                  id="dest_email"
                  type="email"
                  value={formData.dest_email || ""}
                  onChange={(e) => setFormData({ ...formData, dest_email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dest_telefone">Telefone</Label>
                <Input
                  id="dest_telefone"
                  value={formData.dest_telefone || ""}
                  onChange={(e) => setFormData({ ...formData, dest_telefone: e.target.value })}
                />
              </div>
            </div>

            <Separator />
            <p className="text-sm font-medium">Endereço</p>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dest_cep">CEP</Label>
                <Input
                  id="dest_cep"
                  value={formData.dest_cep || ""}
                  onChange={(e) => setFormData({ ...formData, dest_cep: e.target.value })}
                  maxLength={8}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="dest_logradouro">Logradouro</Label>
                <Input
                  id="dest_logradouro"
                  value={formData.dest_logradouro || ""}
                  onChange={(e) => setFormData({ ...formData, dest_logradouro: e.target.value })}
                  maxLength={60}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dest_numero">Número</Label>
                <Input
                  id="dest_numero"
                  value={formData.dest_numero || ""}
                  onChange={(e) => setFormData({ ...formData, dest_numero: e.target.value })}
                  maxLength={10}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dest_complemento">Complemento</Label>
                <Input
                  id="dest_complemento"
                  value={formData.dest_complemento || ""}
                  onChange={(e) => setFormData({ ...formData, dest_complemento: e.target.value })}
                  maxLength={60}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dest_bairro">Bairro</Label>
                <Input
                  id="dest_bairro"
                  value={formData.dest_bairro || ""}
                  onChange={(e) => setFormData({ ...formData, dest_bairro: e.target.value })}
                  maxLength={60}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dest_cidade">Cidade</Label>
                <Input
                  id="dest_cidade"
                  value={formData.dest_cidade || ""}
                  onChange={(e) => setFormData({ ...formData, dest_cidade: e.target.value })}
                  maxLength={60}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dest_uf">UF</Label>
                <Select
                  value={formData.dest_uf || ""}
                  onValueChange={(value) => setFormData({ ...formData, dest_uf: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="UF" />
                  </SelectTrigger>
                  <SelectContent>
                    {UFS.map((uf) => (
                      <SelectItem key={uf} value={uf}>
                        {uf}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Itens */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Itens da NF-e</CardTitle>
                <CardDescription>
                  {isEditing ? "Adicione produtos à nota fiscal" : "Salve o rascunho primeiro para adicionar itens"}
                </CardDescription>
              </div>
              {isEditing && (
                <Button onClick={() => handleOpenItemDialog()} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Item
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {!isEditing ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Salve o rascunho da nota para adicionar itens
              </p>
            ) : isLoadingItens ? (
              <div className="flex justify-center py-4">
                <Spinner />
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead className="w-20">NCM</TableHead>
                      <TableHead className="w-16">Un.</TableHead>
                      <TableHead className="text-right w-20">Qtd.</TableHead>
                      <TableHead className="text-right w-28">Vlr Unit.</TableHead>
                      <TableHead className="text-right w-28">Total</TableHead>
                      <TableHead className="w-20">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {itens.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.numero_item}</TableCell>
                        <TableCell className="truncate max-w-[200px]">{item.descricao}</TableCell>
                        <TableCell className="font-mono text-xs">{item.ncm || "-"}</TableCell>
                        <TableCell>{item.unidade}</TableCell>
                        <TableCell className="text-right">{item.quantidade}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.valor_unitario)}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(item.valor_total)}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenItemDialog(item)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteItem.mutate(item.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {itens.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-4 text-muted-foreground">
                          Nenhum item adicionado
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                  {itens.length > 0 && (
                    <TableFooter>
                      <TableRow>
                        <TableCell colSpan={6} className="text-right font-medium">
                          Total Produtos:
                        </TableCell>
                        <TableCell className="text-right font-bold">
                          {formatCurrency(totals.totalProdutos)}
                        </TableCell>
                        <TableCell />
                      </TableRow>
                    </TableFooter>
                  )}
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Transporte e Pagamento */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Transporte</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="modalidade_frete">Modalidade do Frete</Label>
                <Select
                  value={String(formData.modalidade_frete)}
                  onValueChange={(value) => setFormData({ ...formData, modalidade_frete: Number(value) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MODALIDADES_FRETE.map((mod) => (
                      <SelectItem key={mod.value} value={String(mod.value)}>
                        {mod.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Pagamento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="forma_pagamento">Forma</Label>
                  <Select
                    value={String(formData.forma_pagamento)}
                    onValueChange={(value) => setFormData({ ...formData, forma_pagamento: Number(value) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FORMAS_PAGAMENTO.map((forma) => (
                        <SelectItem key={forma.value} value={String(forma.value)}>
                          {forma.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tipo_pagamento">Tipo</Label>
                  <Select
                    value={formData.tipo_pagamento || "90"}
                    onValueChange={(value) => setFormData({ ...formData, tipo_pagamento: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIPOS_PAGAMENTO.map((tipo) => (
                        <SelectItem key={tipo.value} value={tipo.value}>
                          {tipo.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Informações Adicionais */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Informações Adicionais</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="info_complementar">Informações Complementares (impresso no DANFE)</Label>
              <Textarea
                id="info_complementar"
                value={formData.info_complementar || ""}
                onChange={(e) => setFormData({ ...formData, info_complementar: e.target.value })}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="observacoes">Observações Internas</Label>
              <Textarea
                id="observacoes"
                value={formData.observacoes || ""}
                onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        {/* Totais */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Totais</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Total Produtos</p>
                <p className="text-lg font-semibold">{formatCurrency(totals.totalProdutos)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Desconto</p>
                <p className="text-lg font-semibold">{formatCurrency(totals.totalDesconto)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total ICMS</p>
                <p className="text-lg font-semibold">{formatCurrency(totals.totalIcms)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Nota</p>
                <p className="text-2xl font-bold text-primary">{formatCurrency(totals.totalNota)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Button variant="outline" onClick={() => navigate("/notas-fiscais")}>
            Cancelar
          </Button>
          <Button onClick={handleSaveDraft} disabled={isSaving}>
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? "Salvando..." : "Salvar Rascunho"}
          </Button>
          {(() => {
            const emitente = emitentes.find((e) => e.id === formData.emitente_id);
            const canEmit = isEditing && itens.length > 0 && emitente?.api_configurada && existingNota?.status === "rascunho";
            
            return (
              <Button 
                onClick={handleEmitirNfe} 
                disabled={!canEmit || isEmitting || focusNfe.isLoading}
                variant={canEmit ? "default" : "secondary"}
              >
                {isEmitting || focusNfe.isLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                {isEmitting ? "Emitindo..." : focusNfe.status === "processando" ? "Processando..." : "Emitir NF-e"}
              </Button>
            );
          })()}
        </div>

        {/* Item Dialog */}
        <Dialog open={isItemDialogOpen} onOpenChange={setIsItemDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedItem ? "Editar Item" : "Adicionar Item"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {/* Produto */}
              <div className="space-y-2">
                <Label>Produto</Label>
                <Select
                  value={itemFormData.produto_id || ""}
                  onValueChange={handleProductSelect}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um produto" />
                  </SelectTrigger>
                  <SelectContent>
                    {produtos.filter((p) => p.ativo).map((produto) => (
                      <SelectItem key={produto.id} value={produto.id}>
                        {produto.codigo && `${produto.codigo} - `}{produto.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="item_codigo">Código</Label>
                  <Input
                    id="item_codigo"
                    value={itemFormData.codigo || ""}
                    onChange={(e) => setItemFormData({ ...itemFormData, codigo: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="item_ncm">NCM</Label>
                  <Input
                    id="item_ncm"
                    value={itemFormData.ncm || ""}
                    onChange={(e) => setItemFormData({ ...itemFormData, ncm: e.target.value })}
                    maxLength={8}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="item_descricao">Descrição *</Label>
                <Input
                  id="item_descricao"
                  value={itemFormData.descricao || ""}
                  onChange={(e) => setItemFormData({ ...itemFormData, descricao: e.target.value })}
                  maxLength={120}
                />
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="item_cfop">CFOP</Label>
                  <Input
                    id="item_cfop"
                    value={itemFormData.cfop || ""}
                    onChange={(e) => setItemFormData({ ...itemFormData, cfop: e.target.value })}
                    maxLength={4}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="item_unidade">Unidade</Label>
                  <Input
                    id="item_unidade"
                    value={itemFormData.unidade || ""}
                    onChange={(e) => setItemFormData({ ...itemFormData, unidade: e.target.value })}
                    maxLength={6}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="item_quantidade">Quantidade</Label>
                  <Input
                    id="item_quantidade"
                    type="number"
                    step="0.0001"
                    value={itemFormData.quantidade || 0}
                    onChange={(e) => setItemFormData({ ...itemFormData, quantidade: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="item_valor_unitario">Valor Unitário</Label>
                  <Input
                    id="item_valor_unitario"
                    type="number"
                    step="0.01"
                    value={itemFormData.valor_unitario || 0}
                    onChange={(e) => setItemFormData({ ...itemFormData, valor_unitario: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="item_valor_desconto">Desconto</Label>
                  <Input
                    id="item_valor_desconto"
                    type="number"
                    step="0.01"
                    value={itemFormData.valor_desconto || 0}
                    onChange={(e) => setItemFormData({ ...itemFormData, valor_desconto: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="item_valor_total">Valor Total</Label>
                  <Input
                    id="item_valor_total"
                    type="number"
                    step="0.01"
                    value={itemFormData.valor_total || 0}
                    readOnly
                    className="bg-muted"
                  />
                </div>
              </div>

              <Separator />
              <p className="text-sm font-medium">Tributação</p>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="item_cst_icms">CST ICMS</Label>
                  <Input
                    id="item_cst_icms"
                    value={itemFormData.cst_icms || ""}
                    onChange={(e) => setItemFormData({ ...itemFormData, cst_icms: e.target.value })}
                    maxLength={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="item_aliq_icms">Alíq. ICMS (%)</Label>
                  <Input
                    id="item_aliq_icms"
                    type="number"
                    step="0.01"
                    value={itemFormData.aliq_icms || 0}
                    onChange={(e) => setItemFormData({ ...itemFormData, aliq_icms: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="item_cst_pis">CST PIS</Label>
                  <Input
                    id="item_cst_pis"
                    value={itemFormData.cst_pis || ""}
                    onChange={(e) => setItemFormData({ ...itemFormData, cst_pis: e.target.value })}
                    maxLength={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="item_aliq_pis">Alíq. PIS (%)</Label>
                  <Input
                    id="item_aliq_pis"
                    type="number"
                    step="0.0001"
                    value={itemFormData.aliq_pis || 0}
                    onChange={(e) => setItemFormData({ ...itemFormData, aliq_pis: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="item_cst_cofins">CST COFINS</Label>
                  <Input
                    id="item_cst_cofins"
                    value={itemFormData.cst_cofins || ""}
                    onChange={(e) => setItemFormData({ ...itemFormData, cst_cofins: e.target.value })}
                    maxLength={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="item_aliq_cofins">Alíq. COFINS (%)</Label>
                  <Input
                    id="item_aliq_cofins"
                    type="number"
                    step="0.0001"
                    value={itemFormData.aliq_cofins || 0}
                    onChange={(e) => setItemFormData({ ...itemFormData, aliq_cofins: Number(e.target.value) })}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsItemDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSaveItem}>
                {selectedItem ? "Atualizar" : "Adicionar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
