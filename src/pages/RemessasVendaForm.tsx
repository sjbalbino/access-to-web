import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, Trash2, FileText, Receipt } from "lucide-react";
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
import { usePlacas } from "@/hooks/usePlacas";
import { useProdutosSementes } from "@/hooks/useProdutosSementes";
import { useSilos } from "@/hooks/useSilos";
import { useTransportadoras } from "@/hooks/useTransportadoras";
import { Spinner } from "@/components/ui/spinner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface FormData {
  data_remessa: string;
  placa_id: string;
  peso_bruto: number;
  peso_tara: number;
  variedade_id: string;
  silo_id: string;
  ph: number;
  umidade: number;
  impureza: number;
  transportadora_id: string;
  motorista: string;
  balanceiro: string;
  romaneio: number;
  observacoes: string;
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
  const [sacos, setSacos] = useState(0);
  const [valorNota, setValorNota] = useState(0);

  const { data: contrato, isLoading: loadingContrato } = useContratoVenda(id);
  const { data: remessas, isLoading: loadingRemessas } = useRemessasVenda(id);
  const { data: proximoCodigo } = useProximoCodigoRemessa(id);
  const { data: totais } = useTotaisContrato(id);
  const { data: placas } = usePlacas();
  const { data: variedades } = useProdutosSementes();
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
    },
  });

  const pesoBruto = watch("peso_bruto");
  const pesoTara = watch("peso_tara");
  const umidade = watch("umidade");
  const impureza = watch("impureza");

  // Calculate peso_liquido
  useEffect(() => {
    const liquido = (pesoBruto || 0) - (pesoTara || 0);
    setPesoLiquido(liquido > 0 ? liquido : 0);
    setKgRemessa(liquido > 0 ? liquido : 0);
  }, [pesoBruto, pesoTara]);

  // Calculate discounts
  useEffect(() => {
    const descontoUmidade = calcularDescontoUmidade(kgRemessa, umidade || 0);
    const descontoImpureza = calcularDescontoImpureza(kgRemessa, impureza || 0);
    setKgDescontoUmidade(descontoUmidade);
    setKgDescontoImpureza(descontoImpureza);

    const kgFinal = kgRemessa - descontoUmidade - descontoImpureza;
    setKgNota(kgFinal > 0 ? kgFinal : 0);
    setSacos(kgFinal > 0 ? kgFinal / 60 : 0); // 60kg por saco padrão

    const preco = contrato?.preco_kg || 0;
    setValorNota(kgFinal * preco);
  }, [kgRemessa, umidade, impureza, contrato?.preco_kg]);

  const onSubmit = async (data: FormData) => {
    if (!id) return;

    const payload: RemessaVendaInsert = {
      contrato_venda_id: id,
      codigo: proximoCodigo || 1,
      data_remessa: data.data_remessa,
      placa_id: data.placa_id || null,
      peso_bruto: data.peso_bruto,
      peso_tara: data.peso_tara,
      peso_liquido: pesoLiquido,
      variedade_id: data.variedade_id || null,
      silo_id: data.silo_id || null,
      ph: data.ph,
      umidade: data.umidade,
      impureza: data.impureza,
      kg_remessa: kgRemessa,
      kg_desconto_umidade: kgDescontoUmidade,
      kg_desconto_impureza: kgDescontoImpureza,
      kg_nota: kgNota,
      sacos: sacos,
      preco_kg: contrato?.preco_kg || 0,
      valor_remessa: valorNota,
      valor_nota: valorNota,
      transportadora_id: data.transportadora_id || null,
      motorista: data.motorista || null,
      balanceiro: data.balanceiro || null,
      romaneio: data.romaneio || null,
      observacoes: data.observacoes || null,
      status: "pendente",
      nota_fiscal_id: null,
    };

    await createRemessa.mutateAsync(payload);

    // Reset form
    reset({
      data_remessa: new Date().toISOString().split("T")[0],
      placa_id: "",
      peso_bruto: 0,
      peso_tara: 0,
      variedade_id: "",
      silo_id: "",
      ph: 0,
      umidade: 0,
      impureza: 0,
      transportadora_id: "",
      motorista: "",
      balanceiro: "",
      romaneio: 0,
      observacoes: "",
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
                {contrato.comprador?.nome} • {contrato.safra?.nome} • {contrato.produto?.nome}
              </p>
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
              <div className="grid grid-cols-2 sm:grid-cols-6 gap-4">
                <div className="space-y-2">
                  <Label>Data *</Label>
                  <Input type="date" {...register("data_remessa")} />
                </div>
                <div className="space-y-2">
                  <Label>Placa</Label>
                  <Select value={watch("placa_id")} onValueChange={(v) => setValue("placa_id", v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {placas?.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.placa}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Peso Tara (kg)</Label>
                  <Input type="number" step="0.01" {...register("peso_tara", { valueAsNumber: true })} />
                </div>
                <div className="space-y-2">
                  <Label>Peso Bruto (kg)</Label>
                  <Input type="number" step="0.01" {...register("peso_bruto", { valueAsNumber: true })} />
                </div>
                <div className="space-y-2">
                  <Label>Peso Líquido</Label>
                  <Input type="number" value={pesoLiquido.toFixed(2)} readOnly className="bg-muted font-bold" />
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
              </div>

              {/* Qualidade e Descontos */}
              <div className="grid grid-cols-2 sm:grid-cols-7 gap-4">
                <div className="space-y-2">
                  <Label>Variedade</Label>
                  <Select value={watch("variedade_id")} onValueChange={(v) => setValue("variedade_id", v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {variedades?.map((v) => (
                        <SelectItem key={v.id} value={v.id}>{v.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
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
                  <Label>Desc. Umidade</Label>
                  <Input type="number" value={kgDescontoUmidade.toFixed(2)} readOnly className="bg-muted text-destructive" />
                </div>
                <div className="space-y-2">
                  <Label>Desc. Impureza</Label>
                  <Input type="number" value={kgDescontoImpureza.toFixed(2)} readOnly className="bg-muted text-destructive" />
                </div>
                <div className="space-y-2">
                  <Label>Kg Nota</Label>
                  <Input type="number" value={kgNota.toFixed(2)} readOnly className="bg-muted font-bold text-success" />
                </div>
              </div>

              {/* Valores e Transporte */}
              <div className="grid grid-cols-2 sm:grid-cols-6 gap-4">
                <div className="space-y-2">
                  <Label>Sacos</Label>
                  <Input type="number" value={sacos.toFixed(2)} readOnly className="bg-muted" />
                </div>
                <div className="space-y-2">
                  <Label>Valor Nota</Label>
                  <Input type="text" value={formatCurrency(valorNota)} readOnly className="bg-muted font-bold text-primary" />
                </div>
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
                  <Label>Motorista</Label>
                  <Input {...register("motorista")} />
                </div>
                <div className="space-y-2">
                  <Label>Balanceiro</Label>
                  <Input {...register("balanceiro")} />
                </div>
                <div className="space-y-2">
                  <Label>Romaneio</Label>
                  <Input type="number" {...register("romaneio", { valueAsNumber: true })} />
                </div>
              </div>

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
                      <TableHead>Placa</TableHead>
                      <TableHead className="text-right">Bruto</TableHead>
                      <TableHead className="text-right">Tara</TableHead>
                      <TableHead className="text-right">Líquido</TableHead>
                      <TableHead className="text-right">Kg Nota</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead>Silo</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Nota</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {remessas?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={12} className="text-center py-8 text-muted-foreground">
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
                          <TableCell>{r.placa?.placa || "-"}</TableCell>
                          <TableCell className="text-right">{formatNumber(r.peso_bruto)}</TableCell>
                          <TableCell className="text-right">{formatNumber(r.peso_tara)}</TableCell>
                          <TableCell className="text-right">{formatNumber(r.peso_liquido)}</TableCell>
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
