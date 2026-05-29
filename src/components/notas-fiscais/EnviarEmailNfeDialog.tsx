import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useFocusNfe } from "@/hooks/useFocusNfe";
import { toast } from "sonner";

interface EnviarEmailNfeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nota: {
    id: string;
    numero?: number | null;
    dest_nome?: string | null;
    dest_email?: string | null;
    emitente_id?: string | null;
  } | null;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function EnviarEmailNfeDialog({ open, onOpenChange, nota }: EnviarEmailNfeDialogProps) {
  const focusNfe = useFocusNfe();
  const [emailEmitente, setEmailEmitente] = useState<string | null>(null);
  const [emailContador, setEmailContador] = useState<string | null>(null);
  const [sendDest, setSendDest] = useState(true);
  const [sendEmitente, setSendEmitente] = useState(true);
  const [sendContador, setSendContador] = useState(true);
  const [extras, setExtras] = useState("");

  useEffect(() => {
    if (!open || !nota?.emitente_id) {
      setEmailEmitente(null);
      setEmailContador(null);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("emitentes_nfe")
        .select("email_emitente, email_contador")
        .eq("id", nota.emitente_id)
        .maybeSingle();
      setEmailEmitente((data as any)?.email_emitente ?? null);
      setEmailContador((data as any)?.email_contador ?? null);
    })();
    setSendDest(true);
    setSendEmitente(true);
    setSendContador(true);
    setExtras("");
  }, [open, nota?.emitente_id]);

  const destEmail = nota?.dest_email?.trim() || null;

  const buildEmailList = (): string[] => {
    const list: string[] = [];
    if (sendDest && destEmail) list.push(destEmail);
    if (sendEmitente && emailEmitente) list.push(emailEmitente);
    if (sendContador && emailContador) list.push(emailContador);
    extras
      .split(/[,;\s]+/)
      .map((e) => e.trim())
      .filter(Boolean)
      .forEach((e) => list.push(e));
    return Array.from(new Set(list.map((e) => e.toLowerCase()))).filter((e) => EMAIL_RE.test(e));
  };

  const handleEnviar = async () => {
    if (!nota) return;
    const lista = buildEmailList();
    if (lista.length === 0) {
      toast.error("Selecione ao menos um destinatário válido");
      return;
    }
    const res = await focusNfe.enviarEmail(nota.id, lista);
    if (res.success) {
      onOpenChange(false);
    }
  };

  const totalPreview = buildEmailList().length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Enviar NFe por Email
          </DialogTitle>
          <DialogDescription>
            A Focus NFe enviará a <strong>DANFE (PDF)</strong> e o <strong>XML</strong> da NFe
            {nota?.numero ? ` nº ${nota.numero}` : ""} para os destinatários selecionados.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Destinatários padrão</Label>

            <div className="flex items-start gap-2">
              <Checkbox
                id="dest"
                checked={sendDest && !!destEmail}
                disabled={!destEmail}
                onCheckedChange={(c) => setSendDest(!!c)}
              />
              <div className="flex-1 -mt-0.5">
                <Label htmlFor="dest" className="cursor-pointer">
                  Destinatário da NFe
                </Label>
                <p className="text-xs text-muted-foreground">
                  {destEmail ?? "Sem email cadastrado no destinatário"}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <Checkbox
                id="emit"
                checked={sendEmitente && !!emailEmitente}
                disabled={!emailEmitente}
                onCheckedChange={(c) => setSendEmitente(!!c)}
              />
              <div className="flex-1 -mt-0.5">
                <Label htmlFor="emit" className="cursor-pointer">
                  Emitente (cópia para a empresa)
                </Label>
                <p className="text-xs text-muted-foreground">
                  {emailEmitente ?? "Cadastre em Emitentes NF-e → Email do Emitente"}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <Checkbox
                id="cont"
                checked={sendContador && !!emailContador}
                disabled={!emailContador}
                onCheckedChange={(c) => setSendContador(!!c)}
              />
              <div className="flex-1 -mt-0.5">
                <Label htmlFor="cont" className="cursor-pointer">
                  Contador
                </Label>
                <p className="text-xs text-muted-foreground">
                  {emailContador ?? "Cadastre em Emitentes NF-e → Email do Contador"}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="extras">Emails adicionais (opcional)</Label>
            <Textarea
              id="extras"
              value={extras}
              onChange={(e) => setExtras(e.target.value)}
              placeholder="email1@dominio.com, email2@dominio.com"
              rows={2}
            />
            <p className="text-xs text-muted-foreground">
              Separe múltiplos emails por vírgula, ponto e vírgula ou espaço.
            </p>
          </div>

          <div className="text-sm text-muted-foreground border-t pt-2">
            Total de destinatários: <strong>{totalPreview}</strong>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleEnviar} disabled={focusNfe.isLoading || totalPreview === 0}>
            <Mail className="h-4 w-4 mr-2" />
            {focusNfe.isLoading ? "Enviando..." : "Enviar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
