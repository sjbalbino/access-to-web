import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle2, Circle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export const ETAPAS_ENTRADA = [
  "Verificando se a nota já foi lançada",
  "Baixando o XML da nota",
  "Conferindo inscrição e fornecedor",
  "Localizando ou cadastrando os produtos",
  "Gravando a entrada",
] as const;

export interface EntradaProgressoDialogProps {
  /** Índice da etapa atual; null fecha a tela. */
  etapa: number | null;
  numero?: string | null;
  emitente?: string | null;
}

/** Tela bloqueante que mostra o andamento do "Dar entrada". */
export function EntradaProgressoDialog({ etapa, numero, emitente }: EntradaProgressoDialogProps) {
  return (
    <Dialog open={etapa !== null}>
      <DialogContent className="max-w-md [&>button]:hidden" onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-primary" /> Processando entrada
          </DialogTitle>
          <DialogDescription>
            {numero ? `NF-e ${numero}` : "NF-e"}{emitente ? ` — ${emitente}` : ""}. Aguarde, não feche esta tela.
          </DialogDescription>
        </DialogHeader>
        <ol className="space-y-3 py-2" aria-live="polite">
          {ETAPAS_ENTRADA.map((txt, i) => {
            const feito = etapa !== null && i < etapa;
            const atual = i === etapa;
            return (
              <li key={txt} className={cn("flex items-center gap-3 text-sm", !feito && !atual && "text-muted-foreground")}>
                {feito ? <CheckCircle2 className="h-5 w-5 text-primary" />
                  : atual ? <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  : <Circle className="h-5 w-5" />}
                <span className={cn(atual && "font-semibold")}>{txt}</span>
              </li>
            );
          })}
        </ol>
      </DialogContent>
    </Dialog>
  );
}
