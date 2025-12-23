import { useState, useEffect, useMemo } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Truck, Scale, Check, Loader2, AlertCircle, Package } from "lucide-react";
import { toast } from "sonner";

import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

import { useSafras } from "@/hooks/useSafras";
import { useSilos } from "@/hooks/useSilos";
import { useInscricoesCompletas } from "@/hooks/useInscricoesCompletas";
import { useLocaisEntrega } from "@/hooks/useLocaisEntrega";
import { usePlacas } from "@/hooks/usePlacas";
import { useProdutosSementes } from "@/hooks/useProdutosSementes";
import { useControleLavouras, useCreateControleLavoura } from "@/hooks/useControleLavouras";
import { useTabelaUmidades } from "@/hooks/useTabelaUmidades";
import { useColheitasPendentes, useCreateColheitaEntrada, useUpdateColheitaSaida } from "@/hooks/useColheitasEntrada";
import { supabase } from "@/integrations/supabase/client";

interface FormEntrada {
  peso_bruto: number;
  placa_id: string;
  motorista: string;
  tipo_colheita: string;
  variedade_id: string;
}

interface FormSaida {
  peso_tara: number;
  impureza: number;
  umidade: number;
  percentual_avariados: number;
  percentual_outros: number;
  ph: number;
}

const initialFormEntrada: FormEntrada = {
  peso_bruto: 0,
  placa_id: "",
  motorista: "",
  tipo_colheita: "industria",
  variedade_id: "",
};

const initialFormSaida: FormSaida = {
  peso_tara: 0,
  impureza: 0,
  umidade: 0,
  percentual_avariados: 0,
  percentual_outros: 0,
  ph: 0,
};

