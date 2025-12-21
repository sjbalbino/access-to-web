import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, Trash2, Receipt, ChevronDown, MapPin } from "lucide-react";
import { useContratoVenda } from "@/hooks/useContratosVenda";
import {
  useRemessasVenda,
  useCreateRemessaVenda,
  useDeleteRemessaVenda,
  useProximoCodigoRemessa,
  useTotaisContrato,
  RemessaVendaInsert,
  calcularDescontoUmidade,
  calcularDescontoImpureza,
} from "@/hooks/useRemessasVenda";
import { useSilos } from "@/hooks/useSilos";
import { useTransportadoras } from "@/hooks/useTransportadoras";
import { Spinner } from "@/components/ui/spinner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface FormData {
  data_remessa: string;
  peso_bruto: number;
  peso_tara: number;
  silo_id: string;
  ph: number;
  umidade: number;
  impureza: number;
  transportadora_id: string;
  motorista: string;
  placa: string;
  uf_placa: string;
  balanceiro: string;
  romaneio: number;
  observacoes: string;
  // Local de entrega
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
}

export default function RemessasVendaForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [remessaExcluir, setRemessaExcluir] = useState<string | null>(null);
  const [pesoLiquido, setPesoLiquido] = useState(0);
  const [kgRemessa, setKgRemessa] = useState(0);
  const [kgDescontoUmidade, setKgDescontoUmidade] = useState(0);
  const [kgDescontoImpureza, setKgDescontoImpureza] = useState(0);
  const [kgNota, setKgNota] = useState(0);
  const [sacosRemessa, setSacosRemessa] = useState(0);
  const [sacosNota, setSacosNota] = useState(0);
  const [valorRemessa, setValorRemessa] = useState(0);
  const [valorNota, setValorNota] = useState(0);
  const [localEntregaOpen, setLocalEntregaOpen] = useState(false);

  const { data: contrato, isLoading: loadingContrato } = useContratoVenda(id);
  const { data: remessas, isLoading: loadingRemessas } = useRemessasVenda(id);
  const { data: proximoCodigo } = useProximoCodigoRemessa(id);
  const { data: totais } = useTotaisContrato(id);
  const { data: silos } = useSilos();
  const { transportadoras } = useTransportadoras();

  const createRemessa = useCreateRemessaVenda();
  const deleteRemessa = useDeleteRemessaVenda();

  const { register, handleSubmit, watch, setValue, reset } = useForm<FormData>({
    defaultValues: {
      data_remessa: new Date().toISOString().split("T")[0],
      peso_bruto: 0,
      peso_tara: 0,
      ph: 0,
      umidade: 0,
      impureza: 0,
      romaneio: 0,
      placa: "",
      uf_placa: "",
      motorista: "",
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
    },
  });

  const pesoBruto = watch("peso_bruto");
  const pesoTara = watch("peso_tara");
  const umidade = watch("umidade");
  const impureza = watch("impureza");
  const transportadoraId = watch("transportadora_id");

  // Carregar local de entrega do contrato quando abrir
  useEffect(() => {
    if (contrato) {
      setValue("local_entrega_nome", contrato.local_entrega_nome || "");
      setValue("local_entrega_cnpj_cpf", contrato.local_entrega_cnpj_cpf || "");
      setValue("local_entrega_ie", contrato.local_entrega_ie || "");
      setValue("local_entrega_logradouro", contrato.local_entrega_logradouro || "");
      setValue("local_entrega_numero", contrato.local_entrega_numero || "");
      setValue("local_entrega_complemento", contrato.local_entrega_complemento || "");
      setValue("local_entrega_bairro", contrato.local_entrega_bairro || "");
      setValue("local_entrega_cidade", contrato.local_entrega_cidade || "");
      setValue("local_entrega_uf", contrato.local_entrega_uf || "");
      setValue("local_entrega_cep", contrato.local_entrega_cep || "");
    }
  }, [contrato, setValue]);

  // Quando selecionar transportadora, preencher placa, UF e motorista padrão
  useEffect(() => {
    if (transportadoraId && transportadoras) {
      const transp = transportadoras.find(t => t.id === transportadoraId);
      if (transp) {
        if (transp.placa_padrao) setValue("placa", transp.placa_padrao);
        if (transp.uf_placa_padrao) setValue("uf_placa", transp.uf_placa_padrao);
        if (transp.motorista_padrao) setValue("motorista", transp.motorista_padrao);
      }
    }
  }, [transportadoraId, transportadoras, setValue]);

  // Calculate peso_liquido (Kgs da Remessa)
  useEffect(() => {
    const liquido = (pesoBruto || 0) - (pesoTara || 0);
    setPesoLiquido(liquido > 0 ? liquido : 0);
    setKgRemessa(liquido > 0 ? liquido : 0);
  }, [pesoBruto, pesoTara]);

  // Calculate discounts and values
  useEffect(() => {
    const descontoUmidade = calcularDescontoUmidade(kgRemessa, umidade || 0);
    const descontoImpureza = calcularDescontoImpureza(kgRemessa, impureza || 0);
    setKgDescontoUmidade(descontoUmidade);
    setKgDescontoImpureza(descontoImpureza);

    const kgFinal = kgRemessa - descontoUmidade - descontoImpureza;
    setKgNota(kgFinal > 0 ? kgFinal : 0);

    // Sacos separados
    setSacosRemessa(kgRemessa > 0 ? kgRemessa / 60 : 0);
    setSacosNota(kgFinal > 0 ? kgFinal / 60 : 0);

    const preco = contrato?.preco_kg || 0;
    // Valor Remessa = Kgs Remessa * Preço (baixa do contrato)
    setValorRemessa(kgRemessa * preco);
    // Valor Nota = Kgs Nota * Preço (vai na nota fiscal)
    setValorNota(kgFinal * preco);
  }, [kgRemessa, umidade, impureza, contrato?.preco_kg]);

  const onSubmit = async (data: FormData) => {
    if (!id || !contrato) return;

    const payload: RemessaVendaInsert = {
      contrato_venda_id: id,
      codigo: proximoCodigo || 1,
      data_remessa: data.data_remessa,
      placa_id: null, // Não usar mais placa_id, usar placa direta
      placa: data.placa || null,
      uf_placa: data.uf_placa || null,
      peso_bruto: data.peso_bruto,
      peso_tara: data.peso_tara,
      peso_liquido: pesoLiquido,
      variedade_id: contrato.produto_id || null, // Pegar do contrato
      silo_id: data.silo_id || null,
      ph: data.ph,
      umidade: data.umidade,
      impureza: data.impureza,
      kg_remessa: kgRemessa,
      kg_desconto_umidade: kgDescontoUmidade,
      kg_desconto_impureza: kgDescontoImpureza,
      kg_nota: kgNota,
      sacos: sacosNota, // Manter compatibilidade
      sacos_remessa: sacosRemessa,
      sacos_nota: sacosNota,
      preco_kg: contrato?.preco_kg || 0,
      valor_remessa: valorRemessa,
      valor_nota: valorNota,
      transportadora_id: data.transportadora_id || null,
      motorista: data.motorista || null,
      balanceiro: data.balanceiro || null,
      romaneio: data.romaneio || null,
      observacoes: data.observacoes || null,
      status: "pendente",
      nota_fiscal_id: null,
      // Local de entrega
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
    };

    await createRemessa.mutateAsync(payload);

    // Reset form (manter local de entrega)
    reset({
      data_remessa: new Date().toISOString().split("T")[0],
      peso_bruto: 0,
      peso_tara: 0,
      silo_id: "",
      ph: 0,
      umidade: 0,
      impureza: 0,
      transportadora_id: "",
      motorista: "",
      placa: "",
      uf_placa: "",
      balanceiro: "",
      romaneio: 0,
      observacoes: "",
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
    });
  };

  const handleExcluir = async () => {
    if (remessaExcluir && id) {
      await deleteRemessa.mutateAsync({ id: remessaExcluir, contratoId: id });
      setRemessaExcluir(null);
    }
  };

  const handleEmitirNfe = (remessaId: string) => {
    navigate(`/notas-fiscais/nova?remessa_id=${remessaId}&contrato_id=${id}`);
  };

  const formatNumber = (value: number | null | undefined, decimals: number = 0) => {
    if (value === null || value === undefined) return "-";
    return new Intl.NumberFormat("pt-BR", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value);
  };

  const formatCurrency = (value: number | null | undefined) => {
    if (value === null || value === undefined) return "-";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const saldoKg = (contrato?.quantidade_kg || 0) - (totais?.total_carregado_kg || 0);
  const percentCarregado = contrato?.quantidade_kg 
    ? ((totais?.total_carregado_kg || 0) / contrato.quantidade_kg) * 100 
    : 0;

  if (loadingContrato) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-96">
          <Spinner />
        </div>
      </AppLayout>
    );
  }

  if (!contrato) {
    return (
      <AppLayout>
        <div className="text-center py-16">
          <p className="text-muted-foreground">Contrato não encontrado</p>
          <Button variant="link" onClick={() => navigate("/vendas-producao")}>
            Voltar para listagem
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <Button type="button" variant="ghost" size="icon" onClick={() => navigate(`/vendas-producao/${id}`)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                Remessas - Contrato #{contrato.numero}
              </h1>
              <p className="text-muted-foreground">
                {contrato.comprador?.nome} • {contrato.safra?.nome}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className="text-base font-semibold">
                  {contrato.produto?.nome}
                </Badge>
                {contrato.numero_contrato_comprador && (
                  <Badge variant="outline">
                    Contrato Comprador: {contrato.numero_contrato_comprador}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Info do Contrato */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-xs text-muted-foreground">Contratado</p>
              <p className="text-lg font-bold">{formatNumber(contrato.quantidade_kg)} kg</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-xs text-muted-foreground">Carregado</p>
              <p className="text-lg font-bold text-success">{formatNumber(totais?.total_carregado_kg)} kg</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-xs text-muted-foreground">% Carregado</p>
              <p className="text-lg font-bold text-info">{percentCarregado.toFixed(1)}%</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-xs text-muted-foreground">Saldo</p>
              <p className={`text-lg font-bold ${saldoKg < 0 ? "text-destructive" : "text-warning"}`}>
                {formatNumber(saldoKg)} kg
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-xs text-muted-foreground">Preço/kg</p>
              <p className="text-lg font-bold text-primary">{formatCurrency(contrato.preco_kg)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Formulário de Nova Remessa */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Nova Remessa
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Pesagem */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                <div className="space-y-2">
                  <Label>Data *</Label>
                  <Input type="date" {...register("data_remessa")} />
                </div>
                <div className="space-y-2">
                  <Label>Peso Tara (kg)</Label>
                  <Input type="number" step="1" {...register("peso_tara", { valueAsNumber: true })} />
                </div>
                <div className="space-y-2">
                  <Label>Peso Bruto (kg)</Label>
                  <Input type="number" step="1" {...register("peso_bruto", { valueAsNumber: true })} />
                </div>
                <div className="space-y-2">
                  <Label>Kgs da Remessa</Label>
                  <Input 
                    type="text" 
                    value={formatNumber(pesoLiquido)} 
                    readOnly 
                    className="bg-muted font-bold text-right" 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Sacos Remessa</Label>
                  <Input 
                    type="text" 
                    value={formatNumber(sacosRemessa, 2)} 
                    readOnly 
                    className="bg-muted text-right" 
                  />
                </div>
              </div>

              {/* Qualidade e Descontos */}
              <div className="grid grid-cols-2 sm:grid-cols-6 gap-4">
                <div className="space-y-2">
                  <Label>PH</Label>
                  <Input type="number" step="0.01" {...register("ph", { valueAsNumber: true })} />
                </div>
                <div className="space-y-2">
                  <Label>Umidade %</Label>
                  <Input type="number" step="0.01" {...register("umidade", { valueAsNumber: true })} />
                </div>
                <div className="space-y-2">
                  <Label>Impureza %</Label>
                  <Input type="number" step="0.01" {...register("impureza", { valueAsNumber: true })} />
                </div>
                <div className="space-y-2">
                  <Label>Desc. Umidade (kg)</Label>
                  <Input 
                    type="text" 
                    value={formatNumber(kgDescontoUmidade)} 
                    readOnly 
                    className="bg-muted text-destructive text-right" 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Desc. Impureza (kg)</Label>
                  <Input 
                    type="text" 
                    value={formatNumber(kgDescontoImpureza)} 
                    readOnly 
                    className="bg-muted text-destructive text-right" 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Kg Nota</Label>
                  <Input 
                    type="text" 
                    value={formatNumber(kgNota)} 
                    readOnly 
                    className="bg-muted font-bold text-success text-right" 
                  />
                </div>
              </div>

              {/* Valores */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                <div className="space-y-2">
                  <Label>Sacos Nota</Label>
                  <Input 
                    type="text" 
                    value={formatNumber(sacosNota, 2)} 
                    readOnly 
                    className="bg-muted text-right" 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Valor Remessa</Label>
                  <Input 
                    type="text" 
                    value={formatCurrency(valorRemessa)} 
                    readOnly 
                    className="bg-muted font-bold text-right" 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Valor Nota</Label>
                  <Input 
                    type="text" 
                    value={formatCurrency(valorNota)} 
                    readOnly 
                    className="bg-muted font-bold text-primary text-right" 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Silo</Label>
                  <Select value={watch("silo_id")} onValueChange={(v) => setValue("silo_id", v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {silos?.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Romaneio</Label>
                  <Input type="number" {...register("romaneio", { valueAsNumber: true })} />
                </div>
              </div>

              {/* Transporte */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                <div className="space-y-2">
                  <Label>Transportadora</Label>
                  <Select value={watch("transportadora_id")} onValueChange={(v) => setValue("transportadora_id", v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {transportadoras?.map((t) => (
                        <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Placa</Label>
                  <Input {...register("placa")} placeholder="AAA-0000" maxLength={8} />
                </div>
                <div className="space-y-2">
                  <Label>UF Placa</Label>
                  <Input {...register("uf_placa")} placeholder="SP" maxLength={2} />
                </div>
                <div className="space-y-2">
                  <Label>Motorista</Label>
                  <Input {...register("motorista")} />
                </div>
                <div className="space-y-2">
                  <Label>Balanceiro</Label>
                  <Input {...register("balanceiro")} />
                </div>
              </div>

              {/* Local de Entrega (colapsável) */}
              <Collapsible open={localEntregaOpen} onOpenChange={setLocalEntregaOpen}>
                <CollapsibleTrigger asChild>
                  <Button type="button" variant="outline" className="w-full justify-between">
                    <span className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Local de Entrega
                      {watch("local_entrega_nome") && (
                        <span className="text-muted-foreground text-sm">
                          - {watch("local_entrega_nome")} ({watch("local_entrega_cidade")}/{watch("local_entrega_uf")})
                        </span>
                      )}
                    </span>
                    <ChevronDown className={`h-4 w-4 transition-transform ${localEntregaOpen ? 'rotate-180' : ''}`} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-4 space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="space-y-2 col-span-2">
                      <Label>Nome/Razão Social</Label>
                      <Input {...register("local_entrega_nome")} />
                    </div>
                    <div className="space-y-2">
                      <Label>CNPJ/CPF</Label>
                      <Input {...register("local_entrega_cnpj_cpf")} />
                    </div>
                    <div className="space-y-2">
                      <Label>IE</Label>
                      <Input {...register("local_entrega_ie")} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-6 gap-4">
                    <div className="space-y-2">
                      <Label>CEP</Label>
                      <Input {...register("local_entrega_cep")} />
                    </div>
                    <div className="space-y-2 col-span-2">
                      <Label>Logradouro</Label>
                      <Input {...register("local_entrega_logradouro")} />
                    </div>
                    <div className="space-y-2">
                      <Label>Número</Label>
                      <Input {...register("local_entrega_numero")} />
                    </div>
                    <div className="space-y-2 col-span-2">
                      <Label>Complemento</Label>
                      <Input {...register("local_entrega_complemento")} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label>Bairro</Label>
                      <Input {...register("local_entrega_bairro")} />
                    </div>
                    <div className="space-y-2">
                      <Label>Cidade</Label>
                      <Input {...register("local_entrega_cidade")} />
                    </div>
                    <div className="space-y-2">
                      <Label>UF</Label>
                      <Input {...register("local_entrega_uf")} maxLength={2} />
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* Observações e Botão */}
              <div className="flex gap-4 items-end">
                <div className="flex-1 space-y-2">
                  <Label>Observações</Label>
                  <Input {...register("observacoes")} placeholder="Observações da remessa..." />
                </div>
                <Button type="submit" disabled={createRemessa.isPending}>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Remessa
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Lista de Remessas */}
        <Card>
          <CardHeader>
            <CardTitle>Remessas Cadastradas ({remessas?.length || 0})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loadingRemessas ? (
              <div className="flex items-center justify-center py-8">
                <Spinner />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cód</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Transportadora</TableHead>
                      <TableHead>Placa</TableHead>
                      <TableHead className="text-right">Kg Remessa</TableHead>
                      <TableHead className="text-right">Kg Nota</TableHead>
                      <TableHead className="text-right">Valor Nota</TableHead>
                      <TableHead>Silo</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Nota</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {remessas?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                          Nenhuma remessa cadastrada
                        </TableCell>
                      </TableRow>
                    ) : (
                      remessas?.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell className="font-medium">{r.codigo}</TableCell>
                          <TableCell>
                            {r.data_remessa ? format(new Date(r.data_remessa), "dd/MM/yyyy", { locale: ptBR }) : "-"}
                          </TableCell>
                          <TableCell>{r.transportadora?.nome || "-"}</TableCell>
                          <TableCell>{r.placa || "-"}</TableCell>
                          <TableCell className="text-right">{formatNumber(r.kg_remessa)}</TableCell>
                          <TableCell className="text-right font-medium">{formatNumber(r.kg_nota)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(r.valor_nota)}</TableCell>
                          <TableCell>{r.silo?.nome || "-"}</TableCell>
                          <TableCell>
                            {r.status === "nfe_emitida" ? (
                              <Badge variant="default" className="bg-success text-success-foreground">NFe Emitida</Badge>
                            ) : r.status === "cancelada" ? (
                              <Badge variant="destructive">Cancelada</Badge>
                            ) : (
                              <Badge variant="outline">Pendente</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {r.nota_fiscal?.numero ? (
                              <span className="text-xs">{r.nota_fiscal.numero}</span>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex justify-end gap-1">
                              {!r.nota_fiscal_id && r.status !== "cancelada" && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleEmitirNfe(r.id)}
                                  title="Emitir NF-e"
                                >
                                  <Receipt className="h-4 w-4 text-primary" />
                                </Button>
                              )}
                              {!r.nota_fiscal_id && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setRemessaExcluir(r.id)}
                                  title="Excluir"
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialog de Confirmação */}
      <AlertDialog open={!!remessaExcluir} onOpenChange={() => setRemessaExcluir(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta remessa? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleExcluir} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
