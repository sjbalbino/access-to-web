import { EstoqueSilo } from '@/hooks/useEstoqueSilos';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Warehouse, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SiloEstoqueVisualProps {
  silos: EstoqueSilo[];
}

function getCorOcupacao(percentual: number) {
  if (percentual >= 85) return { bar: 'bg-destructive', text: 'text-destructive' };
  if (percentual >= 60) return { bar: 'bg-amber-500', text: 'text-amber-600' };
  return { bar: 'bg-emerald-500', text: 'text-emerald-600' };
}

function getTipoBadge(tipo: string | null) {
  switch (tipo) {
    case 'armazenamento':
      return <Badge className="bg-emerald-500 text-white">Armazenamento</Badge>;
    case 'secagem':
      return <Badge className="bg-amber-500 text-white">Secagem</Badge>;
    case 'transbordo':
      return <Badge className="bg-sky-500 text-white">Transbordo</Badge>;
    default:
      return tipo ? <Badge>{tipo}</Badge> : null;
  }
}

function formatKg(value: number) {
  return value.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
}

function formatSacas(kg: number) {
  return (kg / 60).toLocaleString('pt-BR', { maximumFractionDigits: 0 });
}

export function SiloEstoqueVisual({ silos }: SiloEstoqueVisualProps) {
  if (!silos || silos.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        Nenhum silo ativo encontrado
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {silos.map((silo) => {
        const cor = getCorOcupacao(silo.percentual);
        return (
          <Card key={silo.id} className="card-hover">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Warehouse className="h-4 w-4 text-primary" />
                  {silo.nome}
                </CardTitle>
                {getTipoBadge(silo.tipo)}
              </div>
              {silo.codigo && (
                <span className="text-xs text-muted-foreground font-mono">
                  Cód: {silo.codigo}
                </span>
              )}
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground">Ocupação</span>
                  <span className={cn('text-sm font-bold', cor.text)}>
                    {silo.percentual.toFixed(1)}%
                  </span>
                </div>
                <div className="relative h-3 w-full overflow-hidden rounded-full bg-secondary">
                  <div
                    className={cn('h-full rounded-full transition-all', cor.bar)}
                    style={{ width: `${Math.min(silo.percentual, 100)}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-muted-foreground">Estoque</span>
                  <p className="font-semibold">{formatKg(silo.estoque_kg)} kg</p>
                  <p className="text-muted-foreground">{formatSacas(silo.estoque_kg)} sacas</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Capacidade</span>
                  <p className="font-semibold">{silo.capacidade_kg ? formatKg(silo.capacidade_kg) + ' kg' : '-'}</p>
                  <p className="text-muted-foreground">
                    {silo.capacidade_kg ? formatSacas(silo.capacidade_kg) + ' sacas' : '-'}
                  </p>
                </div>
              </div>

              {silo.granja_nome && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground pt-1 border-t">
                  <MapPin className="h-3 w-3" />
                  {silo.granja_nome}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
