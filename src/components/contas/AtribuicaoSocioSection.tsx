import { useEffect, useMemo, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useProdutores } from '@/hooks/useProdutores';
import { cn } from '@/lib/utils';

export type RateioModo = 'socio_unico' | 'rateio_granja' | 'manual';

export interface RateioManualItem {
  socio_produtor_id: string;
  percentual: number;
}

interface Props {
  granjaId?: string | null;
  valorTotal: number;
  modo: RateioModo;
  socioUnicoId?: string | null;
  rateioManual?: RateioManualItem[];
  onChange: (v: { modo: RateioModo; socio_produtor_id: string | null; manual: RateioManualItem[] }) => void;
}

export function AtribuicaoSocioSection({ granjaId, valorTotal, modo, socioUnicoId, rateioManual, onChange }: Props) {
  const { data: produtores } = useProdutores();

  const sociosDaGranja = useMemo(
    () => (produtores || []).filter((p: any) => p.granja_id === granjaId && p.ativo),
    [produtores, granjaId]
  );

  const [manual, setManual] = useState<RateioManualItem[]>(rateioManual || []);

  useEffect(() => {
    if (modo === 'manual' && manual.length === 0 && sociosDaGranja.length > 0) {
      const eq = +(100 / sociosDaGranja.length).toFixed(4);
      setManual(sociosDaGranja.map((s: any) => ({ socio_produtor_id: s.id, percentual: eq })));
    }
  }, [modo, sociosDaGranja.length]);

  const previewRateio = useMemo(() => {
    if (!granjaId || !valorTotal) return [];
    if (modo === 'socio_unico' && socioUnicoId) {
      const s: any = sociosDaGranja.find((x: any) => x.id === socioUnicoId);
      return s ? [{ nome: s.nome, percentual: 100, valor: valorTotal }] : [];
    }
    if (modo === 'rateio_granja') {
      const somaPct = sociosDaGranja.reduce((s: number, p: any) => s + Number(p.percentual_participacao || 0), 0);
      if (somaPct <= 0) {
        const n = sociosDaGranja.length;
        if (n === 0) return [];
        const pct = +(100 / n).toFixed(4);
        const valor = +(valorTotal / n).toFixed(2);
        return sociosDaGranja.map((p: any) => ({ nome: p.nome, percentual: pct, valor }));
      }
      return sociosDaGranja
        .filter((p: any) => Number(p.percentual_participacao || 0) > 0)
        .map((p: any) => {
          const pct = +((Number(p.percentual_participacao) * 100) / somaPct).toFixed(4);
          const valor = +((valorTotal * Number(p.percentual_participacao)) / somaPct).toFixed(2);
          return { nome: p.nome, percentual: pct, valor };
        });
    }
    return manual.map((i) => {
      const s: any = sociosDaGranja.find((x: any) => x.id === i.socio_produtor_id);
      return {
        nome: s?.nome || '?',
        percentual: i.percentual,
        valor: +((valorTotal * i.percentual) / 100).toFixed(2),
      };
    });
  }, [granjaId, valorTotal, modo, socioUnicoId, sociosDaGranja, manual]);

  const totalManualPct = manual.reduce((s, i) => s + Number(i.percentual || 0), 0);

  const updateManual = (idx: number, pct: number) => {
    const next = manual.map((m, i) => (i === idx ? { ...m, percentual: pct } : m));
    setManual(next);
    onChange({ modo, socio_produtor_id: null, manual: next });
  };

  return (
    <div className="space-y-3 rounded-md border border-border bg-muted/30 p-3">
      <Label className="text-sm font-semibold">Atribuição ao Sócio (IR)</Label>

      <RadioGroup
        value={modo}
        onValueChange={(v: RateioModo) => onChange({ modo: v, socio_produtor_id: socioUnicoId || null, manual })}
        className="flex flex-col gap-1.5"
      >
        <div className="flex items-center gap-2">
          <RadioGroupItem value="rateio_granja" id="r-rg" />
          <Label htmlFor="r-rg" className="font-normal cursor-pointer">Rateio por % de participação da granja</Label>
        </div>
        <div className="flex items-center gap-2">
          <RadioGroupItem value="socio_unico" id="r-su" />
          <Label htmlFor="r-su" className="font-normal cursor-pointer">Sócio único</Label>
        </div>
        <div className="flex items-center gap-2">
          <RadioGroupItem value="manual" id="r-m" />
          <Label htmlFor="r-m" className="font-normal cursor-pointer">Rateio manual</Label>
        </div>
      </RadioGroup>

      {modo === 'socio_unico' && (
        <div>
          <Label className="text-xs">Sócio</Label>
          <Select isSearchable
            value={socioUnicoId || undefined}
            onValueChange={(v) => onChange({ modo, socio_produtor_id: v, manual })}
          >
            <SelectTrigger><SelectValue placeholder="Selecione o sócio" /></SelectTrigger>
            <SelectContent>
              {sociosDaGranja.map((s: any) => (
                <SelectItem key={s.id} value={s.id}>{s.nome}{s.cpf_cnpj ? ` (${s.cpf_cnpj})` : ''}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {modo === 'manual' && (
        <div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sócio</TableHead>
                <TableHead className="w-32 text-right">% Participação</TableHead>
                <TableHead className="w-32 text-right">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {manual.map((it, i) => {
                const s: any = sociosDaGranja.find((x: any) => x.id === it.socio_produtor_id);
                return (
                  <TableRow key={it.socio_produtor_id}>
                    <TableCell>{s?.nome || '?'}</TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        step="0.0001"
                        value={it.percentual}
                        onChange={(e) => updateManual(i, parseFloat(e.target.value) || 0)}
                        className="text-right h-8"
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      {((valorTotal * it.percentual) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <div className={cn('text-xs mt-1 text-right', Math.abs(totalManualPct - 100) > 0.01 ? 'text-destructive font-semibold' : 'text-muted-foreground')}>
            Total: {totalManualPct.toFixed(4)}% {Math.abs(totalManualPct - 100) > 0.01 && '(deve ser 100%)'}
          </div>
        </div>
      )}

      {modo !== 'manual' && previewRateio.length > 0 && (
        <div className="text-xs">
          <div className="text-muted-foreground mb-1">Pré-visualização do rateio:</div>
          <div className="space-y-0.5">
            {previewRateio.map((p, i) => (
              <div key={i} className="flex justify-between">
                <span>{p.nome} ({p.percentual}%)</span>
                <span className="font-medium">{p.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {sociosDaGranja.length === 0 && granjaId && (
        <p className="text-xs text-destructive">Esta granja não tem sócios (produtores) ativos cadastrados.</p>
      )}
    </div>
  );
}
