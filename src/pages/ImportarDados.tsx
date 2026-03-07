import { useState, useEffect, useCallback } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Database, Upload, CheckCircle2, Clock, AlertTriangle, Building, Trash2, Loader2 } from 'lucide-react';
import { tableConfigs, TableConfig } from '@/lib/importacaoConfig';
import { ImportacaoDialog } from '@/components/importacao/ImportacaoDialog';
import { useTenants } from '@/hooks/useTenants';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';

type TableStatus = 'pendente' | 'importada' | 'erro';

const CLEANUP_STEPS = [
  { label: 'Notas Depósito Emitidas', tables: ['notas_deposito_emitidas'] },
  { label: 'Notas Ref. Compra + Compras Cereais', tables: ['compras_cereais_notas_referenciadas', 'compras_cereais'] },
  { label: 'Devoluções Depósito', tables: ['devolucoes_deposito'] },
  { label: 'Remessas Venda', tables: ['remessas_venda'] },
  { label: 'Contratos Venda', tables: ['contratos_venda'] },
  { label: 'Transferências Depósito', tables: ['transferencias_deposito'] },
  { label: 'Colheitas', tables: ['colheitas'] },
  { label: 'Aplicações, Plantios, Chuvas, etc.', tables: ['aplicacoes', 'plantios', 'chuvas', 'floracoes', 'insetos', 'plantas_invasoras', 'analises_solo', 'pivos'] },
  { label: 'Controle Lavouras', tables: ['controle_lavouras'] },
  { label: 'Notas Fiscais (itens/ref/notas)', tables: ['notas_fiscais_itens', 'notas_fiscais_referenciadas', 'notas_fiscais_duplicatas', 'notas_fiscais'] },
  { label: 'Estoque Produtos', tables: ['estoque_produtos'] },
  { label: 'Inscrições Produtor', tables: ['inscricoes_produtor'] },
  { label: 'Emitentes NFe', tables: ['emitentes_nfe'] },
  { label: 'Produtores', tables: ['produtores'] },
  { label: 'Lavouras', tables: ['lavouras'] },
  { label: 'Silos', tables: ['silos'] },
  { label: 'Produtos', tables: ['produtos'] },
  { label: 'Placas, Transportadoras, Clientes', tables: ['placas', 'transportadoras', 'clientes_fornecedores', 'locais_entrega'] },
  { label: 'Safras, Culturas, Tabela Umidades, etc.', tables: ['safras', 'culturas', 'tabela_umidades', 'grupos_produtos', 'unidades_medida', 'cfops', 'ncm'] },
  { label: 'Granjas', tables: ['granjas'] },
];

