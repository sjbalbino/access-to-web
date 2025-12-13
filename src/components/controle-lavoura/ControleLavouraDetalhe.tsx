import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { ArrowLeft, Save, Trash2, Wheat, Sprout, Droplets, Leaf, Bug, Skull, Beaker, Pill, FlaskConical, Mountain, BugOff, CloudRain, TreeDeciduous, Flower2, TestTube, CircleDot } from 'lucide-react';
import { ControleLavoura, useUpdateControleLavoura, useDeleteControleLavoura } from '@/hooks/useControleLavouras';
import { PlantiosTab } from './PlantiosTab';
import { AplicacoesTab } from './AplicacoesTab';
import { ColheitasTab } from './ColheitasTab';
import { InsetosTab } from './InsetosTab';
import { ChuvasTab } from './ChuvasTab';
import { PlantasInvasorasTab } from './PlantasInvasorasTab';
import { FloracaoTab } from './FloracaoTab';
import { AnaliseTab } from './AnaliseTab';
import { PivosTab } from './PivosTab';
import { toast } from '@/hooks/use-toast';

interface ControleLavouraDetalheProps {
  controleLavoura: ControleLavoura;
  onBack: () => void;
  canEdit: boolean;
}

export function ControleLavouraDetalhe({ controleLavoura, onBack, canEdit }: ControleLavouraDetalheProps) {
  const [haPlantado, setHaPlantado] = useState<number>(controleLavoura.ha_plantado || 0);
  const [coberturaSolo, setCoberturaSolo] = useState<number>(controleLavoura.cobertura_solo || 0);
  const [hasChanges, setHasChanges] = useState(false);

  const updateMutation = useUpdateControleLavoura();
  const deleteMutation = useDeleteControleLavoura();

  const handleFieldChange = (field: 'ha_plantado' | 'cobertura_solo', value: number) => {
    if (field === 'ha_plantado') {
      setHaPlantado(value);
    } else {
      setCoberturaSolo(value);
    }
    setHasChanges(true);
  };

  const handleSave = async () => {
    try {
      await updateMutation.mutateAsync({
        id: controleLavoura.id,
        ha_plantado: haPlantado,
        cobertura_solo: coberturaSolo,
      });
      setHasChanges(false);
      toast({ title: 'Controle atualizado com sucesso!' });
    } catch (error) {
      // Error is handled in the hook
    }
  };

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(controleLavoura.id);
      onBack();
    } catch (error) {
      // Error is handled in the hook
    }
  };

  return (
    <div className="space-y-4">
      {/* Header com dados do mestre */}
      <Card className="border-primary/20 bg-card/50">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={onBack}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Wheat className="h-5 w-5 text-primary" />
                  {controleLavoura.safras?.nome} - {controleLavoura.lavouras?.nome}
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Gerencie os detalhes do controle de lavoura
                </p>
              </div>
            </div>
            {canEdit && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" className="gap-2">
                    <Trash2 className="h-4 w-4" />
                    Excluir Controle
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                    <AlertDialogDescription>
                      Tem certeza que deseja excluir este controle de lavoura?
                      <br /><br />
                      <span className="text-destructive font-medium">
                        Esta ação irá excluir todos os registros associados (plantios, colheitas, aplicações, etc.) e não pode ser desfeita.
                      </span>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Excluir
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 items-end">
            {/* Safra */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Safra</Label>
              <Input value={controleLavoura.safras?.nome || ''} readOnly className="bg-muted/50 h-9" />
            </div>

            {/* Lavoura */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Lavoura</Label>
              <Input value={controleLavoura.lavouras?.nome || ''} readOnly className="bg-muted/50 h-9" />
            </div>

            {/* Área Total */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Área Total (ha)</Label>
              <Input value={controleLavoura.area_total || 0} readOnly className="bg-muted/50 h-9" />
            </div>

            {/* Ha Plantado */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Ha Plantado</Label>
              <Input
                type="number"
                step="0.01"
                value={haPlantado || ''}
                onChange={(e) => handleFieldChange('ha_plantado', parseFloat(e.target.value) || 0)}
                disabled={!canEdit}
                className="h-9"
              />
            </div>

            {/* Cobertura Solo */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Cobertura Solo (%)</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  step="0.01"
                  value={coberturaSolo || ''}
                  onChange={(e) => handleFieldChange('cobertura_solo', parseFloat(e.target.value) || 0)}
                  disabled={!canEdit}
                  className="h-9"
                />
                {canEdit && hasChanges && (
                  <Button size="sm" onClick={handleSave} disabled={updateMutation.isPending} className="h-9">
                    <Save className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Abas de Detalhes */}
      <Tabs defaultValue="colheita" className="w-full">
        <ScrollArea className="w-full whitespace-nowrap">
          <TabsList className="inline-flex h-10 w-max">
            <TabsTrigger value="colheita" className="gap-1.5 text-xs">
              <Wheat className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Colheita</span>
            </TabsTrigger>
            <TabsTrigger value="plantios" className="gap-1.5 text-xs">
              <Sprout className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Plantios</span>
            </TabsTrigger>
            <TabsTrigger value="adubacao" className="gap-1.5 text-xs">
              <Droplets className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Adubos</span>
            </TabsTrigger>
            <TabsTrigger value="herbicidas" className="gap-1.5 text-xs">
              <Leaf className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Herbicidas</span>
            </TabsTrigger>
            <TabsTrigger value="fungicidas" className="gap-1.5 text-xs">
              <Bug className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Fungicidas</span>
            </TabsTrigger>
            <TabsTrigger value="inseticidas" className="gap-1.5 text-xs">
              <Skull className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Inseticidas</span>
            </TabsTrigger>
            <TabsTrigger value="adjuvantes" className="gap-1.5 text-xs">
              <Beaker className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Adjuvantes</span>
            </TabsTrigger>
            <TabsTrigger value="micronutrientes" className="gap-1.5 text-xs">
              <Pill className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Micronut.</span>
            </TabsTrigger>
            <TabsTrigger value="inoculantes" className="gap-1.5 text-xs">
              <FlaskConical className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Inoculantes</span>
            </TabsTrigger>
            <TabsTrigger value="calcarios" className="gap-1.5 text-xs">
              <Mountain className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Calcários</span>
            </TabsTrigger>
            <TabsTrigger value="insetos" className="gap-1.5 text-xs">
              <BugOff className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Insetos</span>
            </TabsTrigger>
            <TabsTrigger value="chuvas" className="gap-1.5 text-xs">
              <CloudRain className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Chuvas</span>
            </TabsTrigger>
            <TabsTrigger value="invasoras" className="gap-1.5 text-xs">
              <TreeDeciduous className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Pl.Invasoras</span>
            </TabsTrigger>
            <TabsTrigger value="floracao" className="gap-1.5 text-xs">
              <Flower2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Floração</span>
            </TabsTrigger>
            <TabsTrigger value="analise" className="gap-1.5 text-xs">
              <TestTube className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Análise</span>
            </TabsTrigger>
            <TabsTrigger value="pivos" className="gap-1.5 text-xs">
              <CircleDot className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Pivôs</span>
            </TabsTrigger>
          </TabsList>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        <div className="mt-4">
          <TabsContent value="colheita">
            <ColheitasTab controleLavouraId={controleLavoura.id} canEdit={canEdit} />
          </TabsContent>
          <TabsContent value="plantios">
            <PlantiosTab controleLavouraId={controleLavoura.id} canEdit={canEdit} />
          </TabsContent>
          <TabsContent value="adubacao">
            <AplicacoesTab tipo="adubacao" controleLavouraId={controleLavoura.id} canEdit={canEdit} />
          </TabsContent>
          <TabsContent value="herbicidas">
            <AplicacoesTab tipo="herbicida" controleLavouraId={controleLavoura.id} canEdit={canEdit} />
          </TabsContent>
          <TabsContent value="fungicidas">
            <AplicacoesTab tipo="fungicida" controleLavouraId={controleLavoura.id} canEdit={canEdit} />
          </TabsContent>
          <TabsContent value="inseticidas">
            <AplicacoesTab tipo="inseticida" controleLavouraId={controleLavoura.id} canEdit={canEdit} />
          </TabsContent>
          <TabsContent value="adjuvantes">
            <AplicacoesTab tipo="adjuvante" controleLavouraId={controleLavoura.id} canEdit={canEdit} />
          </TabsContent>
          <TabsContent value="micronutrientes">
            <AplicacoesTab tipo="micronutriente" controleLavouraId={controleLavoura.id} canEdit={canEdit} />
          </TabsContent>
          <TabsContent value="inoculantes">
            <AplicacoesTab tipo="inoculante" controleLavouraId={controleLavoura.id} canEdit={canEdit} />
          </TabsContent>
          <TabsContent value="calcarios">
            <AplicacoesTab tipo="calcario" controleLavouraId={controleLavoura.id} canEdit={canEdit} />
          </TabsContent>
          <TabsContent value="insetos">
            <InsetosTab controleLavouraId={controleLavoura.id} canEdit={canEdit} />
          </TabsContent>
          <TabsContent value="chuvas">
            <ChuvasTab controleLavouraId={controleLavoura.id} canEdit={canEdit} />
          </TabsContent>
          <TabsContent value="invasoras">
            <PlantasInvasorasTab controleLavouraId={controleLavoura.id} canEdit={canEdit} />
          </TabsContent>
          <TabsContent value="floracao">
            <FloracaoTab controleLavouraId={controleLavoura.id} canEdit={canEdit} />
          </TabsContent>
          <TabsContent value="analise">
            <AnaliseTab controleLavouraId={controleLavoura.id} canEdit={canEdit} />
          </TabsContent>
          <TabsContent value="pivos">
            <PivosTab controleLavouraId={controleLavoura.id} canEdit={canEdit} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
