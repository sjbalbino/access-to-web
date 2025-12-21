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
import { useTransportadoras } from "@/hooks/useTransportadoras";
import {
  RemessaVenda,
  useUpdateRemessaVenda,
  calcularDescontoUmidade,
  calcularDescontoImpureza,
} from "@/hooks/useRemessasVenda";
import { toast } from "sonner";

interface EditarRemessaDialogProps {
  remessa: RemessaVenda | null;
  precoKg: number;
  onClose: () => void;
}

export function EditarRemessaDialog({ remessa, precoKg, onClose }: EditarRemessaDialogProps) {
  const { data: silos } = useSilos();
  const { transportadoras } = useTransportadoras();
  const updateRemessa = useUpdateRemessaVenda();

  const [dataRemessa, setDataRemessa] = useState("");
  const [pesoTara, setPesoTara] = useState(0);
  const [pesoBruto, setPesoBruto] = useState(0);
  const [ph, setPh] = useState(0);
  const [umidade, setUmidade] = useState(0);
  const [impureza, setImpureza] = useState(0);
  const [siloId, setSiloId] = useState("");
  const [transportadoraId, setTransportadoraId] = useState("");
  const [motorista, setMotorista] = useState("");
  const [motoristaCpf, setMotoristaCpf] = useState("");
  const [placa, setPlaca] = useState("");
  const [ufPlaca, setUfPlaca] = useState("");
  const [observacoes, setObservacoes] = useState("");

  // Valores calculados
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
      setDataRemessa(remessa.data_remessa || "");
      setPesoTara(remessa.peso_tara || 0);
      setPesoBruto(remessa.peso_bruto || 0);
      setPh(remessa.ph || 0);
      setUmidade(remessa.umidade || 0);
      setImpureza(remessa.impureza || 0);
      setSiloId(remessa.silo_id || "");
      setTransportadoraId(remessa.transportadora_id || "");
      setMotorista(remessa.motorista || "");
      setMotoristaCpf(remessa.motorista_cpf || "");
      setPlaca(remessa.placa || "");
      setUfPlaca(remessa.uf_placa || "");
      setObservacoes(remessa.observacoes || "");
    }
  }, [remessa]);

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

  // Determinar status baseado nos pesos
  const determinarStatus = () => {
    if (pesoBruto > 0) return "carregado";
    if (pesoTara > 0) return "carregando";
    return "carregando";
  };

  const handleSalvar = async () => {
    if (!remessa) return;

    if (!siloId) {
      toast.error("Silo é obrigatório!");
      return;
    }

    const status = determinarStatus();

    await updateRemessa.mutateAsync({
      id: remessa.id,
      data_remessa: dataRemessa,
      peso_tara: pesoTara,
      peso_bruto: pesoBruto,
      peso_liquido: kgRemessa,
      ph,
      umidade,
      impureza,
      silo_id: siloId,
      transportadora_id: transportadoraId || null,
      motorista: motorista || null,
      motorista_cpf: motoristaCpf || null,
      placa: placa || null,
      uf_placa: ufPlaca || null,
      observacoes: observacoes || null,
      kg_remessa: kgRemessa,
      kg_desconto_umidade: kgDescontoUmidade,
      kg_desconto_impureza: kgDescontoImpureza,
      kg_nota: kgNota,
      sacos: sacosNota,
      sacos_remessa: sacosRemessa,
      sacos_nota: sacosNota,
      valor_remessa: valorRemessa,
      valor_nota: valorNota,
      status,
    });

    onClose();
  };

  if (!remessa) return null;

  return (
    <Dialog open={!!remessa} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Editar Remessa #{remessa.codigo}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Data e Pesagem */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Data *</Label>
              <Input
                type="date"
                value={dataRemessa}
                onChange={(e) => setDataRemessa(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Peso Tara (kg)</Label>
              <Input
                type="number"
                step="1"
                value={pesoTara || ""}
                onChange={(e) => setPesoTara(Number(e.target.value))}
                className="text-right"
              />
            </div>
            <div className="space-y-2">
              <Label>Peso Bruto (kg)</Label>
              <Input
                type="number"
                step="1"
                value={pesoBruto || ""}
                onChange={(e) => setPesoBruto(Number(e.target.value))}
                className="text-right"
              />
            </div>
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
          </div>

          {/* Silo e Qualidade */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
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
          </div>

          {/* Descontos e Valores */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-4">
            <div className="space-y-2">
              <Label className="text-xs">Desc. Umid.</Label>
              <Input
                type="text"
                value={formatNumber(kgDescontoUmidade)}
                readOnly
                className="bg-muted text-destructive text-right text-sm"
                tabIndex={-1}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Desc. Impur.</Label>
              <Input
                type="text"
                value={formatNumber(kgDescontoImpureza)}
                readOnly
                className="bg-muted text-destructive text-right text-sm"
                tabIndex={-1}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Kg Nota</Label>
              <Input
                type="text"
                value={formatNumber(kgNota)}
                readOnly
                className="bg-muted font-bold text-success text-right text-sm"
                tabIndex={-1}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Sacos Nota</Label>
              <Input
                type="text"
                value={formatNumber(sacosNota, 2)}
                readOnly
                className="bg-muted text-right text-sm"
                tabIndex={-1}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Vlr Remessa</Label>
              <Input
                type="text"
                value={formatCurrency(valorRemessa)}
                readOnly
                className="bg-muted text-right text-sm"
                tabIndex={-1}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Vlr Nota</Label>
              <Input
                type="text"
                value={formatCurrency(valorNota)}
                readOnly
                className="bg-muted font-bold text-primary text-right text-sm"
                tabIndex={-1}
              />
            </div>
          </div>

          {/* Transporte */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label>Transportadora</Label>
              <Select value={transportadoraId} onValueChange={setTransportadoraId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {transportadoras?.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Motorista</Label>
              <Input
                value={motorista}
                onChange={(e) => setMotorista(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>CPF Motorista</Label>
              <Input
                value={motoristaCpf}
                onChange={(e) => setMotoristaCpf(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Placa</Label>
              <Input
                value={placa}
                onChange={(e) => setPlaca(e.target.value.toUpperCase())}
                maxLength={7}
              />
            </div>
            <div className="space-y-2">
              <Label>UF</Label>
              <Input
                value={ufPlaca}
                onChange={(e) => setUfPlaca(e.target.value.toUpperCase())}
                maxLength={2}
              />
            </div>
          </div>

          {/* Observações */}
          <div className="space-y-2">
            <Label>Observações</Label>
            <Input
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Observações da remessa..."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSalvar} disabled={updateRemessa.isPending}>
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
