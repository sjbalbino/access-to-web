import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp, ArrowLeft, Save, Truck, FileText, Printer } from "lucide-react";
import { gerarExtratoContrato } from "@/lib/contratoVendaPdf";
import {
  useContratoVenda,
  useCreateContratoVenda,
  useUpdateContratoVenda,
  useProximoNumeroContrato,
  ContratoVendaInsert,
} from "@/hooks/useContratosVenda";
import { useRemessasVenda } from "@/hooks/useRemessasVenda";
import { useSafras } from "@/hooks/useSafras";
import { useProdutos } from "@/hooks/useProdutos";
import { useClientesFornecedores } from "@/hooks/useClientesFornecedores";
import { useAllInscricoes } from "@/hooks/useAllInscricoes";
import { useGranjas } from "@/hooks/useGranjas";
import { Spinner } from "@/components/ui/spinner";
import { CurrencyInput } from "@/components/ui/currency-input";
import { QuantityInput } from "@/components/ui/quantity-input";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface FormData {
  numero: number;
  safra_id: string;
  produto_id: string;
  data_contrato: string;
  nota_venda: string;
  numero_contrato_comprador: string;
  inscricao_produtor_id: string;
  comprador_id: string;
  tipo_venda: string;
  quantidade_kg: number | null;
  quantidade_sacos: number | null;
  preco_kg: number | null;
  valor_total: number | null;
  local_entrega_nome: string;
  local_entrega_cnpj_cpf: string;
  local_entrega_ie: string;
  local_entrega_logradouro: string;
  local_entrega_numero: string;
  local_entrega_complemento: string;
  local_entrega_bairro: string;
  local_entrega_cidade: string;
  local_entrega_uf: string;
  local_entrega_cep: string;
  corretor: string;
  percentual_comissao: number | null;
  valor_comissao: number | null;
  data_pagamento_comissao: string;
  modalidade_frete: number;
  venda_entrega_futura: boolean;
  a_fixar: boolean;
  exportacao: boolean;
  remessa_deposito: boolean;
  retorno_deposito: boolean;
  observacoes: string;
  granja_id: string;
}

