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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RefreshCcw, AlertTriangle, Loader2, Undo2, FileText, History, Search, X } from 'lucide-react';
import { gerarRelatorioAuditoriaRateioPdf } from '@/lib/relatoriosGestao';

interface RecalcularRateioDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RecalcularRateioDialog({ open, onOpenChange }: RecalcularRateioDialogProps) {
  const { user } = useAuth();
  const { data: granjas } = useGranjas();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState('recalcular');
  
  // States para Recálculo
  const [granjaId, setGranjaId] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [confirmacao, setConfirmacao] = useState(false);

  // States para Auditoria
  const [auditGranjaId, setAuditGranjaId] = useState('all');
  const [auditUserId, setAuditUserId] = useState('all');
  const [auditDataInicio, setAuditDataInicio] = useState('');
  const [auditDataFim, setAuditDataFim] = useState('');
  const [auditSearch, setAuditSearch] = useState('');

  // Busca de perfis para filtro
  const { data: profiles } = useQuery({
    queryKey: ['profiles_audit'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, nome')
        .order('nome');
      if (error) throw error;
      return data;
    }
  });

  const { data: logs, isLoading: loadingLogs } = useQuery({
    queryKey: ['rateio_recalculo_logs', auditGranjaId, auditUserId, auditDataInicio, auditDataFim, auditSearch, granjaId, activeTab],
    queryFn: async () => {
      // Se estiver na aba de recálculo e não houver granja selecionada, mostramos os últimos logs gerais ou limitamos
      let query = supabase
        .from('rateio_recalculo_logs' as any)
        .select('*, profiles:user_id(nome)')
        .order('created_at', { ascending: false });

      if (activeTab === 'recalcular') {
        if (granjaId) {
          query = query.eq('granja_id', granjaId);
        }
        query = query.limit(3);
      } else {
        // Filtros da Auditoria
        if (auditGranjaId !== 'all') {
          query = query.eq('granja_id', auditGranjaId);
        }
        if (auditUserId !== 'all') {
          query = query.eq('user_id', auditUserId);
        }
        if (auditDataInicio) {
          query = query.gte('created_at', `${auditDataInicio}T00:00:00`);
        }
        if (auditDataFim) {
          query = query.lte('created_at', `${auditDataFim}T23:59:59`);
        }
        if (auditSearch) {
          query = query.or(`observacoes.ilike.%${auditSearch}%,status.ilike.%${auditSearch}%`);
        }
        query = query.limit(50);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as any[];
    },
    enabled: open,
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

  const undoMutation = useMutation({
    mutationFn: async (logId: string) => {
      if (!user?.id) throw new Error('Usuário não autenticado');
      
      const { data, error } = await supabase.rpc('desfazer_recalculo_rateio', {
        p_log_id: logId,
        p_user_id: user.id,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Recálculo desfeito com sucesso!');
      qc.invalidateQueries({ queryKey: ['lancamento_rateio_socios'] });
      qc.invalidateQueries({ queryKey: ['rateios_periodo'] });
      qc.invalidateQueries({ queryKey: ['rateio_recalculo_logs'] });
    },
    onError: (error: any) => {
      toast.error('Erro ao desfazer recálculo: ' + error.message);
    },
  });

  const resetForm = () => {
    setGranjaId('');
    setDataInicio('');
    setDataFim('');
    setConfirmacao(false);
  };

  const handleExportarAuditoria = (log: any) => {
    const granja = granjas?.find((g: any) => g.id === log.granja_id);
    gerarRelatorioAuditoriaRateioPdf({
      id: log.id,
      created_at: log.created_at,
      data_inicial: log.data_inicial,
      data_final: log.data_final,
      granja_nome: granja?.razao_social || 'Desconhecida',
      usuario_nome: log.profiles?.nome || 'Sistema',
      status: log.status,
      observacoes: log.observacoes,
      backup_data: log.backup_data
    });
    toast.success('Relatório de auditoria gerado!');
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
              Isso atualizará rateios manuais feitos anteriormente no período para esta granja. A ação será registrada e pode ser desfeita usando o log abaixo.
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
                  <div key={log.id} className="text-[10px] p-2 border rounded bg-muted/30 flex justify-between items-center gap-2">
                    <div className="flex-1">
                      <div className="font-semibold">
                        {new Date(log.created_at).toLocaleDateString()} {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      <div className="text-muted-foreground italic">
                        Por: {log.profiles?.nome || 'Sistema'}
                      </div>
                      <div className="mt-0.5">{log.observacoes || log.status}</div>
                    </div>
                    {log.backup_data && (
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-primary hover:text-primary hover:bg-primary/10"
                          onClick={() => handleExportarAuditoria(log)}
                          title="Gerar relatório de auditoria"
                        >
                          <FileText className="h-3 w-3" />
                          <span className="hidden sm:inline ml-1 text-[10px]">Auditoria</span>
                        </Button>
                        
                        {log.status !== 'desfeito' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                            onClick={() => undoMutation.mutate(log.id)}
                            disabled={undoMutation.isPending}
                          >
                            {undoMutation.isPending && undoMutation.variables === log.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <div className="flex items-center gap-1">
                                <Undo2 className="h-3 w-3" />
                                <span className="hidden sm:inline ml-1 text-[10px]">Desfazer</span>
                              </div>
                            )}
                          </Button>
                        )}
                      </div>
                    )}
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
