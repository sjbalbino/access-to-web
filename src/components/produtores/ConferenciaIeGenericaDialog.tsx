import { useMemo, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, FileSearch, Undo2, CheckCircle2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useInscricoesCompletas } from "@/hooks/useInscricoesCompletas";
import { interpretarExtratoLegado, type ExtratoLegado } from "@/lib/extratoLegado";
import {
  useConferirExtrato, useAplicarCorrecoes, useHistoricoReatribuicoes, useDesfazerReatribuicao,
  useSaldoPorSafraInscricao, type MovimentoConferido, type CorrecaoAplicar,
} from "@/hooks/useConferenciaIeGenerica";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const LABEL_TIPO: Record<string, string> = {
  deposito: "Depósito/Colheita",
  devolucao: "Devolução",
  transferencia_entrada: "Transf. Entrada",
  transferencia_saida: "Transf. Saída",
  compra: "Compra",
  venda: "Venda",
  outro: "Outro",
};

const SITUACAO: Record<string, { texto: string; classe: string }> = {
  ja_correto: { texto: "Já correto", classe: "bg-muted text-muted-foreground" },
  corrigir: { texto: "Vai corrigir", classe: "bg-primary text-primary-foreground" },
  multiplos: { texto: "Mais de um lançamento", classe: "bg-accent text-accent-foreground" },
  nao_encontrado: { texto: "Não encontrado", classe: "bg-destructive/15 text-destructive" },
  bloqueado: { texto: "Nota autorizada", classe: "bg-destructive/15 text-destructive" },
  nao_suportado: { texto: "Fora do escopo", classe: "bg-muted text-muted-foreground" },
};

const formatarKg = (valor: number) =>
  new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(Math.round(valor));

const formatarData = (iso: string | null) =>
  iso ? new Date(`${iso}T00:00:00`).toLocaleDateString("pt-BR") : "-";

