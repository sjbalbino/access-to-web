import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Check } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { formatCpfCnpj } from '@/lib/formatters';
import { useEntradasCandidatas, useVincularContraNota } from '@/hooks/useContraNotaVenda';

const formatBR = (v: number) =>
  (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  contratoId: string;
  granjaId: string;
  fornecedorId?: string | null;
}

export function VincularContraNotaDialog({ open, onOpenChange, contratoId, granjaId, fornecedorId }: Props) {
  const [busca, setBusca] = useState('');
  const [filtrarFornecedor, setFiltrarFornecedor] = useState(true);
  const { data: entradas = [] } = useEntradasCandidatas(granjaId, filtrarFornecedor ? fornecedorId : null);
  const vincular = useVincularContraNota();

  const filtered = entradas.filter((e: any) => {
    if (!busca) return true;
    const s = busca.toLowerCase();
    return (
      e.numero_nfe?.toLowerCase().includes(s) ||
      e.chave_acesso?.toLowerCase().includes(s) ||
      e.fornecedor?.nome?.toLowerCase().includes(s) ||
      e.fornecedor?.cpf_cnpj?.includes(busca)
    );
  });

  const handleVincular = async (entradaId: string) => {
    await vincular.mutateAsync({ entradaId, contratoId });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Vincular Contra-Nota do Comprador</DialogTitle>
          <DialogDescription>
            Selecione a NFe de entrada emitida pelo comprador que se refere a esta venda.
            O valor da contra-nota será usado como receita para fins de IR / Livro Caixa.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex gap-2 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nº, chave, fornecedor..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="pl-9"
              />
            </div>
            {fornecedorId && (
              <label className="flex items-center gap-2 text-sm whitespace-nowrap">
                <input
                  type="checkbox"
                  checked={filtrarFornecedor}
                  onChange={(e) => setFiltrarFornecedor(e.target.checked)}
                />
                Apenas do comprador
              </label>
            )}
          </div>

          <div className="border rounded-lg overflow-hidden max-h-[450px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número</TableHead>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead>Emissão</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="w-24"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      Nenhuma entrada disponível para vinculação.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((e: any) => (
                    <TableRow key={e.id}>
                      <TableCell className="font-mono">{e.numero_nfe || '-'}{e.serie ? `/${e.serie}` : ''}</TableCell>
                      <TableCell>
                        <div className="font-medium truncate max-w-[240px]">{e.fornecedor?.nome || '-'}</div>
                        <div className="text-xs text-muted-foreground font-mono">{formatCpfCnpj(e.fornecedor?.cpf_cnpj || '')}</div>
                      </TableCell>
                      <TableCell>{e.data_emissao ? format(parseISO(e.data_emissao), 'dd/MM/yyyy') : '-'}</TableCell>
                      <TableCell className="text-right font-medium">{formatBR(Number(e.valor_total))}</TableCell>
                      <TableCell>
                        <Button size="sm" onClick={() => handleVincular(e.id)} disabled={vincular.isPending}>
                          <Check className="h-4 w-4 mr-1" /> Vincular
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
