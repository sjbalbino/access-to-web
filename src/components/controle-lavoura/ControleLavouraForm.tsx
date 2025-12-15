import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Save, Plus } from 'lucide-react';
import { useSafras } from '@/hooks/useSafras';
import { useLavouras } from '@/hooks/useLavouras';
import { useCreateControleLavoura, useUpdateControleLavoura, useControleLavouraBySafraLavoura, ControleLavoura } from '@/hooks/useControleLavouras';
import { toast } from '@/hooks/use-toast';

interface ControleLavouraFormProps {
  mode: 'create' | 'edit';
  controleLavoura?: ControleLavoura | null;
  onBack: () => void;
  onSaved: (id: string) => void;
}

export function ControleLavouraForm({ mode, controleLavoura, onBack, onSaved }: ControleLavouraFormProps) {
  const [safraId, setSafraId] = useState<string>(controleLavoura?.safra_id || '');
  const [lavouraId, setLavouraId] = useState<string>(controleLavoura?.lavoura_id || '');
  const [haPlantado, setHaPlantado] = useState<number>(controleLavoura?.ha_plantado || 0);
  const [coberturaSolo, setCoberturaSolo] = useState<string>(controleLavoura?.cobertura_solo || '');

  const { data: safras = [] } = useSafras();
  const { data: lavouras = [] } = useLavouras();
  const { data: existingControle } = useControleLavouraBySafraLavoura(
    mode === 'create' ? safraId : null,
    mode === 'create' ? lavouraId : null
  );

  const createMutation = useCreateControleLavoura();
  const updateMutation = useUpdateControleLavoura();

  const selectedLavoura = lavouras.find(l => l.id === lavouraId);
  const areaTotal = controleLavoura?.area_total || selectedLavoura?.total_hectares || 0;

  // Update form when controleLavoura changes (edit mode)
  useEffect(() => {
    if (controleLavoura && mode === 'edit') {
      setSafraId(controleLavoura.safra_id);
      setLavouraId(controleLavoura.lavoura_id);
      setHaPlantado(controleLavoura.ha_plantado || 0);
      setCoberturaSolo(controleLavoura.cobertura_solo || '');
    }
  }, [controleLavoura, mode]);

  const handleSubmit = async () => {
    if (!safraId || !lavouraId) {
      toast({ title: 'Erro', description: 'Selecione a safra e a lavoura', variant: 'destructive' });
      return;
    }

    // Check if already exists in create mode
    if (mode === 'create' && existingControle) {
      toast({ 
        title: 'Registro já existe', 
        description: 'Já existe um controle para esta safra e lavoura. Edite o existente.', 
        variant: 'destructive' 
      });
      return;
    }

    try {
      if (mode === 'create') {
        const result = await createMutation.mutateAsync({
          safra_id: safraId,
          lavoura_id: lavouraId,
          area_total: areaTotal,
          ha_plantado: haPlantado,
          cobertura_solo: coberturaSolo,
        });
        toast({ title: 'Controle criado com sucesso!' });
        onSaved(result.id);
      } else if (controleLavoura) {
        await updateMutation.mutateAsync({
          id: controleLavoura.id,
          ha_plantado: haPlantado,
          cobertura_solo: coberturaSolo,
        });
        toast({ title: 'Controle atualizado com sucesso!' });
        onSaved(controleLavoura.id);
      }
    } catch (error) {
      // Error is handled in the hook
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;
  const canSave = safraId && lavouraId && !isLoading;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <CardTitle>
            {mode === 'create' ? 'Novo Controle de Lavoura' : 'Editar Controle de Lavoura'}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Safra */}
          <div className="space-y-2">
            <Label>Safra *</Label>
            {mode === 'create' ? (
              <Select value={safraId} onValueChange={setSafraId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a safra" />
                </SelectTrigger>
                <SelectContent>
                  {safras.map((safra) => (
                    <SelectItem key={safra.id} value={safra.id}>
                      {safra.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input 
                value={controleLavoura?.safras?.nome || ''} 
                readOnly 
                className="bg-muted/50" 
              />
            )}
          </div>

          {/* Lavoura */}
          <div className="space-y-2">
            <Label>Lavoura *</Label>
            {mode === 'create' ? (
              <Select value={lavouraId} onValueChange={setLavouraId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a lavoura" />
                </SelectTrigger>
                <SelectContent>
                  {lavouras.map((lavoura) => (
                    <SelectItem key={lavoura.id} value={lavoura.id}>
                      {lavoura.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input 
                value={controleLavoura?.lavouras?.nome || ''} 
                readOnly 
                className="bg-muted/50" 
              />
            )}
          </div>

          {/* Área Total */}
          <div className="space-y-2">
            <Label>Área Total (ha)</Label>
            <Input
              type="number"
              value={areaTotal}
              readOnly
              className="bg-muted/50"
            />
          </div>

          {/* Ha Plantado */}
          <div className="space-y-2">
            <Label>Ha Plantado</Label>
            <Input
              type="number"
              step="0.01"
              value={haPlantado || ''}
              onChange={(e) => setHaPlantado(parseFloat(e.target.value) || 0)}
              placeholder="0.00"
            />
          </div>

          {/* Cobertura Solo */}
          <div className="space-y-2">
            <Label>Cobertura do Solo</Label>
            <Input
              type="text"
              value={coberturaSolo}
              onChange={(e) => setCoberturaSolo(e.target.value)}
              placeholder="Ex: Palhada, Nabo Forrageiro..."
            />
          </div>
        </div>

        {/* Warning for existing record */}
        {mode === 'create' && existingControle && (
          <div className="mt-4 p-3 bg-destructive/10 border border-destructive/30 rounded-md text-sm text-destructive">
            Já existe um controle para esta combinação de safra e lavoura.
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
          <Button variant="outline" onClick={onBack}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!canSave}>
            {isLoading ? (
              'Salvando...'
            ) : mode === 'create' ? (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Criar e Editar Detalhes
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Salvar
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
