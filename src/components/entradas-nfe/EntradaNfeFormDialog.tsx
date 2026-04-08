import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useGranjas } from "@/hooks/useGranjas";
import { useClientesFornecedores } from "@/hooks/useClientesFornecedores";
import { useProdutos } from "@/hooks/useProdutos";
import { useCfops } from "@/hooks/useCfops";
import { useEntradaNfe, useCreateEntradaNfe, useUpdateEntradaNfe } from "@/hooks/useEntradasNfe";
import { toast } from "sonner";
import { formatNumber } from "@/lib/formatters";
import { Plus, Trash2, Link2 } from "lucide-react";
import { VincularProdutoDialog } from "./VincularProdutoDialog";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entradaId: string | null;
}

const emptyItem = () => ({
  produto_id: null as string | null,
  produto_xml_codigo: '',
  produto_xml_descricao: '',
  produto_xml_ncm: '',
  cfop: '',
  unidade_medida: '',
  quantidade: 0,
  valor_unitario: 0,
  valor_total: 0,
  valor_desconto: 0,
  valor_frete_rateio: 0,
  cst_icms: '',
  base_icms: 0,
  aliq_icms: 0,
  valor_icms: 0,
  cst_ipi: '',
  base_ipi: 0,
  aliq_ipi: 0,
  valor_ipi: 0,
  cst_pis: '',
  base_pis: 0,
  aliq_pis: 0,
  valor_pis: 0,
  cst_cofins: '',
  base_cofins: 0,
  aliq_cofins: 0,
  valor_cofins: 0,
  lote: '',
  data_validade: '',
  vinculado: false,
  quantidade_conferida: null as number | null,
});

