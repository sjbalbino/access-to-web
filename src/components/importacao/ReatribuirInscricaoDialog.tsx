import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ComboboxFilter, type ComboboxFilterOption } from '@/components/ui/combobox-filter';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertTriangle, Loader2, Save, Users } from 'lucide-react';
import { confirmarExclusao } from '@/components/ui/confirm-dialog-provider';
import { useInscricoesCompletas } from '@/hooks/useInscricoesCompletas';
import { formatDateSP } from '@/lib/datetime';

/** Módulos que suportam reatribuição de inscrição em lançamentos importados. */
export type ReatribuicaoModulo = 'transferencias' | 'devolucoes';

interface ReatribuirInscricaoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  modulo: ReatribuicaoModulo;
}

/** Um lançamento listado para reatribuição. */
interface RegistroReatribuivel {
  id: string;
  codigo: number | null;
  data: string | null;
  quantidade_kg: number | null;
  produto: string;
  safra: string;
  local: string;
  /** Coluna de FK que será atualizada neste registro. */
  campo: string;
  /** Rótulo do papel da inscrição neste lançamento (Origem / Destino / Produtor). */
  papel: string;
  /** Registros com NF-e autorizada são imutáveis (política fiscal). */
  bloqueado: boolean;
}

const PAGE_SIZE = 20;

const nomeInscricao = (i: {
  produtores?: { nome: string } | null;
  nome?: string | null;
  nome_fantasia?: string | null;
  inscricao_estadual?: string | null;
}) => (i.produtores?.nome || i.nome || i.nome_fantasia || i.inscricao_estadual || 'SEM NOME').toUpperCase();

const kg = (v: number | null | undefined) =>
  new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(Math.round(v ?? 0));

