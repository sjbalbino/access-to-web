import { useMemo, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ComboboxFilter } from '@/components/ui/combobox-filter';
import { FileText, Download } from 'lucide-react';
import { useGranjas } from '@/hooks/useGranjas';
import { useProdutores } from '@/hooks/useProdutores';
import { useRateiosPorPeriodo } from '@/hooks/useRateioSocios';
import {
  gerarDemonstrativoSocioPdf,
  gerarLivroCaixaPdf,
  type RateioMovimento,
} from '@/lib/relatoriosIR';

export default function RelatoriosIR() {
  const { data: granjas } = useGranjas();
  const { data: produtores } = useProdutores();
  const [granjaId, setGranjaId] = useState('');
  const [socioId, setSocioId] = useState('');
  const [dataIni, setDataIni] = useState('');
  const [dataFim, setDataFim] = useState('');

  const { data, isLoading } = useRateiosPorPeriodo({});

  const movs: RateioMovimento[] = useMemo(() => {
    if (!data) return [];
    const rateios = data.rateios || [];
    const out: RateioMovimento[] = [];

    const dentro = (d: string) =>
      (!dataIni || d >= dataIni) && (!dataFim || d <= dataFim);

    // Lançamentos diretos
    for (const l of data.lancamentos) {
      if (granjaId && l.granja_id !== granjaId) continue;
      if (!dentro(l.data_lancamento)) continue;
      const rs = rateios.filter((r: any) => r.origem_tipo === 'lancamento' && r.origem_id === l.id);
      for (const r of rs) {
        if (socioId && r.socio_produtor_id !== socioId) continue;
        out.push({
          origem_tipo: 'lancamento',
          origem_id: l.id,
          data: l.data_lancamento,
          descricao: l.descricao,
          documento: l.documento,
          conta_codigo: l.dre_contas?.codigo || null,
          conta_descricao: l.dre_contas?.descricao || null,
          tipo: l.tipo === 'receita' ? 'receita' : 'despesa',
          valor_total: Number(l.valor),
          socio_id: r.socio_produtor_id,
          socio_nome: r.produtor?.nome || '?',
          socio_cpf_cnpj: r.produtor?.cpf_cnpj || null,
          percentual: Number(r.percentual),
          valor_rateio: Number(r.valor),
        });
      }
    }

    // Baixas de CP (despesa - regime caixa)
    for (const b of data.cpBaixas) {
      const conta = b.conta;
      if (!conta) continue;
      if (granjaId && conta.granja_id !== granjaId) continue;
      if (!dentro(b.data_pagamento)) continue;
      const rs = rateios.filter((r: any) => r.origem_tipo === 'cp_baixa' && r.origem_id === b.id);
      for (const r of rs) {
        if (socioId && r.socio_produtor_id !== socioId) continue;
        out.push({
          origem_tipo: 'cp_baixa',
          origem_id: b.id,
          data: b.data_pagamento,
          descricao: `Pgto CP ${conta.documento || ''}`.trim(),
          documento: b.documento || conta.documento,
          conta_codigo: conta.dre_conta?.codigo || null,
          conta_descricao: conta.dre_conta?.descricao || null,
          tipo: 'despesa',
          valor_total: Number(b.valor_pago) + Number(b.juros) + Number(b.multa) - Number(b.desconto),
          socio_id: r.socio_produtor_id,
          socio_nome: r.produtor?.nome || '?',
          socio_cpf_cnpj: r.produtor?.cpf_cnpj || null,
          percentual: Number(r.percentual),
          valor_rateio: Number(r.valor),
        });
      }
    }

    // Baixas de CR (receita - regime caixa)
    for (const b of data.crBaixas) {
      const conta = b.conta;
      if (!conta) continue;
      if (granjaId && conta.granja_id !== granjaId) continue;
      if (!dentro(b.data_pagamento)) continue;
      const rs = rateios.filter((r: any) => r.origem_tipo === 'cr_baixa' && r.origem_id === b.id);
      for (const r of rs) {
        if (socioId && r.socio_produtor_id !== socioId) continue;
        out.push({
          origem_tipo: 'cr_baixa',
          origem_id: b.id,
          data: b.data_pagamento,
          descricao: `Receb CR ${conta.documento || ''}`.trim(),
          documento: b.documento || conta.documento,
          conta_codigo: conta.dre_conta?.codigo || null,
          conta_descricao: conta.dre_conta?.descricao || null,
          tipo: 'receita',
          valor_total: Number(b.valor_pago) + Number(b.juros) + Number(b.multa) - Number(b.desconto),
          socio_id: r.socio_produtor_id,
          socio_nome: r.produtor?.nome || '?',
          socio_cpf_cnpj: r.produtor?.cpf_cnpj || null,
          percentual: Number(r.percentual),
          valor_rateio: Number(r.valor),
        });
      }
    }

    return out;
  }, [data, granjaId, socioId, dataIni, dataFim]);

  const totalReceitas = movs.filter((m) => m.tipo === 'receita').reduce((s, m) => s + m.valor_rateio, 0);
  const totalDespesas = movs.filter((m) => m.tipo === 'despesa').reduce((s, m) => s + m.valor_rateio, 0);
  const granjaNome = granjas?.find((g: any) => g.id === granjaId)?.razao_social;

  const sociosOpts = useMemo(() => {
    const lista = (produtores || []).filter((p: any) => !granjaId || p.granja_id === granjaId);
    return lista.map((p: any) => ({ value: p.id, label: p.nome }));
  }, [produtores, granjaId]);

  return (
    <AppLayout>
      <div className="space-y-6">
        <PageHeader
          title="Relatórios para IR"
          description="Demonstrativo gerencial e Livro Caixa do Produtor Rural por sócio"
          icon={<FileText className="h-6 w-6" />}
        />

        <Card>
          <CardHeader><CardTitle className="text-base">Filtros</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <Label className="text-xs mb-1 block">Granja</Label>
                <ComboboxFilter
                  value={granjaId}
                  onValueChange={setGranjaId}
                  options={granjas?.map((g: any) => ({ value: g.id, label: g.razao_social })) || []}
                  searchPlaceholder="Buscar granja..."
                  emptyText="Nenhuma."
                />
              </div>
              <div>
                <Label className="text-xs mb-1 block">Sócio</Label>
                <ComboboxFilter
                  value={socioId}
                  onValueChange={setSocioId}
                  options={sociosOpts}
                  searchPlaceholder="Buscar sócio..."
                  emptyText="Nenhum."
                />
              </div>
              <div>
                <Label className="text-xs mb-1 block">Data inicial</Label>
                <Input type="date" value={dataIni} onChange={(e) => setDataIni(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs mb-1 block">Data final</Label>
                <Input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Receitas (rateadas)</p><p className="text-2xl font-bold text-success">{totalReceitas.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p></CardContent></Card>
          <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Despesas (rateadas)</p><p className="text-2xl font-bold text-destructive">{totalDespesas.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p></CardContent></Card>
          <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Resultado</p><p className="text-2xl font-bold">{(totalReceitas - totalDespesas).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p></CardContent></Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Relatórios disponíveis</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Button
              variant="outline"
              className="h-auto py-4 flex-col items-start gap-1"
              disabled={isLoading || movs.length === 0}
              onClick={() => gerarDemonstrativoSocioPdf(movs, { granjaNome, dataInicial: dataIni, dataFinal: dataFim })}
            >
              <div className="flex items-center gap-2 font-semibold"><Download className="h-4 w-4" />Demonstrativo Gerencial por Sócio</div>
              <div className="text-xs text-muted-foreground text-left">Receitas e despesas do período, agrupadas por sócio e conta DRE.</div>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-4 flex-col items-start gap-1"
              disabled={isLoading || movs.length === 0}
              onClick={() => gerarLivroCaixaPdf(movs.filter((m) => m.origem_tipo !== 'cp' && m.origem_tipo !== 'cr'), { granjaNome, dataInicial: dataIni, dataFinal: dataFim })}
            >
              <div className="flex items-center gap-2 font-semibold"><Download className="h-4 w-4" />Livro Caixa do Produtor Rural</div>
              <div className="text-xs text-muted-foreground text-left">Modelo Receita Federal: data | histórico | doc | entradas | saídas | saldo. Regime de caixa.</div>
            </Button>
          </CardContent>
        </Card>

        {movs.length === 0 && !isLoading && (
          <div className="text-center text-sm text-muted-foreground py-8">
            Nenhum movimento encontrado com os filtros atuais.
          </div>
        )}
      </div>
    </AppLayout>
  );
}
