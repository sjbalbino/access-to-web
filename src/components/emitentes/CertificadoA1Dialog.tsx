import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Eye, EyeOff, KeyRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { extrairMensagemEdge } from "@/components/emitentes/certificadoUtils";

export interface CertificadoA1DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  emitenteId: string | null;
  emitenteNome: string;
  providerLabel: string;
}

const lerBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(",")[1] ?? "");
    r.onerror = () => reject(new Error("Não foi possível ler o arquivo."));
    r.readAsDataURL(file);
  });

export function CertificadoA1Dialog({ open, onOpenChange, emitenteId, emitenteNome, providerLabel }: CertificadoA1DialogProps) {
  const qc = useQueryClient();
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [senha, setSenha] = useState("");
  const [mostrar, setMostrar] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const fechar = (v: boolean) => {
    if (enviando) return;
    if (!v) { setArquivo(null); setSenha(""); setErro(null); }
    onOpenChange(v);
  };

  const enviar = async () => {
    if (!emitenteId || !arquivo || !senha) return;
    setErro(null);
    if (!/\.(pfx|p12)$/i.test(arquivo.name)) { setErro("Selecione um arquivo .pfx ou .p12."); return; }
    if (arquivo.size > 150_000) { setErro("Arquivo muito grande para um certificado A1."); return; }
    setEnviando(true);
    try {
      const certificado_base64 = await lerBase64(arquivo);
      const { data, error } = await supabase.functions.invoke("emitente-certificado-upload", {
        body: { emitente_id: emitenteId, certificado_base64, senha },
      });
      const r = (data ?? {}) as { success?: boolean; error?: string; titular?: string; validade?: string };
      if (error || !r.success) {
        setErro(r.error || (await extrairMensagemEdge(error)) || "Não foi possível enviar o certificado.");
        return;
      }
      toast.success("Certificado enviado ao provedor fiscal", {
        description: `${r.titular} • válido até ${r.validade ? new Date(r.validade).toLocaleDateString("pt-BR") : "—"}`,
      });
      qc.invalidateQueries({ queryKey: ["emitentes_nfe"] });
      qc.invalidateQueries({ queryKey: ["emitentes-nfe"] });
      setArquivo(null); setSenha("");
      onOpenChange(false);
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={fechar}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><KeyRound className="h-5 w-5" /> Certificado digital A1</DialogTitle>
          <DialogDescription>
            {emitenteNome} — o certificado será enviado diretamente para a {providerLabel}. O arquivo e a senha não ficam gravados no Sisagro.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cert-arquivo">Arquivo do certificado (.pfx)</Label>
            <Input id="cert-arquivo" type="file" accept=".pfx,.p12" disabled={enviando}
              onChange={(e) => setArquivo(e.target.files?.[0] ?? null)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cert-senha">Senha do certificado</Label>
            <div className="flex gap-2">
              <Input id="cert-senha" type={mostrar ? "text" : "password"} value={senha} disabled={enviando}
                autoComplete="new-password" onChange={(e) => setSenha(e.target.value)} />
              <Button type="button" variant="outline" size="icon" aria-label={mostrar ? "Ocultar senha" : "Mostrar senha"}
                onClick={() => setMostrar((v) => !v)}>
                {mostrar ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          {erro && <Alert variant="destructive"><AlertDescription>{erro}</AlertDescription></Alert>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => fechar(false)} disabled={enviando}>Cancelar</Button>
          <Button onClick={enviar} disabled={!arquivo || !senha || enviando}>
            {enviando && <Loader2 className="h-4 w-4 animate-spin" />} Enviar certificado
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
