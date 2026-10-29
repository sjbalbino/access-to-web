import { useEffect, useMemo, useState } from "react";
import JSZip from "jszip";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Mail, MessageCircle, FolderArchive } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useFocusNfe } from "@/hooks/useFocusNfe";
import type { EmitenteNfe } from "@/hooks/useEmitentesNfe";
import {
  abrirLinkNovaAba, baixarBlob, compartilharArquivosNativo, formatarMoedaBR, linkWhatsapp, normalizarTelefoneWhatsapp,
} from "@/lib/whatsappShare";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  emitentes: EmitenteNfe[];
}

interface NotaFechamento {
  id: string; numero: number | null; serie: string | null; status: string | null;
  total_nota: number | null; uuid_api: string | null; info_complementar: string | null; data_emissao: string | null;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TEL_KEY = "sisagro_whatsapp_contador";
const isAut = (s: string | null) => s === "autorizada" || s === "autorizado";
const isCanc = (s: string | null) => s === "cancelada" || s === "cancelado";
const nomeEmitente = (e?: EmitenteNfe) => e?.inscricao?.nome || e?.granja?.razao_social || "Emitente";

function mesAnterior(): string {
  const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

async function blobParaBase64(b: Blob): Promise<string> {
  const buf = new Uint8Array(await b.arrayBuffer());
  let bin = "";
  for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  return btoa(bin);
}

export function FechamentoMensalContadorDialog({ open, onOpenChange, emitentes }: Props) {
  const focusNfe = useFocusNfe();
  const [emitenteId, setEmitenteId] = useState<string | undefined>(undefined);
  const [mes, setMes] = useState(mesAnterior());
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [progresso, setProgresso] = useState<number | null>(null);
  const [zip, setZip] = useState<{ blob: Blob; nome: string; falhas: number } | null>(null);
  const [enviandoEmail, setEnviandoEmail] = useState(false);

  const emitente = emitentes.find((e) => e.id === emitenteId);

  useEffect(() => {
    if (!open) return;
    if (!emitenteId && emitentes.length === 1) setEmitenteId(emitentes[0].id);
    setTelefone(localStorage.getItem(TEL_KEY) ?? "");
  }, [open, emitentes, emitenteId]);

  useEffect(() => { setEmail(emitente?.email_contador ?? ""); }, [emitente]);
  useEffect(() => { setZip(null); }, [emitenteId, mes]);

  const { data: notas = [], isLoading } = useQuery({
    queryKey: ["fechamento-mensal", emitenteId, mes],
    enabled: open && !!emitenteId && /^\d{4}-\d{2}$/.test(mes),
    staleTime: 30_000,
    queryFn: async (): Promise<NotaFechamento[]> => {
      const [a, m] = mes.split("-").map(Number);
      const ini = `${mes}-01`;
      const fim = new Date(a, m, 1).toISOString().slice(0, 10);
      const { data, error } = await supabase
        .from("notas_fiscais")
        .select("id, numero, serie, status, total_nota, uuid_api, info_complementar, data_emissao")
        .eq("emitente_id", emitenteId!)
        .gte("data_emissao", ini).lt("data_emissao", fim)
        .in("status", ["autorizada", "autorizado", "cancelada", "cancelado"])
        .order("numero");
      if (error) throw error;
      return (data ?? []) as NotaFechamento[];
    },
  });

  const resumo = useMemo(() => {
    const aut = notas.filter((n) => isAut(n.status));
    const canc = notas.filter((n) => isCanc(n.status));
    const cce = notas.filter((n) => (n.info_complementar ?? "").includes("Carta de Correção"));
    return { aut: aut.length, canc: canc.length, cce: cce.length, valor: aut.reduce((s, n) => s + Number(n.total_nota ?? 0), 0) };
  }, [notas]);

  const [ano, mm] = mes.split("-");
  const competencia = `${mm}/${ano}`;
  const resumoLinhas = [
    `Emitente: ${nomeEmitente(emitente)}`,
    `Competência: ${competencia}`,
    `NF-es autorizadas: ${resumo.aut} — Total: ${formatarMoedaBR(resumo.valor)}`,
    `NF-es canceladas: ${resumo.canc}`,
    `Notas com Carta de Correção: ${resumo.cce}`,
  ];

  const gerarZip = async () => {
    if (zip) return zip;
    if (!notas.length) { toast.error("Nenhuma nota no período."); return null; }
    const z = new JSZip();
    let feitos = 0; let falhas = 0;
    const tarefas: Array<() => Promise<void>> = [];
    for (const n of notas) {
      const ref = n.uuid_api || `nfe_${n.id}`;
      const base = `NFe_${n.numero ?? n.id}`;
      const add = (pasta: string, tipo: Parameters<typeof focusNfe.obterArquivo>[1], nome: string) =>
        tarefas.push(async () => {
          try { z.folder(pasta)!.file(nome, await focusNfe.obterArquivo(ref, tipo, n.id)); }
          catch { falhas++; }
          feitos++; setProgresso(Math.round((feitos / tarefas.length) * 100));
        });
      const grupo = isCanc(n.status) ? "Canceladas" : "Autorizadas";
      add(`${grupo}/XML`, "xml", `${base}.xml`);
      add(`${grupo}/DANFE`, "danfe", `${base}.pdf`);
      if (isCanc(n.status)) add("Canceladas/Eventos", "xml_cancelamento", `${base}_cancelamento.xml`);
      if ((n.info_complementar ?? "").includes("Carta de Correção")) add("Cartas_Correcao", "cce_xml", `${base}_cce.xml`);
    }
    setProgresso(0);
    // Concorrência limitada para não sobrecarregar o provedor fiscal.
    const fila = [...tarefas];
    await Promise.all(Array.from({ length: 4 }, async () => { while (fila.length) await fila.shift()!(); }));
    z.file("Resumo.txt", [...resumoLinhas, falhas ? `Arquivos não obtidos: ${falhas}` : ""].join("\r\n"));
    const blob = await z.generateAsync({ type: "blob" });
    const nome = `Fechamento_Fiscal_${nomeEmitente(emitente).replace(/\W+/g, "_")}_${mm}_${ano}.zip`;
    const r = { blob, nome, falhas };
    setZip(r); setProgresso(null);
    if (falhas) toast.warning(`${falhas} arquivo(s) não puderam ser obtidos do provedor.`);
    return r;
  };

  const handleBaixar = async () => { const r = await gerarZip(); if (r) baixarBlob(r.blob, r.nome); };

  const handleEmail = async () => {
    const lista = email.split(/[;,\s]+/).map((s) => s.trim()).filter((s) => EMAIL_RE.test(s));
    if (!lista.length) { toast.error("Informe o e-mail do contador."); return; }
    setEnviandoEmail(true);
    try {
      const r = await gerarZip(); if (!r) return;
      const { data, error } = await supabase.functions.invoke("fechamento-fiscal-email", {
        body: { emails: lista, assunto: `Fechamento fiscal ${competencia} — ${nomeEmitente(emitente)}`,
          resumoLinhas, nomeArquivo: r.nome, zipBase64: await blobParaBase64(r.blob) },
      });
      if (error) {
        const ctx = (error as { context?: Response }).context;
        const det = ctx ? await ctx.json().catch(() => null) : null;
        throw new Error(det?.error ?? error.message);
      }
      if (data?.error) throw new Error(data.error);
      toast.success(`Pacote enviado para ${lista.join(", ")}`);
    } catch (e) {
      toast.error("Falha ao enviar o e-mail", { description: e instanceof Error ? e.message : String(e), duration: 10000 });
    } finally { setEnviandoEmail(false); }
  };

  const handleWhatsapp = async () => {
    const tel = normalizarTelefoneWhatsapp(telefone);
    if (!tel) { toast.error("Informe o WhatsApp do contador com DDD."); return; }
    localStorage.setItem(TEL_KEY, telefone);
    const r = await gerarZip(); if (!r) return;
    const texto = `Olá! Segue o fechamento fiscal.\n${resumoLinhas.join("\n")}`;
    const ok = await compartilharArquivosNativo([new File([r.blob], r.nome, { type: "application/zip" })], texto);
    if (!ok) {
      baixarBlob(r.blob, r.nome);
      abrirLinkNovaAba(linkWhatsapp(tel, texto));
      toast.success("WhatsApp aberto com o resumo", { description: "O pacote ZIP foi baixado — arraste-o para a conversa.", duration: 10000 });
    }
  };

  const ocupado = progresso !== null || enviandoEmail;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><FolderArchive className="h-5 w-5 text-primary" /> Fechamento do mês para o contador</DialogTitle>
          <DialogDescription>Reúne XMLs e DANFEs das notas autorizadas e canceladas do mês.</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label>Emitente</Label>
            <Select value={emitenteId} onValueChange={setEmitenteId}>
              <SelectTrigger><SelectValue placeholder="Selecione o emitente" /></SelectTrigger>
              <SelectContent>
                {emitentes.map((e) => <SelectItem key={e.id} value={e.id}>{nomeEmitente(e)} - Série {e.serie_nfe}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="fm-mes">Mês de competência</Label>
            <Input id="fm-mes" type="month" value={mes} onChange={(e) => setMes(e.target.value)} />
          </div>
        </div>

        {emitenteId && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {[["Autorizadas", resumo.aut], ["Canceladas", resumo.canc], ["Com CC-e", resumo.cce], ["Valor total", formatarMoedaBR(resumo.valor)]].map(([l, v]) => (
              <div key={String(l)} className="rounded-md border bg-card p-3">
                <p className="text-xs text-muted-foreground">{l}</p>
                <p className="text-lg font-semibold text-foreground">{isLoading ? "…" : v}</p>
              </div>
            ))}
          </div>
        )}

        {progresso !== null && (
          <div className="space-y-1"><p className="text-sm text-muted-foreground">Baixando arquivos… {progresso}%</p><Progress value={progresso} /></div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="fm-email">E-mail do contador</Label>
            <Input id="fm-email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="contador@exemplo.com" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="fm-tel">WhatsApp do contador</Label>
            <Input id="fm-tel" inputMode="tel" value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="(55) 99999-9999" />
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={handleBaixar} disabled={ocupado || !notas.length}><Download className="h-4 w-4 mr-2" />Baixar ZIP</Button>
          <Button variant="outline" onClick={handleEmail} disabled={ocupado || !notas.length}><Mail className="h-4 w-4 mr-2" />{enviandoEmail ? "Enviando..." : "Enviar por e-mail"}</Button>
          <Button onClick={handleWhatsapp} disabled={ocupado || !notas.length}><MessageCircle className="h-4 w-4 mr-2" />Enviar por WhatsApp</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
