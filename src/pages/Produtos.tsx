import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Plus, Pencil, Trash2, Package, DollarSign, Warehouse, FileText, Building2, Search, Check } from 'lucide-react';
import { useProdutos, useCreateProduto, useUpdateProduto, useDeleteProduto, ProdutoInsert } from '@/hooks/useProdutos';
import { useUnidadesMedida } from '@/hooks/useUnidadesMedida';
import { useClientesFornecedores } from '@/hooks/useClientesFornecedores';
import { useGruposProdutos } from '@/hooks/useGruposProdutos';
import { useNcmSearch } from '@/hooks/useNcmSearch';
import { CurrencyInput } from '@/components/ui/currency-input';
import { QuantityInput } from '@/components/ui/quantity-input';
import { cn } from '@/lib/utils';

const CST_PIS_COFINS = [
  { value: '01', label: '01 - Tributável (Alíquota Básica)' },
  { value: '04', label: '04 - Tributável (Monofásica)' },
  { value: '06', label: '06 - Alíquota Zero' },
  { value: '07', label: '07 - Isenta' },
  { value: '08', label: '08 - Sem Incidência' },
  { value: '09', label: '09 - Com Suspensão' },
];

const CST_ICMS = [
  { value: '00', label: '00 - Tributada integralmente' },
  { value: '20', label: '20 - Redução base de cálculo' },
  { value: '40', label: '40 - Isenta' },
  { value: '41', label: '41 - Não tributada' },
  { value: '51', label: '51 - Diferimento' },
  { value: '60', label: '60 - ICMS cobrado anteriormente por ST' },
];

const CST_IPI = [
  { value: '50', label: '50 - Saída Tributada' },
  { value: '51', label: '51 - Saída Tributada com Alíquota Zero' },
  { value: '52', label: '52 - Saída Isenta' },
  { value: '53', label: '53 - Saída Não-Tributada' },
  { value: '54', label: '54 - Saída Imune' },
  { value: '55', label: '55 - Saída com Suspensão' },
];

// CST IBS/CBS (Reforma Tributária)
const CST_IBS_CBS = [
  { value: '000', label: '000 - Tributação Normal' },
  { value: '010', label: '010 - Tributação Monofásica' },
  { value: '020', label: '020 - Tributação por ST' },
  { value: '040', label: '040 - Operação Isenta' },
  { value: '041', label: '041 - Operação não Tributável' },
  { value: '050', label: '050 - Operação com Suspensão' },
  { value: '060', label: '060 - Operação Imune' },
  { value: '090', label: '090 - Outros' },
];

// CST IS (Imposto Seletivo)
const CST_IS = [
  { value: '000', label: '000 - Tributação Normal' },
  { value: '040', label: '040 - Operação Isenta' },
  { value: '041', label: '041 - Operação não Tributável' },
  { value: '050', label: '050 - Operação com Suspensão' },
  { value: '090', label: '090 - Outros' },
];

