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

  const resetAuditFilters = () => {
    setAuditGranjaId('all');
    setAuditUserId('all');
    setAuditDataInicio('');
    setAuditDataFim('');
    setAuditSearch('');
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
      <DialogContent className={activeTab === 'auditoria' ? "max-w-4xl" : "sm:max-w-[425px]"}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCcw className="h-5 w-5 text-primary" />
            Recalcular Rateios Retroativamente
          </DialogTitle>
          <DialogDescription>
            Gerencie o recálculo de rateios de sócios com total controle de auditoria.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="recalcular">
              <RefreshCcw className="h-4 w-4 mr-2" />
              Executar Recálculo
            </TabsTrigger>
            <TabsTrigger value="auditoria">
              <History className="h-4 w-4 mr-2" />
              Histórico / Auditoria
            </TabsTrigger>
          </TabsList>

          <TabsContent value="recalcular" className="space-y-4 py-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Granja</Label>
                <Select isSearchable value={granjaId} onValueChange={setGranjaId}>
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
                  Isso atualizará rateios manuais feitos anteriormente no período para esta granja. A ação será registrada e pode ser desfeita na aba de auditoria.
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

              {logs && logs.length > 0 && activeTab === 'recalcular' && (
                <div className="mt-2 space-y-2">
                  <Label className="text-xs text-muted-foreground uppercase">Últimos recálculos {granjaId ? 'para esta granja' : 'do sistema'}</Label>
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
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-primary"
                            onClick={() => handleExportarAuditoria(log)}
                            title="Gerar relatório"
                          >
                            <FileText className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Button variant="link" className="text-[10px] h-auto p-0" onClick={() => setActiveTab('auditoria')}>
                    Ver histórico completo
                  </Button>
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
          </TabsContent>

          <TabsContent value="auditoria" className="space-y-4 py-4">
            {/* Filtros da Auditoria */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-muted/20 p-3 rounded-lg border">
              <div className="space-y-1">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Granja</Label>
                <Select isSearchable value={auditGranjaId} onValueChange={setAuditGranjaId}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Todas as Granjas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as Granjas</SelectItem>
                    {granjas?.map((g: any) => (
                      <SelectItem key={g.id} value={g.id}>{g.razao_social}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Usuário</Label>
                <Select isSearchable value={auditUserId} onValueChange={setAuditUserId}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Todos os Usuários" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Usuários</SelectItem>
                    {profiles?.map((p: any) => (
                      <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Início</Label>
                <Input 
                  type="date" 
                  value={auditDataInicio} 
                  onChange={(e) => setAuditDataInicio(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Fim</Label>
                <Input 
                  type="date" 
                  value={auditDataFim} 
                  onChange={(e) => setAuditDataFim(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>

              <div className="md:col-span-3 space-y-1 relative">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Busca</Label>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-3 w-3 text-muted-foreground" />
                  <Input 
                    placeholder="Buscar em observações ou status..." 
                    value={auditSearch}
                    onChange={(e) => setAuditSearch(e.target.value)}
                    className="h-8 text-xs pl-7 pr-7"
                  />
                  {auditSearch && (
                    <button 
                      onClick={() => setAuditSearch('')}
                      className="absolute right-2 top-2.5"
                    >
                      <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-end">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-8 w-full text-xs"
                  onClick={resetAuditFilters}
                >
                  Limpar Filtros
                </Button>
              </div>
            </div>

            {/* Tabela de Logs */}
            <div className="border rounded-md overflow-hidden">
              <div className="max-h-[350px] overflow-y-auto">
                {loadingLogs ? (
                  <div className="flex justify-center items-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : logs && logs.length > 0 ? (
                  <table className="w-full text-xs border-collapse">
                    <thead className="bg-muted sticky top-0 z-10">
                      <tr>
                        <th className="text-left p-2 border-b">Data/Hora</th>
                        <th className="text-left p-2 border-b">Usuário</th>
                        <th className="text-left p-2 border-b">Granja</th>
                        <th className="text-left p-2 border-b">Período Afetado</th>
                        <th className="text-left p-2 border-b">Status/OBS</th>
                        <th className="text-right p-2 border-b">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.map((log) => (
                        <tr key={log.id} className="hover:bg-muted/30 border-b last:border-0">
                          <td className="p-2 whitespace-nowrap">
                            {new Date(log.created_at).toLocaleString()}
                          </td>
                          <td className="p-2 font-medium">{log.profiles?.nome || 'Sistema'}</td>
                          <td className="p-2">
                            {granjas?.find(g => g.id === log.granja_id)?.razao_social || 'Desconhecida'}
                          </td>
                          <td className="p-2 whitespace-nowrap">
                            {log.data_inicial ? new Date(log.data_inicial + 'T12:00:00').toLocaleDateString() : '-'} a {log.data_final ? new Date(log.data_final + 'T12:00:00').toLocaleDateString() : '-'}
                          </td>
                          <td className="p-2">
                            <div className="flex flex-col">
                              <span className={`font-semibold ${log.status === 'desfeito' ? 'text-amber-600' : 'text-emerald-600'}`}>
                                {log.status}
                              </span>
                              {log.observacoes && <span className="text-[10px] text-muted-foreground italic">{log.observacoes}</span>}
                            </div>
                          </td>
                          <td className="p-2 text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0"
                                onClick={() => handleExportarAuditoria(log)}
                                title="Relatório de Auditoria"
                              >
                                <FileText className="h-4 w-4" />
                              </Button>
                              
                              {log.status !== 'desfeito' && log.backup_data && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 w-7 p-0 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                                  onClick={() => undoMutation.mutate(log.id)}
                                  disabled={undoMutation.isPending}
                                  title="Desfazer"
                                >
                                  {undoMutation.isPending && undoMutation.variables === log.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Undo2 className="h-4 w-4" />
                                  )}
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    Nenhum registro encontrado com os filtros selecionados.
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>

  );
}