export function ReatribuirInscricaoDialog({ open, onOpenChange, modulo }: ReatribuirInscricaoDialogProps) {
  const queryClient = useQueryClient();
  const { data: inscricoes = [], isLoading: loadingInscricoes } = useInscricoesCompletas();

  const [inscricaoAtualId, setInscricaoAtualId] = useState<string>('');
  const [destinos, setDestinos] = useState<Record<string, string>>({});
  const [marcados, setMarcados] = useState<Record<string, boolean>>({});
  const [destinoLote, setDestinoLote] = useState<string>('');
  const [pagina, setPagina] = useState(0);
  const [salvando, setSalvando] = useState(false);

  const opcoesInscricoes: ComboboxFilterOption[] = useMemo(
    () =>
      inscricoes.map((i) => ({
        value: i.id,
        label: `${nomeInscricao(i)}${i.inscricao_estadual ? ` — IE ${i.inscricao_estadual}` : ''}`,
        sublabel: i.cpf_cnpj || undefined,
      })),
    [inscricoes],
  );

  const { data: registros = [], isLoading: loadingRegistros } = useQuery({
    queryKey: ['reatribuicao', modulo, inscricaoAtualId],
    enabled: open && !!inscricaoAtualId,
    queryFn: async (): Promise<RegistroReatribuivel[]> => {
      if (modulo === 'transferencias') {
        const { data, error } = await supabase
          .from('transferencias_deposito')
          .select(`
            id, codigo, data_transferencia, quantidade_kg,
            inscricao_origem_id, inscricao_destino_id,
            produto:produtos(nome), safra:safras(nome),
            local_saida:locais_entrega!transferencias_deposito_local_saida_id_fkey(nome),
            local_entrada:locais_entrega!transferencias_deposito_local_entrada_id_fkey(nome)
          `)
          .or(`inscricao_origem_id.eq.${inscricaoAtualId},inscricao_destino_id.eq.${inscricaoAtualId}`)
          .order('data_transferencia', { ascending: false });

        if (error) throw error;

        return (data || []).flatMap((r: any) => {
          const base = {
            codigo: r.codigo ?? null,
            data: r.data_transferencia ?? null,
            quantidade_kg: r.quantidade_kg ?? null,
            produto: r.produto?.nome || '—',
            safra: r.safra?.nome || '—',
            bloqueado: false,
          };
          const itens: RegistroReatribuivel[] = [];
          if (r.inscricao_origem_id === inscricaoAtualId) {
            itens.push({
              ...base,
              id: `${r.id}:inscricao_origem_id`,
              campo: 'inscricao_origem_id',
              papel: 'Origem',
              local: r.local_saida?.nome || '—',
            });
          }
          if (r.inscricao_destino_id === inscricaoAtualId) {
            itens.push({
              ...base,
              id: `${r.id}:inscricao_destino_id`,
              campo: 'inscricao_destino_id',
              papel: 'Destino',
              local: r.local_entrada?.nome || '—',
            });
          }
          return itens;
        });
      }

      const { data, error } = await supabase
        .from('devolucoes_deposito')
        .select(`
          id, codigo, data_devolucao, quantidade_kg, status,
          produto:produtos(nome), safra:safras(nome),
          local_entrega:locais_entrega!devolucoes_deposito_local_entrega_id_fkey(nome),
          nota_fiscal:notas_fiscais(status)
        `)
        .eq('inscricao_produtor_id', inscricaoAtualId)
        .order('data_devolucao', { ascending: false });

      if (error) throw error;

      return (data || []).map((r: any) => ({
        id: `${r.id}:inscricao_produtor_id`,
        codigo: r.codigo ?? null,
        data: r.data_devolucao ?? null,
        quantidade_kg: r.quantidade_kg ?? null,
        produto: r.produto?.nome || '—',
        safra: r.safra?.nome || '—',
        local: r.local_entrega?.nome || '—',
        campo: 'inscricao_produtor_id',
        papel: 'Produtor',
        bloqueado: r.nota_fiscal?.status === 'autorizada',
      }));
    },
  });

  const totalPaginas = Math.max(1, Math.ceil(registros.length / PAGE_SIZE));
  const paginaAtual = Math.min(pagina, totalPaginas - 1);
  const visiveis = registros.slice(paginaAtual * PAGE_SIZE, paginaAtual * PAGE_SIZE + PAGE_SIZE);

  const alteracoes = Object.entries(destinos).filter(([, destinoId]) => !!destinoId);

  const resetar = () => {
    setInscricaoAtualId('');
    setDestinos({});
    setMarcados({});
    setDestinoLote('');
    setPagina(0);
  };

  const aplicarEmLote = () => {
    if (!destinoLote) {
      toast.error('Selecione a inscrição correta antes de aplicar em lote.');
      return;
    }
    const alvos = visiveis.filter((r) => marcados[r.id] && !r.bloqueado);
    if (alvos.length === 0) {
      toast.error('Marque ao menos um lançamento desta página.');
      return;
    }
    setDestinos((prev) => {
      const next = { ...prev };
      alvos.forEach((r) => {
        next[r.id] = destinoLote;
      });
      return next;
    });
    toast.success(`${alvos.length} lançamento(s) preparados para reatribuição.`);
  };

  const salvar = async () => {
    if (alteracoes.length === 0) {
      toast.error('Nenhuma reatribuição informada.');
      return;
    }

    const ok = await confirmarExclusao({
      title: 'Confirmar reatribuição',
      description: `${alteracoes.length} lançamento(s) passarão a pertencer à inscrição selecionada. Os saldos e extratos dos produtores envolvidos serão recalculados.`,
      confirmText: 'Reatribuir',
    });
    if (!ok) return;

    setSalvando(true);
    const tabela = modulo === 'transferencias' ? 'transferencias_deposito' : 'devolucoes_deposito';
    const falhas: string[] = [];
    let sucesso = 0;

    for (const [chave, destinoId] of alteracoes) {
      const [registroId, campo] = chave.split(':');
      const { error } = await supabase
        .from(tabela as any)
        .update({ [campo]: destinoId } as any)
        .eq('id', registroId);

      if (error) {
        falhas.push(`${registroId.slice(0, 8)}: ${error.message}`);
      } else {
        sucesso++;
      }
    }

    ['transferencias_deposito', 'devolucoes_deposito', 'saldos_deposito', 'saldo_produtor',
      'saldo_disponivel_produtor', 'inscricoes_com_saldo', 'saldo_socio', 'reatribuicao'].forEach((key) =>
      queryClient.invalidateQueries({ queryKey: [key] }),
    );

    setSalvando(false);
    setDestinos({});
    setMarcados({});

    if (falhas.length === 0) {
      toast.success(`${sucesso} lançamento(s) reatribuídos com sucesso.`);
    } else {
      toast.warning(`${sucesso} reatribuídos, ${falhas.length} com erro: ${falhas.slice(0, 3).join(' | ')}`);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) resetar();
      }}
    >
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Reatribuir Inscrição — {modulo === 'transferencias' ? 'Transferências' : 'Devoluções'}
          </DialogTitle>
          <DialogDescription>
            Corrija lançamentos que foram vinculados ao produtor errado (ex. inscrições que compartilham a mesma
            Inscrição Estadual genérica).
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          <div className="space-y-2">
            <Label>Inscrição atual (com lançamentos incorretos)</Label>
            <ComboboxFilter
              value={inscricaoAtualId}
              onValueChange={(v) => {
                setInscricaoAtualId(v);
                setDestinos({});
                setMarcados({});
                setPagina(0);
              }}
              options={opcoesInscricoes}
              placeholder={loadingInscricoes ? 'Carregando inscrições...' : 'Selecione a inscrição'}
              searchPlaceholder="Buscar por nome, IE ou CPF/CNPJ..."
              allLabel="Selecione a inscrição"
              popoverWidth="w-[520px]"
            />
          </div>

          {inscricaoAtualId && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {loadingRegistros ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Carregando lançamentos...
                </>
              ) : (
                <>
                  <Badge variant="outline">{registros.length} lançamento(s)</Badge>
                  {alteracoes.length > 0 && (
                    <Badge className="bg-primary text-primary-foreground">{alteracoes.length} a reatribuir</Badge>
                  )}
                </>
              )}
            </div>
          )}

          {registros.length > 0 && (
            <div className="space-y-3">
              <div className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-end">
                <div className="flex-1 space-y-1">
                  <Label className="text-xs">Aplicar aos marcados desta página</Label>
                  <ComboboxFilter
                    value={destinoLote}
                    onValueChange={setDestinoLote}
                    options={opcoesInscricoes}
                    placeholder="Inscrição correta"
                    searchPlaceholder="Buscar por nome, IE ou CPF/CNPJ..."
                    allLabel="Inscrição correta"
                    popoverWidth="w-[520px]"
                  />
                </div>
                <Button variant="secondary" onClick={aplicarEmLote}>
                  Aplicar em lote
                </Button>
              </div>

              <ScrollArea className="h-[360px] rounded-lg border">
                <div className="divide-y">
                  {visiveis.map((r) => (
                    <div key={r.id} className="flex flex-col gap-2 p-3 lg:flex-row lg:items-center">
                      <div className="flex items-start gap-3 lg:w-1/2">
                        <Checkbox
                          checked={!!marcados[r.id]}
                          disabled={r.bloqueado}
                          onCheckedChange={(c) => setMarcados((prev) => ({ ...prev, [r.id]: !!c }))}
                          className="mt-1"
                        />
                        <div className="min-w-0 text-sm">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium">#{r.codigo ?? '—'}</span>
                            <Badge variant="secondary">{r.papel}</Badge>
                            <span className="text-muted-foreground">
                              {r.data ? formatDateSP(r.data) : '—'}
                            </span>
                            <span className="font-mono">{kg(r.quantidade_kg)} kg</span>
                            {r.bloqueado && (
                              <Badge variant="outline" className="text-amber-600 border-amber-600">
                                <AlertTriangle className="mr-1 h-3 w-3" />
                                NF-e autorizada
                              </Badge>
                            )}
                          </div>
                          <div className="truncate text-xs text-muted-foreground">
                            {r.produto} · {r.safra} · {r.local}
                          </div>
                        </div>
                      </div>
                      <div className="lg:w-1/2">
                        <ComboboxFilter
                          value={destinos[r.id] || ''}
                          onValueChange={(v) => setDestinos((prev) => ({ ...prev, [r.id]: v }))}
                          options={opcoesInscricoes}
                          placeholder="Manter atual"
                          searchPlaceholder="Buscar por nome, IE ou CPF/CNPJ..."
                          allLabel="Manter atual"
                          popoverWidth="w-[460px]"
                          disabled={r.bloqueado}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              {totalPaginas > 1 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Página {paginaAtual + 1} de {totalPaginas}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={paginaAtual === 0}
                      onClick={() => setPagina(paginaAtual - 1)}
                    >
                      Anterior
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={paginaAtual >= totalPaginas - 1}
                      onClick={() => setPagina(paginaAtual + 1)}
                    >
                      Próxima
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {inscricaoAtualId && !loadingRegistros && registros.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Nenhum lançamento vinculado a esta inscrição.
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          <Button onClick={salvar} disabled={alteracoes.length === 0 || salvando}>
            {salvando ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Salvar reatribuições ({alteracoes.length})
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
