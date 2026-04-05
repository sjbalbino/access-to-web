import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Edit, Send } from 'lucide-react';
import { useComprasCereais, useDeleteCompraCereal, type CompraCereal } from '@/hooks/useComprasCereais';
import { useGranjas } from '@/hooks/useGranjas';
import { useSafras } from '@/hooks/useSafras';
import { useProdutosSementes } from '@/hooks/useProdutosSementes';
import { formatNumber, formatKg } from '@/lib/formatters';
import { format, parseISO } from 'date-fns';
import { CompraDialog } from '@/components/compra/CompraDialog';
import { EmitirNfeCompraDialog } from '@/components/compra/EmitirNfeCompraDialog';
import { usePaginacao } from "@/hooks/usePaginacao";
import { TablePagination } from "@/components/ui/table-pagination";

export default function CompraCereais() {
  const [granjaId, setGranjaId] = useState<string>('');
  const [safraId, setSafraId] = useState<string>('');
  const [produtoId, setProdutoId] = useState<string>('');
  
  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [compraSelecionada, setCompraSelecionada] = useState<CompraCereal | null>(null);
  const [nfeDialogCompra, setNfeDialogCompra] = useState<CompraCereal | null>(null);

  const { data: granjas } = useGranjas();
  const { data: safras } = useSafras();
  const { data: produtos } = useProdutosSementes();
  
  const { data: compras, isLoading, refetch } = useComprasCereais({ granjaId, safraId, produtoId });
  const deleteCompra = useDeleteCompraCereal();

  const handleNovaCompra = () => {
    setCompraSelecionada(null);
    setDialogOpen(true);
  };

  const handleEditarCompra = (compra: CompraCereal) => {
    setCompraSelecionada(compra);
    setDialogOpen(true);
  };

  const handleEmitirNfe = (compra: CompraCereal) => {
    setNfeDialogCompra(compra);
  };

  const {
    dadosPaginados,
    paginaAtual,
    totalPaginas,
    totalRegistros,
    setPaginaAtual,
    gerarNumerosPaginas,
  } = usePaginacao(compras || []);


  return (
    <AppLayout>
      <div className="space-y-6">
        <PageHeader
          title="Compra de Cereais"
          description="CFOP 1102 - Compra para comercialização (soma saldo sócio)"
          actions={
            <Button onClick={handleNovaCompra}>
              <Plus className="h-4 w-4 mr-2" /> Nova Compra
            </Button>
          }
        />

        {/* Filtros */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            </div>
          </CardContent>
        </Card>

        {/* Lista */}
        <Card>
          <CardHeader>
            <CardTitle>Compras Registradas</CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <Table className="min-w-[600px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Cód</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Vendedor</TableHead>
                    <TableHead className="hidden sm:table-cell">Produto</TableHead>
                    <TableHead className="text-right">Qtde (kg)</TableHead>
                    <TableHead className="text-right hidden sm:table-cell">Valor</TableHead>
                    <TableHead className="hidden md:table-cell">Status</TableHead>
                    <TableHead className="sticky right-0 bg-background">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={8} className="text-center">Carregando...</TableCell></TableRow>
                  ) : !compras?.length ? (
                    <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">Nenhuma compra encontrada</TableCell></TableRow>
                  ) : dadosPaginados.map(c => (
                    <TableRow key={c.id}>
                      <TableCell>{c.codigo}</TableCell>
                      <TableCell>{format(parseISO(c.data_compra), 'dd/MM/yyyy')}</TableCell>
                      <TableCell className="max-w-[150px] truncate">{c.inscricao_vendedor?.produtores?.nome}</TableCell>
                      <TableCell className="hidden sm:table-cell">{c.produto?.nome}</TableCell>
                      <TableCell className="text-right">{formatNumber(c.quantidade_kg, 3)}</TableCell>
                      <TableCell className="text-right hidden sm:table-cell">R$ {formatNumber(c.valor_total, 2)}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge variant={c.status === 'nfe_emitida' ? 'default' : 'secondary'}>
                          {c.status === 'nfe_emitida' ? 'NFe Emitida' : 'Pendente'}
                        </Badge>
                      </TableCell>
                      <TableCell className="sticky right-0 bg-background">
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleEmitirNfe(c)} disabled={!!c.nota_fiscal_id} title={c.nota_fiscal_id ? 'NFe já emitida' : 'Emitir NFe'}>
                            <Send className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleEditarCompra(c)} disabled={!!c.nota_fiscal_id}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => deleteCompra.mutate(c.id)} disabled={!!c.nota_fiscal_id}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="px-4">
              <TablePagination paginaAtual={paginaAtual} totalPaginas={totalPaginas} totalRegistros={totalRegistros} setPaginaAtual={setPaginaAtual} gerarNumerosPaginas={gerarNumerosPaginas} />
            </div>
          </CardContent>
        </Card>

        {/* Dialog de Compra */}
        <CompraDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          compra={compraSelecionada}
        />

        {/* Dialog de Emissão de NFe */}
        <EmitirNfeCompraDialog
          compra={nfeDialogCompra}
          onClose={() => setNfeDialogCompra(null)}
          onSuccess={() => {
            setNfeDialogCompra(null);
            refetch();
          }}
        />
      </div>
    </AppLayout>
  );
}