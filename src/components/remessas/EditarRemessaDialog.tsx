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
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Package, Truck, FileText, MapPin } from "lucide-react";
import { formatCpf, formatCpfCnpj, formatPlaca, formatCep, validateCpf } from "@/lib/formatters";

interface LocalEntrega {
  local_entrega_nome?: string;
  local_entrega_cnpj_cpf?: string;
  local_entrega_ie?: string;
  local_entrega_logradouro?: string;
  local_entrega_numero?: string;
  local_entrega_complemento?: string;
  local_entrega_bairro?: string;
  local_entrega_cidade?: string;
  local_entrega_uf?: string;
  local_entrega_cep?: string;
}

interface EditarRemessaDialogProps {
  remessa: RemessaVenda | null;
  precoKg: number;
  exigePh?: boolean;
  localEntrega?: LocalEntrega;
  onClose: () => void;
}

export function EditarRemessaDialog({ remessa, precoKg, exigePh = true, localEntrega, onClose }: EditarRemessaDialogProps) {
  const { data: silos } = useSilos();
  const { transportadoras } = useTransportadoras();
  const updateRemessa = useUpdateRemessaVenda();
  const { user, profile } = useAuth();

  const [dataRemessa, setDataRemessa] = useState("");
  const [pesoTara, setPesoTara] = useState(0);
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
  const kgRemessa = pesoBruto > pesoTara ? pesoBruto - pesoTara : 0;
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
      setKgNota(remessa.kg_nota || 0);
      setPh(remessa.ph || 0);
      setUmidade(remessa.umidade || 0);
      setImpureza(remessa.impureza || 0);
      setSiloId(remessa.silo_id || "");
      setBalanceiro(remessa.balanceiro || profile?.nome || user?.email || "");
      setTransportadoraId(remessa.transportadora_id || "");
      setMotorista(remessa.motorista || "");
      setMotoristaCpf(formatCpf(remessa.motorista_cpf) || "");
      setPlaca(remessa.placa?.replace(/[^A-Za-z0-9]/g, "").toUpperCase() || "");
      setUfPlaca(remessa.uf_placa || "");
      setObservacoes(remessa.observacoes || "");
    }
  }, [remessa, user]);

  // Atualizar kgNota quando kgRemessa mudar (se ainda não foi editado manualmente)
  useEffect(() => {
    if (kgRemessa > 0 && kgNota === 0) {
      setKgNota(kgRemessa);
    }
  }, [kgRemessa]);

  // Preencher dados da transportadora ao selecionar (sempre sobrescreve)
  useEffect(() => {
    if (transportadoraId && transportadoras) {
      const transp = transportadoras.find(t => t.id === transportadoraId);
      if (transp) {
        // Sempre preenche com os dados da transportadora selecionada
        if (transp.placa_padrao) setPlaca(transp.placa_padrao.replace(/[^A-Za-z0-9]/g, "").toUpperCase());
        if (transp.uf_placa_padrao) setUfPlaca(transp.uf_placa_padrao);
        if (transp.motorista_padrao) setMotorista(transp.motorista_padrao);
        if (transp.motorista_cpf_padrao) setMotoristaCpf(formatCpf(transp.motorista_cpf_padrao));
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

    // Validar CPF do motorista se informado
    const cpfLimpo = motoristaCpf?.replace(/\D/g, "") || "";
    if (cpfLimpo.length > 0 && !validateCpf(cpfLimpo)) {
      toast.error("CPF do motorista inválido!");
      return;
    }

    const status = determinarStatus();

    await updateRemessa.mutateAsync({
      id: remessa.id,
      data_remessa: dataRemessa,
      peso_tara: pesoTara,
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
      status,
    });

    onClose();
  };

  if (!remessa) return null;

  return (
    <Dialog open={!!remessa} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Editar Remessa #{remessa.codigo}
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

              {/* Valores na ordem solicitada */}
              <div className="grid grid-cols-2 sm:grid-cols-7 gap-4">
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
                  <Label className="text-xs">Vlr Remessa</Label>
                  <Input
                    type="text"
                    value={formatCurrency(valorRemessa)}
                    readOnly
                    className="bg-muted text-right"
                    tabIndex={-1}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Vlr Nota</Label>
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

          {/* Card 2: Transportadora */}
          <Card className="border-info/20 bg-info/5">
            <CardHeader className="py-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Truck className="h-4 w-4" />
                Transportadora
              </CardTitle>
            </CardHeader>
            <CardContent>
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
                    onChange={(e) => setMotoristaCpf(formatCpf(e.target.value))}
                    maxLength={14}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Placa</Label>
                  <Input
                    value={placa}
                    onChange={(e) => setPlaca(e.target.value.replace(/[^A-Za-z0-9]/g, "").toUpperCase())}
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
            </CardContent>
          </Card>

          {/* Card 3: Local de Entrega */}
          <Card className="border-warning/20 bg-warning/5">
            <CardHeader className="py-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Local de Entrega
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs">Nome</Label>
                  <Input
                    value={localEntrega?.local_entrega_nome || ""}
                    readOnly
                    className="bg-muted"
                    tabIndex={-1}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">CNPJ/CPF</Label>
                  <Input
                    value={formatCpfCnpj(localEntrega?.local_entrega_cnpj_cpf) || ""}
                    readOnly
                    className="bg-muted"
                    tabIndex={-1}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">IE</Label>
                  <Input
                    value={localEntrega?.local_entrega_ie || ""}
                    readOnly
                    className="bg-muted"
                    tabIndex={-1}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                <div className="sm:col-span-2 space-y-2">
                  <Label className="text-xs">Logradouro</Label>
                  <Input
                    value={localEntrega?.local_entrega_logradouro || ""}
                    readOnly
                    className="bg-muted"
                    tabIndex={-1}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Número</Label>
                  <Input
                    value={localEntrega?.local_entrega_numero || ""}
                    readOnly
                    className="bg-muted"
                    tabIndex={-1}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Bairro</Label>
                  <Input
                    value={localEntrega?.local_entrega_bairro || ""}
                    readOnly
                    className="bg-muted"
                    tabIndex={-1}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Complemento</Label>
                  <Input
                    value={localEntrega?.local_entrega_complemento || ""}
                    readOnly
                    className="bg-muted"
                    tabIndex={-1}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs">Cidade</Label>
                  <Input
                    value={localEntrega?.local_entrega_cidade || ""}
                    readOnly
                    className="bg-muted"
                    tabIndex={-1}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">UF</Label>
                  <Input
                    value={localEntrega?.local_entrega_uf || ""}
                    readOnly
                    className="bg-muted"
                    tabIndex={-1}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">CEP</Label>
                  <Input
                    value={localEntrega?.local_entrega_cep || ""}
                    readOnly
                    className="bg-muted"
                    tabIndex={-1}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 4: Observações */}
          <Card className="border-muted-foreground/20 bg-muted/30">
            <CardHeader className="py-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Observações
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Observações da remessa..."
                rows={3}
              />
            </CardContent>
          </Card>
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
