import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationEllipsis,
} from "@/components/ui/pagination";

interface TablePaginationProps {
  paginaAtual: number;
  totalPaginas: number;
  totalRegistros: number;
  setPaginaAtual: (pagina: number) => void;
  gerarNumerosPaginas: () => (number | "ellipsis")[];
  itensPorPagina?: number;
}

export function TablePagination({
  paginaAtual,
  totalPaginas,
  totalRegistros,
  setPaginaAtual,
  gerarNumerosPaginas,
  itensPorPagina = 20,
}: TablePaginationProps) {
  if (totalPaginas <= 1) return null;

  const inicio = (paginaAtual - 1) * itensPorPagina + 1;
  const fim = Math.min(paginaAtual * itensPorPagina, totalRegistros);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t">
      <span className="text-sm text-muted-foreground">
        {inicio}-{fim} de {totalRegistros}
      </span>

      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPaginaAtual(paginaAtual - 1)}
              disabled={paginaAtual <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </Button>
          </PaginationItem>

          {gerarNumerosPaginas().map((pagina, index) => (
            <PaginationItem key={index}>
              {pagina === "ellipsis" ? (
                <PaginationEllipsis />
              ) : (
                <PaginationLink
                  onClick={() => setPaginaAtual(pagina)}
                  isActive={paginaAtual === pagina}
                  className="cursor-pointer"
                >
                  {pagina}
                </PaginationLink>
              )}
            </PaginationItem>
          ))}

          <PaginationItem>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPaginaAtual(paginaAtual + 1)}
              disabled={paginaAtual >= totalPaginas}
            >
              Próximo
              <ChevronRight className="h-4 w-4" />
            </Button>
          </PaginationItem>
        </PaginationContent>
      </Pagination>

      <span className="text-sm text-muted-foreground">
        Página {paginaAtual} de {totalPaginas}
      </span>
    </div>
  );
}