export default function Produtos() {
  const { canEdit } = useAuth();
  const { data: produtos, isLoading } = useProdutos();
  const { data: unidades } = useUnidadesMedida();
  const { data: fornecedores } = useClientesFornecedores();
  const { data: grupos } = useGruposProdutos();
  const { results: ncmResults, isLoading: ncmLoading, searchNcm } = useNcmSearch();
  const createMutation = useCreateProduto();
  const updateMutation = useUpdateProduto();
  const deleteMutation = useDeleteProduto();

  const [ncmOpen, setNcmOpen] = useState(false);
  const [ncmSearch, setNcmSearch] = useState('');

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [formData, setFormData] = useState<ProdutoInsert>({
    granja_id: null,
    tipo: 'insumo',
    codigo: '',
    nome: '',
    descricao: '',
    unidade_medida_id: null,
    estoque_minimo: 0,
    estoque_atual: 0,
    preco_custo: 0,
    preco_venda: 0,
    fornecedor_id: null,
    ativo: true,
    // Novos campos
    codigo_barras: '',
    grupo: null,
    artigo_nfe: '',
    preco_prazo: 0,
    estoque_maximo: 0,
    tempo_maximo: 0,
    qtd_venda: 1,
    cod_fornecedor: '',
    peso_saco: 60,
    produto_residuo_id: null,
    ncm: '',
    cst_pis: '',
    cst_cofins: '',
    cst_icms: '',
    cst_ipi: '',
    natureza_receita: '',
    observacao_tributaria: '',
    // Campos Reforma Tributária
    cst_ibs: null,
    cst_cbs: null,
    cst_is: null,
    cclass_trib_ibs: null,
    cclass_trib_cbs: null,
  });

  const resetForm = () => {
    setFormData({
      granja_id: null,
      tipo: 'insumo',
      codigo: '',
      nome: '',
      descricao: '',
      unidade_medida_id: null,
      estoque_minimo: 0,
      estoque_atual: 0,
      preco_custo: 0,
      preco_venda: 0,
      fornecedor_id: null,
      ativo: true,
      codigo_barras: '',
      grupo: null,
      artigo_nfe: '',
      preco_prazo: 0,
      estoque_maximo: 0,
      tempo_maximo: 0,
      qtd_venda: 1,
      cod_fornecedor: '',
      peso_saco: 60,
      produto_residuo_id: null,
      ncm: '',
      cst_pis: '',
      cst_cofins: '',
      cst_icms: '',
      cst_ipi: '',
      natureza_receita: '',
      observacao_tributaria: '',
      cst_ibs: null,
      cst_cbs: null,
      cst_is: null,
      cclass_trib_ibs: null,
      cclass_trib_cbs: null,
    });
    setEditingItem(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingItem) {
      await updateMutation.mutateAsync({ id: editingItem.id, ...formData });
    } else {
      await createMutation.mutateAsync(formData);
    }
    setIsDialogOpen(false);
    resetForm();
  };

  const handleEdit = (item: any) => {
    setEditingItem(item);
    setFormData({
      granja_id: item.granja_id,
      tipo: item.tipo,
      codigo: item.codigo || '',
      nome: item.nome,
      descricao: item.descricao || '',
      unidade_medida_id: item.unidade_medida_id,
      estoque_minimo: item.estoque_minimo || 0,
      estoque_atual: item.estoque_atual || 0,
      preco_custo: item.preco_custo || 0,
      preco_venda: item.preco_venda || 0,
      fornecedor_id: item.fornecedor_id,
      ativo: item.ativo,
      codigo_barras: item.codigo_barras || '',
      grupo: item.grupo || null,
      artigo_nfe: item.artigo_nfe || '',
      preco_prazo: item.preco_prazo || 0,
      estoque_maximo: item.estoque_maximo || 0,
      tempo_maximo: item.tempo_maximo || 0,
      qtd_venda: item.qtd_venda || 1,
      cod_fornecedor: item.cod_fornecedor || '',
      peso_saco: item.peso_saco || 60,
      produto_residuo_id: item.produto_residuo_id || null,
      ncm: item.ncm || '',
      cst_pis: item.cst_pis || '',
      cst_cofins: item.cst_cofins || '',
      cst_icms: item.cst_icms || '',
      cst_ipi: item.cst_ipi || '',
      natureza_receita: item.natureza_receita || '',
      observacao_tributaria: item.observacao_tributaria || '',
      cst_ibs: item.cst_ibs || null,
      cst_cbs: item.cst_cbs || null,
      cst_is: item.cst_is || null,
      cclass_trib_ibs: item.cclass_trib_ibs || null,
      cclass_trib_cbs: item.cclass_trib_cbs || null,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este produto?')) {
      await deleteMutation.mutateAsync(id);
    }
  };

  const getTipoBadge = (tipo: string) => {
    switch (tipo) {
      case 'insumo':
        return <Badge className="bg-amber-500">Insumo</Badge>;
      case 'produto':
        return <Badge className="bg-emerald-500">Produto</Badge>;
      case 'semente':
        return <Badge className="bg-sky-500">Semente</Badge>;
      default:
        return <Badge>{tipo}</Badge>;
    }
  };

  const formatCurrency = (value: number | null) => {
    if (value === null || value === undefined) return '-';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const fornecedoresFiltrados = fornecedores?.filter(f => f.tipo === 'fornecedor' || f.tipo === 'ambos');

  // Produtos ativos para seleção de produto resíduo
  const produtosAtivos = produtos?.filter((p: any) => p.ativo && p.id !== editingItem?.id);

  // Grupos ativos para seleção
  const gruposAtivos = grupos?.filter(g => g.ativo);

  // Handler para busca de NCM
  useEffect(() => {
    const timer = setTimeout(() => {
      if (ncmSearch.length >= 2) {
        searchNcm(ncmSearch);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [ncmSearch]);

  if (isLoading) {
    return <div className="p-8">Carregando...</div>;
  }

  return (
    <AppLayout>
    <div className="space-y-6">
      <PageHeader
        title="Produtos / Insumos"
        description="Gerencie os produtos e insumos utilizados nas operações"
        icon={<Package className="h-6 w-6" />}
      />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Lista de Produtos
          </CardTitle>
          {canEdit && (
            <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Novo Produto
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingItem ? 'Editar' : 'Novo'} Produto</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Seção: Dados Básicos */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-primary font-semibold">
                      <Package className="h-4 w-4" />
                      Dados Básicos
                    </div>
                    <Separator />
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <Label>Código</Label>
                        <Input value={formData.codigo || ''} onChange={(e) => setFormData({ ...formData, codigo: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label>Cód. de Barras</Label>
                        <Input value={formData.codigo_barras || ''} onChange={(e) => setFormData({ ...formData, codigo_barras: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label>Unidade de Medida</Label>
                        <Select value={formData.unidade_medida_id || ''} onValueChange={(value) => setFormData({ ...formData, unidade_medida_id: value || null })}>
                          <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                          <SelectContent>
                            {unidades?.filter(u => u.ativa).map((und) => (
                              <SelectItem key={und.id} value={und.id}>{und.codigo} - {und.descricao}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Grupo</Label>
                        <Select value={formData.grupo || ''} onValueChange={(value) => setFormData({ ...formData, grupo: value || null })}>
                          <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                          <SelectContent>
                            {gruposAtivos?.map((grupo) => (
                              <SelectItem key={grupo.id} value={grupo.nome}>{grupo.nome}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Nome / Descrição *</Label>
                        <Input value={formData.nome} onChange={(e) => setFormData({ ...formData, nome: e.target.value })} required />
                      </div>
                      <div className="space-y-2">
                        <Label>Tipo *</Label>
                        <Select value={formData.tipo} onValueChange={(value) => setFormData({ ...formData, tipo: value })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="insumo">Insumo</SelectItem>
                            <SelectItem value="produto">Produto</SelectItem>
                            <SelectItem value="semente">Semente</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Artigo NFe (nome para nota fiscal)</Label>
                      <Input value={formData.artigo_nfe || ''} onChange={(e) => setFormData({ ...formData, artigo_nfe: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Descrição Detalhada</Label>
                      <Textarea value={formData.descricao || ''} onChange={(e) => setFormData({ ...formData, descricao: e.target.value })} rows={2} />
                    </div>
                  </div>

                  {/* Seção: Preços */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-primary font-semibold">
                      <DollarSign className="h-4 w-4" />
                      Preços
                    </div>
                    <Separator />
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Preço Custo</Label>
                        <CurrencyInput value={formData.preco_custo} onChange={(value) => setFormData({ ...formData, preco_custo: value })} prefix="R$" />
                      </div>
                      <div className="space-y-2">
                        <Label>Preço à Vista</Label>
                        <CurrencyInput value={formData.preco_venda} onChange={(value) => setFormData({ ...formData, preco_venda: value })} prefix="R$" />
                      </div>
                      <div className="space-y-2">
                        <Label>Preço à Prazo</Label>
                        <CurrencyInput value={formData.preco_prazo} onChange={(value) => setFormData({ ...formData, preco_prazo: value })} prefix="R$" />
                      </div>
                    </div>
                  </div>

                  {/* Seção: Estoque e Venda */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-primary font-semibold">
                      <Warehouse className="h-4 w-4" />
                      Estoque e Venda
                    </div>
                    <Separator />
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                      <div className="space-y-2">
                        <Label>Estoque Atual</Label>
                        <QuantityInput value={formData.estoque_atual} onChange={(value) => setFormData({ ...formData, estoque_atual: value })} decimals={3} />
                      </div>
                      <div className="space-y-2">
                        <Label>Estoque Mínimo</Label>
                        <QuantityInput value={formData.estoque_minimo} onChange={(value) => setFormData({ ...formData, estoque_minimo: value })} decimals={3} />
                      </div>
                      <div className="space-y-2">
                        <Label>Estoque Máximo</Label>
                        <QuantityInput value={formData.estoque_maximo} onChange={(value) => setFormData({ ...formData, estoque_maximo: value })} decimals={3} />
                      </div>
                      <div className="space-y-2">
                        <Label>Tempo Máximo (dias)</Label>
                        <Input type="number" value={formData.tempo_maximo || ''} onChange={(e) => setFormData({ ...formData, tempo_maximo: parseInt(e.target.value) || 0 })} />
                      </div>
                      <div className="space-y-2">
                        <Label>Qtd. Venda</Label>
                        <QuantityInput value={formData.qtd_venda} onChange={(value) => setFormData({ ...formData, qtd_venda: value ?? 1 })} decimals={3} />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Peso do Saco (kg)</Label>
                        <QuantityInput value={formData.peso_saco} onChange={(value) => setFormData({ ...formData, peso_saco: value ?? 60 })} decimals={2} placeholder="Ex: 60 para indústria, 50 para semente" />
                      </div>
                      <div className="space-y-2">
                        <Label>Produto Resíduo</Label>
                        <Select value={formData.produto_residuo_id || ''} onValueChange={(value) => setFormData({ ...formData, produto_residuo_id: value || null })}>
                          <SelectTrigger><SelectValue placeholder="Selecione o produto resultante..." /></SelectTrigger>
                          <SelectContent>
                            {produtosAtivos?.map((prod: any) => (
                              <SelectItem key={prod.id} value={prod.id}>{prod.nome}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {/* Seção: Dados Fiscais (NFe) */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-primary font-semibold">
                      <FileText className="h-4 w-4" />
                      Dados Fiscais (NFe)
                    </div>
                    <Separator />
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>NCM</Label>
                        <Popover open={ncmOpen} onOpenChange={setNcmOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={ncmOpen}
                              className="w-full justify-between font-normal"
                            >
                              {formData.ncm || "Buscar NCM..."}
                              <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[400px] p-0" align="start">
                            <Command>
                              <CommandInput
                                placeholder="Digite código ou descrição..."
                                value={ncmSearch}
                                onValueChange={setNcmSearch}
                              />
                              <CommandList>
                                <CommandEmpty>
                                  {ncmLoading ? 'Buscando...' : 'Nenhum NCM encontrado.'}
                                </CommandEmpty>
                                <CommandGroup>
                                  {ncmResults.map((ncm) => (
                                    <CommandItem
                                      key={ncm.codigo}
                                      value={`${ncm.codigo} ${ncm.descricao}`}
                                      onSelect={() => {
                                        setFormData({ ...formData, ncm: ncm.codigo });
                                        setNcmOpen(false);
                                        setNcmSearch('');
                                      }}
                                    >
                                      <Check
                                        className={cn(
                                          "mr-2 h-4 w-4",
                                          formData.ncm === ncm.codigo ? "opacity-100" : "opacity-0"
                                        )}
                                      />
                                      <div className="flex flex-col">
                                        <span className="font-mono">{ncm.codigo}</span>
                                        <span className="text-xs text-muted-foreground">{ncm.descricao}</span>
                                      </div>
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      </div>
                      <div className="space-y-2">
                        <Label>Natureza Receita</Label>
                        <Input value={formData.natureza_receita || ''} onChange={(e) => setFormData({ ...formData, natureza_receita: e.target.value })} placeholder="Ex: 213" maxLength={10} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <Label>CST PIS</Label>
                        <Select value={formData.cst_pis || ''} onValueChange={(value) => setFormData({ ...formData, cst_pis: value || null })}>
                          <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                          <SelectContent>
                            {CST_PIS_COFINS.map((cst) => (
                              <SelectItem key={cst.value} value={cst.value}>{cst.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>CST COFINS</Label>
                        <Select value={formData.cst_cofins || ''} onValueChange={(value) => setFormData({ ...formData, cst_cofins: value || null })}>
                          <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                          <SelectContent>
                            {CST_PIS_COFINS.map((cst) => (
                              <SelectItem key={cst.value} value={cst.value}>{cst.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>CST ICMS</Label>
                        <Select value={formData.cst_icms || ''} onValueChange={(value) => setFormData({ ...formData, cst_icms: value || null })}>
                          <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                          <SelectContent>
                            {CST_ICMS.map((cst) => (
                              <SelectItem key={cst.value} value={cst.value}>{cst.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>CST IPI</Label>
                        <Select value={formData.cst_ipi || ''} onValueChange={(value) => setFormData({ ...formData, cst_ipi: value || null })}>
                          <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                          <SelectContent>
                            {CST_IPI.map((cst) => (
                              <SelectItem key={cst.value} value={cst.value}>{cst.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Observação Tributária</Label>
                      <Textarea value={formData.observacao_tributaria || ''} onChange={(e) => setFormData({ ...formData, observacao_tributaria: e.target.value })} rows={2} />
                    </div>
                    
                    {/* Subseção: Reforma Tributária (IBS/CBS/IS) */}
                    <div className="pt-4">
                      <p className="text-sm font-medium text-muted-foreground mb-3">Reforma Tributária (IBS/CBS/IS)</p>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label>CST IBS</Label>
                          <Select value={formData.cst_ibs || ''} onValueChange={(value) => setFormData({ ...formData, cst_ibs: value || null })}>
                            <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                            <SelectContent>
                              {CST_IBS_CBS.map((cst) => (
                                <SelectItem key={cst.value} value={cst.value}>{cst.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>CST CBS</Label>
                          <Select value={formData.cst_cbs || ''} onValueChange={(value) => setFormData({ ...formData, cst_cbs: value || null })}>
                            <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                            <SelectContent>
                              {CST_IBS_CBS.map((cst) => (
                                <SelectItem key={cst.value} value={cst.value}>{cst.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>CST IS</Label>
                          <Select value={formData.cst_is || ''} onValueChange={(value) => setFormData({ ...formData, cst_is: value || null })}>
                            <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                            <SelectContent>
                              {CST_IS.map((cst) => (
                                <SelectItem key={cst.value} value={cst.value}>{cst.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        <div className="space-y-2">
                          <Label>Classificação Tributária IBS</Label>
                          <Input value={formData.cclass_trib_ibs || ''} onChange={(e) => setFormData({ ...formData, cclass_trib_ibs: e.target.value || null })} placeholder="Ex: 100001" />
                        </div>
                        <div className="space-y-2">
                          <Label>Classificação Tributária CBS</Label>
                          <Input value={formData.cclass_trib_cbs || ''} onChange={(e) => setFormData({ ...formData, cclass_trib_cbs: e.target.value || null })} placeholder="Ex: 100001" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Seção: Fornecedor */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-primary font-semibold">
                      <Building2 className="h-4 w-4" />
                      Fornecedor
                    </div>
                    <Separator />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Fornecedor Principal</Label>
                        <Select value={formData.fornecedor_id || ''} onValueChange={(value) => setFormData({ ...formData, fornecedor_id: value || null })}>
                          <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                          <SelectContent>
                            {fornecedoresFiltrados?.map((forn) => (
                              <SelectItem key={forn.id} value={forn.id}>{forn.nome}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Código no Fornecedor</Label>
                        <Input value={formData.cod_fornecedor || ''} onChange={(e) => setFormData({ ...formData, cod_fornecedor: e.target.value })} />
                      </div>
                    </div>
                  </div>

                  {/* Status */}
                  <div className="flex items-center gap-2 pt-4 border-t">
                    <Switch checked={formData.ativo ?? true} onCheckedChange={(checked) => setFormData({ ...formData, ativo: checked })} />
                    <Label>Ativo</Label>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                    <Button type="submit">Salvar</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Grupo</TableHead>
                <TableHead>Unidade</TableHead>
                <TableHead className="text-right">Estoque</TableHead>
                <TableHead className="text-right">Preço Venda</TableHead>
                <TableHead>Status</TableHead>
                {canEdit && <TableHead className="text-right">Ações</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {produtos?.map((item: any) => (
                <TableRow key={item.id}>
                  <TableCell className="font-mono">{item.codigo || '-'}</TableCell>
                  <TableCell className="font-medium">{item.nome}</TableCell>
                  <TableCell>{getTipoBadge(item.tipo)}</TableCell>
                  <TableCell>{item.grupo || '-'}</TableCell>
                  <TableCell>{item.unidade_medida?.sigla || item.unidade_medida?.codigo || '-'}</TableCell>
                  <TableCell className="text-right">{item.estoque_atual?.toLocaleString('pt-BR') || '0'}</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(item.preco_venda)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={item.ativo ? 'default' : 'secondary'}>
                      {item.ativo ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </TableCell>
                  {canEdit && (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(item)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
              {(!produtos || produtos.length === 0) && (
                <TableRow>
                  <TableCell colSpan={canEdit ? 9 : 8} className="text-center text-muted-foreground py-8">
                    Nenhum produto cadastrado
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
    </AppLayout>
  );
}
