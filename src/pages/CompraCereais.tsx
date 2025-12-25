import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2 } from 'lucide-react';
import { useComprasCereais, useCreateCompraCereal, useDeleteCompraCereal } from '@/hooks/useComprasCereais';
import { useGranjas } from '@/hooks/useGranjas';
import { useSafras } from '@/hooks/useSafras';
import { useProdutosSementes } from '@/hooks/useProdutosSementes';
import { useSilos } from '@/hooks/useSilos';
import { useInscricoesSocio } from '@/hooks/useInscricoesSocio';
import { useInscricoesComSaldo } from '@/hooks/useSaldosDeposito';
import { formatNumber } from '@/lib/formatters';
import { QuantityInput } from '@/components/ui/quantity-input';
import { CurrencyInput } from '@/components/ui/currency-input';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';

export default function CompraCereais() {
  const [granjaId, setGranjaId] = useState<string>('');
  const [safraId, setSafraId] = useState<string>('');
  const [produtoId, setProdutoId] = useState<string>('');
  
  // Form state
  const [showForm, setShowForm] = useState(false);
  const [inscricaoCompradorId, setInscricaoCompradorId] = useState('');
  const [inscricaoVendedorId, setInscricaoVendedorId] = useState('');
  const [siloId, setSiloId] = useState('');
  const [dataCompra, setDataCompra] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [quantidadeKg, setQuantidadeKg] = useState(0);
  const [valorUnitarioKg, setValorUnitarioKg] = useState(0);
  const [observacao, setObservacao] = useState('');

  const { data: granjas } = useGranjas();
  const { data: safras } = useSafras();
  const { data: produtos } = useProdutosSementes();
  const { data: silos } = useSilos();
  const { data: inscricoesSocio } = useInscricoesSocio();
  const { data: inscricoesComSaldo } = useInscricoesComSaldo({ safraId, granjaId });
  
  const { data: compras, isLoading } = useComprasCereais({ granjaId, safraId, produtoId });
  const createCompra = useCreateCompraCereal();
  const deleteCompra = useDeleteCompraCereal();

  const valorTotal = quantidadeKg * valorUnitarioKg;

  const handleSubmit = async () => {
    if (!granjaId || !safraId || !produtoId || !inscricaoCompradorId || !inscricaoVendedorId || quantidadeKg <= 0 || valorUnitarioKg <= 0) {
      toast({ title: 'Erro', description: 'Preencha todos os campos obrigatórios.', variant: 'destructive' });
      return;
    }

    await createCompra.mutateAsync({
      granja_id: granjaId,
      safra_id: safraId,
      produto_id: produtoId,
      inscricao_comprador_id: inscricaoCompradorId,
      inscricao_vendedor_id: inscricaoVendedorId,
      silo_id: siloId || null,
      data_compra: dataCompra,
      quantidade_kg: quantidadeKg,
      valor_unitario_kg: valorUnitarioKg,
      valor_total: valorTotal,
      devolucao_id: null,
      nota_fiscal_id: null,
      status: 'pendente',
      observacao: observacao || null,
    });

    setShowForm(false);
    resetForm();
  };

  const resetForm = () => {
    setInscricaoCompradorId('');
    setInscricaoVendedorId('');
    setSiloId('');
    setQuantidadeKg(0);
    setValorUnitarioKg(0);
    setObservacao('');
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <PageHeader
          title="Compra de Cereais"
          description="CFOP 1102 - Compra para comercialização (soma saldo sócio)"
        />

        {/* Filtros */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label>Granja</Label>
                <Select value={granjaId} onValueChange={setGranjaId}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {granjas?.map(g => (
                      <SelectItem key={g.id} value={g.id}>{g.razao_social}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Safra</Label>
                <Select value={safraId} onValueChange={setSafraId}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {safras?.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Produto</Label>
                <Select value={produtoId} onValueChange={setProdutoId}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {produtos?.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button onClick={() => setShowForm(true)} disabled={!granjaId || !safraId || !produtoId}>
                  <Plus className="h-4 w-4 mr-2" /> Nova Compra
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Formulário */}
        {showForm && (
          <Card>
            <CardHeader>
              <CardTitle>Nova Compra de Cereais</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Data</Label>
                  <Input type="date" value={dataCompra} onChange={e => setDataCompra(e.target.value)} />
                </div>
                <div>
                  <Label>Silo</Label>
                  <Select value={siloId} onValueChange={setSiloId}>
                    <SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger>
                    <SelectContent>
                      {silos?.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Comprador (Sócio)</Label>
                  <Select value={inscricaoCompradorId} onValueChange={setInscricaoCompradorId}>
                    <SelectTrigger><SelectValue placeholder="Selecione o sócio comprador" /></SelectTrigger>
                    <SelectContent>
                      {inscricoesSocio?.map(i => (
                        <SelectItem key={i.id} value={i.id}>
                          {i.produtores?.nome} - IE: {i.inscricao_estadual}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Vendedor (Produtor)</Label>
                  <Select value={inscricaoVendedorId} onValueChange={setInscricaoVendedorId}>
                    <SelectTrigger><SelectValue placeholder="Selecione o produtor vendedor" /></SelectTrigger>
                    <SelectContent>
                      {inscricoesComSaldo?.map(i => (
                        <SelectItem key={i.id} value={i.id}>
                          {i.produtor_nome} - IE: {i.inscricao_estadual}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Quantidade (kg)</Label>
                  <QuantityInput value={quantidadeKg} onChange={setQuantidadeKg} />
                </div>
                <div>
                  <Label>Valor Unitário (R$/kg)</Label>
                  <CurrencyInput value={valorUnitarioKg} onChange={setValorUnitarioKg} />
                </div>
                <div>
                  <Label>Valor Total</Label>
                  <CurrencyInput value={valorTotal} onChange={() => {}} disabled />
                </div>
              </div>

              <div>
                <Label>Observações</Label>
                <Textarea value={observacao} onChange={e => setObservacao(e.target.value)} />
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => { setShowForm(false); resetForm(); }}>Cancelar</Button>
                <Button onClick={handleSubmit} disabled={createCompra.isPending}>
                  {createCompra.isPending ? 'Salvando...' : 'Salvar Compra'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Lista */}
        <Card>
          <CardHeader>
            <CardTitle>Compras Registradas</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cód</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Vendedor</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead className="text-right">Qtde (kg)</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={8} className="text-center">Carregando...</TableCell></TableRow>
                ) : !compras?.length ? (
                  <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">Nenhuma compra encontrada</TableCell></TableRow>
                ) : compras.map(c => (
                  <TableRow key={c.id}>
                    <TableCell>{c.codigo}</TableCell>
                    <TableCell>{format(new Date(c.data_compra), 'dd/MM/yyyy')}</TableCell>
                    <TableCell>{c.inscricao_vendedor?.produtores?.nome}</TableCell>
                    <TableCell>{c.produto?.nome}</TableCell>
                    <TableCell className="text-right">{formatNumber(c.quantidade_kg, 3)}</TableCell>
                    <TableCell className="text-right">R$ {formatNumber(c.valor_total, 2)}</TableCell>
                    <TableCell>
                      <Badge variant={c.status === 'nfe_emitida' ? 'default' : 'secondary'}>
                        {c.status === 'nfe_emitida' ? 'NFe Emitida' : 'Pendente'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => deleteCompra.mutate(c.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
