import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSilos } from "@/hooks/useSilos";
import {
  RemessaVenda,
  useUpdateRemessaVenda,
  calcularDescontoUmidade,
  calcularDescontoImpureza,
} from "@/hooks/useRemessasVenda";
import { toast } from "sonner";

interface PesarBrutoDialogProps {
  remessa: RemessaVenda | null;
  precoKg: number;
  onClose: () => void;
}

export function PesarBrutoDialog({ remessa, precoKg, onClose }: PesarBrutoDialogProps) {
  const { data: silos } = useSilos();
  const updateRemessa = useUpdateRemessaVenda();

  const [pesoBruto, setPesoBruto] = useState(0);
  const [ph, setPh] = useState(0);
  const [umidade, setUmidade] = useState(0);
  const [impureza, setImpureza] = useState(0);
  const [siloId, setSiloId] = useState("");

  // Valores calculados
  const pesoTara = remessa?.peso_tara || 0;
  const kgRemessa = pesoBruto > pesoTara ? pesoBruto - pesoTara : 0;
  const kgDescontoUmidade = calcularDescontoUmidade(kgRemessa, umidade);
  const kgDescontoImpureza = calcularDescontoImpureza(kgRemessa, impureza);
  const kgNota = Math.max(0, kgRemessa - kgDescontoUmidade - kgDescontoImpureza);
  const sacosRemessa = kgRemessa / 60;
  const sacosNota = kgNota / 60;
  const valorRemessa = kgRemessa * precoKg;
  const valorNota = kgNota * precoKg;

  // Preencher valores da remessa quando abrir
  useEffect(() => {
    if (remessa) {
      setPesoBruto(remessa.peso_bruto || 0);
      setPh(remessa.ph || 0);
      setUmidade(remessa.umidade || 0);
      setImpureza(remessa.impureza || 0);
      setSiloId(remessa.silo_id || "");
    }
  }, [remessa]);

  const formatNumber = (value: number, decimals: number = 0) => {
    return new Intl.NumberFormat("pt-BR", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const handleSalvar = async () => {
    if (!remessa) return;

    if (!siloId) {
      toast.error("Silo é obrigatório!");
      return;
    }

    if (pesoBruto <= pesoTara) {
      toast.error("Peso bruto deve ser maior que o peso da tara!");
      return;
    }

    await updateRemessa.mutateAsync({
      id: remessa.id,
      peso_bruto: pesoBruto,
      peso_liquido: kgRemessa,
      ph,
      umidade,
      impureza,
      silo_id: siloId,
      kg_remessa: kgRemessa,
      kg_desconto_umidade: kgDescontoUmidade,
      kg_desconto_impureza: kgDescontoImpureza,
      kg_nota: kgNota,
      sacos: sacosNota,
      sacos_remessa: sacosRemessa,
      sacos_nota: sacosNota,
      valor_remessa: valorRemessa,
      valor_nota: valorNota,
      status: "carregado",
    });

    onClose();
  };

  if (!remessa) return null;

  return (
    <Dialog open={!!remessa} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            Pesar Bruto - Remessa #{remessa.codigo}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Peso Tara (readonly) */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Peso Tara (kg)</Label>
              <Input
                type="text"
                value={formatNumber(pesoTara)}
                readOnly
                className="bg-muted text-right"
                tabIndex={-1}
              />
            </div>
            <div className="space-y-2">
              <Label>Peso Bruto (kg) *</Label>
              <Input
                type="number"
                step="1"
                value={pesoBruto || ""}
                onChange={(e) => setPesoBruto(Number(e.target.value))}
                className="text-right"
                autoFocus
              />
            </div>
          </div>

          {/* Kgs Calculados */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Kgs Remessa</Label>
              <Input
                type="text"
                value={formatNumber(kgRemessa)}
                readOnly
                className="bg-muted font-bold text-right"
                tabIndex={-1}
              />
            </div>
            <div className="space-y-2">
              <Label>Sacos Remessa</Label>
              <Input
                type="text"
                value={formatNumber(sacosRemessa, 2)}
                readOnly
                className="bg-muted text-right"
                tabIndex={-1}
              />
            </div>
          </div>

          {/* Qualidade */}
          <div className="grid grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>PH</Label>
              <Input
                type="number"
                step="0.01"
                value={ph || ""}
                onChange={(e) => setPh(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label>Umidade %</Label>
              <Input
                type="number"
                step="0.01"
                value={umidade || ""}
                onChange={(e) => setUmidade(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label>Impureza %</Label>
              <Input
                type="number"
                step="0.01"
                value={impureza || ""}
                onChange={(e) => setImpureza(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label>Silo *</Label>
              <Select value={siloId} onValueChange={setSiloId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {silos?.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Descontos */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Desc. Umidade (kg)</Label>
              <Input
                type="text"
                value={formatNumber(kgDescontoUmidade)}
                readOnly
                className="bg-muted text-destructive text-right"
                tabIndex={-1}
              />
            </div>
            <div className="space-y-2">
              <Label>Desc. Impureza (kg)</Label>
              <Input
                type="text"
                value={formatNumber(kgDescontoImpureza)}
                readOnly
                className="bg-muted text-destructive text-right"
                tabIndex={-1}
              />
            </div>
            <div className="space-y-2">
              <Label>Kg Nota</Label>
              <Input
                type="text"
                value={formatNumber(kgNota)}
                readOnly
                className="bg-muted font-bold text-success text-right"
                tabIndex={-1}
              />
            </div>
          </div>

          {/* Valores */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Sacos Nota</Label>
              <Input
                type="text"
                value={formatNumber(sacosNota, 2)}
                readOnly
                className="bg-muted text-right"
                tabIndex={-1}
              />
            </div>
            <div className="space-y-2">
              <Label>Valor Remessa</Label>
              <Input
                type="text"
                value={formatCurrency(valorRemessa)}
                readOnly
                className="bg-muted font-bold text-right"
                tabIndex={-1}
              />
            </div>
            <div className="space-y-2">
              <Label>Valor Nota</Label>
              <Input
                type="text"
                value={formatCurrency(valorNota)}
                readOnly
                className="bg-muted font-bold text-primary text-right"
                tabIndex={-1}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSalvar} disabled={updateRemessa.isPending}>
            Salvar Pesagem
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
