import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Upload, Search, Trash2, Eye, CheckCircle, Package } from "lucide-react";
import { useEntradasNfe, useDeleteEntradaNfe, useFinalizarEntrada } from "@/hooks/useEntradasNfe";
import { useGranjas } from "@/hooks/useGranjas";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatNumber } from "@/lib/formatters";
import { EntradaNfeFormDialog } from "@/components/entradas-nfe/EntradaNfeFormDialog";
import { ImportarXmlDialog } from "@/components/entradas-nfe/ImportarXmlDialog";
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

const statusLabels: Record<string, string> = {
  pendente: 'Pendente',
  conferido: 'Conferido',
  finalizado: 'Finalizado',
};

const statusVariants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pendente: 'secondary',
  conferido: 'outline',
  finalizado: 'default',
};

export default function EntradasNfe() {
  const [granjaId, setGranjaId] = useState<string>('all');
  const [busca, setBusca] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [xmlOpen, setXmlOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: granjas } = useGranjas();
  const { data: entradas, isLoading } = useEntradasNfe(granjaId === 'all' ? null : granjaId);
  const deleteMutation = useDeleteEntradaNfe();
  const finalizarMutation = useFinalizarEntrada();

  const filtered = (entradas || []).filter((e: any) => {
    if (!busca) return true;
    const term = busca.toLowerCase();
    return (
      e.numero_nfe?.toLowerCase().includes(term) ||
      e.fornecedor?.nome?.toLowerCase().includes(term) ||
      e.chave_acesso?.toLowerCase().includes(term)
    );
  });

  return (
    <AppLayout>
      <div className="space-y-6">
        <PageHeader title="Entradas NF-e" description="Entrada de produtos no estoque via Notas Fiscais de compra"
          actions={
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setXmlOpen(true)}>
                <Upload className="h-4 w-4 mr-2" /> Importar XML
              </Button>
              <Button onClick={() => { setEditId(null); setFormOpen(true); }}>
                <Plus className="h-4 w-4 mr-2" /> Entrada Manual
              </Button>
            </div>
          }
        />

        <div className="flex flex-wrap gap-4 items-end">
          <div className="w-48">
            <label className="text-sm font-medium mb-1 block">Granja</label>
            <Select value={granjaId} onValueChange={setGranjaId}>
              <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {granjas?.map((g: any) => (
                  <SelectItem key={g.id} value={g.id}>{g.razao_social}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar por número, fornecedor ou chave..." value={busca} onChange={(e) => setBusca(e.target.value)} className="pl-10" />
          </div>
        </div>

        <div className="rounded-lg border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="whitespace-nowrap">Nº NF-e</TableHead>
                <TableHead className="whitespace-nowrap">Série</TableHead>
                <TableHead className="whitespace-nowrap">Fornecedor</TableHead>
                <TableHead className="whitespace-nowrap">Data Emissão</TableHead>
                <TableHead className="whitespace-nowrap">Data Entrada</TableHead>
                <TableHead className="whitespace-nowrap text-right">Valor Total</TableHead>
                <TableHead className="whitespace-nowrap">Modo</TableHead>
                <TableHead className="whitespace-nowrap">Status</TableHead>
                <TableHead className="text-right whitespace-nowrap">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={9} className="text-center py-8">Carregando...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Nenhuma entrada encontrada</TableCell></TableRow>
              ) : (
                filtered.map((e: any) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium">{e.numero_nfe || '-'}</TableCell>
                    <TableCell>{e.serie || '-'}</TableCell>
                    <TableCell>{e.fornecedor?.nome || '-'}</TableCell>
                    <TableCell>{e.data_emissao ? new Date(e.data_emissao + 'T00:00:00').toLocaleDateString('pt-BR') : '-'}</TableCell>
                    <TableCell>{e.data_entrada ? new Date(e.data_entrada + 'T00:00:00').toLocaleDateString('pt-BR') : '-'}</TableCell>
                    <TableCell className="text-right">{formatCurrency(e.valor_total || 0)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{e.modo_entrada === 'xml' ? 'XML' : 'Manual'}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariants[e.status] || 'secondary'}>{statusLabels[e.status] || e.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        <Button size="icon" variant="ghost" onClick={() => { setEditId(e.id); setFormOpen(true); }}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        {e.status !== 'finalizado' && (
                          <>
                            <Button size="icon" variant="ghost" onClick={() => finalizarMutation.mutate(e.id)} title="Finalizar e dar entrada no estoque">
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => setDeleteId(e.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <EntradaNfeFormDialog open={formOpen} onOpenChange={setFormOpen} entradaId={editId} />
      <ImportarXmlDialog open={xmlOpen} onOpenChange={setXmlOpen} />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir entrada?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (deleteId) { deleteMutation.mutate(deleteId); setDeleteId(null); } }}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
