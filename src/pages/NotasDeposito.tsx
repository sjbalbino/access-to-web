import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Eye, Send } from 'lucide-react';
import { useNotasDepositoEmitidas, useDeleteNotaDepositoEmitida, type NotaDepositoEmitida } from '@/hooks/useNotasDepositoEmitidas';
import { useGranjas } from '@/hooks/useGranjas';
import { useSafras } from '@/hooks/useSafras';
import { useProdutosSementes } from '@/hooks/useProdutosSementes';
import { formatNumber } from '@/lib/formatters';
import { format } from 'date-fns';
import { NotaDepositoDialog } from '@/components/deposito/NotaDepositoDialog';
import { EmitirNfeDepositoDialog } from '@/components/deposito/EmitirNfeDepositoDialog';

export default function NotasDeposito() {
  const [granjaId, setGranjaId] = useState<string>('');
  const [safraId, setSafraId] = useState<string>('');
  const [produtoId, setProdutoId] = useState<string>('');
  
  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [notaSelecionada, setNotaSelecionada] = useState<NotaDepositoEmitida | null>(null);
  
  // NFe Dialog state
  const [nfeDialogNota, setNfeDialogNota] = useState<NotaDepositoEmitida | null>(null);

  const { data: granjas } = useGranjas();
  const { data: safras } = useSafras();
  const { data: produtos } = useProdutosSementes();
  
  const { data: notas, isLoading, refetch } = useNotasDepositoEmitidas({ 
    granjaId: granjaId || undefined, 
    safraId: safraId || undefined, 
    produtoId: produtoId || undefined 
  });
  const deleteNota = useDeleteNotaDepositoEmitida();

  const handleNovaNota = () => {
    setNotaSelecionada(null);
    setDialogOpen(true);
  };

  const handleVisualizarNota = (nota: NotaDepositoEmitida) => {
    setNotaSelecionada(nota);
    setDialogOpen(true);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <PageHeader
          title="Notas de Depósito"
          description="CFOP 1905 - Contra-nota de entrada para depósito (baixa saldo produtor)"
          actions={
            <Button onClick={handleNovaNota}>
              <Plus className="h-4 w-4 mr-2" /> Nova Nota Depósito
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
            <CardTitle>Notas de Depósito Registradas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Produtor</TableHead>
                    <TableHead>Produto</TableHead>
                    <TableHead>Safra</TableHead>
                    <TableHead className="text-right">Qtde (kg)</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={7} className="text-center">Carregando...</TableCell></TableRow>
                  ) : !notas?.length ? (
                    <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">Nenhuma nota de depósito encontrada</TableCell></TableRow>
                  ) : notas.map(n => (
                    <TableRow key={n.id}>
                      <TableCell>{n.data_emissao ? format(new Date(n.data_emissao), 'dd/MM/yyyy') : '-'}</TableCell>
                      <TableCell>{n.inscricao_produtor?.produtores?.nome}</TableCell>
                      <TableCell>{n.produto?.nome}</TableCell>
                      <TableCell>{n.safra?.nome}</TableCell>
                      <TableCell className="text-right">{formatNumber(n.quantidade_kg, 3)}</TableCell>
                      <TableCell>
                        <Badge variant={n.nota_fiscal?.status === 'autorizado' ? 'default' : 'secondary'}>
                          {n.nota_fiscal_id ? 'NFe Emitida' : 'Pendente'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => setNfeDialogNota(n)}
                            disabled={!!n.nota_fiscal_id}
                            title={n.nota_fiscal_id ? 'NFe já emitida' : 'Emitir NFe'}
                          >
                            <Send className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleVisualizarNota(n)}
                            title="Visualizar"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => deleteNota.mutate(n.id)}
                            disabled={!!n.nota_fiscal_id}
                            title={n.nota_fiscal_id ? 'Não é possível excluir - NFe emitida' : 'Excluir'}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Dialog */}
        <NotaDepositoDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          nota={notaSelecionada}
          defaultFiltros={{ granjaId, safraId, produtoId }}
        />

        {/* NFe Dialog */}
        <EmitirNfeDepositoDialog
          nota={nfeDialogNota}
          onClose={() => setNfeDialogNota(null)}
          onSuccess={() => {
            setNfeDialogNota(null);
            refetch();
          }}
        />
      </div>
    </AppLayout>
  );
}
