import { useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Save } from 'lucide-react';
import { useSafras } from '@/hooks/useSafras';
import { useLavouras } from '@/hooks/useLavouras';
import { ControleLavoura, useControleLavouraBySafraLavoura, useCreateControleLavoura, useUpdateControleLavoura } from '@/hooks/useControleLavouras';
import { Spinner } from '@/components/ui/spinner';

interface CabecalhoControleProps {
  safraId: string | null;
  lavouraId: string | null;
  onSafraChange: (id: string | null) => void;
  onLavouraChange: (id: string | null) => void;
  controleLavoura: ControleLavoura | null;
  onControleLavouraChange: (controle: ControleLavoura | null) => void;
  canEdit: boolean;
}

export function CabecalhoControle({
  safraId,
  lavouraId,
  onSafraChange,
  onLavouraChange,
  controleLavoura,
  onControleLavouraChange,
  canEdit,
}: CabecalhoControleProps) {
  const { data: safras = [], isLoading: loadingSafras } = useSafras();
  const { data: lavouras = [], isLoading: loadingLavouras } = useLavouras();
  const { data: existingControle, isLoading: loadingControle } = useControleLavouraBySafraLavoura(safraId, lavouraId);
  
  const createMutation = useCreateControleLavoura();
  const updateMutation = useUpdateControleLavoura();

  // Quando mudar safra/lavoura, atualizar o controle atual
  useEffect(() => {
    if (existingControle) {
      onControleLavouraChange(existingControle);
    } else if (safraId && lavouraId && !loadingControle) {
      onControleLavouraChange(null);
    }
  }, [existingControle, safraId, lavouraId, loadingControle]);

  const handleCreateOrUpdate = async () => {
    if (!safraId || !lavouraId) return;

    const lavoura = lavouras.find(l => l.id === lavouraId);
    
    if (controleLavoura) {
      // Atualizar existente
      await updateMutation.mutateAsync({
        id: controleLavoura.id,
        ha_plantado: controleLavoura.ha_plantado,
        cobertura_solo: controleLavoura.cobertura_solo,
      });
    } else {
      // Criar novo
      const result = await createMutation.mutateAsync({
        safra_id: safraId,
        lavoura_id: lavouraId,
        codigo: lavoura?.codigo || null,
        area_total: lavoura?.total_hectares || 0,
        ha_plantado: 0,
        cobertura_solo: 0,
      });
      onControleLavouraChange(result as ControleLavoura);
    }
  };

  const handleFieldChange = (field: keyof ControleLavoura, value: number) => {
    if (controleLavoura) {
      onControleLavouraChange({ ...controleLavoura, [field]: value });
    }
  };

  // Navegação entre lavouras
  const currentLavouraIndex = lavouras.findIndex(l => l.id === lavouraId);
  const canGoPrevious = currentLavouraIndex > 0;
  const canGoNext = currentLavouraIndex < lavouras.length - 1;

  const handlePrevious = () => {
    if (canGoPrevious) {
      onLavouraChange(lavouras[currentLavouraIndex - 1].id);
    }
  };

  const handleNext = () => {
    if (canGoNext) {
      onLavouraChange(lavouras[currentLavouraIndex + 1].id);
    }
  };

  const selectedLavoura = lavouras.find(l => l.id === lavouraId);

  return (
    <Card className="border-primary/20 bg-card/50">
      <CardContent className="pt-4 pb-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 items-end">
          {/* Código */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Código</Label>
            <Input
              value={controleLavoura?.codigo || selectedLavoura?.codigo || ''}
              readOnly
              className="bg-muted/50 h-9"
            />
          </div>

          {/* Lavoura */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Lavoura</Label>
            <Select value={lavouraId || ''} onValueChange={(v) => onLavouraChange(v || null)}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {lavouras.map((lavoura) => (
                  <SelectItem key={lavoura.id} value={lavoura.id}>
                    {lavoura.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Área Total */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Área Total (ha)</Label>
            <Input
              type="number"
              value={controleLavoura?.area_total || selectedLavoura?.total_hectares || 0}
              readOnly
              className="bg-muted/50 h-9"
            />
          </div>

          {/* Safra */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Safra</Label>
            <Select value={safraId || ''} onValueChange={(v) => onSafraChange(v || null)}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {safras.map((safra) => (
                  <SelectItem key={safra.id} value={safra.id}>
                    {safra.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Ha. Plantado */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Ha. Plantado</Label>
            <Input
              type="number"
              step="0.01"
              value={controleLavoura?.ha_plantado || ''}
              onChange={(e) => handleFieldChange('ha_plantado', parseFloat(e.target.value) || 0)}
              disabled={!canEdit || !controleLavoura}
              className="h-9"
            />
          </div>

          {/* Cobertura do Solo */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Cobertura Solo</Label>
            <Input
              type="number"
              step="0.01"
              value={controleLavoura?.cobertura_solo || ''}
              onChange={(e) => handleFieldChange('cobertura_solo', parseFloat(e.target.value) || 0)}
              disabled={!canEdit || !controleLavoura}
              className="h-9"
            />
          </div>
        </div>

        {/* Botões de ação */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/50">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrevious}
              disabled={!canGoPrevious}
              className="gap-1"
            >
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNext}
              disabled={!canGoNext}
              className="gap-1"
            >
              Próximo
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            {loadingControle && <Spinner className="h-4 w-4" />}
            {safraId && lavouraId && canEdit && (
              <Button
                size="sm"
                onClick={handleCreateOrUpdate}
                disabled={createMutation.isPending || updateMutation.isPending}
                className="gap-1"
              >
                <Save className="h-4 w-4" />
                {controleLavoura ? 'Salvar' : 'Criar Registro'}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
