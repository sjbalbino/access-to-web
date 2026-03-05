import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Database, Upload, CheckCircle2, Clock, AlertTriangle, Building } from 'lucide-react';
import { tableConfigs, TableConfig } from '@/lib/importacaoConfig';
import { ImportacaoDialog } from '@/components/importacao/ImportacaoDialog';
import { useTenants } from '@/hooks/useTenants';

type TableStatus = 'pendente' | 'importada' | 'erro';

export default function ImportarDados() {
  const [statuses, setStatuses] = useState<Record<string, { status: TableStatus; count: number }>>({});
  const [activeConfig, setActiveConfig] = useState<TableConfig | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');

  const { data: tenants, isLoading: isLoadingTenants } = useTenants();

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
    </AppLayout>
  );
}