export default function VendaProducaoForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = !!id;
  const [corretorOpen, setCorretorOpen] = useState(false);
  const [loadedContractId, setLoadedContractId] = useState<string | null>(null);
  const [formResetDone, setFormResetDone] = useState(!isEditing);

  const { data: contrato, isLoading: loadingContrato } = useContratoVenda(id);
  const { data: remessas } = useRemessasVenda(id);
  const { data: proximoNumero } = useProximoNumeroContrato();
  const { data: safras } = useSafras();
  const { data: produtos } = useProdutos();
  const { data: clientes } = useClientesFornecedores();
  const { data: inscricoes } = useAllInscricoes();
  const { data: granjas } = useGranjas();

  const createContrato = useCreateContratoVenda();
  const updateContrato = useUpdateContratoVenda();

  const { register, handleSubmit, watch, setValue, reset } = useForm<FormData>({
    defaultValues: {
      numero: 0,
      safra_id: "",
      produto_id: "",
      data_contrato: "",
      nota_venda: "",
      numero_contrato_comprador: "",
      inscricao_produtor_id: "",
      comprador_id: "",
      tipo_venda: "industria",
      quantidade_kg: null,
      quantidade_sacos: null,
      preco_kg: null,
      valor_total: null,
      local_entrega_nome: "",
      local_entrega_cnpj_cpf: "",
      local_entrega_ie: "",
      local_entrega_logradouro: "",
      local_entrega_numero: "",
      local_entrega_complemento: "",
      local_entrega_bairro: "",
      local_entrega_cidade: "",
      local_entrega_uf: "",
      local_entrega_cep: "",
      corretor: "",
      percentual_comissao: null,
      valor_comissao: null,
      data_pagamento_comissao: "",
      modalidade_frete: 0,
      venda_entrega_futura: false,
      a_fixar: false,
      exportacao: false,
      remessa_deposito: false,
      retorno_deposito: false,
      observacoes: "",
      granja_id: "",
    },
  });

  const compradores = clientes?.filter(c => c.tipo === "cliente" || c.tipo === "ambos") || [];
  const inscricoesParceria = inscricoes?.filter(i => i.tipo === "parceria" || i.produtores?.tipo_produtor === "parceiro") || [];

  // Check if all required data is loaded for the form
  const isDataReady = !!(safras && produtos && clientes);
  const isFormReady = isEditing ? !!(contrato && isDataReady) : isDataReady;

  // When switching routes (editar/novo), force a new "reset cycle"
  useEffect(() => {
    if (isEditing) {
      setFormResetDone(false);
      setLoadedContractId(null);
    } else {
      setFormResetDone(true);
    }
  }, [isEditing, id]);

  // Watch values for calculations
  const quantidadeKg = watch("quantidade_kg");
  const precoKg = watch("preco_kg");
  const compradorId = watch("comprador_id");
  const percentualComissao = watch("percentual_comissao");
  const valorTotal = watch("valor_total");
  const vendaEntregaFutura = watch("venda_entrega_futura");
  const aFixar = watch("a_fixar");

  // Calculate if contract is closed (saldo <= 0)
  const isContratoFechado = contrato && (contrato.saldo_kg || 0) <= 0;

  // Auto-calculate valor_total
  useEffect(() => {
    const total = (quantidadeKg || 0) * (precoKg || 0);
    setValue("valor_total", total > 0 ? total : null);
  }, [quantidadeKg, precoKg, setValue]);

  // Auto-calculate valor_comissao
  useEffect(() => {
    const comissao = (valorTotal || 0) * ((percentualComissao || 0) / 100);
    setValue("valor_comissao", comissao > 0 ? comissao : null);
  }, [valorTotal, percentualComissao, setValue]);

  // Auto-fill local_entrega when comprador changes
  useEffect(() => {
    if (compradorId && !isEditing) {
      const comprador = clientes?.find(c => c.id === compradorId);
      if (comprador) {
        setValue("local_entrega_nome", comprador.nome || "");
        setValue("local_entrega_cnpj_cpf", comprador.cpf_cnpj || "");
        setValue("local_entrega_ie", comprador.inscricao_estadual || "");
        setValue("local_entrega_logradouro", comprador.logradouro || "");
        setValue("local_entrega_numero", comprador.numero || "");
        setValue("local_entrega_complemento", comprador.complemento || "");
        setValue("local_entrega_bairro", comprador.bairro || "");
        setValue("local_entrega_cidade", comprador.cidade || "");
        setValue("local_entrega_uf", comprador.uf || "");
        setValue("local_entrega_cep", comprador.cep || "");
      }
    }
  }, [compradorId, clientes, isEditing, setValue]);

  // Load contrato data - only when ALL required data is ready and only once per contract
  useEffect(() => {
    // Only run reset when editing, all data is ready, and this specific contract hasn't been loaded
    if (isEditing && contrato && isDataReady && contrato.id !== loadedContractId) {
      reset({
        numero: contrato.numero,
        safra_id: contrato.safra_id || "",
        produto_id: contrato.produto_id || "",
        data_contrato: contrato.data_contrato || "",
        nota_venda: contrato.nota_venda || "",
        numero_contrato_comprador: contrato.numero_contrato_comprador || "",
        inscricao_produtor_id: contrato.inscricao_produtor_id || "",
        comprador_id: contrato.comprador_id || "",
        tipo_venda: contrato.tipo_venda || "industria",
        quantidade_kg: contrato.quantidade_kg,
        quantidade_sacos: contrato.quantidade_sacos,
        preco_kg: contrato.preco_kg,
        valor_total: contrato.valor_total,
        local_entrega_nome: contrato.local_entrega_nome || "",
        local_entrega_cnpj_cpf: contrato.local_entrega_cnpj_cpf || "",
        local_entrega_ie: contrato.local_entrega_ie || "",
        local_entrega_logradouro: contrato.local_entrega_logradouro || "",
        local_entrega_numero: contrato.local_entrega_numero || "",
        local_entrega_complemento: contrato.local_entrega_complemento || "",
        local_entrega_bairro: contrato.local_entrega_bairro || "",
        local_entrega_cidade: contrato.local_entrega_cidade || "",
        local_entrega_uf: contrato.local_entrega_uf || "",
        local_entrega_cep: contrato.local_entrega_cep || "",
        corretor: contrato.corretor || "",
        percentual_comissao: contrato.percentual_comissao,
        valor_comissao: contrato.valor_comissao,
        data_pagamento_comissao: contrato.data_pagamento_comissao || "",
        modalidade_frete: contrato.modalidade_frete || 0,
        venda_entrega_futura: contrato.venda_entrega_futura || false,
        a_fixar: contrato.a_fixar || false,
        exportacao: contrato.exportacao || false,
        remessa_deposito: contrato.remessa_deposito || false,
        retorno_deposito: contrato.retorno_deposito || false,
        observacoes: contrato.observacoes || "",
        granja_id: contrato.granja_id || "",
      });
      if (contrato.corretor) setCorretorOpen(true);
      setLoadedContractId(contrato.id);
      setFormResetDone(true);
    }
  }, [isEditing, contrato, isDataReady, loadedContractId, reset]);

  // Set initial values for new contracts
  useEffect(() => {
    if (!isEditing && proximoNumero && isDataReady) {
      setValue("numero", proximoNumero);
      setValue("data_contrato", new Date().toISOString().split("T")[0]);
    }
  }, [isEditing, proximoNumero, isDataReady, setValue]);

  const onSubmit = async (data: FormData) => {
    // Validar campo obrigatório
    if (!data.inscricao_produtor_id) {
      toast.error("Selecione o Vendedor (Parceiro)");
      return;
    }

    const payload: ContratoVendaInsert = {
      numero: data.numero,
      data_contrato: data.data_contrato,
      safra_id: data.safra_id || null,
      produto_id: data.produto_id || null,
      nota_venda: data.nota_venda || null,
      numero_contrato_comprador: data.numero_contrato_comprador || null,
      inscricao_produtor_id: data.inscricao_produtor_id || null,
      comprador_id: data.comprador_id || null,
      tipo_venda: data.tipo_venda || null,
      quantidade_kg: data.quantidade_kg,
      quantidade_sacos: data.quantidade_sacos,
      preco_kg: data.preco_kg,
      valor_total: data.valor_total,
      local_entrega_nome: data.local_entrega_nome || null,
      local_entrega_cnpj_cpf: data.local_entrega_cnpj_cpf || null,
      local_entrega_ie: data.local_entrega_ie || null,
      local_entrega_logradouro: data.local_entrega_logradouro || null,
      local_entrega_numero: data.local_entrega_numero || null,
      local_entrega_complemento: data.local_entrega_complemento || null,
      local_entrega_bairro: data.local_entrega_bairro || null,
      local_entrega_cidade: data.local_entrega_cidade || null,
      local_entrega_uf: data.local_entrega_uf || null,
      local_entrega_cep: data.local_entrega_cep || null,
      corretor: data.corretor || null,
      percentual_comissao: data.percentual_comissao,
      valor_comissao: data.valor_comissao,
      data_pagamento_comissao: data.data_pagamento_comissao || null,
      modalidade_frete: data.modalidade_frete,
      venda_entrega_futura: data.venda_entrega_futura,
      a_fixar: data.a_fixar,
      exportacao: data.exportacao,
      remessa_deposito: data.remessa_deposito,
      retorno_deposito: data.retorno_deposito,
      observacoes: data.observacoes || null,
      granja_id: data.granja_id || granjas?.[0]?.id || null,
    };

    if (isEditing) {
      await updateContrato.mutateAsync({ id, ...payload });
    } else {
      await createContrato.mutateAsync(payload);
    }
    navigate("/vendas-producao");
  };

  const formatNumber = (value: number | null | undefined) => {
    if (value === null || value === undefined) return "-";
    return new Intl.NumberFormat("pt-BR", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 3,
    }).format(value);
  };

  const formatCurrency = (value: number | null | undefined) => {
    if (value === null || value === undefined) return "-";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const handleEmitirNfe = () => {
    // Navigate to NFe form or open dialog
    navigate(`/notas-fiscais/nova?contrato=${id}`);
  };

  // Show loading state until ALL data is ready
  if ((loadingContrato && isEditing) || !isFormReady || (isEditing && !formResetDone)) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-96">
          <Spinner />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <form
        key={isEditing ? (loadedContractId ?? id ?? "edit") : "new"}
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-6"
      >
        {/* Header */}
        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-4">
            <Button type="button" variant="ghost" size="icon" onClick={() => navigate("/vendas-producao")} className="shrink-0">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-foreground">
                  {isEditing ? `Contrato #${contrato?.numero}` : "Novo Contrato de Venda"}
                </h1>
                {isEditing && isContratoFechado && (
                  <Badge variant="default" className="bg-green-600">Fechado</Badge>
                )}
              </div>
              <p className="text-muted-foreground text-sm sm:text-base">
                {isEditing ? "Editar contrato de venda" : "Cadastrar novo contrato"}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {isEditing && (
              <>
                <Button type="button" variant="outline" onClick={() => navigate(`/vendas-producao/${id}/remessas`)} className="flex-1 sm:flex-none">
                  <Truck className="h-4 w-4 mr-2" />
                  Remessas
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    if (contrato && remessas) {
                      gerarExtratoContrato(contrato as any, remessas as any);
                    }
                  }} 
                  className="flex-1 sm:flex-none"
                  title="Gerar Extrato PDF"
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Extrato PDF
                </Button>
              </>
            )}
            <Button type="submit" disabled={createContrato.isPending || updateContrato.isPending} className="flex-1 sm:flex-none">
              <Save className="h-4 w-4 mr-2" />
              Salvar
            </Button>
          </div>
        </div>

        {/* Dados da Venda */}
        <Card>
          <CardHeader>
            <CardTitle>Dados da Venda</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
              <div className="space-y-2">
                <Label>Número</Label>
                <Input type="number" {...register("numero", { valueAsNumber: true })} readOnly className="bg-muted" />
              </div>
              <div className="space-y-2 sm:col-span-1 lg:col-span-2">
                <Label>Safra *</Label>
                <Select value={watch("safra_id")} onValueChange={(v) => setValue("safra_id", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {safras?.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 sm:col-span-1 lg:col-span-2">
                <Label>Produto *</Label>
                <Select value={watch("produto_id")} onValueChange={(v) => setValue("produto_id", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {produtos?.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Data *</Label>
                <Input type="date" {...register("data_contrato")} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Nota de Venda</Label>
                <Input {...register("nota_venda")} placeholder="Número da nota" />
              </div>
              <div className="space-y-2">
                <Label>Nº Contrato Comprador</Label>
                <Input {...register("numero_contrato_comprador")} placeholder="Contrato do comprador" />
              </div>
              <div className="space-y-2 sm:col-span-2 lg:col-span-1">
                <Label>Vendedor (Parceiro)</Label>
                <Select value={watch("inscricao_produtor_id")} onValueChange={(v) => setValue("inscricao_produtor_id", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {inscricoesParceria?.map((i) => (
                      <SelectItem key={i.id} value={i.id}>
                        {i.produtores?.nome || i.granjas?.razao_social} - {i.inscricao_estadual}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Comprador e Valores */}
        <Card>
          <CardHeader>
            <CardTitle>Comprador e Valores</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2 sm:col-span-2">
                <Label>Comprador *</Label>
                <Select value={watch("comprador_id")} onValueChange={(v) => setValue("comprador_id", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o comprador..." />
                  </SelectTrigger>
                  <SelectContent>
                    {compradores?.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.nome} {c.cpf_cnpj ? `- ${c.cpf_cnpj}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tipo de Venda</Label>
                <Select value={watch("tipo_venda")} onValueChange={(v) => setValue("tipo_venda", v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="industria">Indústria</SelectItem>
                    <SelectItem value="semente">Semente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Quantidade (kg)</Label>
                <QuantityInput
                  value={watch("quantidade_kg")}
                  onChange={(v) => setValue("quantidade_kg", v)}
                  decimals={3}
                />
              </div>
              <div className="space-y-2">
                <Label>Quantidade (sacos)</Label>
                <QuantityInput
                  value={watch("quantidade_sacos")}
                  onChange={(v) => setValue("quantidade_sacos", v)}
                  decimals={3}
                />
              </div>
              <div className="space-y-2">
                <Label>Preço/kg (R$)</Label>
                <CurrencyInput
                  value={watch("preco_kg")}
                  onChange={(v) => setValue("preco_kg", v)}
                  decimals={10}
                />
              </div>
              <div className="space-y-2">
                <Label>Valor Total (R$)</Label>
                <CurrencyInput
                  value={watch("valor_total")}
                  onChange={(v) => setValue("valor_total", v)}
                  decimals={2}
                  disabled
                  className="bg-muted font-bold"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Local de Entrega */}
        <Card>
          <CardHeader>
            <CardTitle>Local de Entrega</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2 sm:col-span-2">
                <Label>Nome / Razão Social</Label>
                <Input {...register("local_entrega_nome")} />
              </div>
              <div className="space-y-2">
                <Label>CNPJ/CPF</Label>
                <Input {...register("local_entrega_cnpj_cpf")} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>IE</Label>
                <Input {...register("local_entrega_ie")} />
              </div>
              <div className="space-y-2 sm:col-span-1 lg:col-span-2">
                <Label>Logradouro</Label>
                <Input {...register("local_entrega_logradouro")} />
              </div>
              <div className="space-y-2">
                <Label>Número</Label>
                <Input {...register("local_entrega_numero")} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Complemento</Label>
                <Input {...register("local_entrega_complemento")} />
              </div>
              <div className="space-y-2">
                <Label>Bairro</Label>
                <Input {...register("local_entrega_bairro")} />
              </div>
              <div className="space-y-2">
                <Label>Cidade</Label>
                <Input {...register("local_entrega_cidade")} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label>UF</Label>
                  <Input {...register("local_entrega_uf")} maxLength={2} />
                </div>
                <div className="space-y-2">
                  <Label>CEP</Label>
                  <Input {...register("local_entrega_cep")} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Corretor (Collapsible) */}
        <Collapsible open={corretorOpen} onOpenChange={setCorretorOpen}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50">
                <div className="flex items-center justify-between">
                  <CardTitle>Corretor (Opcional)</CardTitle>
                  {corretorOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="space-y-4 pt-0">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div className="space-y-2 col-span-2">
                    <Label>Nome do Corretor</Label>
                    <Input {...register("corretor")} />
                  </div>
                  <div className="space-y-2">
                    <Label>% Comissão</Label>
                    <QuantityInput
                      value={watch("percentual_comissao")}
                      onChange={(v) => setValue("percentual_comissao", v)}
                      decimals={2}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Valor Comissão</Label>
                    <CurrencyInput
                      value={watch("valor_comissao")}
                      onChange={(v) => setValue("valor_comissao", v)}
                      decimals={2}
                      disabled
                      className="bg-muted"
                    />
                  </div>
                </div>
                <div className="space-y-2 sm:w-1/4">
                  <Label>Data Pgto Comissão</Label>
                  <Input type="date" {...register("data_pagamento_comissao")} />
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Tipo de Contrato e Condição de Venda - 2 Cards lado a lado */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Card 1: Tipo de Contrato (seleção única) */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Tipo de Contrato</CardTitle>
            </CardHeader>
            <CardContent>
              <RadioGroup
                value={
                  watch("exportacao") ? "exportacao" :
                  watch("remessa_deposito") ? "remessa" :
                  watch("retorno_deposito") ? "retorno" :
                  "normal"
                }
                onValueChange={(value) => {
                  setValue("exportacao", value === "exportacao");
                  setValue("remessa_deposito", value === "remessa");
                  setValue("retorno_deposito", value === "retorno");
                }}
                className="space-y-3"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="normal" id="tipo_normal" />
                  <Label htmlFor="tipo_normal" className="font-normal cursor-pointer">Venda Normal</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="exportacao" id="tipo_exportacao" />
                  <Label htmlFor="tipo_exportacao" className="font-normal cursor-pointer">Exportação</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="remessa" id="tipo_remessa" />
                  <Label htmlFor="tipo_remessa" className="font-normal cursor-pointer">Remessa p/ Depósito</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="retorno" id="tipo_retorno" />
                  <Label htmlFor="tipo_retorno" className="font-normal cursor-pointer">Retorno de Depósito</Label>
                </div>
              </RadioGroup>
            </CardContent>
          </Card>

          {/* Card 2: Condição de Venda (múltipla seleção) */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Condição de Venda</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="venda_entrega_futura"
                    checked={watch("venda_entrega_futura")}
                    onCheckedChange={(c) => setValue("venda_entrega_futura", !!c)}
                  />
                  <Label htmlFor="venda_entrega_futura" className="font-normal cursor-pointer">Venda para Entrega Futura</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="a_fixar"
                    checked={watch("a_fixar")}
                    onCheckedChange={(c) => setValue("a_fixar", !!c)}
                  />
                  <Label htmlFor="a_fixar" className="font-normal cursor-pointer">Preço a Fixar</Label>
                </div>
              </div>
              
              {/* Botão Emitir NFe - aparece se marcou uma das opções */}
              {isEditing && (vendaEntregaFutura || aFixar) && (
                <Button type="button" variant="outline" onClick={handleEmitirNfe} className="w-full mt-4">
                  <FileText className="h-4 w-4 mr-2" />
                  Emitir NFe
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Frete e Observações */}
        <Card>
          <CardHeader>
            <CardTitle>Frete e Observações</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Modalidade Frete</Label>
                <Select 
                  value={watch("modalidade_frete")?.toString()} 
                  onValueChange={(v) => setValue("modalidade_frete", parseInt(v))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">0 - Por conta do Emitente (CIF)</SelectItem>
                    <SelectItem value="1">1 - Por conta do Destinatário (FOB)</SelectItem>
                    <SelectItem value="2">2 - Por conta de Terceiros</SelectItem>
                    <SelectItem value="9">9 - Sem Frete</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea {...register("observacoes")} rows={3} />
            </div>
          </CardContent>
        </Card>

        {/* Grid de Remessas (somente edição) */}
        {isEditing && remessas && remessas.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Remessas do Contrato</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cód</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Placa</TableHead>
                      <TableHead className="text-right">Bruto</TableHead>
                      <TableHead className="text-right">Tara</TableHead>
                      <TableHead className="text-right">Kg Remessa</TableHead>
                      <TableHead className="text-right">Preço</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead>Silo</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {remessas.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>{r.codigo}</TableCell>
                        <TableCell>
                          {r.data_remessa ? format(new Date(r.data_remessa), "dd/MM/yyyy", { locale: ptBR }) : "-"}
                        </TableCell>
                        <TableCell>{r.placa || "-"}</TableCell>
                        <TableCell className="text-right">{formatNumber(r.peso_bruto)}</TableCell>
                        <TableCell className="text-right">{formatNumber(r.peso_tara)}</TableCell>
                        <TableCell className="text-right">{formatNumber(r.kg_remessa)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(r.preco_kg)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(r.valor_nota)}</TableCell>
                        <TableCell>{r.silo?.nome || "-"}</TableCell>
                        <TableCell>{r.status}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Totais (somente edição) */}
        {isEditing && contrato && (
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-sm text-muted-foreground">Valor Total</p>
                <p className="text-xl font-bold text-primary">{formatCurrency(contrato.valor_total)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-sm text-muted-foreground">Vendido</p>
                <p className="text-xl font-bold">{formatNumber(contrato.quantidade_kg)} kg</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-sm text-muted-foreground">Carregado</p>
                <p className="text-xl font-bold text-green-600">{formatNumber(contrato.total_carregado_kg)} kg</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-sm text-muted-foreground">Saldo</p>
                <p className="text-xl font-bold text-orange-600">{formatNumber(contrato.saldo_kg)} kg</p>
              </CardContent>
            </Card>
          </div>
        )}
      </form>
    </AppLayout>
  );
}
