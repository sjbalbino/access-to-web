import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ComboboxFilter } from '@/components/ui/combobox-filter';
import { Loader2 } from 'lucide-react';
import { formatNumber } from '@/lib/formatters';
import { usePaginacao } from '@/hooks/usePaginacao';
import { TablePagination } from '@/components/ui/table-pagination';

/** Tipos de produto cobertos pelo extrato (insumos do estoque + pecuária). */
const TIPOS_PRODUTO = ['insumo', 'semente', 'pecuaria'] as const;

type TipoOperacao = 'compra' | 'entrada' | 'devolucao_venda' | 'venda' | 'devolucao_compra' | 'transferencia' | 'aplicacao';

const ROTULO: Record<TipoOperacao, string> = {
  compra: 'Compra',
  entrada: 'Entrada NF-e',
  devolucao_venda: 'Devolução de venda',
  venda: 'Venda / Saída',
  devolucao_compra: 'Devolução de compra',
  transferencia: 'Transferência',
  aplicacao: 'Aplicação na lavoura',
};

interface Movimento {
  id: string;
  produtoId: string;
  data: string; // yyyy-MM-dd
  tipo: TipoOperacao;
  documento: string;
  participante: string;
  safraId: string | null;
  quantidade: number; // positivo = entrada, negativo = saída
  valor: number;
}

interface LinhaExtrato extends Movimento { saldo: number; }

const CFOP_TRANSF = /^[56]15[0-9]$|^[12]15[0-9]$/;
const CFOP_DEV_VENDA = /^[12]20[1-2]$|^[12]41[01]$/;

