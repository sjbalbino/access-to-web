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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSilos } from "@/hooks/useSilos";
import { useTransportadoras } from "@/hooks/useTransportadoras";
import {
  RemessaVenda,
  useUpdateRemessaVenda,
} from "@/hooks/useRemessasVenda";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Package, Truck, FileText } from "lucide-react";

interface PesarBrutoDialogProps {
  remessa: RemessaVenda | null;
  precoKg: number;
  exigePh?: boolean;
  onClose: () => void;
}

export function PesarBrutoDialog({ remessa, precoKg, exigePh = true, onClose }: PesarBrutoDialogProps) {
  const { data: silos } = useSilos();
  const { transportadoras } = useTransportadoras();
  const updateRemessa = useUpdateRemessaVenda();
  const { user, profile } = useAuth();

  const [pesoBruto, setPesoBruto] = useState(0);
  const [kgNota, setKgNota] = useState(0);
  const [ph, setPh] = useState(0);
  const [umidade, setUmidade] = useState(0);
  const [impureza, setImpureza] = useState(0);
  const [siloId, setSiloId] = useState("");
  const [balanceiro, setBalanceiro] = useState("");
  const [transportadoraId, setTransportadoraId] = useState("");
  const [motorista, setMotorista] = useState("");
  const [motoristaCpf, setMotoristaCpf] = useState("");
  const [placa, setPlaca] = useState("");
  const [ufPlaca, setUfPlaca] = useState("");
  const [observacoes, setObservacoes] = useState("");

  // Valores calculados
  const pesoTara = remessa?.peso_tara || 0;
  const kgRemessa = pesoBruto > pesoTara ? pesoBruto - pesoTara : 0;
  const sacosRemessa = kgRemessa / 60;
  const sacosNota = kgNota / 60;
  const valorRemessa = kgRemessa * precoKg;
  const valorNota = kgNota * precoKg;

  // Preencher valores da remessa quando abrir
  useEffect(() => {
    if (remessa) {
      setPesoBruto(remessa.peso_bruto || 0);
      setKgNota(remessa.kg_nota || 0);
      setPh(remessa.ph || 0);
      setUmidade(remessa.umidade || 0);
      setImpureza(remessa.impureza || 0);
      setSiloId(remessa.silo_id || "");
      setBalanceiro(remessa.balanceiro || profile?.nome || user?.email || "");
      setTransportadoraId(remessa.transportadora_id || "");
      setMotorista(remessa.motorista || "");
      setMotoristaCpf(remessa.motorista_cpf || "");
      setPlaca(remessa.placa || "");
      setUfPlaca(remessa.uf_placa || "");
      setObservacoes(remessa.observacoes || "");
    }
  }, [remessa, user]);

  // Atualizar kgNota quando kgRemessa mudar
  useEffect(() => {
    if (kgRemessa > 0) {
      setKgNota(kgRemessa);
    }
  }, [kgRemessa]);

  // Preencher dados da transportadora ao selecionar
  useEffect(() => {
    if (transportadoraId && transportadoras) {
      const transp = transportadoras.find(t => t.id === transportadoraId);
      if (transp) {
        if (transp.placa_padrao && !placa) setPlaca(transp.placa_padrao);
        if (transp.uf_placa_padrao && !ufPlaca) setUfPlaca(transp.uf_placa_padrao);
        if (transp.motorista_padrao && !motorista) setMotorista(transp.motorista_padrao);
        if (transp.motorista_cpf_padrao && !motoristaCpf) setMotoristaCpf(transp.motorista_cpf_padrao);
      }
    }
  }, [transportadoraId, transportadoras]);

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
      ph: exigePh ? ph : null,
      umidade,
      impureza,
      silo_id: siloId,
      balanceiro,
      transportadora_id: transportadoraId || null,
      motorista: motorista || null,
      motorista_cpf: motoristaCpf || null,
      placa: placa || null,
      uf_placa: ufPlaca || null,
      observacoes: observacoes || null,
      kg_remessa: kgRemessa,
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
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Pesar Bruto - Remessa #{remessa.codigo}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Card 1: Dados da Remessa */}
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader className="py-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Package className="h-4 w-4" />
                Dados da Remessa
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Pesagem */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
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
                <div className="space-y-2">
                  <Label>Preço/Kg</Label>
                  <Input
                    type="text"
                    value={formatCurrency(precoKg)}
                    readOnly
                    className="bg-muted text-right"
                    tabIndex={-1}
                  />
                </div>
              </div>

              {/* Valores na ordem solicitada - dividido em duas linhas para evitar truncamento */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs">Kgs Remessa</Label>
                  <Input
                    type="text"
                    value={formatNumber(kgRemessa)}
                    readOnly
                    className="bg-muted font-bold text-right"
                    tabIndex={-1}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Sacos Remessa</Label>
                  <Input
                    type="text"
                    value={formatNumber(sacosRemessa, 2)}
                    readOnly
                    className="bg-muted text-right"
                    tabIndex={-1}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Kgs Nota</Label>
                  <Input
                    type="number"
                    step="1"
                    value={kgNota || ""}
                    onChange={(e) => setKgNota(Number(e.target.value))}
                    className="text-right font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Sacos Nota</Label>
                  <Input
                    type="text"
                    value={formatNumber(sacosNota, 2)}
                    readOnly
                    className="bg-muted text-right"
                    tabIndex={-1}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs">Preço Kg</Label>
                  <Input
                    type="text"
                    value={formatCurrency(precoKg)}
                    readOnly
                    className="bg-muted text-right"
                    tabIndex={-1}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Total da Remessa</Label>
                  <Input
                    type="text"
                    value={formatCurrency(valorRemessa)}
                    readOnly
                    className="bg-muted text-right font-semibold"
                    tabIndex={-1}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Total da Nota</Label>
                  <Input
                    type="text"
                    value={formatCurrency(valorNota)}
                    readOnly
                    className="bg-muted font-bold text-primary text-right"
                    tabIndex={-1}
                  />
                </div>
              </div>

              {/* Silo, PH, Umidade, Impureza, Balanceiro */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
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
                {exigePh && (
                  <div className="space-y-2">
                    <Label>PH</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={ph || ""}
                      onChange={(e) => setPh(Number(e.target.value))}
                      className="text-right"
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Umidade %</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={umidade || ""}
                    onChange={(e) => setUmidade(Number(e.target.value))}
                    className="text-right"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Impureza %</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={impureza || ""}
                    onChange={(e) => setImpureza(Number(e.target.value))}
                    className="text-right"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Balanceiro</Label>
                  <Input
                    value={balanceiro}
                    readOnly
                    className="bg-muted"
                    tabIndex={-1}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

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
