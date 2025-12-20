import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp, ArrowLeft, Save, Truck } from "lucide-react";
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
  quantidade_kg: number;
  quantidade_sacos: number;
  preco_kg: number;
  valor_total: number;
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
  percentual_comissao: number;
  valor_comissao: number;
  data_pagamento_comissao: string;
  modalidade_frete: number;
  venda_entrega_futura: boolean;
  a_fixar: boolean;
  fechada: boolean;
  observacoes: string;
  granja_id: string;
}

export default function VendaProducaoForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = !!id;
  const [corretorOpen, setCorretorOpen] = useState(false);

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

  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<FormData>({
    defaultValues: {
      numero: 0,
      tipo_venda: "industria",
      modalidade_frete: 0,
      venda_entrega_futura: false,
      a_fixar: false,
      fechada: false,
      quantidade_kg: 0,
      quantidade_sacos: 0,
      preco_kg: 0,
      valor_total: 0,
      percentual_comissao: 0,
      valor_comissao: 0,
    },
  });

  const compradores = clientes?.filter(c => c.tipo === "cliente" || c.tipo === "ambos") || [];
  const inscricoesParceria = inscricoes?.filter(i => i.tipo === "parceria" || i.produtores?.tipo_produtor === "parceiro") || [];

  // Watch values for calculations
  const quantidadeKg = watch("quantidade_kg");
  const precoKg = watch("preco_kg");
  const compradorId = watch("comprador_id");
  const percentualComissao = watch("percentual_comissao");
  const valorTotal = watch("valor_total");

  // Auto-calculate valor_total
  useEffect(() => {
    const total = (quantidadeKg || 0) * (precoKg || 0);
    setValue("valor_total", total);
  }, [quantidadeKg, precoKg, setValue]);

  // Auto-calculate valor_comissao
  useEffect(() => {
    const comissao = (valorTotal || 0) * ((percentualComissao || 0) / 100);
    setValue("valor_comissao", comissao);
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

  // Load contrato data
  useEffect(() => {
    if (contrato) {
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
        quantidade_kg: contrato.quantidade_kg || 0,
        quantidade_sacos: contrato.quantidade_sacos || 0,
        preco_kg: contrato.preco_kg || 0,
        valor_total: contrato.valor_total || 0,
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
        percentual_comissao: contrato.percentual_comissao || 0,
        valor_comissao: contrato.valor_comissao || 0,
        data_pagamento_comissao: contrato.data_pagamento_comissao || "",
        modalidade_frete: contrato.modalidade_frete || 0,
        venda_entrega_futura: contrato.venda_entrega_futura || false,
        a_fixar: contrato.a_fixar || false,
        fechada: contrato.fechada || false,
        observacoes: contrato.observacoes || "",
        granja_id: contrato.granja_id || "",
      });
      if (contrato.corretor) setCorretorOpen(true);
    } else if (proximoNumero && !isEditing) {
      setValue("numero", proximoNumero);
      setValue("data_contrato", new Date().toISOString().split("T")[0]);
    }
  }, [contrato, proximoNumero, isEditing, reset, setValue]);

  const onSubmit = async (data: FormData) => {
    const payload: ContratoVendaInsert = {
      ...data,
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
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatCurrency = (value: number | null | undefined) => {
    if (value === null || value === undefined) return "-";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  if (loadingContrato && isEditing) {
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
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <Button type="button" variant="ghost" size="icon" onClick={() => navigate("/vendas-producao")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                {isEditing ? `Contrato #${contrato?.numero}` : "Novo Contrato de Venda"}
              </h1>
              <p className="text-muted-foreground">
                {isEditing ? "Editar contrato de venda" : "Cadastrar novo contrato"}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {isEditing && (
              <Button type="button" variant="outline" onClick={() => navigate(`/vendas-producao/${id}/remessas`)}>
                <Truck className="h-4 w-4 mr-2" />
                Remessas
              </Button>
            )}
            <Button type="submit" disabled={createContrato.isPending || updateContrato.isPending}>
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
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-4">
              <div className="space-y-2">
                <Label>Número</Label>
                <Input type="number" {...register("numero", { valueAsNumber: true })} readOnly className="bg-muted" />
              </div>
              <div className="space-y-2 col-span-2">
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
              <div className="space-y-2 col-span-2">
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
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Nota de Venda</Label>
                <Input {...register("nota_venda")} placeholder="Número da nota" />
              </div>
              <div className="space-y-2">
                <Label>Nº Contrato Comprador</Label>
                <Input {...register("numero_contrato_comprador")} placeholder="Contrato do comprador" />
              </div>
              <div className="space-y-2">
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
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2 col-span-2">
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
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Quantidade (kg)</Label>
                <Input type="number" step="0.01" {...register("quantidade_kg", { valueAsNumber: true })} />
              </div>
              <div className="space-y-2">
                <Label>Quantidade (sacos)</Label>
                <Input type="number" step="0.01" {...register("quantidade_sacos", { valueAsNumber: true })} />
              </div>
              <div className="space-y-2">
                <Label>Preço/kg (R$)</Label>
                <Input type="number" step="0.0000000001" {...register("preco_kg", { valueAsNumber: true })} />
              </div>
              <div className="space-y-2">
                <Label>Valor Total (R$)</Label>
                <Input type="number" step="0.01" {...register("valor_total", { valueAsNumber: true })} readOnly className="bg-muted font-bold" />
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
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2 col-span-2">
                <Label>Nome / Razão Social</Label>
                <Input {...register("local_entrega_nome")} />
              </div>
              <div className="space-y-2">
                <Label>CNPJ/CPF</Label>
                <Input {...register("local_entrega_cnpj_cpf")} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>IE</Label>
                <Input {...register("local_entrega_ie")} />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Logradouro</Label>
                <Input {...register("local_entrega_logradouro")} />
              </div>
              <div className="space-y-2">
                <Label>Número</Label>
                <Input {...register("local_entrega_numero")} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
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
                    <Input type="number" step="0.01" {...register("percentual_comissao", { valueAsNumber: true })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Valor Comissão</Label>
                    <Input type="number" step="0.01" {...register("valor_comissao", { valueAsNumber: true })} readOnly className="bg-muted" />
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

        {/* Flags e Observações */}
        <Card>
          <CardHeader>
            <CardTitle>Opções e Observações</CardTitle>
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
              <div className="space-y-4 pt-6">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="venda_entrega_futura"
                    checked={watch("venda_entrega_futura")}
                    onCheckedChange={(c) => setValue("venda_entrega_futura", !!c)}
                  />
                  <Label htmlFor="venda_entrega_futura">Venda para Entrega Futura</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="a_fixar"
                    checked={watch("a_fixar")}
                    onCheckedChange={(c) => setValue("a_fixar", !!c)}
                  />
                  <Label htmlFor="a_fixar">Preço a Fixar</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="fechada"
                    checked={watch("fechada")}
                    onCheckedChange={(c) => setValue("fechada", !!c)}
                  />
                  <Label htmlFor="fechada">Contrato Fechado</Label>
                </div>
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
                      <TableHead className="text-right">Kg Nota</TableHead>
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
                        <TableCell>{r.placa?.placa || "-"}</TableCell>
                        <TableCell className="text-right">{formatNumber(r.peso_bruto)}</TableCell>
                        <TableCell className="text-right">{formatNumber(r.peso_tara)}</TableCell>
                        <TableCell className="text-right">{formatNumber(r.kg_nota)}</TableCell>
                        <TableCell className="text-right">{formatNumber(r.preco_kg)}</TableCell>
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
                <p className="text-xl font-bold text-success">{formatNumber(contrato.total_carregado_kg)} kg</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-sm text-muted-foreground">Saldo</p>
                <p className="text-xl font-bold text-warning">{formatNumber(contrato.saldo_kg)} kg</p>
              </CardContent>
            </Card>
          </div>
        )}
      </form>
    </AppLayout>
  );
}