export default function ImportarDados() {
  const [statuses, setStatuses] = useState<Record<string, { status: TableStatus; count: number }>>({});
  const [activeConfig, setActiveConfig] = useState<TableConfig | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');
  const [showCleanupDialog, setShowCleanupDialog] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [cleaning, setCleaning] = useState(false);
  const [cleanProgress, setCleanProgress] = useState(0);
  const [cleanStep, setCleanStep] = useState('');

  const { data: tenants, isLoading: isLoadingTenants } = useTenants();
  const queryClient = useQueryClient();

  const sortedConfigs = [...tableConfigs].sort((a, b) => a.order - b.order);

  const handleImportComplete = (key: string, count: number) => {
    setStatuses(prev => ({ ...prev, [key]: { status: 'importada', count } }));
  };

  const getStatusInfo = (key: string) => {
    const s = statuses[key];
    if (!s) return { status: 'pendente' as TableStatus, count: 0 };
    return s;
  };

  const importedCount = Object.values(statuses).filter(s => s.status === 'importada').length;
  const totalTables = sortedConfigs.length;
  const overallProgress = totalTables > 0 ? Math.round((importedCount / totalTables) * 100) : 0;

  const canImport = (config: TableConfig) => {
    if (!selectedTenantId) return false;
    if (!config.dependsOn || config.dependsOn.length === 0) return true;
    return config.dependsOn.every(dep => statuses[dep]?.status === 'importada');
  };

  const selectedTenant = tenants?.find(t => t.id === selectedTenantId);

  const handleCleanupRequest = () => {
    setShowCleanupDialog(true);
  };

  const handleFirstConfirm = () => {
    setShowCleanupDialog(false);
    setConfirmText('');
    setShowConfirmDialog(true);
  };

  const handleCleanup = async () => {
    setShowConfirmDialog(false);
    setConfirmText('');
    setCleaning(true);
    setCleanProgress(0);
    setCleanStep('Iniciando limpeza...');

    try {
      for (let i = 0; i < CLEANUP_STEPS.length; i++) {
        const step = CLEANUP_STEPS[i];
        setCleanStep(step.label);
        setCleanProgress(Math.round(((i) / CLEANUP_STEPS.length) * 100));

        for (const table of step.tables) {
          const { error } = await supabase
            .from(table as any)
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000');

          if (error) {
            console.warn(`Erro ao limpar ${table}:`, error.message);
          }
        }
      }

      setCleanProgress(100);
      setCleanStep('Concluído!');
      setStatuses({});
      queryClient.invalidateQueries();
      toast.success('Base de dados limpa com sucesso! Apenas as empresas contratantes foram mantidas.');
    } catch (err: any) {
      toast.error(`Erro na limpeza: ${err.message}`);
    } finally {
      setCleaning(false);
    }
  };

  return (
    <AppLayout>
      <PageHeader
        title="Importar Dados"
        description="Importe dados do sistema legado (Access) via planilhas Excel"
        icon={<Database className="h-6 w-6" />}
      />

      {/* Tenant selector */}
      <Card className="mb-6 border-primary/30 bg-primary/5">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 mb-2">
            <Building className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Empresa Contratante</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-3">
            Selecione a empresa contratante para a qual os dados serão importados. 
            Todas as granjas importadas serão vinculadas a esta empresa.
          </p>
          <div className="max-w-md">
            <Label htmlFor="tenant-select">Empresa Contratante *</Label>
            <Select value={selectedTenantId} onValueChange={setSelectedTenantId}>
              <SelectTrigger id="tenant-select" className="mt-1">
                <SelectValue placeholder={isLoadingTenants ? "Carregando..." : "Selecione a empresa contratante"} />
              </SelectTrigger>
              <SelectContent>
                {tenants?.map((tenant) => (
                  <SelectItem key={tenant.id} value={tenant.id}>
                    {tenant.razao_social} {tenant.cnpj ? `(${tenant.cnpj})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {selectedTenant && (
            <div className="mt-2">
              <Badge variant="outline" className="text-primary border-primary">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                {selectedTenant.razao_social}
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Progress overview */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium">Progresso geral</span>
            <span className="text-sm text-muted-foreground">{importedCount} de {totalTables} tabelas</span>
          </div>
          <Progress value={overallProgress} />
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card className="mb-6 border-primary/30 bg-primary/5">
        <CardContent className="pt-6">
          <h3 className="font-semibold mb-2 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-primary" />
            Instruções
          </h3>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>1. Selecione a <strong>Empresa Contratante</strong> acima</li>
            <li>2. Exporte cada tabela do Access como arquivo <strong>.xlsx</strong> (Excel)</li>
            <li>3. Siga a <strong>ordem sugerida</strong> abaixo (tabelas sem dependência primeiro)</li>
            <li>4. Para cada tabela, clique em <strong>"Importar"</strong> e selecione o arquivo correspondente</li>
            <li>5. O sistema resolve automaticamente códigos legados para os IDs internos</li>
          </ul>
        </CardContent>
      </Card>

      {/* Tables list */}
      <div className="grid gap-3">
        {sortedConfigs.map((config) => {
          const { status, count } = getStatusInfo(config.key);
          const enabled = canImport(config);
          const hasDeps = config.dependsOn && config.dependsOn.length > 0;
          const pendingDeps = config.dependsOn?.filter(d => statuses[d]?.status !== 'importada') || [];

          return (
            <Card key={config.key} className={status === 'importada' ? 'border-green-500/50 bg-green-500/5' : ''}>
              <CardContent className="py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-muted-foreground text-sm font-bold">
                    {config.order}
                  </div>
                  <div>
                    <h4 className="font-medium flex items-center gap-2">
                      {config.label}
                      {status === 'importada' && (
                        <Badge variant="outline" className="text-green-600 border-green-600">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          {count} importados
                        </Badge>
                      )}
                      {status === 'pendente' && (
                        <Badge variant="outline" className="text-muted-foreground">
                          <Clock className="h-3 w-3 mr-1" />
                          Pendente
                        </Badge>
                      )}
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      {config.description}
                      {!selectedTenantId && (
                        <span className="text-destructive ml-2">(Selecione a empresa contratante primeiro)</span>
                      )}
                      {selectedTenantId && hasDeps && pendingDeps.length > 0 && (
                        <span className="text-warning ml-2">
                          (Depende de: {pendingDeps.map(d => {
                            const dep = tableConfigs.find(t => t.key === d);
                            return dep?.label || d;
                          }).join(', ')})
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant={status === 'importada' ? 'outline' : 'default'}
                  disabled={!enabled}
                  onClick={() => {
                    setActiveConfig(config);
                    setDialogOpen(true);
                  }}
                >
                  <Upload className="h-4 w-4 mr-1" />
                  {status === 'importada' ? 'Reimportar' : 'Importar'}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Cleanup section */}
      <Card className="mt-6 border-destructive/30 bg-destructive/5">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-destructive flex items-center gap-2">
                <Trash2 className="h-4 w-4" />
                Limpar Base de Dados
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Remove todos os dados mantendo apenas as Empresas Contratantes. Use antes de reimportar dados.
              </p>
            </div>
            <Button
              variant="destructive"
              disabled={cleaning}
              onClick={handleCleanupRequest}
            >
              {cleaning ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  Limpando...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-1" />
                  Limpar Base
                </>
              )}
            </Button>
          </div>
          {cleaning && (
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{cleanStep}</span>
                <span className="text-muted-foreground">{cleanProgress}%</span>
              </div>
              <Progress value={cleanProgress} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Import dialog */}
      {activeConfig && (
        <ImportacaoDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          config={activeConfig}
          tenantId={selectedTenantId}
          onImportComplete={(count) => handleImportComplete(activeConfig.key, count)}
        />
      )}

      {/* First confirmation dialog */}
      <AlertDialog open={showCleanupDialog} onOpenChange={setShowCleanupDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">⚠️ Limpar Base de Dados</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação irá <strong>remover permanentemente</strong> todos os dados do sistema, incluindo:
              granjas, produtores, lavouras, silos, colheitas, notas fiscais, contratos, e todos os demais registros.
              <br /><br />
              <strong>Apenas as Empresas Contratantes (tenants) serão mantidas.</strong>
              <br /><br />
              Esta ação <strong>NÃO pode ser desfeita</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleFirstConfirm}
            >
              Continuar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Second confirmation dialog - type to confirm */}
      <AlertDialog open={showConfirmDialog} onOpenChange={(open) => { setShowConfirmDialog(open); if (!open) setConfirmText(''); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">Confirmação Final</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                <p className="mb-3">
                  Para confirmar a exclusão de todos os dados, digite <strong>LIMPAR</strong> no campo abaixo:
                </p>
                <Input
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="Digite LIMPAR para confirmar"
                  className="border-destructive/50"
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmText('')}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={confirmText !== 'LIMPAR'}
              onClick={handleCleanup}
            >
              Limpar Tudo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
