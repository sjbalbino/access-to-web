import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useSaveConjunto, type ControleConjunto } from "@/hooks/useControleParalelo";

export interface ConjuntoFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conjunto?: ControleConjunto | null;
}

export function ConjuntoFormDialog({ open, onOpenChange, conjunto }: ConjuntoFormDialogProps) {
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [ativo, setAtivo] = useState(true);
  const salvar = useSaveConjunto();

  useEffect(() => {
    if (!open) return;
    setNome(conjunto?.nome ?? "");
    setDescricao(conjunto?.descricao ?? "");
    setAtivo(conjunto?.ativo ?? true);
  }, [open, conjunto]);

  const handleSalvar = async () => {
    if (!nome.trim()) return;
    await salvar.mutateAsync({
      id: conjunto?.id,
      nome: nome.trim(),
      descricao: descricao.trim() || null,
      ativo,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{conjunto ? "Editar Conjunto" : "Novo Conjunto de Controle"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nome-conjunto">Nome *</Label>
            <Input
              id="nome-conjunto"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex.: Controle Safra 2026 - Sócio A"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="descricao-conjunto">Descrição</Label>
            <Textarea
              id="descricao-conjunto"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              rows={3}
              placeholder="Finalidade deste controle paralelo"
            />
          </div>

          <div className="flex items-center gap-3">
            <Switch id="ativo-conjunto" checked={ativo} onCheckedChange={setAtivo} />
            <Label htmlFor="ativo-conjunto">Conjunto ativo</Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSalvar} disabled={!nome.trim() || salvar.isPending}>
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
