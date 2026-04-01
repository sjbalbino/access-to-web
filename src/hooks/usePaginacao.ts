import { useState, useMemo } from "react";

interface UsePaginacaoReturn<T> {
  dadosPaginados: T[];
  paginaAtual: number;
  totalPaginas: number;
  totalRegistros: number;
  setPaginaAtual: (pagina: number) => void;
  gerarNumerosPaginas: () => (number | "ellipsis")[];
}

export function usePaginacao<T>(dados: T[], itensPorPagina: number = 20): UsePaginacaoReturn<T> {
  const [paginaAtual, setPaginaAtualState] = useState(1);

  const totalRegistros = dados.length;
  const totalPaginas = Math.max(1, Math.ceil(totalRegistros / itensPorPagina));

  // Reset to page 1 if current page exceeds total
  const paginaSegura = paginaAtual > totalPaginas ? 1 : paginaAtual;

  const dadosPaginados = useMemo(() => {
    const inicio = (paginaSegura - 1) * itensPorPagina;
    return dados.slice(inicio, inicio + itensPorPagina);
  }, [dados, paginaSegura, itensPorPagina]);

  const setPaginaAtual = (pagina: number) => {
    if (pagina >= 1 && pagina <= totalPaginas) {
      setPaginaAtualState(pagina);
    }
  };

  const gerarNumerosPaginas = (): (number | "ellipsis")[] => {
    const paginas: (number | "ellipsis")[] = [];
    if (totalPaginas <= 7) {
      for (let i = 1; i <= totalPaginas; i++) paginas.push(i);
    } else {
      paginas.push(1);
      if (paginaSegura > 3) paginas.push("ellipsis");
      const start = Math.max(2, paginaSegura - 1);
      const end = Math.min(totalPaginas - 1, paginaSegura + 1);
      for (let i = start; i <= end; i++) paginas.push(i);
      if (paginaSegura < totalPaginas - 2) paginas.push("ellipsis");
      paginas.push(totalPaginas);
    }
    return paginas;
  };

  return {
    dadosPaginados,
    paginaAtual: paginaSegura,
    totalPaginas,
    totalRegistros,
    setPaginaAtual,
    gerarNumerosPaginas,
  };
}