export function ConferenciaIeGenericaDialog({ open, onOpenChange }: Props) {
  const { profile, user } = useAuth();
  const { data: inscricoes } = useInscricoesCompletas();

  const [arquivos, setArquivos] = useState<File[]>([]);
  const [extrato, setExtrato] = useState<ExtratoLegado | null>(null);
  const [lendo, setLendo] = useState(false);
  const [inscricaoDestino, setInscricaoDestino] = useState<string | undefined>(undefined);
  const [conferidos, setConferidos] = useState<MovimentoConferido[]>([]);
  const [selecoes, setSelecoes] = useState<Record<string, string | null>>({});

  const conferir = useConferirExtrato();
  const aplicar = useAplicarCorrecoes();
  const desfazer = useDesfazerReatribuicao();
  const { data: historico } = useHistoricoReatribuicoes();
  const { data: saldos } = useSaldoPorSafraInscricao(inscricaoDestino ?? null);

  const opcoesInscricoes = useMemo(
    () =>
      (inscricoes || []).map((i: any) => ({
        id: i.id,
        label: `${(i.produtores?.nome || i.nome || "SEM NOME").toUpperCase()} — IE ${i.inscricao_estadual || "sem IE"}`,
      })),
    [inscricoes],
  );

  const lerArquivos = async () => {
    if (arquivos.length === 0) {
      toast.error("Anexe o extrato detalhado (e o resumo, se tiver) em PDF.");
      return;
    }
    setLendo(true);
    try {
      const resultado = await interpretarExtratoLegado(arquivos);
      setExtrato(resultado);
      setConferidos([]);
      setSelecoes({});
      toast.success(`${resultado.movimentos.length} movimento(s) lidos do extrato.`);
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : "Não foi possível ler o extrato.");
    } finally {
      setLendo(false);
    }
  };

  const conferirMovimentos = async () => {
    if (!extrato || !inscricaoDestino) {
      toast.error("Leia o extrato e escolha o produtor correto.");
      return;
    }
    const resultado = await conferir.mutateAsync({
      movimentos: extrato.movimentos,
      inscricaoDestinoId: inscricaoDestino,
    });
    setConferidos(resultado);
    const iniciais: Record<string, string | null> = {};
    resultado.forEach((c) => {
      iniciais[c.chave] = c.situacao === "corrigir" ? c.selecionado : null;
    });
    setSelecoes(iniciais);
  };

  const correcoes: CorrecaoAplicar[] = useMemo(() => {
    if (!inscricaoDestino) return [];
    return conferidos
      .map((c) => {
        const escolhido = selecoes[c.chave];
        if (!escolhido) return null;
        const candidato = c.candidatos.find((cd) => cd.registro_id === escolhido);
        if (!candidato || candidato.bloqueado) return null;
        if (candidato.inscricao_atual_id === inscricaoDestino) return null;
        return {
          tabela: candidato.tabela,
          registro_id: candidato.registro_id,
          campo: candidato.campo,
          valor_anterior: candidato.inscricao_atual_id,
          valor_novo: inscricaoDestino,
          descricao: `${LABEL_TIPO[c.movimento.tipo]} ${formatarData(c.movimento.data)} — ${formatarKg(c.movimento.quilos)} kg`,
        } as CorrecaoAplicar;
      })
      .filter(Boolean) as CorrecaoAplicar[];
  }, [conferidos, selecoes, inscricaoDestino]);

  const aplicarCorrecoes = async () => {
    if (correcoes.length === 0) {
      toast.error("Nenhum lançamento marcado para corrigir.");
      return;
    }
    await aplicar.mutateAsync({
      correcoes,
      tenantId: profile?.tenant_id ?? null,
      usuarioId: user?.id ?? null,
    });
    await conferirMovimentos();
  };

  const lotesHistorico = useMemo(() => {
    const mapa = new Map<string, { lote_id: string; created_at: string; total: number; desfeitos: number }>();
    (historico || []).forEach((h) => {
      const atual = mapa.get(h.lote_id) || { lote_id: h.lote_id, created_at: h.created_at, total: 0, desfeitos: 0 };
      atual.total += 1;
      if (h.desfeito_em) atual.desfeitos += 1;
      mapa.set(h.lote_id, atual);
    });
    return [...mapa.values()].slice(0, 10);
  }, [historico]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSearch className="h-5 w-5 text-primary" />
            Conferência de Produtores (IE genérica)
          </DialogTitle>
          <DialogDescription>
            Anexe o extrato do sistema antigo, escolha o produtor correto e confirme os lançamentos que devem ser
            transferidos. Nada é excluído e todas as correções podem ser desfeitas.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">1. Extrato do sistema antigo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1 md:col-span-2">
                  <Label className="text-xs">Arquivos PDF (extrato e resumo)</Label>
                  <Input
                    type="file"
                    accept="application/pdf"
                    multiple
                    onChange={(e) => setArquivos(Array.from(e.target.files || []))}
                  />
                </div>
                <div className="flex items-end">
                  <Button onClick={lerArquivos} disabled={lendo} className="gap-2 w-full">
                    {lendo ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSearch className="h-4 w-4" />}
                    Ler extrato
                  </Button>
                </div>
              </div>

              {extrato && (
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>
                    Produtor no extrato: <strong>{extrato.produtor || "não identificado"}</strong>
                    {extrato.inscricao_estadual ? ` — IE ${extrato.inscricao_estadual}` : ""}
                  </p>
                  <p>{extrato.movimentos.length} movimento(s) encontrados.</p>
                  {extrato.resumo_safras.length > 0 && (
                    <p>
                      Saldo no extrato:{" "}
                      {extrato.resumo_safras
                        .map((r) => `${r.safra}: ${formatarKg(r.saldo_kg)} kg`)
                        .join(" | ")}
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">2. Produtor correto (destino)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1 md:col-span-2">
                  <Label className="text-xs">Inscrição estadual de destino</Label>
                  <Select isSearchable value={inscricaoDestino} onValueChange={setInscricaoDestino}>
                    <SelectTrigger><SelectValue placeholder="Selecione o produtor/inscrição..." /></SelectTrigger>
                    <SelectContent>
                      {opcoesInscricoes.map((o) => (
                        <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button
                    variant="outline"
                    className="gap-2 w-full"
                    onClick={conferirMovimentos}
                    disabled={!extrato || !inscricaoDestino || conferir.isPending}
                  >
                    {conferir.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    Conferir lançamentos
                  </Button>
                </div>
              </div>

              {saldos && saldos.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  Saldo atual no sistema:{" "}
                  {saldos.map((s) => `${s.safra}: ${formatarKg(s.saldo_kg)} kg`).join(" | ")}
                </p>
              )}
            </CardContent>
          </Card>

          {conferidos.length > 0 && (
            <Card>
              <CardHeader className="pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <CardTitle className="text-base">3. Lançamentos encontrados</CardTitle>
                <Button onClick={aplicarCorrecoes} disabled={aplicar.isPending || correcoes.length === 0} className="gap-2">
                  {aplicar.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  Corrigir {correcoes.length} lançamento(s)
                </Button>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10"></TableHead>
                      <TableHead className="text-center">Data</TableHead>
                      <TableHead>Movimento</TableHead>
                      <TableHead className="text-right">Kg</TableHead>
                      <TableHead>Safra / Produto</TableHead>
                      <TableHead>Está hoje em</TableHead>
                      <TableHead>Situação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {conferidos.map((c) => {
                      const marcavel = c.candidatos.filter((cd) => !cd.bloqueado && cd.inscricao_atual_id !== inscricaoDestino);
                      return (
                        <TableRow key={c.chave}>
                          <TableCell>
                            {marcavel.length === 1 && (
                              <Checkbox
                                checked={selecoes[c.chave] === marcavel[0].registro_id}
                                onCheckedChange={(v) =>
                                  setSelecoes((prev) => ({ ...prev, [c.chave]: v ? marcavel[0].registro_id : null }))
                                }
                              />
                            )}
                          </TableCell>
                          <TableCell className="text-center">{formatarData(c.movimento.data)}</TableCell>
                          <TableCell>{LABEL_TIPO[c.movimento.tipo]}</TableCell>
                          <TableCell className="text-right">{formatarKg(c.movimento.quilos)}</TableCell>
                          <TableCell className="text-sm">
                            {c.candidatos[0]
                              ? `${c.candidatos[0].safra || "-"} / ${c.candidatos[0].produto || "-"}`
                              : `${c.movimento.safra || "-"} / ${c.movimento.produto || "-"}`}
                          </TableCell>
                          <TableCell className="text-sm">
                            {marcavel.length > 1 ? (
                              <Select
                                isSearchable
                                value={selecoes[c.chave] ?? undefined}
                                onValueChange={(v) => setSelecoes((prev) => ({ ...prev, [c.chave]: v }))}
                              >
                                <SelectTrigger><SelectValue placeholder="Escolha o lançamento..." /></SelectTrigger>
                                <SelectContent>
                                  {marcavel.map((cd) => (
                                    <SelectItem key={cd.registro_id} value={cd.registro_id}>
                                      {`${cd.codigo ?? "s/nº"} — ${cd.produtor_atual || "sem produtor"} (IE ${cd.ie_atual || "-"})`}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              c.candidatos[0]
                                ? `${c.candidatos[0].produtor_atual || "sem produtor"} (IE ${c.candidatos[0].ie_atual || "-"})`
                                : "-"
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge className={SITUACAO[c.situacao].classe}>{SITUACAO[c.situacao].texto}</Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>

                {conferidos.some((c) => c.situacao === "nao_encontrado") && (
                  <p className="flex items-center gap-2 text-sm text-muted-foreground pt-3">
                    <AlertTriangle className="h-4 w-4" />
                    Movimentos não encontrados precisam de conferência manual (data ou quantidade diferentes).
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {lotesHistorico.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Histórico de correções</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {lotesHistorico.map((l) => (
                  <div key={l.lote_id} className="flex items-center justify-between gap-2 text-sm border-b pb-2 last:border-0">
                    <span>
                      {new Date(l.created_at).toLocaleString("pt-BR")} — {l.total} lançamento(s)
                      {l.desfeitos > 0 ? ` (${l.desfeitos} desfeito(s))` : ""}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-2"
                      disabled={desfazer.isPending || l.desfeitos === l.total}
                      onClick={() => desfazer.mutate({ loteId: l.lote_id })}
                    >
                      <Undo2 className="h-4 w-4" />
                      Desfazer
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
