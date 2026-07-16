import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyInput, formatBrazilianNumber } from "@/components/ui/currency-input";
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
import { useInscricoesCompletas } from "@/hooks/useInscricoesCompletas";
import { useSafras } from "@/hooks/useSafras";
import { useContasBancarias } from "@/hooks/useContasBancarias";
import { useEntradaNfe, useCreateEntradaNfe, useUpdateEntradaNfe } from "@/hooks/useEntradasNfe";
import { ContasPagarEntradaSection } from "@/components/contas/ContasPagarEntradaSection";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Plus, Trash2, Link2, X } from "lucide-react";
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

const FORMAS = [
  { value: 'pix', label: 'PIX' }, { value: 'dinheiro', label: 'Dinheiro' },
  { value: 'cheque', label: 'Cheque' }, { value: 'boleto', label: 'Boleto' },
  { value: 'cartao', label: 'Cartão' }, { value: 'prazo', label: 'A prazo' },
  { value: 'outro', label: 'Outro' },
];
const FORMAS_AVISTA = ['pix', 'dinheiro', 'cheque', 'cartao'];

const toNumber = (value: number | string | null | undefined): number => {
  if (value === null || value === undefined || value === '') return 0;
  if (typeof value === 'number') return Number.isNaN(value) ? 0 : value;
  const cleaned = value.replace(/[R$\s]/g, '');
  const normalized = cleaned.includes(',')
    ? cleaned.replace(/\./g, '').replace(',', '.')
    : cleaned;
  const parsed = Number(normalized);
  return Number.isNaN(parsed) ? 0 : parsed;
};

const MoneyReadOnlyInput = ({ value, className = '' }: { value: number | string | null | undefined; className?: string }) => (
  <CurrencyInput
    value={toNumber(value)}
    onChange={() => {}}
    readOnly
    className={`bg-muted ${className}`}
  />
);

