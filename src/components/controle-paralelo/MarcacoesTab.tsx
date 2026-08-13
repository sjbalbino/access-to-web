import { useMemo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious, PaginationEllipsis } from "@/components/ui/pagination";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { usePaginacao } from "@/hooks/usePaginacao";
import {
  useDocumentosControle,
  useMarcarLote,
  useToggleMarcacao,
  type DocumentoFiltros,
  type DocumentoTipo,
} from "@/hooks/useControleParalelo";

export interface MarcacoesTabProps {
  conjuntoId: string;
  tipo: DocumentoTipo;
  filtros: DocumentoFiltros;
  /** IDs de documentos já marcados neste conjunto para este tipo. */
  marcados: Set<string>;
}

const nf = (v: number) => new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(v || 0);

const dataBr = (v: string | null): string => {
  if (!v) return "-";
  try {
    return format(parseISO(v.length > 10 ? v : `${v}T00:00:00`), "dd/MM/yyyy");
  } catch {
    return v;
  }
};

export function MarcacoesTab({ conjuntoId, tipo, filtros, marcados }: MarcacoesTabProps) {
  const { data: documentos, isLoading } = useDocumentosControle(tipo, filtros);
  const toggle = useToggleMarcacao();
  const lote = useMarcarLote();

  const lista = documentos ?? [];
  const { dadosPaginados, paginaAtual, totalPaginas, totalRegistros, setPaginaAtual, gerarNumerosPaginas } =
    usePaginacao(lista, 20);

  const totalMarcadosVisiveis = useMemo(
    () => lista.filter((d) => marcados.has(d.id)).length,
    [lista, marcados]
  );

  const idsPagina = dadosPaginados.map((d) => d.id);
  const todosPaginaMarcados = idsPagina.length > 0 && idsPagina.every((id) => marcados.has(id));

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm text-muted-foreground">
          {totalRegistros} lançamento(s) — <span className="font-medium text-foreground">{totalMarcadosVisiveis} marcado(s)</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={idsPagina.length === 0 || lote.isPending}
            onClick={() =>
              lote.mutate({ conjuntoId, documentoTipo: tipo, documentoIds: idsPagina, marcar: !todosPaginaMarcados })
            }
          >
            {todosPaginaMarcados ? "Desmarcar página" : "Marcar página"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={lista.length === 0 || lote.isPending}
            onClick={() =>
              lote.mutate({
                conjuntoId,
                documentoTipo: tipo,
                documentoIds: lista.map((d) => d.id),
                marcar: true,
              })
            }
          >
            Marcar todos do filtro
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={totalMarcadosVisiveis === 0 || lote.isPending}
            onClick={() =>
              lote.mutate({
                conjuntoId,
                documentoTipo: tipo,
                documentoIds: lista.filter((d) => marcados.has(d.id)).map((d) => d.id),
                marcar: false,
              })
            }
          >
            Limpar marcações do filtro
          </Button>
        </div>
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10"></TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Referência</TableHead>
              <TableHead>Produtor / Inscrição</TableHead>
              <TableHead>Contraparte</TableHead>
              <TableHead>Produto</TableHead>
              <TableHead>Local</TableHead>
              <TableHead className="text-right">Qtde (kg)</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead>Situação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {dadosPaginados.length === 0 && (
              <TableRow>
                <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                  Nenhum lançamento encontrado com os filtros informados.
                </TableCell>
              </TableRow>
            )}
            {dadosPaginados.map((d) => {
              const marcado = marcados.has(d.id);
              return (
                <TableRow key={d.id} className={cn(marcado && "bg-muted/60")}>
                  <TableCell>
                    <Checkbox
                      checked={marcado}
                      aria-label={`Marcar lançamento ${d.referencia}`}
                      onCheckedChange={(checked) =>
                        toggle.mutate({
                          conjuntoId,
                          documentoTipo: tipo,
                          documentoId: d.id,
                          marcar: !!checked,
                        })
                      }
                    />
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{dataBr(d.data)}</TableCell>
                  <TableCell className="whitespace-nowrap">{d.referencia}</TableCell>
                  <TableCell className="max-w-[220px] truncate" title={d.produtor}>{d.produtor}</TableCell>
                  <TableCell className="max-w-[200px] truncate" title={d.contraparte}>{d.contraparte}</TableCell>
                  <TableCell className="max-w-[140px] truncate" title={d.produto}>{d.produto}</TableCell>
                  <TableCell className="max-w-[180px] truncate" title={d.local}>{d.local}</TableCell>
                  <TableCell className="text-right">{nf(d.quantidade_kg)}</TableCell>
                  <TableCell className="text-right">
                    {d.valor > 0
                      ? `R$ ${new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(d.valor)}`
                      : "-"}
                  </TableCell>
                  <TableCell>
                    {marcado ? (
                      <Badge variant="destructive">Marcado</Badge>
                    ) : (
                      <Badge variant="secondary">Normal</Badge>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {totalPaginas > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => setPaginaAtual(paginaAtual - 1)}
                className={cn(paginaAtual === 1 && "pointer-events-none opacity-50")}
              />
            </PaginationItem>
            {gerarNumerosPaginas().map((p, i) => (
              <PaginationItem key={`${p}-${i}`}>
                {p === "ellipsis" ? (
                  <PaginationEllipsis />
                ) : (
                  <PaginationLink isActive={p === paginaAtual} onClick={() => setPaginaAtual(p)}>
                    {p}
                  </PaginationLink>
                )}
              </PaginationItem>
            ))}
            <PaginationItem>
              <PaginationNext
                onClick={() => setPaginaAtual(paginaAtual + 1)}
                className={cn(paginaAtual === totalPaginas && "pointer-events-none opacity-50")}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}
