import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useTransportadoras, TransportadoraInsert, Transportadora } from "@/hooks/useTransportadoras";
import { useGranjas } from "@/hooks/useGranjas";
import { useCnpjLookup } from "@/hooks/useCnpjLookup";
import { useCepLookup, formatCep } from "@/hooks/useCepLookup";
import { formatCpf, formatCpfCnpj, unformatDocument, validateCnpj, validateCpf } from "@/lib/formatters";
import { isIeGenerica, validarIeUF } from "@/lib/inscricaoEstadualValidator";

const UFS = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS",
  "MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
];

const emptyForm: TransportadoraInsert = {
  granja_id: null, nome: "", cpf_cnpj: null, inscricao_estadual: null,
  logradouro: null, numero: null, bairro: null, cidade: null, uf: null, cep: null,
  telefone: null, email: null, placa_padrao: null, uf_placa_padrao: null, rntc: null,
  motorista_padrao: null, motorista_cpf_padrao: null, ativa: true,
};

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  transportadora?: Transportadora | null;
  onSaved?: (t: Transportadora) => void;
}

export function TransportadoraFormDialog({ open, onOpenChange, transportadora, onSaved }: Props) {
  const { createTransportadora, updateTransportadora } = useTransportadoras();
  const granjasQuery = useGranjas();
  const granjas = granjasQuery.data || [];
  const { isLoading: cnpjLoading, fetchCnpj } = useCnpjLookup();
  const { isLoading: cepLoading, fetchCep } = useCepLookup();

  const [formData, setFormData] = useState<TransportadoraInsert>(emptyForm);

  useEffect(() => {
    if (!open) return;
    if (transportadora) {
      const { id, created_at, updated_at, ...rest } = transportadora as any;
      setFormData({ ...emptyForm, ...rest });
    } else {
      setFormData({ ...emptyForm, granja_id: granjas[0]?.id || null });
    }
  }, [open, transportadora, granjas]);

  const handleCnpjBlur = async (valor: string) => {
    const cleanDoc = valor.replace(/\D/g, "");
    if (cleanDoc.length !== 14) return;
    const data = await fetchCnpj(valor);
    if (data) {
      setFormData((prev) => ({
        ...prev,
        nome: data.razao_social || prev.nome,
        logradouro: data.logradouro || prev.logradouro,
        numero: data.numero || prev.numero,
        bairro: data.bairro || prev.bairro,
        cidade: data.cidade || prev.cidade,
        uf: data.uf || prev.uf,
        cep: data.cep?.replace(/\D/g, "") || prev.cep,
        telefone: data.telefone || prev.telefone,
        email: data.email || prev.email,
      }));
    }
  };

  const handleCepBlur = async (cep: string) => {
    const data = await fetchCep(cep);
    if (data) {
      setFormData((prev) => ({
        ...prev,
        logradouro: data.logradouro || prev.logradouro,
        bairro: data.bairro || prev.bairro,
        cidade: data.localidade || prev.cidade,
        uf: data.uf || prev.uf,
      }));
    }
  };

  const handleSave = async () => {
    if (!formData.nome.trim()) return;
    if (formData.cpf_cnpj && formData.cpf_cnpj.length > 0) {
      const clean = formData.cpf_cnpj.replace(/\D/g, "");
      if (clean.length === 11 && !validateCpf(clean)) { toast.error("CPF inválido!"); return; }
      if (clean.length === 14 && !validateCnpj(clean)) { toast.error("CNPJ inválido!"); return; }
      if (clean.length !== 11 && clean.length !== 14) { toast.error("CPF/CNPJ inválido!"); return; }
    }
    if (formData.motorista_cpf_padrao && !validateCpf(formData.motorista_cpf_padrao)) {
      toast.error("CPF do motorista inválido!"); return;
    }
    let saved: Transportadora;
    if (transportadora) {
      await updateTransportadora.mutateAsync({ id: transportadora.id, ...formData });
      saved = { ...(transportadora as any), ...formData };
    } else {
      saved = await createTransportadora.mutateAsync(formData) as any;
    }
    onSaved?.(saved);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{transportadora ? "Editar Transportadora" : "Nova Transportadora"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>CPF/CNPJ</Label>
              <div className="relative">
                <Input
                  value={formatCpfCnpj(formData.cpf_cnpj)}
                  onChange={(e) => setFormData({ ...formData, cpf_cnpj: e.target.value.replace(/\D/g, "").slice(0, 14) })}
                  onBlur={(e) => handleCnpjBlur(e.target.value)}
                  placeholder="000.000.000-00 ou 00.000.000/0000-00"
                  maxLength={18}
                />
                {cnpjLoading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Inscrição Estadual</Label>
              <Input value={formData.inscricao_estadual || ""} onChange={(e) => setFormData({ ...formData, inscricao_estadual: e.target.value })} maxLength={14} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Nome/Razão Social *</Label>
            <Input value={formData.nome} onChange={(e) => setFormData({ ...formData, nome: e.target.value })} maxLength={100} />
          </div>

          <div className="grid grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>CEP</Label>
              <div className="relative">
                <Input
                  value={formData.cep ? formatCep(formData.cep) : ""}
                  onChange={(e) => setFormData({ ...formData, cep: e.target.value.replace(/\D/g, "") })}
                  onBlur={(e) => handleCepBlur(e.target.value)}
                  placeholder="00000-000"
                  maxLength={9}
                />
                {cepLoading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />}
              </div>
            </div>
            <div className="space-y-2 col-span-2">
              <Label>Logradouro</Label>
              <Input value={formData.logradouro || ""} onChange={(e) => setFormData({ ...formData, logradouro: e.target.value })} maxLength={200} />
            </div>
            <div className="space-y-2">
              <Label>Número</Label>
              <Input value={formData.numero || ""} onChange={(e) => setFormData({ ...formData, numero: e.target.value })} maxLength={10} />
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Bairro</Label>
              <Input value={formData.bairro || ""} onChange={(e) => setFormData({ ...formData, bairro: e.target.value })} maxLength={100} />
            </div>
            <div className="space-y-2">
              <Label>Cidade</Label>
              <Input value={formData.cidade || ""} onChange={(e) => setFormData({ ...formData, cidade: e.target.value })} maxLength={100} />
            </div>
            <div className="space-y-2">
              <Label>UF</Label>
              <Select isSearchable value={formData.uf || ""} onValueChange={(v) => setFormData({ ...formData, uf: v })}>
                <SelectTrigger><SelectValue placeholder="UF" /></SelectTrigger>
                <SelectContent>{UFS.map((uf) => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Granja</Label>
              <Select isSearchable value={formData.granja_id || ""} onValueChange={(v) => setFormData({ ...formData, granja_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{granjas.map((g) => <SelectItem key={g.id} value={g.id}>{g.nome_fantasia || g.razao_social}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Telefone</Label>
              <Input value={formData.telefone || ""} onChange={(e) => setFormData({ ...formData, telefone: e.target.value })} maxLength={14} />
            </div>
            <div className="space-y-2">
              <Label>E-mail</Label>
              <Input type="email" value={formData.email || ""} onChange={(e) => setFormData({ ...formData, email: e.target.value })} maxLength={100} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Placa Padrão</Label>
              <Input
                value={formData.placa_padrao?.toUpperCase() || ""}
                onChange={(e) => setFormData({ ...formData, placa_padrao: e.target.value.replace(/[^A-Za-z0-9]/g, "").toUpperCase() })}
                maxLength={7}
                placeholder="ABC1D23"
              />
            </div>
            <div className="space-y-2">
              <Label>UF Placa</Label>
              <Select isSearchable value={formData.uf_placa_padrao || ""} onValueChange={(v) => setFormData({ ...formData, uf_placa_padrao: v })}>
                <SelectTrigger><SelectValue placeholder="UF" /></SelectTrigger>
                <SelectContent>{UFS.map((uf) => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>RNTC</Label>
              <Input value={formData.rntc || ""} onChange={(e) => setFormData({ ...formData, rntc: e.target.value })} maxLength={20} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Motorista Padrão</Label>
              <Input value={formData.motorista_padrao || ""} onChange={(e) => setFormData({ ...formData, motorista_padrao: e.target.value })} maxLength={100} />
            </div>
            <div className="space-y-2">
              <Label>CPF Motorista Padrão</Label>
              <Input
                value={formatCpf(formData.motorista_cpf_padrao || "")}
                onChange={(e) => setFormData({ ...formData, motorista_cpf_padrao: unformatDocument(e.target.value) })}
                maxLength={14}
                placeholder="000.000.000-00"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Switch checked={formData.ativa ?? true} onCheckedChange={(c) => setFormData({ ...formData, ativa: c })} />
            <Label>Transportadora Ativa</Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={!formData.nome.trim()}>
            {transportadora ? "Salvar" : "Criar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
