import { useEffect, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { useFocusNfe } from "@/hooks/useFocusNfe";
import {
  abrirLinkNovaAba, baixarBlob, compartilharArquivosNativo, formatarChave, formatarMoedaBR,
  linkWhatsapp, normalizarTelefoneWhatsapp,
} from "@/lib/whatsappShare";

export interface NotaWhatsapp {
  id: string;
  numero?: number | null;
  serie?: string | number | null;
  data_emissao?: string | null;
  dest_nome?: string | null;
  dest_telefone?: string | null;
  chave_acesso?: string | null;
  total_nota?: number | null;
  uuid_api?: string | null;
  status?: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nota: NotaWhatsapp | null;
  emitenteNome?: string | null;
}

type Destino = "destinatario" | "outro";

export function EnviarWhatsappNfeDialog({ open, onOpenChange, nota, emitenteNome }: Props) {
  const focusNfe = useFocusNfe();
  const [destino, setDestino] = useState<Destino>("destinatario");
  const [telefone, setTelefone] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [enviando, setEnviando] = useState(false);

  const mensagemPadrao = useMemo(() => {
    if (!nota) return "";
    const data = nota.data_emissao ? format(parseISO(nota.data_emissao.slice(0, 10)), "dd/MM/yyyy") : "-";
    return [
      `Olá! Segue a NF-e nº ${nota.numero ?? "-"} (série ${nota.serie ?? "-"}).`,
      emitenteNome ? `Emitente: ${emitenteNome}` : null,
      `Destinatário: ${nota.dest_nome ?? "-"}`,
      `Emissão: ${data}`,
      `Valor: ${formatarMoedaBR(Number(nota.total_nota ?? 0))}`,
      nota.chave_acesso ? `Chave de acesso: ${formatarChave(nota.chave_acesso)}` : null,
      "Consulta: https://www.nfe.fazenda.gov.br/portal/consultaRecaptcha.aspx",
      "Em anexo: DANFE (PDF) e XML.",
    ].filter(Boolean).join("\n");
  }, [nota, emitenteNome]);

  useEffect(() => {
    if (!open) return;
    setDestino("destinatario");
    setTelefone(nota?.dest_telefone ?? "");
    setMensagem(mensagemPadrao);
  }, [open, nota, mensagemPadrao]);

  useEffect(() => {
    if (destino === "destinatario") setTelefone(nota?.dest_telefone ?? "");
    else setTelefone("");
  }, [destino, nota]);

  const telNormalizado = normalizarTelefoneWhatsapp(telefone);

  const handleEnviar = async () => {
    if (!nota) return;
    if (!telNormalizado) {
      toast.error("Informe um telefone válido com DDD.");
      return;
    }
    setEnviando(true);
    try {
      const ref = nota.uuid_api || `nfe_${nota.id}`;
      const nome = `NFe_${nota.numero ?? nota.id}`;
      const [pdf, xml] = await Promise.all([
        focusNfe.obterArquivo(ref, "danfe", nota.id),
        focusNfe.obterArquivo(ref, "xml", nota.id),
      ]);
      const files = [
        new File([pdf], `${nome}_DANFE.pdf`, { type: "application/pdf" }),
        new File([xml], `${nome}.xml`, { type: "application/xml" }),
      ];
      const compartilhou = await compartilharArquivosNativo(files, mensagem);
      if (!compartilhou) {
        files.forEach((f) => baixarBlob(f, f.name));
        abrirLinkNovaAba(linkWhatsapp(telNormalizado, mensagem));
        toast.success("WhatsApp aberto com a mensagem", {
          description: "O DANFE e o XML foram baixados — arraste-os para a conversa para anexar.",
          duration: 10000,
        });
      }
      onOpenChange(false);
    } catch (e) {
      toast.error("Não foi possível preparar os arquivos", {
        description: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-primary" /> Enviar NF-e por WhatsApp
          </DialogTitle>
          <DialogDescription>
            NF-e nº {nota?.numero ?? "-"} — {nota?.dest_nome ?? ""}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <RadioGroup value={destino} onValueChange={(v) => setDestino(v as Destino)} className="flex gap-4">
            <div className="flex items-center gap-2">
              <RadioGroupItem value="destinatario" id="wa-dest" />
              <Label htmlFor="wa-dest">Destinatário</Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="outro" id="wa-outro" />
              <Label htmlFor="wa-outro">Outro número</Label>
            </div>
          </RadioGroup>
          <div className="space-y-1">
            <Label htmlFor="wa-tel">Telefone (com DDD)</Label>
            <Input id="wa-tel" inputMode="tel" placeholder="(55) 99999-9999" value={telefone}
              onChange={(e) => setTelefone(e.target.value)} />
            {telefone && !telNormalizado && (
              <p className="text-xs text-destructive">Telefone inválido.</p>
            )}
          </div>
          <div className="space-y-1">
            <Label htmlFor="wa-msg">Mensagem</Label>
            <Textarea id="wa-msg" rows={8} value={mensagem} onChange={(e) => setMensagem(e.target.value)} />
          </div>
          <p className="text-xs text-muted-foreground">
            No celular, o DANFE e o XML vão anexados direto. No computador, os arquivos são baixados e o
            WhatsApp Web abre com a mensagem pronta para você anexá-los.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleEnviar} disabled={enviando || !telNormalizado}>
            {enviando ? "Preparando..." : "Enviar pelo WhatsApp"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