/** Busca paginada (contorna o limite de 1000 linhas por consulta). */
async function buscarTudo<T>(montar: (de: number, ate: number) => PromiseLike<{ data: T[] | null; error: unknown }>): Promise<T[]> {
  const out: T[] = [];
  for (let de = 0; ; de += 1000) {
    const { data, error } = await montar(de, de + 999);
    if (error) throw error;
    out.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  return out;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
async function carregarMovimentos(): Promise<Movimento[]> {
  const [entradas, notas, aplics] = await Promise.all([
    buscarTudo<any>((a, b) => supabase.from('entradas_nfe_itens')
      .select('id, produto_id, cfop, quantidade, valor_total, entradas_nfe!inner(numero_nfe, data_entrada, data_emissao, status, safra_id, clientes_fornecedores:fornecedor_id(nome))')
      .not('produto_id', 'is', null).eq('entradas_nfe.status', 'finalizado').range(a, b)),
    buscarTudo<any>((a, b) => supabase.from('notas_fiscais_itens')
      .select('id, produto_id, cfop, quantidade, valor_total, notas_fiscais!inner(numero, serie, data_emissao, status, operacao, finalidade, dest_nome)')
      .not('produto_id', 'is', null).in('notas_fiscais.status', ['autorizada', 'autorizado']).range(a, b)),
    buscarTudo<any>((a, b) => supabase.from('aplicacoes')
      .select('id, produto_id, data_aplicacao, quantidade_total, valor_total, safra_id, lavouras:lavoura_id(nome)')
      .not('produto_id', 'is', null).range(a, b)),
  ]);

  const movs: Movimento[] = [];
  for (const i of entradas) {
    const e = i.entradas_nfe;
    const cfop = String(i.cfop ?? '');
    movs.push({
      id: 'e' + i.id, produtoId: i.produto_id, data: e.data_entrada ?? e.data_emissao,
      tipo: CFOP_DEV_VENDA.test(cfop) ? 'devolucao_venda' : CFOP_TRANSF.test(cfop) ? 'transferencia' : 'compra',
      documento: `NF-e ${e.numero_nfe ?? ''}`, participante: e.clientes_fornecedores?.nome ?? '',
      safraId: e.safra_id, quantidade: Number(i.quantidade) || 0, valor: Number(i.valor_total) || 0,
    });
  }
  for (const i of notas) {
    const n = i.notas_fiscais;
    const cfop = String(i.cfop ?? '');
    const saida = String(n.operacao) === '1';
    // Entradas próprias (contra-notas) já constam em Entradas NF-e; só contamos devoluções de venda.
    if (!saida && String(n.finalidade) !== '4') continue;
    let tipo: TipoOperacao;
    if (!saida) tipo = 'devolucao_venda';
    else if (String(n.finalidade) === '4') tipo = 'devolucao_compra';
    else if (CFOP_TRANSF.test(cfop)) tipo = 'transferencia';
    else tipo = 'venda';
    const q = Number(i.quantidade) || 0;
    movs.push({
      id: 'n' + i.id, produtoId: i.produto_id, data: n.data_emissao?.slice(0, 10),
      tipo, documento: `NF-e ${n.numero ?? ''}/${n.serie ?? ''}`, participante: n.dest_nome ?? '',
      safraId: null, quantidade: saida ? -q : q, valor: Number(i.valor_total) || 0,
    });
  }
  for (const a of aplics) {
    movs.push({
      id: 'a' + a.id, produtoId: a.produto_id, data: a.data_aplicacao, tipo: 'aplicacao',
      documento: 'Aplicação', participante: a.lavouras?.nome ? `Lavoura ${a.lavouras.nome}` : '',
      safraId: a.safra_id, quantidade: -(Number(a.quantidade_total) || 0), valor: Number(a.valor_total) || 0,
    });
  }
  return movs.filter((m) => m.data);
}
/* eslint-enable @typescript-eslint/no-explicit-any */

const fmtData = (d: string) => { const [y, m, dd] = d.slice(0, 10).split('-'); return `${dd}/${m}/${y}`; };
const fmtMoeda = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export interface ExtratoProdutosDialogProps { open: boolean; onOpenChange: (open: boolean) => void; produtoInicialId?: string; }

export function ExtratoProdutosDialog({ open, onOpenChange, produtoInicialId }: ExtratoProdutosDialogProps) {
  const [dataIni, setDataIni] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [safraId, setSafraId] = useState('todas');
  const [produtoId, setProdutoId] = useState(produtoInicialId ?? 'todos');
  const [tipoOp, setTipoOp] = useState<'todos' | TipoOperacao>('todos');

  const { data: produtos = [] } = useQuery({
    queryKey: ['extrato_produtos_lista'], enabled: open, staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.from('produtos').select('id, nome, codigo, tipo').in('tipo', [...TIPOS_PRODUTO]).order('nome');
      if (error) throw error;
      return data ?? [];
    },
  });
  const { data: safras = [] } = useQuery({
    queryKey: ['extrato_produtos_safras'], enabled: open, staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.from('safras').select('id, nome').order('nome');
      if (error) throw error;
      return data ?? [];
    },
  });
  const { data: movs = [], isLoading, error } = useQuery({
    queryKey: ['extrato_produtos_movs'], enabled: open, staleTime: 60_000, queryFn: carregarMovimentos,
  });

  const nomeProduto = useMemo(() => new Map(produtos.map((p) => [p.id, p.nome])), [produtos]);

  // Saldo acumulado por produto: considera todo o histórico até a data final;
  // movimentos antes do período compõem o "saldo anterior".
  const { linhas, saldoAnterior } = useMemo(() => {
    const validos = movs
      .filter((m) => nomeProduto.has(m.produtoId))
      .filter((m) => produtoId === 'todos' || m.produtoId === produtoId)
      .filter((m) => !dataFim || m.data <= dataFim)
      .sort((a, b) => (nomeProduto.get(a.produtoId)! + a.data).localeCompare(nomeProduto.get(b.produtoId)! + b.data, 'pt-BR'));
    const saldos = new Map<string, number>();
    const anterior = new Map<string, number>();
    const out: LinhaExtrato[] = [];
    for (const m of validos) {
      const s = (saldos.get(m.produtoId) ?? 0) + m.quantidade;
      saldos.set(m.produtoId, s);
      if (dataIni && m.data < dataIni) { anterior.set(m.produtoId, s); continue; }
      if (tipoOp !== 'todos' && m.tipo !== tipoOp) continue;
      if (safraId !== 'todas' && m.safraId !== safraId) continue;
      out.push({ ...m, saldo: s });
    }
    return { linhas: out, saldoAnterior: anterior };
  }, [movs, nomeProduto, produtoId, dataIni, dataFim, tipoOp, safraId]);

  const totalEntradas = linhas.reduce((s, l) => s + Math.max(l.quantidade, 0), 0);
  const totalSaidas = linhas.reduce((s, l) => s + Math.max(-l.quantidade, 0), 0);
  const pag = usePaginacao(linhas, 20);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Extrato de Produtos</DialogTitle>
          <DialogDescription>Compras, vendas, devoluções, transferências e aplicações de insumos, sementes e pecuária, com saldo acumulado.</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div><Label>Data inicial</Label><Input type="date" value={dataIni} onChange={(e) => setDataIni(e.target.value)} /></div>
          <div><Label>Data final</Label><Input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} /></div>
          <div><Label>Safra</Label>
            <Select value={safraId} onValueChange={setSafraId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="todas">Todas</SelectItem>{safras.map((s) => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Produto</Label>
            <ComboboxFilter value={produtoId === 'todos' ? '' : produtoId} onValueChange={(v) => setProdutoId(v || 'todos')}
              options={produtos.map((p) => ({ value: p.id, label: p.nome, sublabel: p.codigo != null ? String(p.codigo) : undefined }))}
              searchPlaceholder="Digite o nome do produto..." popoverWidth="w-[360px]" />
          </div>
          <div><Label>Tipo de operação</Label>
            <Select value={tipoOp} onValueChange={(v) => setTipoOp(v as typeof tipoOp)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="todos">Todos</SelectItem>{(Object.keys(ROTULO) as TipoOperacao[]).map((k) => <SelectItem key={k} value={k}>{ROTULO[k]}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        {safraId !== 'todas' && <p className="text-xs text-muted-foreground">Notas fiscais emitidas não têm safra; com o filtro de safra aparecem só compras (Entradas NF-e) e aplicações.</p>}

        {isLoading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : error ? (
          <p className="py-6 text-center text-destructive">Não foi possível carregar o extrato. Tente novamente.</p>
        ) : (
          <>
            {produtoId !== 'todos' && dataIni && (
              <p className="text-sm">Saldo anterior a {fmtData(dataIni)}: <strong>{formatNumber(saldoAnterior.get(produtoId) ?? 0, 2)}</strong></p>
            )}
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader><TableRow>
                  <TableHead className="text-center">Data</TableHead><TableHead>Produto</TableHead><TableHead>Operação</TableHead>
                  <TableHead>Documento</TableHead><TableHead>Fornecedor / Destino</TableHead>
                  <TableHead className="text-right">Entrada</TableHead><TableHead className="text-right">Saída</TableHead>
                  <TableHead className="text-right">Saldo</TableHead><TableHead className="text-right">Valor</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {pag.dadosPaginados.length === 0 ? (
                    <TableRow><TableCell colSpan={9} className="py-8 text-center text-muted-foreground">Nenhuma movimentação encontrada.</TableCell></TableRow>
                  ) : pag.dadosPaginados.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell className="text-center whitespace-nowrap">{fmtData(l.data)}</TableCell>
                      <TableCell>{nomeProduto.get(l.produtoId)}</TableCell>
                      <TableCell><Badge variant={l.quantidade >= 0 ? 'secondary' : 'outline'}>{ROTULO[l.tipo]}</Badge></TableCell>
                      <TableCell className="whitespace-nowrap">{l.documento}</TableCell>
                      <TableCell>{l.participante}</TableCell>
                      <TableCell className="text-right">{l.quantidade > 0 ? formatNumber(l.quantidade, 2) : ''}</TableCell>
                      <TableCell className="text-right">{l.quantidade < 0 ? formatNumber(-l.quantidade, 2) : ''}</TableCell>
                      <TableCell className={l.saldo < 0 ? 'text-right font-semibold text-destructive' : 'text-right font-semibold'}>{formatNumber(l.saldo, 2)}</TableCell>
                      <TableCell className="text-right whitespace-nowrap">{fmtMoeda(l.valor)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <TablePagination {...pag} />
            <div className="flex flex-wrap justify-end gap-6 text-sm">
              <span>Total entradas: <strong>{formatNumber(totalEntradas, 2)}</strong></span>
              <span>Total saídas: <strong>{formatNumber(totalSaidas, 2)}</strong></span>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
