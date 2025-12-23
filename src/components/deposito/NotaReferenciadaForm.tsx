import { useState, useEffect } from "react";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";

const UFS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

export interface NotaReferenciadaTemp {
  tipo: 'nfe' | 'nfp';
  chave_nfe?: string;
  nfp_uf?: string;
  nfp_aamm?: string;
  nfp_cnpj?: string;
  nfp_cpf?: string;
  nfp_ie?: string;
  nfp_serie?: number;
  nfp_numero?: number;
}

interface NotaReferenciadaFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (nota: NotaReferenciadaTemp) => void;
  inscricao?: {
    cpf_cnpj?: string | null;
    inscricao_estadual?: string | null;
    uf?: string | null;
  } | null;
}

export function NotaReferenciadaForm({ 
  open, 
  onOpenChange, 
  onAdd,
  inscricao 
}: NotaReferenciadaFormProps) {
  const [tipo, setTipo] = useState<'nfe' | 'nfp'>('nfp');
  
  // Campos NFe
  const [chaveNfe, setChaveNfe] = useState("");
  
  // Campos NFP
  const [nfpUf, setNfpUf] = useState("");
  const [nfpAamm, setNfpAamm] = useState("");
  const [nfpCnpj, setNfpCnpj] = useState("");
  const [nfpCpf, setNfpCpf] = useState("");
  const [nfpIe, setNfpIe] = useState("");
  const [nfpSerie, setNfpSerie] = useState("");
  const [nfpNumero, setNfpNumero] = useState("");

  // Preencher campos com dados da inscrição quando o dialog abrir
  useEffect(() => {
    if (open && inscricao) {
      setNfpUf(inscricao.uf || "");
      setNfpCpf(inscricao.cpf_cnpj && inscricao.cpf_cnpj.length <= 11 ? inscricao.cpf_cnpj : "");
      setNfpIe(inscricao.inscricao_estadual || "");
    }
  }, [open, inscricao]);

  const resetForm = () => {
    setTipo('nfp');
    setChaveNfe("");
    setNfpUf("");
    setNfpAamm("");
    setNfpCnpj("");
    setNfpCpf("");
    setNfpIe("");
    setNfpSerie("");
    setNfpNumero("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (tipo === 'nfe') {
      if (!chaveNfe || chaveNfe.length !== 44) {
        toast({
          title: "Chave de acesso inválida",
          description: "A chave de acesso da NFe deve ter 44 dígitos.",
          variant: "destructive",
        });
        return;
      }

      onAdd({
        tipo: 'nfe',
        chave_nfe: chaveNfe,
      });
    } else {
      if (!nfpUf || !nfpAamm || !nfpIe || !nfpSerie || !nfpNumero) {
        toast({
          title: "Campos obrigatórios",
          description: "Preencha todos os campos obrigatórios da NFP.",
          variant: "destructive",
        });
        return;
      }

      if (nfpAamm.length !== 4) {
        toast({
          title: "AAMM inválido",
          description: "O campo AAMM deve ter 4 dígitos (ex: 2412 para Dez/2024).",
          variant: "destructive",
        });
        return;
      }

      if (!nfpCnpj && !nfpCpf) {
        toast({
          title: "CPF ou CNPJ obrigatório",
          description: "Informe o CPF ou CNPJ do produtor.",
          variant: "destructive",
        });
        return;
      }

      onAdd({
        tipo: 'nfp',
        nfp_uf: nfpUf,
        nfp_aamm: nfpAamm,
        nfp_cnpj: nfpCnpj || undefined,
        nfp_cpf: nfpCpf || undefined,
        nfp_ie: nfpIe,
        nfp_serie: parseInt(nfpSerie),
        nfp_numero: parseInt(nfpNumero),
      });
    }

    resetForm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Adicionar Nota Referenciada</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-3">
            <Label>Tipo de Nota</Label>
            <RadioGroup 
              value={tipo} 
              onValueChange={(v) => setTipo(v as 'nfe' | 'nfp')}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="nfp" id="nfp" />
                <Label htmlFor="nfp" className="font-normal cursor-pointer">
                  NFP (Nota Fiscal de Produtor)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="nfe" id="nfe" />
                <Label htmlFor="nfe" className="font-normal cursor-pointer">
                  NFe (Nota Fiscal Eletrônica)
                </Label>
              </div>
            </RadioGroup>
          </div>

          {tipo === 'nfe' ? (
            <div className="space-y-2">
              <Label>Chave de Acesso (44 dígitos) *</Label>
              <Input
                value={chaveNfe}
                onChange={(e) => setChaveNfe(e.target.value.replace(/\D/g, '').slice(0, 44))}
                placeholder="00000000000000000000000000000000000000000000"
                maxLength={44}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                {chaveNfe.length}/44 dígitos
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>UF *</Label>
                  <Select value={nfpUf} onValueChange={setNfpUf}>
                    <SelectTrigger>
                      <SelectValue placeholder="UF" />
                    </SelectTrigger>
                    <SelectContent>
                      {UFS.map((uf) => (
                        <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>AAMM *</Label>
                  <Input
                    value={nfpAamm}
                    onChange={(e) => setNfpAamm(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder="2412"
                    maxLength={4}
                  />
                  <p className="text-xs text-muted-foreground">Ano/Mês (ex: 2412 = Dez/24)</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>CPF do Produtor</Label>
                <Input
                  value={nfpCpf}
                  onChange={(e) => {
                    setNfpCpf(e.target.value.replace(/\D/g, '').slice(0, 11));
                    if (e.target.value) setNfpCnpj("");
                  }}
                  placeholder="00000000000"
                  maxLength={11}
                  disabled={!!nfpCnpj}
                />
              </div>

              <div className="space-y-2">
                <Label>ou CNPJ do Produtor</Label>
                <Input
                  value={nfpCnpj}
                  onChange={(e) => {
                    setNfpCnpj(e.target.value.replace(/\D/g, '').slice(0, 14));
                    if (e.target.value) setNfpCpf("");
                  }}
                  placeholder="00000000000000"
                  maxLength={14}
                  disabled={!!nfpCpf}
                />
              </div>

              <div className="space-y-2">
                <Label>Inscrição Estadual *</Label>
                <Input
                  value={nfpIe}
                  onChange={(e) => setNfpIe(e.target.value.replace(/\D/g, '').slice(0, 14))}
                  placeholder="000000000000"
                  maxLength={14}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Série *</Label>
                  <Input
                    type="number"
                    value={nfpSerie}
                    onChange={(e) => setNfpSerie(e.target.value)}
                    placeholder="1"
                    min="1"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Número *</Label>
                  <Input
                    type="number"
                    value={nfpNumero}
                    onChange={(e) => setNfpNumero(e.target.value)}
                    placeholder="123"
                    min="1"
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit">Adicionar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
