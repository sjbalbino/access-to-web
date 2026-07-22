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

type Origem = "compra_cereais" | "devolucao_deposito";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  origem: Origem;
  registroId: string;
  granjaId: string;
  cpfCnpjContraparte: string | null | undefined;
  valorTotal: number;
  dataOperacao: string; // ISO date
  onVinculado?: () => void;
}

interface NfeCandidato {
  id: string;
  numero: number | null;
  serie: number | null;
  data_emissao: string | null;
  total_nota: number | null;
  dest_cpf_cnpj: string | null;
}

const CFOP_MAP: Record<Origem, string[]> = {
  compra_cereais: ["1101", "1102", "2101", "2102"],
  devolucao_deposito: ["1905", "2905"],
};

const TABELA: Record<Origem, "compras_cereais" | "devolucoes_deposito"> = {
  compra_cereais: "compras_cereais",
  devolucao_deposito: "devolucoes_deposito",
};

export function VincularNfeDialog({
  open,
  onOpenChange,
  origem,
  registroId,
  granjaId,
  cpfCnpjContraparte,
  valorTotal,
  dataOperacao,
  onVinculado,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [salvando, setSalvando] = useState<string | null>(null);
  const [candidatos, setCandidatos] = useState<NfeCandidato[]>([]);

  useEffect(() => {
    if (!open) return;
    (async () => {
      setLoading(true);
      try {
        const cfops = CFOP_MAP[origem];
        // Buscar NF-es autorizadas da granja sem origem já vinculada (heurística ampla)
        const dIni = new Date(dataOperacao);
        dIni.setDate(dIni.getDate() - 10);
        const dFim = new Date(dataOperacao);
        dFim.setDate(dFim.getDate() + 10);

        const { data: itens } = await supabase
          .from("notas_fiscais_itens")
          .select("nota_fiscal_id, cfop, notas_fiscais!inner(id, numero, serie, data_emissao, total_nota, dest_cpf_cnpj, granja_id, status)")
          .in("cfop", cfops)
          .eq("notas_fiscais.granja_id", granjaId)
          .in("notas_fiscais.status", ["autorizada", "autorizado"])
          .gte("notas_fiscais.data_emissao", dIni.toISOString())
          .lte("notas_fiscais.data_emissao", dFim.toISOString());

        const map = new Map<string, NfeCandidato>();
        const cpf = (cpfCnpjContraparte ?? "").replace(/\D/g, "");
        (itens ?? []).forEach((row: any) => {
          const nf = row.notas_fiscais;
          if (!nf) return;
          const dest = (nf.dest_cpf_cnpj ?? "").replace(/\D/g, "");
          if (cpf && dest && cpf !== dest) return;
          map.set(nf.id, {
            id: nf.id,
            numero: nf.numero,
            serie: nf.serie,
            data_emissao: nf.data_emissao,
            total_nota: nf.total_nota,
            dest_cpf_cnpj: nf.dest_cpf_cnpj,
          });
        });

        // Excluir NF-es já vinculadas a outra origem
        const ids = Array.from(map.keys());
        if (ids.length > 0) {
          const [{ data: comprasVinc }, { data: devVinc }] = await Promise.all([
            supabase.from("compras_cereais").select("nota_fiscal_id").in("nota_fiscal_id", ids),
            supabase.from("devolucoes_deposito").select("nota_fiscal_id").in("nota_fiscal_id", ids),
          ]);
          const vinculados = new Set<string>();
          (comprasVinc ?? []).forEach((r: any) => r.nota_fiscal_id && vinculados.add(r.nota_fiscal_id));
          (devVinc ?? []).forEach((r: any) => r.nota_fiscal_id && vinculados.add(r.nota_fiscal_id));
          vinculados.forEach((id) => map.delete(id));
        }

        const list = Array.from(map.values()).sort((a, b) => {
          // priorizar match de valor
          const da = Math.abs(Number(a.total_nota ?? 0) - valorTotal);
          const db = Math.abs(Number(b.total_nota ?? 0) - valorTotal);
          return da - db;
        });
        setCandidatos(list);
      } catch (err) {
        console.error(err);
        toast.error("Erro ao buscar NF-es disponíveis");
      } finally {
        setLoading(false);
      }
    })();
  }, [open, origem, granjaId, cpfCnpjContraparte, valorTotal, dataOperacao]);

  const vincular = async (notaId: string) => {
    setSalvando(notaId);
    try {
      const tabela = TABELA[origem];
      const { error } = await supabase
        .from(tabela)
        .update({ nota_fiscal_id: notaId, status: "nfe_emitida" })
        .eq("id", registroId);
      if (error) throw error;
      toast.success("NF-e vinculada com sucesso.");
      onVinculado?.();
      onOpenChange(false);
    } catch (err: any) {
      toast.error("Falha ao vincular: " + (err.message ?? "erro desconhecido"));
    } finally {
      setSalvando(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" /> Vincular NF-e existente
          </DialogTitle>
          <DialogDescription>
            NF-es autorizadas da granja compatíveis com esta {origem === "compra_cereais" ? "compra" : "devolução"}.
            Selecione a nota correta para atualizar o status.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : candidatos.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            Nenhuma NF-e autorizada compatível encontrada.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nº</TableHead>
                <TableHead>Emissão</TableHead>
                <TableHead>CPF/CNPJ dest.</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {candidatos.map((n) => (
                <TableRow key={n.id}>
                  <TableCell>{n.numero ?? "-"}{n.serie ? `/${n.serie}` : ""}</TableCell>
                  <TableCell>
                    {n.data_emissao ? format(parseISO(n.data_emissao), "dd/MM/yyyy HH:mm") : "-"}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{n.dest_cpf_cnpj ?? "-"}</TableCell>
                  <TableCell className="text-right">R$ {formatNumber(Number(n.total_nota ?? 0), 2)}</TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      disabled={salvando !== null}
                      onClick={() => vincular(n.id)}
                    >
                      {salvando === n.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Vincular"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