export default function EntradaColheita() {
  // Filtros
  const [safraId, setSafraId] = useState<string>("");
  const [siloId, setSiloId] = useState<string>("");
  const [inscricaoId, setInscricaoId] = useState<string>("");
  const [localEntregaId, setLocalEntregaId] = useState<string>("");
  const [balanceiro, setBalanceiro] = useState<string>("");

  // Seleções
  const [selectedLavouraId, setSelectedLavouraId] = useState<string | null>(null);
  const [selectedPendente, setSelectedPendente] = useState<string | null>(null);

  // Formulários
  const [formEntrada, setFormEntrada] = useState<FormEntrada>(initialFormEntrada);
  const [formSaida, setFormSaida] = useState<FormSaida>(initialFormSaida);
  const [pesoBrutoSelecionado, setPesoBrutoSelecionado] = useState<number>(0);

  // Queries
  const { data: safras = [] } = useSafras();
  const { data: silos = [] } = useSilos();
  const { data: inscricoes = [] } = useInscricoesCompletas();
  const { data: locaisEntrega = [] } = useLocaisEntrega();
  const { data: placas = [] } = usePlacas();
  const { data: sementes = [] } = useProdutosSementes();
  const { data: tabelaUmidades = [] } = useTabelaUmidades();
  const { data: controleLavouras = [] } = useControleLavouras(safraId || null);
  const { data: cargasPendentes = [], isLoading: loadingPendentes } = useColheitasPendentes(safraId || null);

  // Mutations
  const createControleLavoura = useCreateControleLavoura();
  const createColheitaEntrada = useCreateColheitaEntrada();
  const updateColheitaSaida = useUpdateColheitaSaida();

  // Buscar cultura da safra selecionada
  const safraSelecionada = useMemo(() => 
    safras.find(s => s.id === safraId), 
    [safras, safraId]
  );
  
  const culturaId = safraSelecionada?.cultura_id;

  // Filtrar inscrições ativas
  const inscricoesAtivas = useMemo(() => 
    inscricoes.filter(i => i.ativa), 
    [inscricoes]
  );

  // Obter controle_lavoura_id para a lavoura selecionada
  const controleLavouraSelecionado = useMemo(() => 
    controleLavouras.find(cl => cl.lavoura_id === selectedLavouraId),
    [controleLavouras, selectedLavouraId]
  );

  // Calcular descontos automáticos
  const calculos = useMemo(() => {
    const pesoLiquido = pesoBrutoSelecionado - formSaida.peso_tara;
    
    // Kg Impureza
    const kgImpureza = pesoLiquido * (formSaida.impureza / 100);
    
    // Buscar desconto de umidade na tabela
    const faixaUmidade = tabelaUmidades.find(
      t => t.cultura_id === culturaId && 
           formSaida.umidade >= t.umidade_minima && 
           formSaida.umidade <= t.umidade_maxima
    );
    const percentualDescontoUmidade = faixaUmidade?.desconto_percentual || 0;
    const kgUmidade = pesoLiquido * (percentualDescontoUmidade / 100);
    
    // Avariados e Outros
    const kgAvariados = pesoLiquido * (formSaida.percentual_avariados / 100);
    const kgOutros = pesoLiquido * (formSaida.percentual_outros / 100);
    
    // Total descontos
    const totalDescontos = kgImpureza + kgUmidade + kgAvariados + kgOutros;
    
    // Líquido final
    const liquidoFinal = pesoLiquido - totalDescontos;
    
    // Sacos (60kg para indústria, 40kg para semente)
    const pesoSaco = formEntrada.tipo_colheita === "semente" ? 40 : 60;
    const totalSacos = liquidoFinal / pesoSaco;

    return {
      pesoLiquido,
      kgImpureza,
      percentualDescontoUmidade,
      kgUmidade,
      kgAvariados,
      kgOutros,
      totalDescontos,
      liquidoFinal,
      totalSacos,
    };
  }, [pesoBrutoSelecionado, formSaida, formEntrada.tipo_colheita, tabelaUmidades, culturaId]);

  // Resetar seleções quando muda a safra
  useEffect(() => {
    setSelectedLavouraId(null);
    setSelectedPendente(null);
    setFormEntrada(initialFormEntrada);
    setFormSaida(initialFormSaida);
    setPesoBrutoSelecionado(0);
  }, [safraId]);

  // Quando seleciona uma carga pendente
  useEffect(() => {
    if (selectedPendente) {
      const carga = cargasPendentes.find(c => c.id === selectedPendente);
      if (carga) {
        setPesoBrutoSelecionado(carga.peso_bruto || 0);
        setFormEntrada(prev => ({
          ...prev,
          tipo_colheita: carga.tipo_colheita || "industria",
          variedade_id: carga.variedade_id || "",
        }));
        setFormSaida(initialFormSaida);
      }
    }
  }, [selectedPendente, cargasPendentes]);

  // Confirmar entrada
  const handleConfirmarEntrada = async () => {
    if (!safraId) {
      toast.error("Selecione uma safra");
      return;
    }
    if (!selectedLavouraId) {
      toast.error("Selecione uma lavoura");
      return;
    }
    if (formEntrada.peso_bruto <= 0) {
      toast.error("Informe o peso bruto");
      return;
    }

    try {
      let controleLavouraId = controleLavouraSelecionado?.id;
      
      // Se não existe controle de lavoura, criar um
      if (!controleLavouraId) {
        const lavoura = controleLavouras[0]?.lavouras || 
          await supabase.from("lavouras").select("total_hectares").eq("id", selectedLavouraId).single().then(r => r.data);
        
        const novoControle = await createControleLavoura.mutateAsync({
          safra_id: safraId,
          lavoura_id: selectedLavouraId,
          area_total: lavoura?.total_hectares || null,
          ha_plantado: null,
          cobertura_solo: null,
        });
        controleLavouraId = novoControle.id;
      }

      await createColheitaEntrada.mutateAsync({
        controle_lavoura_id: controleLavouraId,
        safra_id: safraId,
        lavoura_id: selectedLavouraId,
        data_colheita: format(new Date(), "yyyy-MM-dd"),
        peso_bruto: formEntrada.peso_bruto,
        placa_id: formEntrada.placa_id || null,
        motorista: formEntrada.motorista || null,
        tipo_colheita: formEntrada.tipo_colheita,
        variedade_id: formEntrada.variedade_id || null,
        silo_id: siloId || null,
        inscricao_produtor_id: inscricaoId || null,
        local_entrega_terceiro_id: localEntregaId || null,
        observacoes: balanceiro ? `Balanceiro: ${balanceiro}` : null,
      });

      toast.success("Entrada registrada com sucesso!");
      setFormEntrada(initialFormEntrada);
      setSelectedLavouraId(null);
    } catch (error: any) {
      toast.error("Erro ao registrar entrada: " + error.message);
    }
  };

  // Confirmar saída
  const handleConfirmarSaida = async () => {
    if (!selectedPendente) {
      toast.error("Selecione uma carga pendente");
      return;
    }
    if (formSaida.peso_tara <= 0) {
      toast.error("Informe o peso da tara");
      return;
    }

    try {
      await updateColheitaSaida.mutateAsync({
        id: selectedPendente,
        peso_tara: formSaida.peso_tara,
        producao_kg: calculos.pesoLiquido,
        impureza: formSaida.impureza,
        kg_impureza: calculos.kgImpureza,
        umidade: formSaida.umidade,
        percentual_desconto: calculos.percentualDescontoUmidade,
        kg_umidade: calculos.kgUmidade,
        percentual_avariados: formSaida.percentual_avariados,
        kg_avariados: calculos.kgAvariados,
        percentual_outros: formSaida.percentual_outros,
        kg_outros: calculos.kgOutros,
        kg_desconto_total: calculos.totalDescontos,
        producao_liquida_kg: calculos.liquidoFinal,
        total_sacos: calculos.totalSacos,
        ph: formSaida.ph || null,
      });

      toast.success("Saída registrada com sucesso!");
      setSelectedPendente(null);
      setFormSaida(initialFormSaida);
      setPesoBrutoSelecionado(0);
    } catch (error: any) {
      toast.error("Erro ao registrar saída: " + error.message);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-orange-500/20">
            <Truck className="h-6 w-6 text-orange-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Entrada de Colheita</h1>
            <p className="text-sm text-muted-foreground">
              Registro rápido de pesagem de entrada e saída
            </p>
          </div>
        </div>

        {/* Filtros */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Contexto da Pesagem</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="space-y-2">
                <Label>Safra *</Label>
                <Select value={safraId} onValueChange={setSafraId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {safras.filter(s => s.status === 'ativa').map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Silo (Destino)</Label>
                <Select value={siloId || "_none"} onValueChange={v => setSiloId(v === "_none" ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">Nenhum</SelectItem>
                    {silos.filter(s => s.ativo).map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Produtor/Inscrição</Label>
                <Select value={inscricaoId || "_none"} onValueChange={v => setInscricaoId(v === "_none" ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">Nenhum</SelectItem>
                    {inscricoesAtivas.map(i => (
                      <SelectItem key={i.id} value={i.id}>
                        {i.produtores?.nome} - {i.inscricao_estadual}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Local Entrega</Label>
                <Select value={localEntregaId || "_none"} onValueChange={v => setLocalEntregaId(v === "_none" ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">Nenhum</SelectItem>
                    {locaisEntrega.filter(l => l.ativo).map(l => (
                      <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 lg:col-span-2">
                <Label>Balanceiro</Label>
                <Input 
                  value={balanceiro} 
                  onChange={e => setBalanceiro(e.target.value)}
                  placeholder="Nome do balanceiro"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {!safraId && (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="font-medium text-lg mb-1">Selecione uma Safra</h3>
              <p className="text-sm text-muted-foreground">
                Para iniciar o registro de colheitas, selecione uma safra no campo acima.
              </p>
            </CardContent>
          </Card>
        )}

        {safraId && (
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Coluna Esquerda: Lavouras e Pesagem Entrada */}
            <div className="space-y-6">
              {/* Lista de Lavouras */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Lista de Lavouras
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="max-h-48 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Lavoura</TableHead>
                          <TableHead className="text-right">Área (ha)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {controleLavouras.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={2} className="text-center text-muted-foreground py-8">
                              Nenhuma lavoura cadastrada para esta safra
                            </TableCell>
                          </TableRow>
                        ) : (
                          controleLavouras.map(cl => (
                            <TableRow 
                              key={cl.id}
                              className={cn(
                                "cursor-pointer transition-colors",
                                selectedLavouraId === cl.lavoura_id && "bg-primary/10"
                              )}
                              onClick={() => {
                                setSelectedLavouraId(cl.lavoura_id);
                                setSelectedPendente(null);
                              }}
                            >
                              <TableCell className="font-medium">
                                {cl.lavouras?.nome}
                              </TableCell>
                              <TableCell className="text-right">
                                {cl.ha_plantado?.toFixed(2) || cl.lavouras?.total_hectares?.toFixed(2) || "-"}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {/* Pesagem de Entrada */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Scale className="h-4 w-4" />
                    Pesagem de Entrada
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2 space-y-2">
                      <Label>Kgs Entrada (Bruto) *</Label>
                      <Input
                        type="number"
                        value={formEntrada.peso_bruto || ""}
                        onChange={e => setFormEntrada(prev => ({ ...prev, peso_bruto: Number(e.target.value) }))}
                        placeholder="0"
                        className="text-lg font-bold"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Placa</Label>
                      <Select 
                        value={formEntrada.placa_id || "_none"} 
                        onValueChange={v => setFormEntrada(prev => ({ ...prev, placa_id: v === "_none" ? "" : v }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="_none">Nenhuma</SelectItem>
                          {placas.filter(p => p.ativa).map(p => (
                            <SelectItem key={p.id} value={p.id}>{p.placa}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Motorista</Label>
                      <Input
                        value={formEntrada.motorista}
                        onChange={e => setFormEntrada(prev => ({ ...prev, motorista: e.target.value }))}
                        placeholder="Nome"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Tipo</Label>
                      <Select 
                        value={formEntrada.tipo_colheita} 
                        onValueChange={v => setFormEntrada(prev => ({ ...prev, tipo_colheita: v }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="industria">Indústria (60kg)</SelectItem>
                          <SelectItem value="semente">Semente (40kg)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Variedade</Label>
                      <Select 
                        value={formEntrada.variedade_id || "_none"} 
                        onValueChange={v => setFormEntrada(prev => ({ ...prev, variedade_id: v === "_none" ? "" : v }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="_none">Nenhuma</SelectItem>
                          {sementes.map(s => (
                            <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Button 
                    onClick={handleConfirmarEntrada}
                    disabled={!selectedLavouraId || formEntrada.peso_bruto <= 0 || createColheitaEntrada.isPending}
                    className="w-full"
                  >
                    {createColheitaEntrada.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4 mr-2" />
                    )}
                    Confirmar Entrada
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Coluna Direita: Cargas Pendentes e Pesagem Saída */}
            <div className="space-y-6">
              {/* Cargas Pendentes */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Truck className="h-4 w-4" />
                    Cargas Pendentes (Aguardando Saída)
                    {cargasPendentes.length > 0 && (
                      <Badge variant="secondary">{cargasPendentes.length}</Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="max-h-48 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Lavoura</TableHead>
                          <TableHead>Placa</TableHead>
                          <TableHead className="text-right">Bruto</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {loadingPendentes ? (
                          <TableRow>
                            <TableCell colSpan={3} className="text-center py-8">
                              <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                            </TableCell>
                          </TableRow>
                        ) : cargasPendentes.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                              Nenhuma carga pendente
                            </TableCell>
                          </TableRow>
                        ) : (
                          cargasPendentes.map(carga => (
                            <TableRow 
                              key={carga.id}
                              className={cn(
                                "cursor-pointer transition-colors",
                                selectedPendente === carga.id && "bg-primary/10"
                              )}
                              onClick={() => {
                                setSelectedPendente(carga.id);
                                setSelectedLavouraId(null);
                              }}
                            >
                              <TableCell className="font-medium">
                                {carga.lavouras?.nome}
                              </TableCell>
                              <TableCell>
                                {carga.placas?.placa || "-"}
                              </TableCell>
                              <TableCell className="text-right font-mono">
                                {carga.peso_bruto?.toLocaleString("pt-BR")}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {/* Pesagem de Saída */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Scale className="h-4 w-4" />
                    Pesagem de Saída
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Kgs Entrada</Label>
                      <Input
                        value={pesoBrutoSelecionado.toLocaleString("pt-BR")}
                        readOnly
                        className="bg-muted font-mono"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Kgs Tara *</Label>
                      <Input
                        type="number"
                        value={formSaida.peso_tara || ""}
                        onChange={e => setFormSaida(prev => ({ ...prev, peso_tara: Number(e.target.value) }))}
                        placeholder="0"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Kgs Líquido</Label>
                      <Input
                        value={calculos.pesoLiquido.toLocaleString("pt-BR")}
                        readOnly
                        className="bg-muted font-mono"
                      />
                    </div>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Impureza %</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={formSaida.impureza || ""}
                        onChange={e => setFormSaida(prev => ({ ...prev, impureza: Number(e.target.value) }))}
                        placeholder="0.00"
                      />
                      <p className="text-xs text-muted-foreground">
                        Kg: {calculos.kgImpureza.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>Umidade %</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={formSaida.umidade || ""}
                        onChange={e => setFormSaida(prev => ({ ...prev, umidade: Number(e.target.value) }))}
                        placeholder="0.00"
                      />
                      <p className="text-xs text-muted-foreground">
                        Desc: {calculos.percentualDescontoUmidade}% | Kg: {calculos.kgUmidade.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>Avariados %</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={formSaida.percentual_avariados || ""}
                        onChange={e => setFormSaida(prev => ({ ...prev, percentual_avariados: Number(e.target.value) }))}
                        placeholder="0.00"
                      />
                      <p className="text-xs text-muted-foreground">
                        Kg: {calculos.kgAvariados.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>Outros %</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={formSaida.percentual_outros || ""}
                        onChange={e => setFormSaida(prev => ({ ...prev, percentual_outros: Number(e.target.value) }))}
                        placeholder="0.00"
                      />
                      <p className="text-xs text-muted-foreground">
                        Kg: {calculos.kgOutros.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>PH</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={formSaida.ph || ""}
                        onChange={e => setFormSaida(prev => ({ ...prev, ph: Number(e.target.value) }))}
                        placeholder="0.0"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Total Descontos</Label>
                      <Input
                        value={calculos.totalDescontos.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}
                        readOnly
                        className="bg-muted font-mono"
                      />
                    </div>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-base font-semibold">Líquido Final (Kg)</Label>
                      <Input
                        value={calculos.liquidoFinal.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}
                        readOnly
                        className="bg-primary/10 font-mono text-lg font-bold"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-base font-semibold">Total Sacos</Label>
                      <Input
                        value={calculos.totalSacos.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}
                        readOnly
                        className="bg-primary/10 font-mono text-lg font-bold"
                      />
                    </div>
                  </div>

                  <Button 
                    onClick={handleConfirmarSaida}
                    disabled={!selectedPendente || formSaida.peso_tara <= 0 || updateColheitaSaida.isPending}
                    className="w-full"
                    variant="default"
                  >
                    {updateColheitaSaida.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4 mr-2" />
                    )}
                    Confirmar Saída
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
