import { Badge } from "@/components/ui/badge";
import { parseISO, differenceInCalendarDays } from "date-fns";

/** Extrai a mensagem real do corpo de uma Edge Function que respondeu HTTP != 2xx. */
export async function extrairMensagemEdge(error: unknown): Promise<string | null> {
  // deno-lint-ignore no-explicit-any
  const ctx = (error as any)?.context;
  try {
    if (ctx && typeof ctx.json === "function") {
      const b = await ctx.json();
      return b?.error || b?.message || null;
    }
  } catch { /* ignora */ }
  return (error as Error | undefined)?.message ?? null;
}

export interface CertificadoBadgeProps { validade: string | null; titular?: string | null }

/** Selo de situação do certificado A1: verde (válido), amarelo (vence em 30 dias), vermelho (vencido). */
export function CertificadoBadge({ validade, titular }: CertificadoBadgeProps) {
  if (!validade) return <Badge variant="outline">Sem certificado</Badge>;
  const dias = differenceInCalendarDays(parseISO(validade), new Date());
  const data = parseISO(validade).toLocaleDateString("pt-BR");
  const title = titular ? `${titular} • válido até ${data}` : `Válido até ${data}`;
  if (dias < 0) return <Badge variant="destructive" title={title}>Vencido em {data}</Badge>;
  if (dias <= 30) return <Badge variant="secondary" className="bg-accent text-accent-foreground" title={title}>Vence em {dias} dia(s)</Badge>;
  return <Badge variant="default" title={title}>Válido até {data}</Badge>;
}
