import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { Plus, Pencil, Trash2, AlertCircle, Search } from 'lucide-react';
import { useColheitas, useCreateColheita, useUpdateColheita, useDeleteColheita, ColheitaInput } from '@/hooks/useColheitas';
import { useSilos } from '@/hooks/useSilos';
import { usePlacas } from '@/hooks/usePlacas';
import { useProdutosSementes } from '@/hooks/useProdutosSementes';
import { useTabelaUmidades } from '@/hooks/useTabelaUmidades';
import { useControleLavoura } from '@/hooks/useControleLavouras';
import { useAllInscricoes } from '@/hooks/useAllInscricoes';
import { useInscricoesByProdutor } from '@/hooks/useInscricoesProdutor';
import { useProdutores } from '@/hooks/useProdutores';
import { useLocaisEntrega } from '@/hooks/useLocaisEntrega';
import { format } from 'date-fns';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

interface ColheitasTabProps {
  controleLavouraId: string | null;
  canEdit: boolean;
}

const emptyColheita: ColheitaInput = {
  controle_lavoura_id: '',
  data_colheita: null,
  area_colhida: 0,
  producao_kg: 0,
  umidade: 0,
  impureza: 0,
  producao_liquida_kg: 0,
  produtividade_sacas_ha: 0,
  silo_id: null,
  placa_id: null,
  motorista: null,
  observacoes: null,
  peso_bruto: 0,
  peso_tara: 0,
  kg_impureza: 0,
  percentual_desconto: 0,
  kg_umidade: 0,
  percentual_avariados: 0,
  kg_avariados: 0,
  percentual_outros: 0,
  kg_outros: 0,
  kg_desconto_total: 0,
  total_sacos: 0,
  ph: 0,
  variedade_id: null,
  tipo_colheita: 'industria',
  inscricao_produtor_id: null,
  local_entrega_terceiro_id: null,
};

