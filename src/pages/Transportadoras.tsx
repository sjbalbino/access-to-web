import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Search, Pencil, Trash2, Truck, Loader2 } from "lucide-react";
import { useTransportadoras, TransportadoraInsert } from "@/hooks/useTransportadoras";
import { useGranjas } from "@/hooks/useGranjas";
import { Spinner } from "@/components/ui/spinner";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty";
import { useCnpjLookup, formatCnpj } from "@/hooks/useCnpjLookup";
import { useCepLookup, formatCep } from "@/hooks/useCepLookup";
import { formatCpf, formatPlaca, unformatDocument, validateCnpj, validateCpf } from "@/lib/formatters";
import { toast } from "sonner";

const UFS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS",
  "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC",
  "SP", "SE", "TO",
];

export default function Transportadoras() {
  const { transportadoras, isLoading, createTransportadora, updateTransportadora, deleteTransportadora } = useTransportadoras();
  const granjasQuery = useGranjas();
  const granjas = granjasQuery.data || [];
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedTransportadora, setSelectedTransportadora] = useState<any>(null);

  const { isLoading: cnpjLoading, fetchCnpj } = useCnpjLookup();
  const { isLoading: cepLoading, fetchCep } = useCepLookup();

  const [formData, setFormData] = useState<TransportadoraInsert>({
    granja_id: null,
    nome: "",
    cpf_cnpj: null,
    inscricao_estadual: null,
    logradouro: null,
    numero: null,
    bairro: null,
    cidade: null,
    uf: null,
    cep: null,
    telefone: null,
    email: null,
    placa_padrao: null,
    uf_placa_padrao: null,
    rntc: null,
    motorista_padrao: null,
    motorista_cpf_padrao: null,
    ativa: true,
  });

  const filteredTransportadoras = transportadoras.filter((t) =>
    t.nome.toLowerCase().includes(search.toLowerCase()) ||
    t.cpf_cnpj?.includes(search) ||
    t.cidade?.toLowerCase().includes(search.toLowerCase())
  );

  const handleCnpjBlur = async (cnpj: string) => {
    const cleanCnpj = cnpj.replace(/\D/g, "");
    if (cleanCnpj.length !== 14) return;
    
    const data = await fetchCnpj(cnpj);
    if (data) {
      setFormData((prev) => ({
        ...prev,
        nome: data.razao_social || prev.nome,
        inscricao_estadual: prev.inscricao_estadual,
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

  const handleOpenDialog = (transportadora?: any) => {
    if (transportadora) {
      setSelectedTransportadora(transportadora);
      setFormData({
        granja_id: transportadora.granja_id,
        nome: transportadora.nome,
        cpf_cnpj: transportadora.cpf_cnpj,
        inscricao_estadual: transportadora.inscricao_estadual,
        logradouro: transportadora.logradouro,
        numero: transportadora.numero,
        bairro: transportadora.bairro,
        cidade: transportadora.cidade,
        uf: transportadora.uf,
        cep: transportadora.cep,
        telefone: transportadora.telefone,
        email: transportadora.email,
        placa_padrao: transportadora.placa_padrao,
        uf_placa_padrao: transportadora.uf_placa_padrao,
        rntc: transportadora.rntc,
        motorista_padrao: transportadora.motorista_padrao,
        motorista_cpf_padrao: transportadora.motorista_cpf_padrao,
        ativa: transportadora.ativa ?? true,
      });
    } else {
      setSelectedTransportadora(null);
      setFormData({
        granja_id: granjas[0]?.id || null,
        nome: "",
        cpf_cnpj: null,
        inscricao_estadual: null,
        logradouro: null,
        numero: null,
        bairro: null,
        cidade: null,
        uf: null,
        cep: null,
        telefone: null,
        email: null,
        placa_padrao: null,
        uf_placa_padrao: null,
        rntc: null,
        motorista_padrao: null,
        motorista_cpf_padrao: null,
        ativa: true,
      });
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.nome.trim()) return;

    // Validar CNPJ se informado
    if (formData.cpf_cnpj && formData.cpf_cnpj.length > 0) {
      if (!validateCnpj(formData.cpf_cnpj)) {
        toast.error("CNPJ inválido!");
        return;
      }
    }

    // Validar CPF do motorista se informado
    if (formData.motorista_cpf_padrao && formData.motorista_cpf_padrao.length > 0) {
      if (!validateCpf(formData.motorista_cpf_padrao)) {
        toast.error("CPF do motorista inválido!");
        return;
      }
    }

    if (selectedTransportadora) {
      await updateTransportadora.mutateAsync({ id: selectedTransportadora.id, ...formData });
    } else {
      await createTransportadora.mutateAsync(formData);
    }
    setIsDialogOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Deseja realmente excluir esta transportadora?")) {
      await deleteTransportadora.mutateAsync(id);
    }
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <Spinner />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <PageHeader
          title="Transportadoras"
          description="Gerencie as transportadoras para emissão de NF-e"
        />

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between gap-4 mb-6">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar transportadora..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Nova Transportadora
              </Button>
            </div>

            {filteredTransportadoras.length === 0 ? (
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <Truck className="h-6 w-6" />
                  </EmptyMedia>
                  <EmptyTitle>Nenhuma transportadora</EmptyTitle>
                  <EmptyDescription>Cadastre transportadoras para usar nas notas fiscais</EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>CPF/CNPJ</TableHead>
                      <TableHead>Cidade/UF</TableHead>
                      <TableHead>Placa Padrão</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-24">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTransportadoras.map((transportadora) => (
                      <TableRow key={transportadora.id}>
                        <TableCell className="font-medium">{transportadora.nome}</TableCell>
                        <TableCell className="font-mono text-sm">{transportadora.cpf_cnpj || "-"}</TableCell>
                        <TableCell>
                          {transportadora.cidade && transportadora.uf
                            ? `${transportadora.cidade}/${transportadora.uf}`
                            : "-"}
                        </TableCell>
                        <TableCell className="font-mono">
                          {transportadora.placa_padrao || "-"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={transportadora.ativa ? "default" : "secondary"}>
                            {transportadora.ativa ? "Ativa" : "Inativa"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenDialog(transportadora)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(transportadora.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedTransportadora ? "Editar Transportadora" : "Nova Transportadora"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* CNPJ primeiro */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cpf_cnpj">CNPJ</Label>
                <div className="relative">
                  <Input
                    id="cpf_cnpj"
                    value={formData.cpf_cnpj ? formatCnpj(formData.cpf_cnpj) : ""}
                    onChange={(e) => setFormData({ ...formData, cpf_cnpj: e.target.value.replace(/\D/g, "") })}
                    onBlur={(e) => handleCnpjBlur(e.target.value)}
                    placeholder="00.000.000/0000-00"
                    maxLength={18}
                  />
                  {cnpjLoading && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="inscricao_estadual">Inscrição Estadual</Label>
                <Input
                  id="inscricao_estadual"
                  value={formData.inscricao_estadual || ""}
                  onChange={(e) => setFormData({ ...formData, inscricao_estadual: e.target.value })}
                  maxLength={14}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="nome">Nome/Razão Social *</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                maxLength={100}
              />
            </div>

            {/* CEP e endereço */}
            <div className="grid grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cep">CEP</Label>
                <div className="relative">
                  <Input
                    id="cep"
                    value={formData.cep ? formatCep(formData.cep) : ""}
                    onChange={(e) => setFormData({ ...formData, cep: e.target.value.replace(/\D/g, "") })}
                    onBlur={(e) => handleCepBlur(e.target.value)}
                    placeholder="00000-000"
                    maxLength={9}
                  />
                  {cepLoading && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                </div>
              </div>

              <div className="space-y-2 col-span-2">
                <Label htmlFor="logradouro">Logradouro</Label>
                <Input
                  id="logradouro"
                  value={formData.logradouro || ""}
                  onChange={(e) => setFormData({ ...formData, logradouro: e.target.value })}
                  maxLength={200}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="numero">Número</Label>
                <Input
                  id="numero"
                  value={formData.numero || ""}
                  onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
                  maxLength={10}
                />
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bairro">Bairro</Label>
                <Input
                  id="bairro"
                  value={formData.bairro || ""}
                  onChange={(e) => setFormData({ ...formData, bairro: e.target.value })}
                  maxLength={100}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cidade">Cidade</Label>
                <Input
                  id="cidade"
                  value={formData.cidade || ""}
                  onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                  maxLength={100}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="uf">UF</Label>
                <Select
                  value={formData.uf || ""}
                  onValueChange={(value) => setFormData({ ...formData, uf: value })}
                >
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
                <Label htmlFor="granja_id">Granja</Label>
                <Select
                  value={formData.granja_id || ""}
                  onValueChange={(value) => setFormData({ ...formData, granja_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {granjas.map((granja) => (
                      <SelectItem key={granja.id} value={granja.id}>
                        {granja.nome_fantasia || granja.razao_social}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="telefone">Telefone</Label>
                <Input
                  id="telefone"
                  value={formData.telefone || ""}
                  onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                  maxLength={14}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email || ""}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  maxLength={100}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="placa_padrao">Placa Padrão</Label>
                <Input
                  id="placa_padrao"
                  value={formatPlaca(formData.placa_padrao) || ""}
                  onChange={(e) => setFormData({ ...formData, placa_padrao: e.target.value.replace(/[^A-Za-z0-9]/g, "").toUpperCase() })}
                  maxLength={8}
                  placeholder="ABC-1D23"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="uf_placa_padrao">UF Placa</Label>
                <Select
                  value={formData.uf_placa_padrao || ""}
                  onValueChange={(value) => setFormData({ ...formData, uf_placa_padrao: value })}
                >
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
                <Label htmlFor="rntc">RNTC</Label>
                <Input
                  id="rntc"
                  value={formData.rntc || ""}
                  onChange={(e) => setFormData({ ...formData, rntc: e.target.value })}
                  maxLength={20}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="motorista_padrao">Motorista Padrão</Label>
                <Input
                  id="motorista_padrao"
                  value={formData.motorista_padrao || ""}
                  onChange={(e) => setFormData({ ...formData, motorista_padrao: e.target.value })}
                  maxLength={100}
                  placeholder="Nome do motorista padrão"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="motorista_cpf_padrao">CPF Motorista Padrão</Label>
                <Input
                  id="motorista_cpf_padrao"
                  value={formatCpf(formData.motorista_cpf_padrao || "")}
                  onChange={(e) => setFormData({ ...formData, motorista_cpf_padrao: unformatDocument(e.target.value) })}
                  maxLength={14}
                  placeholder="000.000.000-00"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="ativa"
                checked={formData.ativa ?? true}
                onCheckedChange={(checked) => setFormData({ ...formData, ativa: checked })}
              />
              <Label htmlFor="ativa">Transportadora Ativa</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={!formData.nome.trim()}>
              {selectedTransportadora ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
