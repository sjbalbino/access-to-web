import { TrendingDown, TrendingUp, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { CotacaoMercado } from "@/hooks/useCotacoes";

/** Formata o valor conforme a grandeza (câmbio usa 4 casas). */
export function formatarValorCotacao(c: CotacaoMercado): string {
  const casas = c.categoria === "cambio" ? 4 : 2;
  return c.valor.toLocaleString("pt-BR", {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  });
}

export function formatarDataReferencia(data: string): string {
  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}/${ano}`;
}

interface CotacaoCardProps {
  cotacao: CotacaoMercado;
  /** Momento da última coleta bem-sucedida da fonte (ISO). Opcional. */
  atualizadoEm?: string | null;
  className?: string;
}


export function CotacaoCard({ cotacao, className }: CotacaoCardProps) {
  const variacao = cotacao.variacao_percentual;
  const subiu = typeof variacao === "number" && variacao > 0;
  const caiu = typeof variacao === "number" && variacao < 0;

  const Icon = subiu ? TrendingUp : caiu ? TrendingDown : Minus;

  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card p-4 flex flex-col gap-1",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold text-foreground truncate">{cotacao.nome}</p>
          <p className="text-xs text-muted-foreground truncate">
            {[cotacao.regiao, cotacao.unidade].filter(Boolean).join(" • ")}
          </p>
        </div>
        <span
          className={cn(
            "flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold shrink-0",
            subiu && "bg-success/10 text-success",
            caiu && "bg-destructive/10 text-destructive",
            !subiu && !caiu && "bg-muted text-muted-foreground",
          )}
        >
          <Icon className="h-3.5 w-3.5" />
          {typeof variacao === "number"
            ? `${variacao > 0 ? "+" : ""}${variacao.toLocaleString("pt-BR", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}%`
            : "—"}
        </span>
      </div>

      <p className="text-2xl font-bold text-foreground tabular-nums">
        {cotacao.categoria === "cambio" ? "" : "R$ "}
        {formatarValorCotacao(cotacao)}
      </p>

      <p className="text-xs text-muted-foreground">
        {formatarDataReferencia(cotacao.data_referencia)} • {cotacao.fonte}
      </p>
    </div>
  );
}
