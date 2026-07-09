import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";
import type { IbsCbsItemIssue } from "@/lib/focusNfeMapper";

interface ValidacaoIbsCbsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  issues: IbsCbsItemIssue[];
}

export function ValidacaoIbsCbsDialog({ open, onOpenChange, issues }: ValidacaoIbsCbsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            IBS/CBS incompletos — transmissão bloqueada
          </DialogTitle>
          <DialogDescription>
            A Reforma Tributária 2026 exige CST, classificação tributária (cClassTrib) e alíquotas
            de IBS/CBS em todos os itens. Corrija os campos abaixo no cadastro do produto ou do
            emitente antes de transmitir a NF-e.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[50vh] overflow-y-auto space-y-3">
          {issues.map((issue) => (
            <div
              key={issue.numeroItem}
              className="rounded-md border border-destructive/30 bg-destructive/5 p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold">
                    Item {issue.numeroItem} — {issue.descricao}
                  </p>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {issue.camposFaltantes.map((campo) => (
                  <Badge key={campo} variant="destructive" className="font-normal">
                    {campo}
                  </Badge>
                ))}
              </div>
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
