import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { DollarSign, Ruler, Package, Wheat } from 'lucide-react';
import { useCustosLavoura } from '@/hooks/useCustosLavoura';

interface CustosTabProps {
  controleLavouraId: string;
}

const moeda = (v: number | null | undefined) =>
  v === null || v === undefined
    ? '-'
    : v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 });

const inteiro = (v: number) => Math.round(v).toLocaleString('pt-BR', { maximumFractionDigits: 0 });

const percentual = (v: number) =>
  `${v.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;

export function CustosTab({ controleLavouraId }: CustosTabProps) {
  const { data, isLoading } = useCustosLavoura(controleLavouraId);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!data || data.linhas.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">
          Nenhum custo lançado nesta lavoura. Cadastre plantios e aplicações de produtos para ver os custos aqui.
        </CardContent>
      </Card>
    );
  }

  const indicadores = [
    { label: 'Custo Total', valor: moeda(data.custoTotal), detalhe: `${data.linhas.length} categoria(s)`, Icon: DollarSign, cor: 'text-primary bg-primary/10' },
    { label: 'Custo por Hectare', valor: data.custoHa === null ? '-' : moeda(data.custoHa), detalhe: data.areaHa ? `${data.areaHa.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} ha` : 'Área não informada', Icon: Ruler, cor: 'text-info bg-info/10' },
    { label: 'Custo por Saca', valor: data.custoSaca === null ? '-' : moeda(data.custoSaca), detalhe: data.sacas > 0 ? `${inteiro(data.sacas)} sc` : 'Sem colheita', Icon: Package, cor: 'text-warning bg-warning/10' },
    { label: 'Produção Colhida', valor: `${inteiro(data.producaoKg)} kg`, detalhe: `${inteiro(data.sacas)} sacas de 60 kg`, Icon: Wheat, cor: 'text-success bg-success/10' },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {indicadores.map(({ label, valor, detalhe, Icon, cor }) => (
          <Card key={label}>
            <CardContent className="p-4 flex items-start gap-3">
              <div className={`p-2 rounded-lg ${cor}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-lg font-semibold truncate">{valor}</p>
                <p className="text-xs text-muted-foreground truncate">{detalhe}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Composição do Custo</CardTitle>
        </CardHeader>
        <CardContent className="p-0 sm:p-2">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Lanç.</TableHead>
                  <TableHead className="text-right">Total (R$)</TableHead>
                  <TableHead className="text-right">R$/ha</TableHead>
                  <TableHead className="text-right w-[140px]">% do Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.linhas.map((linha) => (
                  <TableRow key={linha.chave}>
                    <TableCell className="font-medium">{linha.label}</TableCell>
                    <TableCell className="text-right">{linha.lancamentos}</TableCell>
                    <TableCell className="text-right">{moeda(linha.total)}</TableCell>
                    <TableCell className="text-right">{linha.custoHa === null ? '-' : moeda(linha.custoHa)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="h-2 w-16 rounded-full bg-muted overflow-hidden">
                          <div className="h-full bg-primary" style={{ width: `${Math.min(100, linha.percentual)}%` }} />
                        </div>
                        <span className="tabular-nums">{percentual(linha.percentual)}</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell className="font-semibold">Total</TableCell>
                  <TableCell className="text-right font-semibold">
                    {data.linhas.reduce((s, l) => s + l.lancamentos, 0)}
                  </TableCell>
                  <TableCell className="text-right font-semibold">{moeda(data.custoTotal)}</TableCell>
                  <TableCell className="text-right font-semibold">
                    {data.custoHa === null ? '-' : moeda(data.custoHa)}
                  </TableCell>
                  <TableCell className="text-right font-semibold">100,0%</TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
