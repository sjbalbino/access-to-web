import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatNumber } from "@/lib/formatters";

export interface ItemDevolucaoSelecionado {
  id: string;
  quantidade: number;
}

export interface DevolucaoCompraOpcoes {
  itens: ItemDevolucaoSelecionado[];
  motivo: string;
}

interface DevolucaoCompraDialogProps {
  entradaId: string | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: (entradaId: string, opcoes: DevolucaoCompraOpcoes) => void;
  gerando: boolean;
}

interface ItemEntrada {
  id: string;
  descricao: string;
  unidade: string;
  quantidade: number;
  valor_unitario: number;
}

const MOTIVOS = [
  "Mercadoria com defeito",
  "Mercadoria em desacordo com o pedido",
  "Mercadoria avariada no transporte",
  "Quantidade enviada a maior",
];

const brl = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

/** Diálogo para escolher itens/quantidades e motivo antes de gerar a NF-e de devolução de compra. */
export function DevolucaoCompraDialog({ entradaId, onOpenChange, onConfirm, gerando }: DevolucaoCompraDialogProps) {
  const [itens, setItens] = useState<ItemEntrada[]>([]);
  const [loading, setLoading] = useState(false);
  const [sel, setSel] = useState<Record<string, number>>({});
  const [motivo, setMotivo] = useState("");

  useEffect(() => {
    if (!entradaId) return;
    let ativo = true;
    setLoading(true);
    setMotivo("");
    supabase
      .from("entradas_nfe_itens")
      .select("id, quantidade, valor_unitario, unidade_medida, produto_xml_descricao, produto:produto_id(nome)")
      .eq("entrada_nfe_id", entradaId)
      .then(({ data }) => {
        const rows: any[] | null = data;
        if (!ativo) return;
        const lista: ItemEntrada[] = (rows || []).map((it: any) => ({
          id: it.id,
          descricao: it.produto?.nome || it.produto_xml_descricao || "-",
          unidade: it.unidade_medida || "",
          quantidade: Number(it.quantidade || 0),
          valor_unitario: Number(it.valor_unitario || 0),
        }));
        setItens(lista);
        setSel(Object.fromEntries(lista.map((i) => [i.id, i.quantidade])));
        setLoading(false);
      });
    return () => { ativo = false; };
  }, [entradaId]);

  const total = useMemo(
    () => itens.reduce((s, i) => s + (sel[i.id] !== undefined ? sel[i.id] * i.valor_unitario : 0), 0),
    [itens, sel],
  );
  const selecionados = itens.filter((i) => sel[i.id] !== undefined && sel[i.id] > 0);
  const qtdInvalida = itens.some((i) => sel[i.id] !== undefined && (sel[i.id] <= 0 || sel[i.id] > i.quantidade));
  const podeConfirmar = selecionados.length > 0 && !qtdInvalida && motivo.trim().length >= 5 && !gerando;

  const toggle = (item: ItemEntrada, checked: boolean) => {
    setSel((prev) => {
      const n = { ...prev };
      if (checked) n[item.id] = item.quantidade; else delete n[item.id];
      return n;
    });
  };

  return (
    <Dialog open={!!entradaId} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Devolução de compra</DialogTitle>
          <DialogDescription>
            Escolha os itens e as quantidades a devolver e informe o motivo. O texto das informações complementares será gerado automaticamente.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="border rounded-lg overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10" />
                  <TableHead>Produto</TableHead>
                  <TableHead className="text-right">Qtd. comprada</TableHead>
                  <TableHead className="text-right w-36">Qtd. a devolver</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {itens.map((i) => {
                  const marcado = sel[i.id] !== undefined;
                  const q = sel[i.id] ?? 0;
                  const erro = marcado && (q <= 0 || q > i.quantidade);
                  return (
                    <TableRow key={i.id}>
                      <TableCell>
                        <Checkbox checked={marcado} onCheckedChange={(c) => toggle(i, c === true)} aria-label={`Devolver ${i.descricao}`} />
                      </TableCell>
                      <TableCell className="max-w-[240px] truncate">{i.descricao}</TableCell>
                      <TableCell className="text-right">{formatNumber(i.quantidade, 2)} {i.unidade}</TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          step="any"
                          min={0}
                          max={i.quantidade}
                          disabled={!marcado}
                          value={marcado ? q : ""}
                          onChange={(ev) => setSel((p) => ({ ...p, [i.id]: Number(ev.target.value) }))}
                          className={erro ? "border-destructive text-right" : "text-right"}
                        />
                      </TableCell>
                      <TableCell className="text-right">{marcado ? brl(q * i.valor_unitario) : "-"}</TableCell>
                    </TableRow>
                  );
                })}
                {itens.length === 0 && (
                  <TableRow><TableCell colSpan={5} className="text-center py-6 text-muted-foreground">Nenhum item nesta entrada</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}

        <div className="flex justify-end text-sm font-semibold">Total da devolução: {brl(total)}</div>
        {qtdInvalida && <p className="text-sm text-destructive">A quantidade a devolver deve ser maior que zero e não pode passar da quantidade comprada.</p>}

        <div className="space-y-2">
          <Label htmlFor="motivo-devolucao">Motivo da devolução *</Label>
          <div className="flex flex-wrap gap-2">
            {MOTIVOS.map((m) => (
              <Button key={m} type="button" size="sm" variant={motivo === m ? "default" : "outline"} onClick={() => setMotivo(m)}>{m}</Button>
            ))}
          </div>
          <Textarea id="motivo-devolucao" value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Descreva o motivo" maxLength={300} />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            disabled={!podeConfirmar}
            onClick={() => entradaId && onConfirm(entradaId, {
              itens: selecionados.map((i) => ({ id: i.id, quantidade: sel[i.id] })),
              motivo: motivo.trim(),
            })}
          >
            {gerando && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Gerar devolução
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