export function EntradaNfeFormDialog({ open, onOpenChange, entradaId }: Props) {
  const isEdit = !!entradaId;
  const { data: entradaData } = useEntradaNfe(entradaId);
  const { data: granjas } = useGranjas();
  const { data: clientes } = useClientesFornecedores();
  const { data: cfops } = useCfops();
  const { data: produtos } = useProdutos();
  const createMutation = useCreateEntradaNfe();
  const updateMutation = useUpdateEntradaNfe();

  const [granjaId, setGranjaId] = useState('');
  const [fornecedorId, setFornecedorId] = useState('');
  const [numeroNfe, setNumeroNfe] = useState('');
  const [serie, setSerie] = useState('1');
  const [chaveAcesso, setChaveAcesso] = useState('');
  const [dataEmissao, setDataEmissao] = useState('');
  const [dataEntrada, setDataEntrada] = useState(new Date().toISOString().split('T')[0]);
  const [cfopId, setCfopId] = useState('');
  const [naturezaOperacao, setNaturezaOperacao] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [itens, setItens] = useState<ReturnType<typeof emptyItem>[]>([emptyItem()]);
  const [vincularIdx, setVincularIdx] = useState<number | null>(null);

  // Totais calculados
  const [valorProdutos, setValorProdutos] = useState(0);
  const [valorFrete, setValorFrete] = useState(0);
  const [valorSeguro, setValorSeguro] = useState(0);
  const [valorDesconto, setValorDesconto] = useState(0);
  const [valorOutras, setValorOutras] = useState(0);

  useEffect(() => {
    if (!open) return;
    if (isEdit && entradaData) {
      setGranjaId(entradaData.granja_id || '');
      setFornecedorId(entradaData.fornecedor_id || '');
      setNumeroNfe(entradaData.numero_nfe || '');
      setSerie(entradaData.serie || '1');
      setChaveAcesso(entradaData.chave_acesso || '');
      setDataEmissao(entradaData.data_emissao || '');
      setDataEntrada(entradaData.data_entrada || '');
      setCfopId(entradaData.cfop_id || '');
      setNaturezaOperacao(entradaData.natureza_operacao || '');
      setObservacoes(entradaData.observacoes || '');
      setValorProdutos(entradaData.valor_produtos || 0);
      setValorFrete(entradaData.valor_frete || 0);
      setValorSeguro(entradaData.valor_seguro || 0);
      setValorDesconto(entradaData.valor_desconto || 0);
      setValorOutras(entradaData.valor_outras_despesas || 0);
      setItens(
        (entradaData as any).itens?.length
          ? (entradaData as any).itens.map((i: any) => ({
              ...i,
              data_validade: i.data_validade || '',
              lote: i.lote || '',
              quantidade_conferida: i.quantidade_conferida,
            }))
          : [emptyItem()]
      );
    } else if (!isEdit) {
      resetForm();
    }
  }, [open, isEdit, entradaData]);

  const resetForm = () => {
    setGranjaId('');
    setFornecedorId('');
    setNumeroNfe('');
    setSerie('1');
    setChaveAcesso('');
    setDataEmissao('');
    setDataEntrada(new Date().toISOString().split('T')[0]);
    setCfopId('');
    setNaturezaOperacao('');
    setObservacoes('');
    setItens([emptyItem()]);
    setValorProdutos(0);
    setValorFrete(0);
    setValorSeguro(0);
    setValorDesconto(0);
    setValorOutras(0);
  };

  const updateItem = (idx: number, field: string, value: any) => {
    setItens((prev) => {
      const updated = [...prev];
      (updated[idx] as any)[field] = value;
      if (field === 'quantidade' || field === 'valor_unitario') {
        updated[idx].valor_total = (updated[idx].quantidade || 0) * (updated[idx].valor_unitario || 0);
      }
      return updated;
    });
  };

  const addItem = () => setItens((prev) => [...prev, emptyItem()]);
  const removeItem = (idx: number) => setItens((prev) => prev.filter((_, i) => i !== idx));

  const calcTotalNfe = () => {
    const totalItens = itens.reduce((s, i) => s + (i.valor_total || 0), 0);
    return totalItens + valorFrete + valorSeguro + valorOutras - valorDesconto;
  };

  const handleSave = async () => {
    if (!granjaId) { toast.error('Selecione uma granja.'); return; }

    const itensSave = itens.map(({ ...item }) => {
      const { id, entrada_nfe_id, produto, created_at, updated_at, ...rest } = item as any;
      return rest;
    });

    const payload = {
      granja_id: granjaId,
      fornecedor_id: fornecedorId || null,
      numero_nfe: numeroNfe,
      serie,
      chave_acesso: chaveAcesso,
      data_emissao: dataEmissao || null,
      data_entrada: dataEntrada,
      cfop_id: cfopId || null,
      natureza_operacao: naturezaOperacao,
      valor_produtos: itens.reduce((s, i) => s + (i.valor_total || 0), 0),
      valor_frete: valorFrete,
      valor_seguro: valorSeguro,
      valor_desconto: valorDesconto,
      valor_outras_despesas: valorOutras,
      valor_ipi: itens.reduce((s, i) => s + (i.valor_ipi || 0), 0),
      valor_icms: itens.reduce((s, i) => s + (i.valor_icms || 0), 0),
      valor_pis: itens.reduce((s, i) => s + (i.valor_pis || 0), 0),
      valor_cofins: itens.reduce((s, i) => s + (i.valor_cofins || 0), 0),
      valor_total: calcTotalNfe(),
      modo_entrada: 'manual',
      observacoes,
      itens: itensSave,
    };

    try {
      if (isEdit) {
        await updateMutation.mutateAsync({ id: entradaId, ...payload });
      } else {
        await createMutation.mutateAsync(payload);
      }
      onOpenChange(false);
    } catch {}
  };

  const handleVincular = (idx: number, produtoId: string) => {
    setItens((prev) => {
      const updated = [...prev];
      updated[idx].produto_id = produtoId;
      updated[idx].vinculado = true;
      return updated;
    });
    setVincularIdx(null);
  };

  const isFinalizado = isEdit && entradaData?.status === 'finalizado';
  const fornecedores = clientes?.filter((c: any) => c.tipo === 'fornecedor' || c.tipo === 'ambos') || [];

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl max-h-[95vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{isEdit ? 'Detalhes da Entrada NF-e' : 'Nova Entrada Manual'}</DialogTitle>
            <DialogDescription>
              {isFinalizado ? 'Esta entrada já foi finalizada.' : 'Preencha os dados da nota fiscal de compra.'}
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="cabecalho" className="flex-1 overflow-hidden flex flex-col">
            <TabsList className="w-full justify-start">
              <TabsTrigger value="cabecalho">Cabeçalho</TabsTrigger>
              <TabsTrigger value="itens">Itens ({itens.length})</TabsTrigger>
              <TabsTrigger value="totais">Totais</TabsTrigger>
            </TabsList>

            <ScrollArea className="flex-1">
              <TabsContent value="cabecalho" className="p-1">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>Granja *</Label>
                    <Select value={granjaId} onValueChange={setGranjaId} disabled={isFinalizado}>
                      <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                      <SelectContent>
                        {granjas?.map((g: any) => (<SelectItem key={g.id} value={g.id}>{g.razao_social}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Fornecedor</Label>
                    <Select value={fornecedorId} onValueChange={setFornecedorId} disabled={isFinalizado}>
                      <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                      <SelectContent>
                        {fornecedores.map((f: any) => (<SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>CFOP</Label>
                    <Select value={cfopId} onValueChange={setCfopId} disabled={isFinalizado}>
                      <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                      <SelectContent>
                        {cfops?.filter((c: any) => c.tipo === 'entrada').map((c: any) => (
                          <SelectItem key={c.id} value={c.id}>{c.codigo} - {c.descricao}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Nº NF-e</Label>
                    <Input value={numeroNfe} onChange={(e) => setNumeroNfe(e.target.value)} disabled={isFinalizado} />
                  </div>
                  <div>
                    <Label>Série</Label>
                    <Input value={serie} onChange={(e) => setSerie(e.target.value)} disabled={isFinalizado} />
                  </div>
                  <div>
                    <Label>Chave de Acesso</Label>
                    <Input value={chaveAcesso} onChange={(e) => setChaveAcesso(e.target.value)} maxLength={44} disabled={isFinalizado} />
                  </div>
                  <div>
                    <Label>Data Emissão</Label>
                    <Input type="date" value={dataEmissao} onChange={(e) => setDataEmissao(e.target.value)} disabled={isFinalizado} />
                  </div>
                  <div>
                    <Label>Data Entrada</Label>
                    <Input type="date" value={dataEntrada} onChange={(e) => setDataEntrada(e.target.value)} disabled={isFinalizado} />
                  </div>
                  <div>
                    <Label>Natureza da Operação</Label>
                    <Input value={naturezaOperacao} onChange={(e) => setNaturezaOperacao(e.target.value)} disabled={isFinalizado} />
                  </div>
                  <div className="md:col-span-3">
                    <Label>Observações</Label>
                    <Textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} rows={2} disabled={isFinalizado} />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="itens" className="p-1">
                {!isFinalizado && (
                  <div className="flex justify-end mb-2">
                    <Button size="sm" variant="outline" onClick={addItem}><Plus className="h-4 w-4 mr-1" /> Adicionar Item</Button>
                  </div>
                )}
                <div className="overflow-x-auto border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-8">#</TableHead>
                        <TableHead className="whitespace-nowrap min-w-[200px]">Produto</TableHead>
                        <TableHead className="whitespace-nowrap">CFOP</TableHead>
                        <TableHead className="whitespace-nowrap">Un.</TableHead>
                        <TableHead className="whitespace-nowrap text-right">Qtd</TableHead>
                        <TableHead className="whitespace-nowrap text-right">Vlr Unit.</TableHead>
                        <TableHead className="whitespace-nowrap text-right">Vlr Total</TableHead>
                        <TableHead className="whitespace-nowrap">Vínculo</TableHead>
                        {!isFinalizado && <TableHead className="w-10" />}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {itens.map((item, idx) => {
                        const prodNome = item.produto_id
                          ? produtos?.find((p: any) => p.id === item.produto_id)?.nome || 'Produto vinculado'
                          : item.produto_xml_descricao || '';
                        return (
                          <TableRow key={idx}>
                            <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                            <TableCell>
                              {isFinalizado || (isEdit && entradaData?.modo_entrada === 'xml') ? (
                                <div>
                                  <p className="text-sm font-medium">{item.produto_xml_descricao || prodNome}</p>
                                  {item.produto_xml_codigo && <p className="text-xs text-muted-foreground">Cód: {item.produto_xml_codigo}</p>}
                                </div>
                              ) : (
                                <Select value={item.produto_id || ''} onValueChange={(v) => { updateItem(idx, 'produto_id', v); updateItem(idx, 'vinculado', true); }}>
                                  <SelectTrigger className="min-w-[180px]"><SelectValue placeholder="Selecione produto..." /></SelectTrigger>
                                  <SelectContent>
                                    {produtos?.map((p: any) => (<SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>))}
                                  </SelectContent>
                                </Select>
                              )}
                            </TableCell>
                            <TableCell>
                              <Input value={item.cfop} onChange={(e) => updateItem(idx, 'cfop', e.target.value)} className="w-16" disabled={isFinalizado} />
                            </TableCell>
                            <TableCell>
                              <Input value={item.unidade_medida} onChange={(e) => updateItem(idx, 'unidade_medida', e.target.value)} className="w-14" disabled={isFinalizado} />
                            </TableCell>
                            <TableCell className="text-right">
                              <Input type="number" value={item.quantidade} onChange={(e) => updateItem(idx, 'quantidade', parseFloat(e.target.value) || 0)} className="w-20 text-right" disabled={isFinalizado} />
                            </TableCell>
                            <TableCell className="text-right">
                              <Input type="number" value={item.valor_unitario} onChange={(e) => updateItem(idx, 'valor_unitario', parseFloat(e.target.value) || 0)} className="w-24 text-right" step="0.01" disabled={isFinalizado} />
                            </TableCell>
                            <TableCell className="text-right font-medium">{formatCurrency(item.valor_total || 0)}</TableCell>
                            <TableCell>
                              {item.vinculado ? (
                                <Badge variant="default" className="text-xs">Vinculado</Badge>
                              ) : item.produto_xml_descricao ? (
                                <Button size="sm" variant="outline" onClick={() => setVincularIdx(idx)} disabled={isFinalizado}>
                                  <Link2 className="h-3 w-3 mr-1" /> Vincular
                                </Button>
                              ) : (
                                <span className="text-xs text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            {!isFinalizado && (
                              <TableCell>
                                <Button size="icon" variant="ghost" onClick={() => removeItem(idx)} disabled={itens.length <= 1}>
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </TableCell>
                            )}
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              <TabsContent value="totais" className="p-1">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-2xl">
                  <div>
                    <Label>Valor Produtos</Label>
                    <Input type="number" value={itens.reduce((s, i) => s + (i.valor_total || 0), 0)} readOnly className="bg-muted" />
                  </div>
                  <div>
                    <Label>Frete</Label>
                    <Input type="number" value={valorFrete} onChange={(e) => setValorFrete(parseFloat(e.target.value) || 0)} step="0.01" disabled={isFinalizado} />
                  </div>
                  <div>
                    <Label>Seguro</Label>
                    <Input type="number" value={valorSeguro} onChange={(e) => setValorSeguro(parseFloat(e.target.value) || 0)} step="0.01" disabled={isFinalizado} />
                  </div>
                  <div>
                    <Label>Desconto</Label>
                    <Input type="number" value={valorDesconto} onChange={(e) => setValorDesconto(parseFloat(e.target.value) || 0)} step="0.01" disabled={isFinalizado} />
                  </div>
                  <div>
                    <Label>Outras Despesas</Label>
                    <Input type="number" value={valorOutras} onChange={(e) => setValorOutras(parseFloat(e.target.value) || 0)} step="0.01" disabled={isFinalizado} />
                  </div>
                  <div>
                    <Label>Total ICMS</Label>
                    <Input type="number" value={itens.reduce((s, i) => s + (i.valor_icms || 0), 0)} readOnly className="bg-muted" />
                  </div>
                  <div>
                    <Label>Total IPI</Label>
                    <Input type="number" value={itens.reduce((s, i) => s + (i.valor_ipi || 0), 0)} readOnly className="bg-muted" />
                  </div>
                  <div>
                    <Label>Total PIS</Label>
                    <Input type="number" value={itens.reduce((s, i) => s + (i.valor_pis || 0), 0)} readOnly className="bg-muted" />
                  </div>
                  <div>
                    <Label>Total COFINS</Label>
                    <Input type="number" value={itens.reduce((s, i) => s + (i.valor_cofins || 0), 0)} readOnly className="bg-muted" />
                  </div>
                  <div className="md:col-span-3">
                    <Label className="text-lg font-bold">Valor Total da NF-e</Label>
                    <Input type="number" value={calcTotalNfe()} readOnly className="bg-muted text-lg font-bold" />
                  </div>
                </div>
              </TabsContent>
            </ScrollArea>
          </Tabs>

          {!isFinalizado && (
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending}>
                {createMutation.isPending || updateMutation.isPending ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {vincularIdx !== null && (
        <VincularProdutoDialog
          open={true}
          onOpenChange={() => setVincularIdx(null)}
          xmlDescricao={itens[vincularIdx]?.produto_xml_descricao || ''}
          xmlCodigo={itens[vincularIdx]?.produto_xml_codigo || ''}
          xmlNcm={itens[vincularIdx]?.produto_xml_ncm || ''}
          onVincular={(produtoId) => handleVincular(vincularIdx, produtoId)}
        />
      )}
    </>
  );
}
