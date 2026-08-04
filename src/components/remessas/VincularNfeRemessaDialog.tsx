import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatNumber } from "@/lib/formatters";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { Loader2, Link2 } from "lucide-react";

interface NfeCandidato {
  id: string;
  numero: number | null;
  serie: number | null;
  data_emissao: string | null;
  total_nota: number | null;
  dest_nome: string | null;
  volumes_peso_liquido: number | null;
}

interface VincularNfeRemessaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Remessa que ficou sem vínculo com a NF-e */
  remessa: {
    id: string;
    romaneio?: number | null;
    kg_nota?: number | null;
    valor_nota?: number | null;
    data_remessa?: string | null;
  } | null;
  granjaId: string | null | undefined;
  /** CPF/CNPJ do comprador do contrato, usado para restringir candidatas */
  cpfCnpjComprador?: string | null;
  onVinculado?: () => void;
}

/**
 * Permite vincular manualmente uma NF-e já autorizada a uma remessa que ficou
 * com status "Carregado" — cenário típico quando a nota foi rejeitada e depois
 * corrigida/emitida pelo painel de Notas Fiscais, fora do fluxo da remessa.
 */
export function VincularNfeRemessaDialog({
  open,
  onOpenChange,
  remessa,
  granjaId,
  cpfCnpjComprador,
  onVinculado,
}: VincularNfeRemessaDialogProps) {
  const [loading, setLoading] = useState(false);
  const [salvando, setSalvando] = useState<string | null>(null);
  const [candidatos, setCandidatos] = useState<NfeCandidato[]>([]);

  useEffect(() => {
    if (!open || !remessa) return;

    let cancelado = false;

    (async () => {
      setLoading(true);
      try {
        const base = remessa.data_remessa ? new Date(remessa.data_remessa) : new Date();
        const dIni = new Date(base);
        dIni.setDate(dIni.getDate() - 15);
        const dFim = new Date(base);
        dFim.setDate(dFim.getDate() + 15);

        let query = supabase
          .from("notas_fiscais")
          .select("id, numero, serie, data_emissao, total_nota, dest_nome, dest_cpf_cnpj, volumes_peso_liquido")
          .in("status", ["autorizada", "autorizado"])
          .gte("data_emissao", dIni.toISOString())
          .lte("data_emissao", dFim.toISOString())
          .order("data_emissao", { ascending: false });

        if (granjaId) query = query.eq("granja_id", granjaId);

        const { data: notas, error } = await query;
        if (error) throw error;

        const cpf = (cpfCnpjComprador ?? "").replace(/\D/g, "");
        const filtradas = (notas ?? []).filter((n) => {
          const dest = (n.dest_cpf_cnpj ?? "").replace(/\D/g, "");
          return !cpf || !dest || cpf === dest;
        });

        const ids = filtradas.map((n) => n.id);
        const vinculados = new Set<string>();
        if (ids.length > 0) {
          const { data: jaVinculadas } = await supabase
            .from("remessas_venda")
            .select("nota_fiscal_id")
            .in("nota_fiscal_id", ids);
          (jaVinculadas ?? []).forEach((r) => {
            if (r.nota_fiscal_id) vinculados.add(r.nota_fiscal_id);
          });
        }

        const kgRemessa = Number(remessa.kg_nota ?? 0);
        const lista = filtradas
          .filter((n) => !vinculados.has(n.id))
          .map((n) => ({
            id: n.id,
            numero: n.numero,
            serie: n.serie,
            data_emissao: n.data_emissao,
            total_nota: n.total_nota,
            dest_nome: n.dest_nome,
            volumes_peso_liquido: n.volumes_peso_liquido,
          }))
          .sort((a, b) => {
            // Priorizar a nota cujo peso líquido mais se aproxima do KG da remessa
            const da = Math.abs(Number(a.volumes_peso_liquido ?? 0) - kgRemessa);
            const db = Math.abs(Number(b.volumes_peso_liquido ?? 0) - kgRemessa);
            return da - db;
          });

        if (!cancelado) setCandidatos(lista);
      } catch (err) {
        console.error("Erro ao buscar NF-es candidatas:", err);
        if (!cancelado) toast.error("Erro ao buscar NF-es disponíveis");
      } finally {
        if (!cancelado) setLoading(false);
      }
    })();

    return () => {
      cancelado = true;
    };
  }, [open, remessa, granjaId, cpfCnpjComprador]);

  const vincular = async (notaId: string) => {
    if (!remessa) return;
    setSalvando(notaId);
    try {
      const { error } = await supabase
        .from("remessas_venda")
        .update({ nota_fiscal_id: notaId, status: "carregado_nfe" })
        .eq("id", remessa.id);
      if (error) throw error;
      toast.success("NF-e vinculada à remessa com sucesso.");
      onVinculado?.();
      onOpenChange(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "erro desconhecido";
      toast.error("Falha ao vincular: " + message);
    } finally {
      setSalvando(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" /> Vincular NF-e à remessa
          </DialogTitle>
          <DialogDescription>
            NF-es autorizadas compatíveis com a remessa
            {remessa?.romaneio ? ` (romaneio ${remessa.romaneio})` : ""}
            {remessa?.kg_nota ? ` — ${formatNumber(Number(remessa.kg_nota), 0)} kg` : ""}. Use quando a nota foi
            emitida ou corrigida pelo painel de Notas Fiscais e a remessa ficou como "Carregado".
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : candidatos.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            Nenhuma NF-e autorizada compatível e ainda não vinculada foi encontrada.
          </p>
        ) : (
          <div className="max-h-[420px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nº/Série</TableHead>
                  <TableHead>Emissão</TableHead>
                  <TableHead>Destinatário</TableHead>
                  <TableHead className="text-right">Peso líq. (kg)</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {candidatos.map((n) => (
                  <TableRow key={n.id}>
                    <TableCell className="whitespace-nowrap">
                      {n.numero ?? "-"}
                      {n.serie ? `/${n.serie}` : ""}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {n.data_emissao ? format(parseISO(n.data_emissao), "dd/MM/yyyy HH:mm") : "-"}
                    </TableCell>
                    <TableCell className="text-xs max-w-[220px] truncate">{n.dest_nome ?? "-"}</TableCell>
                    <TableCell className="text-right">
                      {formatNumber(Number(n.volumes_peso_liquido ?? 0), 0)}
                    </TableCell>
                    <TableCell className="text-right">
                      R$ {formatNumber(Number(n.total_nota ?? 0), 2)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" disabled={salvando !== null} onClick={() => vincular(n.id)}>
                        {salvando === n.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Vincular"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