export function EntradaNfeFormDialog({ open, onOpenChange, entradaId }: Props) {
  const [currentId, setCurrentId] = useState<string | null>(entradaId);
  useEffect(() => { setCurrentId(entradaId); }, [entradaId, open]);
  const isEdit = !!currentId;
  const { data: entradaData } = useEntradaNfe(currentId);
  const { data: granjas } = useGranjas();
  const { data: clientes } = useClientesFornecedores();
  const { cfops } = useCfops();
  const { data: produtos } = useProdutos();
  const { data: inscricoes } = useInscricoesCompletas();
  const { data: safras } = useSafras();
  const { data: contasBancarias } = useContasBancarias({ ativo: true });
  const createMutation = useCreateEntradaNfe();
  const updateMutation = useUpdateEntradaNfe();

  const [granjaId, setGranjaId] = useState('');
  const [inscricaoId, setInscricaoId] = useState<string | undefined>(undefined);
  const [safraId, setSafraId] = useState<string | undefined>(undefined);
  const [formaPagamento, setFormaPagamento] = useState<string | undefined>(undefined);
  const [contaBancariaId, setContaBancariaId] = useState<string | undefined>(undefined);
  const [jaPago, setJaPago] = useState(false);
  const [numeroCheque, setNumeroCheque] = useState('');
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

  const inscricoesFiltradas = useMemo(() => {
    if (!granjaId) return [];
    const list = (inscricoes || []).filter((i) => i.granja_id === granjaId && i.ativa);
    // Garante que IE selecionada apareça mesmo se inativa/de outra granja (edição)
    if (inscricaoId && !list.some((i) => i.id === inscricaoId)) {
      const sel = (inscricoes || []).find((i) => i.id === inscricaoId);
      if (sel) list.push(sel);
    }
    return list;
  }, [inscricoes, granjaId, inscricaoId]);

  const isAvista = !!formaPagamento && FORMAS_AVISTA.includes(formaPagamento);

  useEffect(() => {
    if (!open) return;
    if (isEdit && entradaData) {
      setGranjaId(entradaData.granja_id || '');
      setInscricaoId((entradaData as any).inscricao_produtor_id || undefined);
      setSafraId((entradaData as any).safra_id || undefined);
      setFormaPagamento((entradaData as any).forma_pagamento || undefined);
      setContaBancariaId((entradaData as any).conta_bancaria_id || undefined);
      setNumeroCheque((entradaData as any).numero_cheque || '');
      setFornecedorId(entradaData.fornecedor_id || '');
      setNumeroNfe(entradaData.numero_nfe || '');
      setSerie(entradaData.serie || '1');
      setChaveAcesso(entradaData.chave_acesso || '');
      setDataEmissao(entradaData.data_emissao || '');
      setDataEntrada(entradaData.data_entrada || '');
      setCfopId(entradaData.cfop_id || '');
      setNaturezaOperacao(entradaData.natureza_operacao || '');
      setObservacoes(entradaData.observacoes || '');
      setValorProdutos(toNumber(entradaData.valor_produtos));
      setValorFrete(toNumber(entradaData.valor_frete));
      setValorSeguro(toNumber(entradaData.valor_seguro));
      setValorDesconto(toNumber(entradaData.valor_desconto));
      setValorOutras(toNumber(entradaData.valor_outras_despesas));
      setItens(
        (entradaData as any).itens?.length
          ? (entradaData as any).itens.map((i: any) => ({
              ...i, data_validade: i.data_validade || '', lote: i.lote || '',
              quantidade_conferida: i.quantidade_conferida,
            }))
          : [emptyItem()]
      );
    } else if (!isEdit) {
      resetForm();
    }
  }, [open, isEdit, entradaData]);

  // Auto-seleciona conta bancária padrão da granja
  useEffect(() => {
    if (!granjaId || contaBancariaId) return;
    const padrao = contasBancarias?.find((c: any) => c.granja_id === granjaId && c.is_padrao_granja);
    if (padrao) setContaBancariaId(padrao.id);
  }, [granjaId, contasBancarias]);

  // Código do CFOP do cabeçalho (para auto-preencher itens)
  const cfopCabecalhoCodigo = useMemo(() => {
    if (!cfopId) return '';
    const c = cfops?.find((x: any) => x.id === cfopId);
    return c?.codigo ? String(c.codigo) : '';
  }, [cfopId, cfops]);

  // Auto-preenche CFOP dos itens vazios quando CFOP do cabeçalho mudar
  useEffect(() => {
    if (!cfopCabecalhoCodigo) return;
    setItens((prev) => prev.map((it) => (it.cfop ? it : { ...it, cfop: cfopCabecalhoCodigo })));

  }, [cfopCabecalhoCodigo]);




  // Pré-seleciona IE principal ao trocar granja (somente criação)
  useEffect(() => {
    if (isEdit || !granjaId) return;
    const principal = (inscricoes || []).find(
      (i: any) => i.granja_id === granjaId && i.ativa && i.is_emitente_principal
    );
    setInscricaoId(principal?.id);
  }, [granjaId, inscricoes, isEdit]);

  const resetForm = () => {
    setGranjaId(''); setInscricaoId(undefined); setSafraId(undefined);
    setFormaPagamento(undefined); setContaBancariaId(undefined); setJaPago(false); setNumeroCheque('');
    setFornecedorId(''); setNumeroNfe(''); setSerie('1'); setChaveAcesso('');
    setDataEmissao(''); setDataEntrada(new Date().toISOString().split('T')[0]);
    setCfopId(''); setNaturezaOperacao(''); setObservacoes('');
    setItens([emptyItem()]);
    setValorProdutos(0); setValorFrete(0); setValorSeguro(0);
    setValorDesconto(0); setValorOutras(0);
  };


  const updateItem = (idx: number, field: string, value: any) => {
    setItens((prev) => {
      const updated = [...prev];
      (updated[idx] as any)[field] = value;
      if (field === 'quantidade' || field === 'valor_unitario') {
        updated[idx].valor_total = toNumber(updated[idx].quantidade) * toNumber(updated[idx].valor_unitario);
      }
      return updated;
    });
  };

  const addItem = () => setItens((prev) => [...prev, emptyItem()]);
  const removeItem = (idx: number) => setItens((prev) => prev.filter((_, i) => i !== idx));

  const calcTotalNfe = () => {
    const totalItens = itens.reduce((s, i) => s + toNumber(i.valor_total), 0);
    return totalItens + toNumber(valorFrete) + toNumber(valorSeguro) + toNumber(valorOutras) - toNumber(valorDesconto);
  };

  const handleSave = async () => {
    if (!granjaId) { toast.error('Selecione uma granja.'); return; }
    if (!fornecedorId) { toast.error('Selecione o fornecedor.'); return; }
    if (!cfopId) { toast.error('Selecione o CFOP.'); return; }
    if (!inscricaoId) { toast.error('Selecione a IE do produtor.'); return; }
    if (!safraId) { toast.error('Selecione a safra.'); return; }
    const itensValidos = itens.filter((i) => toNumber(i.quantidade) > 0 || toNumber(i.valor_total) > 0 || (i as any).produto_xml_descricao);
    if (itensValidos.length === 0) { toast.error('Adicione ao menos um item à NF-e.'); return; }


    const ALLOWED_ITEM_FIELDS = [
      'produto_id','produto_xml_codigo','produto_xml_descricao','produto_xml_ncm',
      'cfop','unidade_medida','quantidade','valor_unitario','valor_total',
      'valor_desconto','valor_frete_rateio',
      'cst_icms','base_icms','aliq_icms','valor_icms',
      'cst_ipi','base_ipi','aliq_ipi','valor_ipi',
      'cst_pis','base_pis','aliq_pis','valor_pis',
      'cst_cofins','base_cofins','aliq_cofins','valor_cofins',
      'lote','data_validade','vinculado','quantidade_conferida',
    ];
    const NUMERIC_FIELDS = new Set(['quantidade','valor_unitario','valor_total','valor_desconto','valor_frete_rateio','base_icms','aliq_icms','valor_icms','base_ipi','aliq_ipi','valor_ipi','base_pis','aliq_pis','valor_pis','base_cofins','aliq_cofins','valor_cofins']);
    const itensSave = itens.map((item: any) => {
      const rest: any = {};
      for (const f of ALLOWED_ITEM_FIELDS) {
        let v = item[f];
        if (NUMERIC_FIELDS.has(f)) v = toNumber(v);
        if ((f === 'data_validade' || f === 'quantidade_conferida') && (v === '' || v === undefined)) v = null;
        if (f === 'produto_id' && !v) v = null;
        rest[f] = v;
      }
      return rest;
    });

    const payload: any = {
      granja_id: granjaId,
      inscricao_produtor_id: inscricaoId,
      safra_id: safraId,
      forma_pagamento: null,
      conta_bancaria_id: null,
      numero_cheque: null,
      fornecedor_id: fornecedorId || null,
      numero_nfe: numeroNfe,
      serie,
      chave_acesso: chaveAcesso,
      data_emissao: dataEmissao || null,
      data_entrada: dataEntrada,
      cfop_id: cfopId || null,
      natureza_operacao: naturezaOperacao,
      valor_produtos: itens.reduce((s, i) => s + toNumber(i.valor_total), 0),
      valor_frete: toNumber(valorFrete),
      valor_seguro: toNumber(valorSeguro),
      valor_desconto: toNumber(valorDesconto),
      valor_outras_despesas: toNumber(valorOutras),
      valor_ipi: itens.reduce((s, i) => s + toNumber(i.valor_ipi), 0),
      valor_icms: itens.reduce((s, i) => s + toNumber(i.valor_icms), 0),
      valor_pis: itens.reduce((s, i) => s + toNumber(i.valor_pis), 0),
      valor_cofins: itens.reduce((s, i) => s + toNumber(i.valor_cofins), 0),
      valor_total: calcTotalNfe(),
      modo_entrada: 'manual',
      observacoes,
      itens: itensSave,
    };

    try {
      if (isEdit) {
        await updateMutation.mutateAsync({ id: currentId, ...payload });
      } else {
        const created = await createMutation.mutateAsync(payload);
        if (created?.id) setCurrentId(created.id);
      }
      // Mantém o formulário aberto para permitir incluir mais itens
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
  const fornecedores = clientes || [];

  if (!open) {
    return null;
  }

  return (
    <>
      <div className="rounded-lg border bg-card p-4 sm:p-6 flex flex-col">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold leading-none tracking-tight">{isEdit ? 'Detalhes da Entrada NF-e' : 'Nova Entrada Manual'}</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {isFinalizado ? 'Esta entrada já foi finalizada.' : 'Preencha os dados da nota fiscal de compra.'}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} aria-label="Fechar">
            <X className="h-4 w-4" />
          </Button>
        </div>


        <Tabs defaultValue="cabecalho" className="flex flex-col">

            <TabsList className="w-full justify-start flex-none">
              <TabsTrigger value="cabecalho">Cabeçalho</TabsTrigger>
              <TabsTrigger value="itens">Itens ({itens.length})</TabsTrigger>
              <TabsTrigger value="totais">Totais</TabsTrigger>
            </TabsList>

            <ScrollArea className="flex-1 min-h-0 pr-3">
              <TabsContent value="cabecalho" className="p-1 mt-3 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 [&>div]:min-w-0">
                  <div>
                    <Label>Granja *</Label>
                    <Select isSearchable value={granjaId} onValueChange={setGranjaId} disabled={isFinalizado}>
                      <SelectTrigger className="w-full min-w-0"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                      <SelectContent>
                        {granjas?.map((g: any) => (<SelectItem key={g.id} value={g.id}>{g.razao_social}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Fornecedor *</Label>
                    <Select isSearchable value={fornecedorId} onValueChange={setFornecedorId} disabled={isFinalizado}>
                      <SelectTrigger className="w-full min-w-0"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                      <SelectContent>
                        {fornecedores.map((f: any) => (<SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>CFOP *</Label>
                    <Select isSearchable value={cfopId} onValueChange={setCfopId} disabled={isFinalizado}>
                      <SelectTrigger className="w-full min-w-0"><SelectValue placeholder="Selecione..." /></SelectTrigger>
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
                  <div className="md:col-span-2 xl:col-span-1">
                    <Label>Chave de Acesso</Label>
                    <Input className="font-mono text-xs" value={chaveAcesso} onChange={(e) => setChaveAcesso(e.target.value)} maxLength={44} disabled={isFinalizado} />
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
                  <div className="md:col-span-2 xl:col-span-2">
                    <Label>IE do Produtor *</Label>
                    <Select isSearchable value={inscricaoId} onValueChange={setInscricaoId} disabled={isFinalizado || !granjaId}>
                      <SelectTrigger className="w-full min-w-0"><SelectValue placeholder={granjaId ? 'Selecione...' : 'Escolha granja'} /></SelectTrigger>
                      <SelectContent>
                        {inscricoesFiltradas.map((i) => (
                          <SelectItem key={i.id} value={i.id}>
                            {(i.inscricao_estadual || i.cpf_cnpj || '—').toUpperCase()} {i.nome ? `— ${i.nome.toUpperCase()}` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Safra *</Label>
                    <Select isSearchable value={safraId} onValueChange={setSafraId} disabled={isFinalizado}>
                      <SelectTrigger className="w-full min-w-0"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                      <SelectContent>
                        {safras?.map((s: any) => (<SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                  {/* Forma de pagamento removida do cabeçalho — será informada na baixa do contas a pagar */}

                  <div className="md:col-span-2 xl:col-span-3">
                    <Label>Observações</Label>
                    <Textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} rows={2} disabled={isFinalizado} />
                  </div>
                </div>

                {isEdit && entradaData && (
                  <ContasPagarEntradaSection entrada={entradaData} />
                )}
              </TabsContent>


              <TabsContent value="itens" className="p-1 mt-3">
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
                                <Select isSearchable value={item.produto_id || ''} onValueChange={(v) => { updateItem(idx, 'produto_id', v); updateItem(idx, 'vinculado', true); }}>
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
                              <CurrencyInput
                                value={item.valor_unitario ?? null}
                                onChange={(v) => updateItem(idx, 'valor_unitario', v ?? 0)}
                                className="w-28"
                                prefix=""
                                disabled={isFinalizado}
                              />
                            </TableCell>
                            <TableCell className="text-right font-medium">R$ {formatBrazilianNumber(toNumber(item.valor_total), 2)}</TableCell>
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

              <TabsContent value="totais" className="p-1 mt-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full max-w-5xl [&>div]:min-w-0">
                  <div>
                    <Label>Valor Produtos</Label>
                    <MoneyReadOnlyInput value={itens.reduce((s, i) => s + toNumber(i.valor_total), 0)} />
                  </div>
                  <div>
                    <Label>Frete</Label>
                    <CurrencyInput value={toNumber(valorFrete)} onChange={(v) => setValorFrete(v ?? 0)} disabled={isFinalizado} />
                  </div>
                  <div>
                    <Label>Seguro</Label>
                    <CurrencyInput value={toNumber(valorSeguro)} onChange={(v) => setValorSeguro(v ?? 0)} disabled={isFinalizado} />
                  </div>
                  <div>
                    <Label>Desconto</Label>
                    <CurrencyInput value={toNumber(valorDesconto)} onChange={(v) => setValorDesconto(v ?? 0)} disabled={isFinalizado} />
                  </div>
                  <div>
                    <Label>Outras Despesas</Label>
                    <CurrencyInput value={toNumber(valorOutras)} onChange={(v) => setValorOutras(v ?? 0)} disabled={isFinalizado} />
                  </div>
                  <div>
                    <Label>Total ICMS</Label>
                    <MoneyReadOnlyInput value={itens.reduce((s, i) => s + toNumber(i.valor_icms), 0)} />
                  </div>
                  <div>
                    <Label>Total IPI</Label>
                    <MoneyReadOnlyInput value={itens.reduce((s, i) => s + toNumber(i.valor_ipi), 0)} />
                  </div>
                  <div>
                    <Label>Total PIS</Label>
                    <MoneyReadOnlyInput value={itens.reduce((s, i) => s + toNumber(i.valor_pis), 0)} />
                  </div>
                  <div>
                    <Label>Total COFINS</Label>
                    <MoneyReadOnlyInput value={itens.reduce((s, i) => s + toNumber(i.valor_cofins), 0)} />
                  </div>
                  <div className="sm:col-span-2 lg:col-span-3">
                    <Label className="text-lg font-bold">Valor Total da NF-e</Label>
                    <MoneyReadOnlyInput value={calcTotalNfe()} className="text-base font-bold h-11" />
                  </div>

                </div>
              </TabsContent>
            </ScrollArea>
          </Tabs>

          <div className="flex justify-end gap-2 pt-4 border-t flex-none">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            {!isFinalizado && (
              <>
                <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending}>
                  {createMutation.isPending || updateMutation.isPending ? 'Salvando...' : 'Salvar'}
                </Button>
                <Button variant="secondary" onClick={() => onOpenChange(false)}>Sair</Button>
              </>
            )}
          </div>
      </div>




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
