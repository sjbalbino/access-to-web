import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { Seo } from "@/components/portal/Seo";
import {
  CotacaoCard,
  formatarDataReferencia,
  formatarValorCotacao,
} from "@/components/portal/CotacaoCard";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useCotacoesAtuais,
  useHistoricoCotacao,
  useUltimaColetaCotacoes,
} from "@/hooks/useCotacoes";
import { formatDateTimeSP } from "@/lib/datetime";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const rotulosCategoria: Record<string, string> = {
  graos: "Grãos",
  pecuaria: "Pecuária",
  cambio: "Câmbio",
};

export default function PortalIndicadores() {
  const { data: cotacoes, isLoading, refetch, isFetching } = useCotacoesAtuais();
  const { data: coletas, refetch: refetchColetas } = useUltimaColetaCotacoes();
  const [slugGrafico, setSlugGrafico] = useState<string | undefined>(undefined);


  const slugAtivo = slugGrafico ?? cotacoes?.[0]?.slug;
  const { data: historico } = useHistoricoCotacao(slugAtivo ?? null);

  const porCategoria = useMemo(() => {
    const grupos = new Map<string, typeof cotacoes>();
    (cotacoes ?? []).forEach((c) => {
      const atual = grupos.get(c.categoria) ?? [];
      grupos.set(c.categoria, [...(atual ?? []), c]);
    });
    return [...grupos.entries()];
  }, [cotacoes]);

  const dadosGrafico = (historico ?? []).map((h) => ({
    data: formatarDataReferencia(h.data_referencia).slice(0, 5),
    valor: h.valor,
  }));

  const datasOrdenadas = (cotacoes ?? []).map((c) => c.data_referencia).sort();
  const dataMaisRecente =
    datasOrdenadas.length > 0 ? datasOrdenadas[datasOrdenadas.length - 1] : undefined;

  // Coleta mais recente entre todas as fontes.
  const ultimaColeta = Object.values(coletas ?? {})
    .map((c) => c.created_at)
    .sort()
    .pop();




  return (
    <PortalLayout>
      <Seo
        title="Indicadores diários do mercado agrícola — SisAgro"
        description="Cotações diárias de soja, milho, trigo, arroz, boi gordo, dólar e euro, a partir de fontes públicas (CEPEA/ESALQ e Banco Central do Brasil)."
        path="/indicadores"
      />

      <section className="border-b border-border bg-muted/30">
        <div className="container max-w-6xl px-4 py-12">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
            Indicadores do mercado agrícola
          </h1>
          <p className="text-muted-foreground max-w-3xl">
            Acompanhe as principais referências de preço usadas na comercialização de
            grãos. Os dados são coletados automaticamente de fontes públicas e a data de
            referência exibida é sempre a informada pela própria fonte.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2">
            {dataMaisRecente && (
              <span className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm text-muted-foreground">
                Última referência das fontes:{" "}
                <strong className="text-foreground">
                  {formatarDataReferencia(dataMaisRecente)}
                </strong>
              </span>
            )}
            {ultimaColeta && (
              <span className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm text-muted-foreground">
                Última coleta do portal:{" "}
                <strong className="text-foreground">
                  {formatDateTimeSP(ultimaColeta)}
                </strong>
              </span>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                refetch();
                refetchColetas();
              }}
              disabled={isFetching}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Atualizar
            </Button>
          </div>

        </div>
      </section>

      <section className="container max-w-6xl px-4 py-12 space-y-12">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
              <div
                key={i}
                className="h-28 rounded-xl border border-border bg-card animate-pulse"
              />
            ))}
          </div>
        ) : (cotacoes ?? []).length === 0 ? (
          <p className="text-muted-foreground">
            Ainda não há cotações disponíveis. Os indicadores aparecem aqui após a
            primeira coleta diária.
          </p>
        ) : (
          <>
            {porCategoria.map(([categoria, itens]) => (
              <div key={categoria}>
                <h2 className="text-xl font-bold text-foreground mb-4">
                  {rotulosCategoria[categoria] ?? categoria}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {(itens ?? []).map((c) => (
                    <CotacaoCard
                      key={c.slug}
                      cotacao={c}
                      atualizadoEm={coletas?.[c.fonte]?.created_at ?? null}
                    />

                  ))}
                </div>
              </div>
            ))}

            {/* Gráfico histórico */}
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <h2 className="text-lg font-bold text-foreground">
                  Evolução do indicador
                </h2>
                <Select value={slugAtivo} onValueChange={setSlugGrafico}>
                  <SelectTrigger className="w-full sm:w-72">
                    <SelectValue placeholder="Selecione o indicador" />
                  </SelectTrigger>
                  <SelectContent>
                    {(cotacoes ?? []).map((c) => (
                      <SelectItem key={c.slug} value={c.slug}>
                        {[c.nome, c.regiao].filter(Boolean).join(" - ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {dadosGrafico.length < 2 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  O histórico é construído a cada coleta diária. Em poucos dias o gráfico
                  deste indicador estará disponível.
                </p>
              ) : (
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={dadosGrafico}>
                      <defs>
                        <linearGradient id="corIndicador" x1="0" y1="0" x2="0" y2="1">
                          <stop
                            offset="5%"
                            stopColor="hsl(var(--primary))"
                            stopOpacity={0.35}
                          />
                          <stop
                            offset="95%"
                            stopColor="hsl(var(--primary))"
                            stopOpacity={0}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="data" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} domain={["auto", "auto"]} />
                      <Tooltip
                        formatter={(v: number) =>
                          v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })
                        }
                      />
                      <Area
                        type="monotone"
                        dataKey="valor"
                        stroke="hsl(var(--primary))"
                        fill="url(#corIndicador)"
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Tabela resumo */}
            <div className="rounded-xl border border-border bg-card overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Indicador</TableHead>
                    <TableHead>Praça</TableHead>
                    <TableHead>Unidade</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="text-right">Variação</TableHead>
                    <TableHead className="text-center">Referência</TableHead>
                    <TableHead>Fonte</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(cotacoes ?? []).map((c) => (
                    <TableRow key={c.slug}>
                      <TableCell className="font-medium">{c.nome}</TableCell>
                      <TableCell>{c.regiao ?? "-"}</TableCell>
                      <TableCell>{c.unidade}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {c.categoria === "cambio" ? "" : "R$ "}
                        {formatarValorCotacao(c)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {typeof c.variacao_percentual === "number"
                          ? `${c.variacao_percentual > 0 ? "+" : ""}${c.variacao_percentual.toLocaleString(
                              "pt-BR",
                              { minimumFractionDigits: 2, maximumFractionDigits: 2 },
                            )}%`
                          : "—"}
                      </TableCell>
                      <TableCell className="text-center">
                        {formatarDataReferencia(c.data_referencia)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {c.fonte_url ? (
                          <a
                            href={c.fonte_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:underline"
                          >
                            {c.fonte}
                          </a>
                        ) : (
                          c.fonte
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="space-y-2 text-xs text-muted-foreground">
              <p>
                <strong className="text-foreground">
                  Por que a data de referência pode ser do dia anterior?
                </strong>{" "}
                O portal busca os dados três vezes por dia (10:05, 14:05 e 18:05, horário
                de Brasília), mas o CEPEA/ESALQ divulga o indicador de grãos apenas no fim
                da tarde e o PTAX do Banco Central é publicado após as 13h. Enquanto a
                fonte não publica o valor do dia, exibimos o último valor realmente
                divulgado, com a data original dele — nunca uma data ou um valor
                estimado.
              </p>
              {Object.values(coletas ?? {}).length > 0 && (
                <p>
                  Últimas coletas por fonte:{" "}
                  {Object.values(coletas ?? {})
                    .map((c) => `${c.fonte} — ${formatDateTimeSP(c.created_at)}`)
                    .join(" • ")}
                </p>
              )}
              <p>
                Os valores são indicativos e servem apenas como referência de mercado.
                Para negociações, consulte diretamente a fonte oficial de cada indicador.
              </p>
            </div>

          </>
        )}

        <div className="rounded-xl border border-border bg-muted/40 p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h2 className="font-semibold text-foreground mb-1">
              Quer esses números conectados à sua operação?
            </h2>
            <p className="text-sm text-muted-foreground">
              No SisAgro você acompanha saldos, contratos e faturamento com a mesma
              agilidade.
            </p>
          </div>
          <Button asChild>
            <Link to="/contato">
              Solicitar demonstração
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>
    </PortalLayout>
  );
}
