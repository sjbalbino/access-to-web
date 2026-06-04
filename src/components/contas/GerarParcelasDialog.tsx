import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tipo: 'receber' | 'pagar';
  valorTotal: number;
  onGerar: (config: { 
    num_parcelas: number; 
    primeiro_vencimento: string; 
    intervalo_dias: number;
    ja_pago: boolean;
  }) => void | Promise<void>;
}

export function GerarParcelasDialog({ open, onOpenChange, tipo, valorTotal, onGerar }: Props) {
  const [numParcelas, setNumParcelas] = useState(1);
  const [primeiroVenc, setPrimeiroVenc] = useState(new Date().toISOString().slice(0, 10));
  const [intervalo, setIntervalo] = useState(30);
  const [jaPago, setJaPago] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handle = async () => {
    setSubmitting(true);
    try {
      await onGerar({ 
        num_parcelas: numParcelas, 
        primeiro_vencimento: primeiroVenc, 
        intervalo_dias: intervalo,
        ja_pago: jaPago
      });
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  const formatBR = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Gerar {tipo === 'receber' ? 'Contas a Receber' : 'Contas a Pagar'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            Valor total: <span className="font-bold text-foreground">{formatBR(valorTotal)}</span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Parcelas</Label>
              <Input type="number" min={1} max={60} value={numParcelas} onChange={(e) => setNumParcelas(Math.max(1, parseInt(e.target.value) || 1))} />
            </div>
            <div>
              <Label>1º vencimento</Label>
              <Input type="date" value={primeiroVenc} onChange={(e) => setPrimeiroVenc(e.target.value)} />
            </div>
            <div>
              <Label>Intervalo (dias)</Label>
              <Input type="number" min={1} value={intervalo} onChange={(e) => setIntervalo(Math.max(1, parseInt(e.target.value) || 30))} />
            </div>
          </div>
          
          <div className="flex items-center space-x-2 border rounded-md p-3 bg-muted/30">
            <Checkbox 
              id="ja_pago" 
              checked={jaPago} 
              onCheckedChange={(checked) => setJaPago(checked === true)} 
            />
            <div className="grid gap-1.5 leading-none">
              <Label htmlFor="ja_pago" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Lançar como já {tipo === 'receber' ? 'recebido' : 'pago'}
              </Label>
              <p className="text-xs text-muted-foreground">
                As parcelas serão criadas com status "{tipo === 'receber' ? 'pago' : 'pago'}" e o valor total baixado.
              </p>
            </div>
          </div>

          <div className="text-xs text-muted-foreground">
            Valor por parcela: aproximadamente {formatBR(valorTotal / numParcelas)}
            <br />
            Parcelas existentes sem baixa serão regeradas.
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handle} disabled={submitting || valorTotal <= 0}>
            Gerar parcelas
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
