import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from '@/components/ui/empty';
import { Plus, Pencil, Trash2, Search, Wheat } from 'lucide-react';
import { useControleLavouras, useDeleteControleLavoura } from '@/hooks/useControleLavouras';
import { useSafras } from '@/hooks/useSafras';
import { Spinner } from '@/components/ui/spinner';
import { toast } from '@/hooks/use-toast';

interface ControleLavouraListProps {
  onNew: () => void;
  onEdit: (id: string) => void;
  canEdit: boolean;
}

export function ControleLavouraList({ onNew, onEdit, canEdit }: ControleLavouraListProps) {
  const [safraFilter, setSafraFilter] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const { data: safras = [] } = useSafras();
  const { data: controles = [], isLoading } = useControleLavouras(safraFilter);
  const deleteMutation = useDeleteControleLavoura();

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id);
    } catch (error) {
      // Error is handled in the hook
    }
  };

  const filteredControles = controles.filter(controle => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      controle.lavouras?.nome?.toLowerCase().includes(term) ||
      controle.safras?.nome?.toLowerCase().includes(term)
    );
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle className="flex items-center gap-2">
            <Wheat className="h-5 w-5 text-primary" />
            Controles de Lavoura
          </CardTitle>
          {canEdit && (
            <Button onClick={onNew} className="gap-2">
              <Plus className="h-4 w-4" />
              Novo Controle
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* Filtros */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por lavoura..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={safraFilter || 'all'} onValueChange={(v) => setSafraFilter(v === 'all' ? null : v)}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Filtrar por safra" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as safras</SelectItem>
              {safras.map((safra) => (
                <SelectItem key={safra.id} value={safra.id}>
                  {safra.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Tabela */}
        {filteredControles.length === 0 ? (
          <Empty className="border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Wheat className="h-6 w-6" />
              </EmptyMedia>
              <EmptyTitle>Nenhum controle encontrado</EmptyTitle>
              <EmptyDescription>
                {canEdit ? "Clique em 'Novo Controle' para começar." : "Nenhum registro disponível."}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Safra</TableHead>
                  <TableHead>Lavoura</TableHead>
                  <TableHead className="text-right">Área Total (ha)</TableHead>
                  <TableHead className="text-right">Ha Plantado</TableHead>
                  <TableHead>Cobertura do Solo</TableHead>
                  {canEdit && <TableHead className="w-24 text-center">Ações</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredControles.map((controle) => (
                  <TableRow 
                    key={controle.id} 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => onEdit(controle.id)}
                  >
                    <TableCell className="font-medium">{controle.safras?.nome || '-'}</TableCell>
                    <TableCell>{controle.lavouras?.nome || '-'}</TableCell>
                    <TableCell className="text-right">{controle.area_total?.toFixed(2) || '0.00'}</TableCell>
                    <TableCell className="text-right">{controle.ha_plantado?.toFixed(2) || '0.00'}</TableCell>
                    <TableCell>{controle.cobertura_solo || '-'}</TableCell>
                    {canEdit && (
                      <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onEdit(controle.id)}
                            title="Editar"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive"
                                title="Excluir"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tem certeza que deseja excluir este controle de lavoura?
                                  <br />
                                  <strong>Safra:</strong> {controle.safras?.nome}
                                  <br />
                                  <strong>Lavoura:</strong> {controle.lavouras?.nome}
                                  <br /><br />
                                  <span className="text-destructive font-medium">
                                    Esta ação irá excluir todos os registros associados (plantios, colheitas, aplicações, etc.)
                                  </span>
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(controle.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Excluir
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