export function ColheitasTab({ controleLavouraId, canEdit }: ColheitasTabProps) {
  const { data: colheitas, isLoading } = useColheitas(controleLavouraId);
  const { data: controleLavoura } = useControleLavoura(controleLavouraId);
  const { data: silos } = useSilos();
  const { data: placas } = usePlacas();
  const { data: sementes } = useProdutosSementes();
  const { data: tabelaUmidades } = useTabelaUmidades();
  const { data: inscricoes } = useAllInscricoes();
  const { data: produtores } = useProdutores();
  const { data: locaisEntrega = [] } = useLocaisEntrega();

  // Estado para seleção de produtor em duas etapas
  const [selectedProdutorId, setSelectedProdutorId] = useState<string | null>(null);
  const { data: inscricoesPorProdutor } = useInscricoesByProdutor(selectedProdutorId || undefined);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<ColheitaInput>(emptyColheita);

  const createMutation = useCreateColheita();
  const updateMutation = useUpdateColheita();
  const deleteMutation = useDeleteColheita();

  // Obter cultura_id da safra do controle
  const culturaId = controleLavoura?.safras?.cultura_id;
  const informarPh = controleLavoura?.safras?.culturas?.informar_ph ?? false;

  // Função para buscar percentual de desconto na tabela de umidades
  const getPercentualDesconto = (umidade: number): number => {
    if (!tabelaUmidades || !culturaId) {
      console.log('[% Desconto Debug] tabelaUmidades:', tabelaUmidades?.length, 'culturaId:', culturaId);
      return 0;
    }
    
    const faixasParaCultura = tabelaUmidades.filter(t => t.cultura_id === culturaId && t.ativa);
    console.log('[% Desconto Debug] Faixas para cultura', culturaId, ':', faixasParaCultura.length, faixasParaCultura);
    
    const faixa = faixasParaCultura.find(
      (t) => umidade >= t.umidade_minima && umidade <= t.umidade_maxima
    );
    
    console.log('[% Desconto Debug] Umidade:', umidade, 'Faixa encontrada:', faixa);
    return faixa?.desconto_percentual || 0;
  };

  // Calcular campos automaticamente quando valores mudam (cálculos em cascata)
  useEffect(() => {
    const pesoBruto = formData.peso_bruto || 0;
    const pesoTara = formData.peso_tara || 0;
    const total = pesoBruto - pesoTara;
    
    const percImpureza = formData.impureza || 0;
    const percUmidade = formData.umidade || 0;
    const percDesconto = getPercentualDesconto(percUmidade);
    const percAvariados = formData.percentual_avariados || 0;
    const percOutros = formData.percentual_outros || 0;
    
    // Cálculos em cascata (descontando do saldo anterior)
    const kgImpureza = total * (percImpureza / 100);
    const baseUmidade = total - kgImpureza;
    const kgUmidade = baseUmidade * (percDesconto / 100);
    const baseAvariados = baseUmidade - kgUmidade;
    const kgAvariados = baseAvariados * (percAvariados / 100);
    const baseOutros = baseAvariados - kgAvariados;
    const kgOutros = baseOutros * (percOutros / 100);
    const kgDescontoTotal = kgImpureza + kgUmidade + kgAvariados + kgOutros;
    
    const liquido = total - kgDescontoTotal;
    const pesoSaco = formData.tipo_colheita === 'semente' ? 40 : 60;
    const totalSacos = liquido / pesoSaco;
    
    const areaColhida = formData.area_colhida || 0;
    const produtividade = areaColhida > 0 ? totalSacos / areaColhida : 0;

    setFormData(prev => ({
      ...prev,
      producao_kg: total,
      kg_impureza: kgImpureza,
      percentual_desconto: percDesconto,
      kg_umidade: kgUmidade,
      kg_avariados: kgAvariados,
      kg_outros: kgOutros,
      kg_desconto_total: kgDescontoTotal,
      producao_liquida_kg: liquido,
      total_sacos: totalSacos,
      produtividade_sacas_ha: produtividade,
    }));
  }, [
    formData.peso_bruto,
    formData.peso_tara,
    formData.impureza,
    formData.umidade,
    formData.percentual_avariados,
    formData.percentual_outros,
    formData.area_colhida,
    formData.tipo_colheita,
    tabelaUmidades,
    culturaId
  ]);

  // Calcular totais e médias para o rodapé
  const totais = useMemo(() => {
    if (!colheitas || colheitas.length === 0) {
      return {
        totalBruto: 0,
        totalTara: 0,
        totalProducao: 0,
        totalLiquido: 0,
        totalSacos: 0,
        totalAreaColhida: 0,
        mediaImpureza: 0,
        mediaUmidade: 0,
        mediaPh: 0,
        mediaPorHa: 0,
      };
    }

    const totalBruto = colheitas.reduce((sum, c) => sum + (c.peso_bruto || 0), 0);
    const totalTara = colheitas.reduce((sum, c) => sum + (c.peso_tara || 0), 0);
    const totalProducao = colheitas.reduce((sum, c) => sum + (c.producao_kg || 0), 0);
    const totalLiquido = colheitas.reduce((sum, c) => sum + (c.producao_liquida_kg || 0), 0);
    const totalSacos = colheitas.reduce((sum, c) => sum + (c.total_sacos || 0), 0);
    const totalAreaColhida = colheitas.reduce((sum, c) => sum + (c.area_colhida || 0), 0);
    
    const mediaImpureza = colheitas.reduce((sum, c) => sum + (c.impureza || 0), 0) / colheitas.length;
    const mediaUmidade = colheitas.reduce((sum, c) => sum + (c.umidade || 0), 0) / colheitas.length;
    const mediaPh = colheitas.reduce((sum, c) => sum + (c.ph || 0), 0) / colheitas.length;
    const mediaPorHa = totalAreaColhida > 0 ? totalSacos / totalAreaColhida : 0;

    return {
      totalBruto,
      totalTara,
      totalProducao,
      totalLiquido,
      totalSacos,
      totalAreaColhida,
      mediaImpureza,
      mediaUmidade,
      mediaPh,
      mediaPorHa,
    };
  }, [colheitas]);

  if (!controleLavouraId) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Selecione uma Safra e Lavoura no cabeçalho e clique em "Criar Registro" para habilitar o cadastro de colheitas.
        </AlertDescription>
      </Alert>
    );
  }

  const handleNew = () => {
    setFormData({
      ...emptyColheita,
      controle_lavoura_id: controleLavouraId,
    });
    setSelectedProdutorId(null);
    setEditingId(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (colheita: any) => {
    // Encontrar o produtor associado à inscrição
    if (colheita.inscricao_produtor_id) {
      const inscricao = inscricoes?.find(i => i.id === colheita.inscricao_produtor_id);
      if (inscricao?.produtor_id) {
        setSelectedProdutorId(inscricao.produtor_id);
      }
    } else {
      setSelectedProdutorId(null);
    }
    
    setFormData({
      controle_lavoura_id: colheita.controle_lavoura_id || controleLavouraId,
      data_colheita: colheita.data_colheita,
      area_colhida: colheita.area_colhida || 0,
      producao_kg: colheita.producao_kg || 0,
      umidade: colheita.umidade || 0,
      impureza: colheita.impureza || 0,
      producao_liquida_kg: colheita.producao_liquida_kg || 0,
      produtividade_sacas_ha: colheita.produtividade_sacas_ha || 0,
      silo_id: colheita.silo_id,
      placa_id: colheita.placa_id,
      motorista: colheita.motorista,
      observacoes: colheita.observacoes,
      peso_bruto: colheita.peso_bruto || 0,
      peso_tara: colheita.peso_tara || 0,
      kg_impureza: colheita.kg_impureza || 0,
      percentual_desconto: colheita.percentual_desconto || 0,
      kg_umidade: colheita.kg_umidade || 0,
      percentual_avariados: colheita.percentual_avariados || 0,
      kg_avariados: colheita.kg_avariados || 0,
      percentual_outros: colheita.percentual_outros || 0,
      kg_outros: colheita.kg_outros || 0,
      kg_desconto_total: colheita.kg_desconto_total || 0,
      total_sacos: colheita.total_sacos || 0,
      ph: colheita.ph || 0,
      variedade_id: colheita.variedade_id,
      tipo_colheita: colheita.tipo_colheita || 'industria',
      inscricao_produtor_id: colheita.inscricao_produtor_id,
      local_entrega_terceiro_id: colheita.local_entrega_terceiro_id,
    });
    setEditingId(colheita.id);
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta colheita?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      updateMutation.mutate({ id: editingId, ...formData }, {
        onSuccess: () => setIsDialogOpen(false),
      });
    } else {
      createMutation.mutate(formData, {
        onSuccess: () => setIsDialogOpen(false),
      });
    }
  };

  const formatNumber = (value: number | null, decimals = 2) => {
    if (value === null || value === undefined) return '-';
    return value.toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {canEdit && (
        <div className="flex justify-end">
          <Button onClick={handleNew} className="gap-2">
            <Plus className="h-4 w-4" />
            Nova Colheita
          </Button>
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          <ScrollArea className="w-full whitespace-nowrap">
            <div className="min-w-[1600px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    {canEdit && <TableHead className="w-20">Ações</TableHead>}
                    <TableHead className="w-24">Data</TableHead>
                    <TableHead className="w-20">Placa</TableHead>
                    <TableHead className="text-right w-20">Bruto</TableHead>
                    <TableHead className="text-right w-20">Tara</TableHead>
                    <TableHead className="text-right w-20">Total</TableHead>
                    <TableHead className="text-right w-14">%Imp</TableHead>
                    <TableHead className="text-right w-20">Kg Imp</TableHead>
                    <TableHead className="text-right w-14">%Um</TableHead>
                    <TableHead className="text-right w-14">%Desc</TableHead>
                    <TableHead className="text-right w-20">Kg Um</TableHead>
                    <TableHead className="text-right w-20">Kg Desc</TableHead>
                    <TableHead className="text-right w-20">Líquido</TableHead>
                    <TableHead className="text-right w-16">Sacos</TableHead>
                    <TableHead className="text-right w-16">Sc/Ha</TableHead>
                    {informarPh && <TableHead className="text-right w-12">PH</TableHead>}
                    <TableHead className="w-24">Destino</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {colheitas?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={canEdit ? (informarPh ? 17 : 16) : (informarPh ? 16 : 15)} className="text-center text-muted-foreground py-8">
                        Nenhuma colheita cadastrada
                      </TableCell>
                    </TableRow>
                  ) : (
                    colheitas?.map((colheita) => (
                      <TableRow key={colheita.id}>
                        {canEdit && (
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" onClick={() => handleEdit(colheita)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDelete(colheita.id)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                        <TableCell className="text-sm">
                          {colheita.data_colheita ? format(new Date(colheita.data_colheita), 'dd/MM/yy') : '-'}
                        </TableCell>
                        <TableCell className="text-sm">{colheita.placas?.placa || '-'}</TableCell>
                        <TableCell className="text-right text-sm">{formatNumber(colheita.peso_bruto, 0)}</TableCell>
                        <TableCell className="text-right text-sm">{formatNumber(colheita.peso_tara, 0)}</TableCell>
                        <TableCell className="text-right text-sm font-medium">{formatNumber(colheita.producao_kg, 0)}</TableCell>
                        <TableCell className="text-right text-sm">{formatNumber(colheita.impureza, 1)}</TableCell>
                        <TableCell className="text-right text-sm">{formatNumber(colheita.kg_impureza, 0)}</TableCell>
                        <TableCell className="text-right text-sm">{formatNumber(colheita.umidade, 1)}</TableCell>
                        <TableCell className="text-right text-sm">{formatNumber(colheita.percentual_desconto, 2)}</TableCell>
                        <TableCell className="text-right text-sm">{formatNumber(colheita.kg_umidade, 0)}</TableCell>
                        <TableCell className="text-right text-sm">{formatNumber(colheita.kg_desconto_total, 0)}</TableCell>
                        <TableCell className="text-right text-sm font-medium">{formatNumber(colheita.producao_liquida_kg, 0)}</TableCell>
                        <TableCell className="text-right text-sm font-medium">{formatNumber(colheita.total_sacos, 2)}</TableCell>
                        <TableCell className="text-right text-sm">{formatNumber(colheita.produtividade_sacas_ha, 2)}</TableCell>
                        {informarPh && <TableCell className="text-right text-sm">{formatNumber(colheita.ph, 1)}</TableCell>}
                        <TableCell className="text-sm">
                          {colheita.local_entrega_terceiro?.nome || colheita.silos?.nome || '-'}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Rodapé com Totais e Médias */}
      {colheitas && colheitas.length > 0 && (
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-base">Totais e Médias</CardTitle>
          </CardHeader>
          <CardContent className="py-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="space-y-1">
                <span className="text-muted-foreground">Total Bruto:</span>
                <p className="font-semibold">{formatNumber(totais.totalBruto, 0)} kg</p>
              </div>
              <div className="space-y-1">
                <span className="text-muted-foreground">Total Tara:</span>
                <p className="font-semibold">{formatNumber(totais.totalTara, 0)} kg</p>
              </div>
              <div className="space-y-1">
                <span className="text-muted-foreground">Total Produção:</span>
                <p className="font-semibold">{formatNumber(totais.totalProducao, 0)} kg</p>
              </div>
              <div className="space-y-1">
                <span className="text-muted-foreground">Total Líquido:</span>
                <p className="font-semibold">{formatNumber(totais.totalLiquido, 0)} kg</p>
              </div>
              <div className="space-y-1">
                <span className="text-muted-foreground">Total Sacos:</span>
                <p className="font-semibold">{formatNumber(totais.totalSacos, 2)}</p>
              </div>
              <div className="space-y-1">
                <span className="text-muted-foreground">Média Impureza:</span>
                <p className="font-semibold">{formatNumber(totais.mediaImpureza, 2)}%</p>
              </div>
              <div className="space-y-1">
                <span className="text-muted-foreground">Média Umidade:</span>
                <p className="font-semibold">{formatNumber(totais.mediaUmidade, 2)}%</p>
              </div>
              {informarPh && (
                <div className="space-y-1">
                  <span className="text-muted-foreground">Média PH:</span>
                  <p className="font-semibold">{formatNumber(totais.mediaPh, 2)}</p>
                </div>
              )}
              <div className="space-y-1">
                <span className="text-muted-foreground">Área Colhida:</span>
                <p className="font-semibold">{formatNumber(totais.totalAreaColhida, 2)} ha</p>
              </div>
              <div className="space-y-1">
                <span className="text-muted-foreground">Média por Ha:</span>
                <p className="font-semibold">{formatNumber(totais.mediaPorHa, 2)} sc/ha</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar Colheita' : 'Nova Colheita'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Linha 1: Data, Placa, Motorista, Tipo, Área */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="space-y-2">
                <Label>Data Colheita</Label>
                <Input
                  type="date"
                  value={formData.data_colheita || ''}
                  onChange={(e) => setFormData({ ...formData, data_colheita: e.target.value || null })}
                />
              </div>

              <div className="space-y-2">
                <Label>Placa</Label>
                <Select
                  value={formData.placa_id || "none"}
                  onValueChange={(value) => setFormData({ ...formData, placa_id: value === "none" ? null : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {placas?.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.placa}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Motorista</Label>
                <Input
                  value={formData.motorista || ''}
                  onChange={(e) => setFormData({ ...formData, motorista: e.target.value || null })}
                />
              </div>

              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select
                  value={formData.tipo_colheita || 'industria'}
                  onValueChange={(value) => setFormData({ ...formData, tipo_colheita: value })}
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
                <Label>Área Colhida (ha)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.area_colhida || ''}
                  onChange={(e) => setFormData({ ...formData, area_colhida: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>

            {/* Linha 2: Pesos */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Peso Bruto (kg)</Label>
                <Input
                  type="number"
                  step="1"
                  value={formData.peso_bruto || ''}
                  onChange={(e) => setFormData({ ...formData, peso_bruto: parseFloat(e.target.value) || 0 })}
                />
              </div>

              <div className="space-y-2">
                <Label>Peso Tara (kg)</Label>
                <Input
                  type="number"
                  step="1"
                  value={formData.peso_tara || ''}
                  onChange={(e) => setFormData({ ...formData, peso_tara: parseFloat(e.target.value) || 0 })}
                />
              </div>

              <div className="space-y-2">
                <Label>Total (kg)</Label>
                <Input
                  type="text"
                  value={formatNumber(formData.producao_kg, 0)}
                  disabled
                  className="bg-muted"
                />
              </div>
            </div>

            {/* Linha 3: Impureza */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>% Impureza</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.impureza || ''}
                  onChange={(e) => setFormData({ ...formData, impureza: parseFloat(e.target.value) || 0 })}
                />
              </div>

              <div className="space-y-2">
                <Label>Kg Impureza</Label>
                <Input
                  type="text"
                  value={formatNumber(formData.kg_impureza, 0)}
                  disabled
                  className="bg-muted"
                />
              </div>

              <div className="space-y-2">
                <Label>% Umidade</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.umidade || ''}
                  onChange={(e) => setFormData({ ...formData, umidade: parseFloat(e.target.value) || 0 })}
                />
              </div>

              <div className="space-y-2">
                <Label>% Desconto (auto)</Label>
                <Input
                  type="text"
                  value={formatNumber(formData.percentual_desconto, 2)}
                  disabled
                  className="bg-muted"
                />
              </div>
            </div>

            {/* Linha 4: Umidade e outros descontos */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Kg Umidade</Label>
                <Input
                  type="text"
                  value={formatNumber(formData.kg_umidade, 0)}
                  disabled
                  className="bg-muted"
                />
              </div>

              <div className="space-y-2">
                <Label>% Avariados</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.percentual_avariados || ''}
                  onChange={(e) => setFormData({ ...formData, percentual_avariados: parseFloat(e.target.value) || 0 })}
                />
              </div>

              <div className="space-y-2">
                <Label>Kg Avariados</Label>
                <Input
                  type="text"
                  value={formatNumber(formData.kg_avariados, 0)}
                  disabled
                  className="bg-muted"
                />
              </div>

              <div className="space-y-2">
                <Label>% Outros</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.percentual_outros || ''}
                  onChange={(e) => setFormData({ ...formData, percentual_outros: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>

            {/* Linha 5: Totais calculados */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="space-y-2">
                <Label>Kg Outros</Label>
                <Input
                  type="text"
                  value={formatNumber(formData.kg_outros, 0)}
                  disabled
                  className="bg-muted"
                />
              </div>

              <div className="space-y-2">
                <Label>Kg Desc. Total</Label>
                <Input
                  type="text"
                  value={formatNumber(formData.kg_desconto_total, 0)}
                  disabled
                  className="bg-muted"
                />
              </div>

              <div className="space-y-2">
                <Label>Líquido (kg)</Label>
                <Input
                  type="text"
                  value={formatNumber(formData.producao_liquida_kg, 0)}
                  disabled
                  className="bg-muted font-semibold"
                />
              </div>

              <div className="space-y-2">
                <Label>Total Sacos</Label>
                <Input
                  type="text"
                  value={formatNumber(formData.total_sacos, 2)}
                  disabled
                  className="bg-muted font-semibold"
                />
              </div>

              <div className="space-y-2">
                <Label>Produtividade (sc/ha)</Label>
                <Input
                  type="text"
                  value={formatNumber(formData.produtividade_sacas_ha, 2)}
                  disabled
                  className="bg-muted font-semibold"
                />
              </div>
            </div>

            {/* Linha 6: Sócio/Produtor (duas etapas) e Inscrição */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Sócio/Produtor</Label>
                <Select
                  value={selectedProdutorId || "none"}
                  onValueChange={(value) => {
                    setSelectedProdutorId(value === "none" ? null : value);
                    setFormData({ ...formData, inscricao_produtor_id: null }); // Limpa inscrição ao mudar produtor
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o produtor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {produtores?.filter(p => p.ativo).map((prod) => (
                      <SelectItem key={prod.id} value={prod.id}>
                        {prod.nome} ({prod.tipo_produtor === 'socio' ? 'Sócio' : 'Produtor'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Inscrição Estadual</Label>
                <Select
                  value={formData.inscricao_produtor_id || "none"}
                  onValueChange={(value) => setFormData({ ...formData, inscricao_produtor_id: value === "none" ? null : value })}
                  disabled={!selectedProdutorId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={selectedProdutorId ? "Selecione a inscrição" : "Selecione o produtor primeiro"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma</SelectItem>
                    {inscricoesPorProdutor
                      ?.sort((a, b) => (b.ativa ? 1 : 0) - (a.ativa ? 1 : 0))
                      .map((insc) => (
                      <SelectItem key={insc.id} value={insc.id}>
                        IE: {insc.inscricao_estadual || 'N/A'} - {insc.tipo || 'Sem tipo'} ({insc.cidade}/{insc.uf}){!insc.ativa && ' (Inativa)'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Local Entrega (Terceiros)</Label>
                <Select
                  value={formData.local_entrega_terceiro_id || "none"}
                  onValueChange={(value) => setFormData({ ...formData, local_entrega_terceiro_id: value === "none" ? null : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum (Silo próprio)</SelectItem>
                    {locaisEntrega?.filter(le => le.ativo).map((le) => (
                      <SelectItem key={le.id} value={le.id}>{le.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Linha 7: PH (condicional), Semente, Silo */}
            <div className={`grid ${informarPh ? 'grid-cols-3' : 'grid-cols-2'} gap-4`}>
              {informarPh && (
                <div className="space-y-2">
                  <Label>PH</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.ph || ''}
                    onChange={(e) => setFormData({ ...formData, ph: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label>Semente</Label>
                <Select
                  value={formData.variedade_id || "none"}
                  onValueChange={(value) => setFormData({ ...formData, variedade_id: value === "none" ? null : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma</SelectItem>
                    {sementes?.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Destino (Silo Próprio)</Label>
                <Select
                  value={formData.silo_id || "none"}
                  onValueChange={(value) => setFormData({ ...formData, silo_id: value === "none" ? null : value })}
                  disabled={!!formData.local_entrega_terceiro_id && formData.local_entrega_terceiro_id !== "none"}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {silos?.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Observações */}
            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea
                value={formData.observacoes || ''}
                onChange={(e) => setFormData({ ...formData, observacoes: e.target.value || null })}
                rows={2}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {editingId ? 'Salvar' : 'Cadastrar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
