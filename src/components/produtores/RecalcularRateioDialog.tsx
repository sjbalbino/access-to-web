import { useState, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useGranjas } from '@/hooks/useGranjas';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RefreshCcw, AlertTriangle, Loader2 } from 'lucide-react';

interface RecalcularRateioDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RecalcularRateioDialog({ open, onOpenChange }: RecalcularRateioDialogProps) {
  const { user } = useAuth();
  const { data: granjas } = useGranjas();
  const qc = useQueryClient();
  const [granjaId, setGranjaId] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [confirmacao, setConfirmacao] = useState(false);

  const { data: logs, isLoading: loadingLogs } = useQuery({
    queryKey: ['rateio_recalculo_logs', granjaId],
    queryFn: async () => {
      if (!granjaId) return [];
      const { data, error } = await supabase
        .from('rateio_recalculo_logs' as any)
        .select('*, profiles:user_id(nome)')
        .eq('granja_id', granjaId)
        .order('created_at', { ascending: false })
        .limit(3);
      if (error) throw error;
      return data as any[];
    },
    enabled: !!granjaId,
  });

  const mutation = useMutation({
    mutationFn: async () => {
      if (!granjaId || !dataInicio || !dataFim || !user?.id) {
        throw new Error('Preencha todos os campos obrigatórios.');
      }

      const { data, error } = await supabase.rpc('recalcular_rateios_granja', {
        p_granja_id: granjaId,
        p_data_inicio: dataInicio,
        p_data_fim: dataFim,
        p_user_id: user.id,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      toast.success('Recálculo concluído com sucesso!');
      if (data && typeof data === 'object') {
          console.log('Resultado do recálculo:', data);
      }
      qc.invalidateQueries({ queryKey: ['lancamento_rateio_socios'] });
      qc.invalidateQueries({ queryKey: ['rateios_periodo'] });
      onOpenChange(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error('Erro ao recalcular: ' + error.message);
    },
  });

  const resetForm = () => {
    setGranjaId('');
    setDataInicio('');
    setDataFim('');
    setConfirmacao(false);
  };

  const handleRecalcular = () => {
    if (!confirmacao) {
      toast.error('Você precisa confirmar que entendeu os riscos.');
      return;
    }
    mutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCcw className="h-5 w-5 text-primary" />
            Recalcular Rateios Retroativamente
          </DialogTitle>
          <DialogDescription>
            Esta ação atualizará todos os rateios de sócios para o período selecionado com base nos percentuais de participação ATUAIS.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label>Granja</Label>
            <Select value={granjaId} onValueChange={setGranjaId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a granja" />
              </SelectTrigger>
              <SelectContent>
                {granjas?.map((g: any) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.razao_social}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data Início</Label>
              <Input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Data Fim</Label>
              <Input
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
              />
            </div>
          </div>

          <div className="p-3 bg-amber-50 border border-amber-200 rounded-md space-y-2">
            <div className="flex items-start gap-2 text-amber-800 text-sm font-semibold">
              <AlertTriangle className="h-4 w-4 mt-0.5" />
              Atenção
            </div>
            <p className="text-xs text-amber-700">
              Isso apagará rateios manuais feitos anteriormente no período para esta granja. Esta ação é irreversível e será registrada em log de auditoria.
            </p>
            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="confirm-recalc"
                checked={confirmacao}
                onChange={(e) => setConfirmacao(e.target.checked)}
                className="h-4 w-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
              />
              <Label htmlFor="confirm-recalc" className="text-xs text-amber-900 cursor-pointer">
                Estou ciente e desejo prosseguir.
              </Label>
            </div>
          </div>

          {logs && logs.length > 0 && (
            <div className="mt-2 space-y-2">
              <Label className="text-xs text-muted-foreground uppercase">Últimos recálculos para esta granja</Label>
              <div className="space-y-1">
                {logs.map((log) => (
                  <div key={log.id} className="text-[10px] p-2 border rounded bg-muted/30 flex justify-between items-center">
                    <div>
                      <span className="font-semibold">{new Date(log.created_at).toLocaleDateString()}</span> - 
                      {log.observacoes || log.status}
                    </div>
                    <div className="text-muted-foreground italic">
                      Por: {log.profiles?.nome || 'Sistema'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleRecalcular}
            disabled={mutation.isPending || !granjaId || !dataInicio || !dataFim}
          >
            {mutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processando...
              </>
            ) : (
              'Recalcular Agora'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
