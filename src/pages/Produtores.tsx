import { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Users, Plus, Search, Loader2, Trash2, Save } from "lucide-react";
import {
  useProdutores,
  useCreateProdutor,
  useUpdateProdutor,
  useDeleteProdutor,
  ProdutorInput,
} from "@/hooks/useProdutores";
import { useGranjas } from "@/hooks/useGranjas";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { useCepLookup, formatCep } from "@/hooks/useCepLookup";
import { useCnpjLookup, formatCnpj } from "@/hooks/useCnpjLookup";
import { InscricoesTab } from "@/components/produtores/InscricoesTab";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { formatCpf, formatCpfCnpj, formatTelefone, validateCpf, validateCnpj } from "@/lib/formatters";
import { toast } from "sonner";

const TIPOS_PRODUTOR = [
  { value: "produtor", label: "Produtor" },
  { value: "socio", label: "Sócio" },
];

const TIPOS_PESSOA = [
  { value: "fisica", label: "Pessoa Física" },
  { value: "juridica", label: "Pessoa Jurídica" },
  { value: "estrangeiro", label: "Estrangeiro" },
  { value: "produtor_rural", label: "Produtor Rural" },
];

const emptyProdutor: ProdutorInput = {
  nome: "",
  tipo_pessoa: "fisica",
  tipo_produtor: "produtor",
  cpf_cnpj: "",
  identidade: "",
  granja_id: null,
  logradouro: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "",
  uf: "",
  cep: "",
  telefone: "",
  celular: "",
  email: "",
  ativo: true,
};

export default function Produtores() {
  const { data: produtores, isLoading } = useProdutores();
  const { data: granjas } = useGranjas();
  const createProdutor = useCreateProdutor();
  const updateProdutor = useUpdateProdutor();
  const deleteProdutor = useDeleteProdutor();
  const { canEdit } = useAuth();
  const { isLoading: cepLoading, fetchCep } = useCepLookup();
  const { isLoading: cnpjLoading, fetchCnpj } = useCnpjLookup();

  const [selectedProdutorId, setSelectedProdutorId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterTipo, setFilterTipo] = useState<string>("todos");
  const [filterStatus, setFilterStatus] = useState<string>("ativos");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [newFormData, setNewFormData] = useState<ProdutorInput>(emptyProdutor);
  const [editFormData, setEditFormData] = useState<ProdutorInput>(emptyProdutor);

  // Filtra produtores pela busca, tipo e status
  const filteredProdutores = useMemo(() => {
    return produtores?.filter((p: any) => {
      const matchesSearch =
        p.nome.toLowerCase().includes(search.toLowerCase()) ||
        p.cpf_cnpj?.includes(search);
      const matchesTipo =
        filterTipo === "todos" || p.tipo_produtor === filterTipo;
      const matchesStatus =
        filterStatus === "todos" ||
        (filterStatus === "ativos" && p.ativo !== false) ||
        (filterStatus === "inativos" && p.ativo === false);
      return matchesSearch && matchesTipo && matchesStatus;
    });
  }, [produtores, search, filterTipo, filterStatus]);

  // Produtor selecionado
  const selectedProdutor = useMemo(() => {
    return produtores?.find((p: any) => p.id === selectedProdutorId);
  }, [produtores, selectedProdutorId]);

  // Índice do produtor selecionado na lista filtrada
  const selectedIndex = useMemo(() => {
    if (!selectedProdutorId || !filteredProdutores) return -1;
    return filteredProdutores.findIndex((p: any) => p.id === selectedProdutorId);
  }, [filteredProdutores, selectedProdutorId]);

  // Atualiza o formulário de edição quando muda a seleção
  const handleSelect = (produtor: any) => {
    setSelectedProdutorId(produtor.id);
    setEditFormData({
      nome: produtor.nome,
      tipo_pessoa: produtor.tipo_pessoa || "fisica",
      tipo_produtor: produtor.tipo_produtor || "produtor",
      cpf_cnpj: produtor.cpf_cnpj || "",
      identidade: produtor.identidade || "",
      granja_id: produtor.granja_id,
      logradouro: produtor.logradouro || "",
      numero: produtor.numero || "",
      complemento: produtor.complemento || "",
      bairro: produtor.bairro || "",
      cidade: produtor.cidade || "",
      uf: produtor.uf || "",
      cep: produtor.cep || "",
      telefone: produtor.telefone || "",
      celular: produtor.celular || "",
      email: produtor.email || "",
      ativo: produtor.ativo ?? true,
    });
  };

  const handleCnpjBlurNew = async (cnpj: string) => {
    if (newFormData.tipo_pessoa !== "juridica") return;
    const cleanCnpj = cnpj.replace(/\D/g, "");
    if (cleanCnpj.length !== 14) return;
    
    const data = await fetchCnpj(cnpj);
    if (data) {
      setNewFormData((prev) => ({
        ...prev,
        nome: data.razao_social || prev.nome,
        logradouro: data.logradouro || prev.logradouro,
        numero: data.numero || prev.numero,
        complemento: data.complemento || prev.complemento,
        bairro: data.bairro || prev.bairro,
        cidade: data.cidade || prev.cidade,
        uf: data.uf || prev.uf,
        cep: data.cep?.replace(/\D/g, "") || prev.cep,
        telefone: data.telefone || prev.telefone,
        email: data.email || prev.email,
      }));
    }
  };

  const handleCnpjBlurEdit = async (cnpj: string) => {
    if (editFormData.tipo_pessoa !== "juridica") return;
    const cleanCnpj = cnpj.replace(/\D/g, "");
    if (cleanCnpj.length !== 14) return;
    
    const data = await fetchCnpj(cnpj);
    if (data) {
      setEditFormData((prev) => ({
        ...prev,
        nome: data.razao_social || prev.nome,
        logradouro: data.logradouro || prev.logradouro,
        numero: data.numero || prev.numero,
        complemento: data.complemento || prev.complemento,
        bairro: data.bairro || prev.bairro,
        cidade: data.cidade || prev.cidade,
        uf: data.uf || prev.uf,
        cep: data.cep?.replace(/\D/g, "") || prev.cep,
        telefone: data.telefone || prev.telefone,
        email: data.email || prev.email,
      }));
    }
  };

  const handleCepBlurNew = async (cep: string) => {
    const data = await fetchCep(cep);
    if (data) {
      setNewFormData((prev) => ({
        ...prev,
        logradouro: data.logradouro || prev.logradouro,
        bairro: data.bairro || prev.bairro,
        cidade: data.localidade || prev.cidade,
        uf: data.uf || prev.uf,
      }));
    }
  };

  const handleCepBlurEdit = async (cep: string) => {
    const data = await fetchCep(cep);
    if (data) {
      setEditFormData((prev) => ({
        ...prev,
        logradouro: data.logradouro || prev.logradouro,
        bairro: data.bairro || prev.bairro,
        cidade: data.localidade || prev.cidade,
        uf: data.uf || prev.uf,
      }));
    }
  };

  const handleNew = () => {
    setNewFormData(emptyProdutor);
    setDialogOpen(true);
  };

  const handleSaveNew = async () => {
    // Validar CPF/CNPJ se informado
    if (newFormData.cpf_cnpj && newFormData.cpf_cnpj.length > 0) {
      if (newFormData.tipo_pessoa === "fisica") {
        if (!validateCpf(newFormData.cpf_cnpj)) {
          toast.error("CPF inválido!");
          return;
        }
      } else {
        if (!validateCnpj(newFormData.cpf_cnpj)) {
          toast.error("CNPJ inválido!");
          return;
        }
      }
    }

    const newProdutor = await createProdutor.mutateAsync(newFormData);
    setDialogOpen(false);
    if (newProdutor) {
      setSelectedProdutorId(newProdutor.id);
      handleSelect(newProdutor);
    }
  };

  const handleSaveEdit = async () => {
    if (!selectedProdutorId) return;

    // Validar CPF/CNPJ se informado
    if (editFormData.cpf_cnpj && editFormData.cpf_cnpj.length > 0) {
      if (editFormData.tipo_pessoa === "fisica") {
        if (!validateCpf(editFormData.cpf_cnpj)) {
          toast.error("CPF inválido!");
          return;
        }
      } else {
        if (!validateCnpj(editFormData.cpf_cnpj)) {
          toast.error("CNPJ inválido!");
          return;
        }
      }
    }

    await updateProdutor.mutateAsync({ id: selectedProdutorId, ...editFormData });
  };

  const handleDelete = async () => {
    if (!selectedProdutorId) return;
    await deleteProdutor.mutateAsync(selectedProdutorId);
    setDeleteDialogOpen(false);
    setSelectedProdutorId(null);
  };

  return (
    <AppLayout>
      <PageHeader
        title="Cadastro de Sócios e Produtores"
        description="Produtores depositam produção para devolução/compra. Sócios são parceiros na Granja."
        icon={<Users className="h-6 w-6" />}
        iconColor="bg-accent/10 text-accent"
        actions={
          canEdit && (
            <Button onClick={handleNew} className="gap-2">
              <Plus className="h-4 w-4" />
              Novo
            </Button>
          )
        }
      />

      {/* Lista de Produtores/Sócios */}
      <Card className="mb-4">
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <CardTitle className="text-lg">Lista de Sócios e Produtores</CardTitle>
              {filteredProdutores && (
                <span className="text-sm text-muted-foreground">
                  {selectedIndex >= 0
                    ? `Reg: ${selectedIndex + 1} de ${filteredProdutores.length}`
                    : `${filteredProdutores.length} registros`}
                </span>
              )}
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="ativos">Ativos</SelectItem>
                  <SelectItem value="inativos">Inativos</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterTipo} onValueChange={setFilterTipo}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="produtor">Produtores</SelectItem>
                  <SelectItem value="socio">Sócios</SelectItem>
                </SelectContent>
              </Select>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome/CPF..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : filteredProdutores && filteredProdutores.length > 0 ? (
            <div className="overflow-x-auto max-h-[280px] overflow-y-auto border rounded-md">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead className="w-24">Tipo</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>CPF/CNPJ</TableHead>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProdutores.map((produtor: any) => (
                    <TableRow
                      key={produtor.id}
                      onClick={() => handleSelect(produtor)}
                      className={`cursor-pointer transition-colors ${
                        selectedProdutorId === produtor.id
                          ? "bg-primary/10 hover:bg-primary/15"
                          : "hover:bg-muted/50"
                      }`}
                    >
                      <TableCell>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            produtor.tipo_produtor === "socio"
                              ? "bg-secondary text-secondary-foreground"
                              : "bg-accent/10 text-accent"
                          }`}
                        >
                          {TIPOS_PRODUTOR.find((t) => t.value === produtor.tipo_produtor)?.label ||
                            "Produtor"}
                        </span>
                      </TableCell>
                      <TableCell className="font-medium">{produtor.nome}</TableCell>
                      <TableCell className="font-mono">{formatCpfCnpj(produtor.cpf_cnpj) || "-"}</TableCell>
                      <TableCell>{produtor.granja?.razao_social || "-"}</TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            produtor.ativo
                              ? "bg-success/10 text-success"
                              : "bg-destructive/10 text-destructive"
                          }`}
                        >
                          {produtor.ativo ? "Ativo" : "Inativo"}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8">
              <Users className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
              <p className="text-muted-foreground">
                {search || filterTipo !== "todos"
                  ? "Nenhum registro encontrado com os filtros aplicados"
                  : "Nenhum produtor/sócio cadastrado"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dados do Selecionado */}
      {selectedProdutor && (
        <>
          <Card className="mb-4">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">
                  Dados: {selectedProdutor.nome}
                </CardTitle>
                {canEdit && (
                  <div className="flex gap-2">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setDeleteDialogOpen(true)}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Excluir
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSaveEdit}
                      disabled={!editFormData.nome || updateProdutor.isPending}
                    >
                      <Save className="h-4 w-4 mr-1" />
                      {updateProdutor.isPending ? "Salvando..." : "Salvar"}
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select
                    value={editFormData.tipo_produtor || "produtor"}
                    onValueChange={(value) =>
                      setEditFormData({ ...editFormData, tipo_produtor: value })
                    }
                    disabled={!canEdit}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIPOS_PRODUTOR.map((tipo) => (
                        <SelectItem key={tipo.value} value={tipo.value}>
                          {tipo.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Tipo Pessoa</Label>
                  <Select
                    value={editFormData.tipo_pessoa || "fisica"}
                    onValueChange={(value) =>
                      setEditFormData({ ...editFormData, tipo_pessoa: value })
                    }
                    disabled={!canEdit}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIPOS_PESSOA.map((tipo) => (
                        <SelectItem key={tipo.value} value={tipo.value}>
                          {tipo.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{editFormData.tipo_pessoa === "fisica" || editFormData.tipo_pessoa === "produtor_rural" ? "CPF" : "CNPJ"}</Label>
                  <div className="relative">
                    <Input
                      value={editFormData.tipo_pessoa === "fisica" || editFormData.tipo_pessoa === "produtor_rural"
                        ? formatCpf(editFormData.cpf_cnpj || "") 
                        : formatCnpj(editFormData.cpf_cnpj || "")}
                      onChange={(e) =>
                        setEditFormData({ ...editFormData, cpf_cnpj: e.target.value.replace(/\D/g, "") })
                      }
                      onBlur={(e) => handleCnpjBlurEdit(e.target.value)}
                      disabled={!canEdit}
                      placeholder={editFormData.tipo_pessoa === "fisica" || editFormData.tipo_pessoa === "produtor_rural" ? "000.000.000-00" : "00.000.000/0000-00"}
                      maxLength={editFormData.tipo_pessoa === "fisica" || editFormData.tipo_pessoa === "produtor_rural" ? 14 : 18}
                    />
                    {cnpjLoading && editFormData.tipo_pessoa === "juridica" && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Identidade</Label>
                  <Input
                    value={editFormData.identidade || ""}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, identidade: e.target.value })
                    }
                    disabled={!canEdit}
                  />
                </div>
                <div className="space-y-2 lg:col-span-2">
                  <Label>Nome *</Label>
                  <Input
                    value={editFormData.nome}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, nome: e.target.value })
                    }
                    disabled={!canEdit}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Granja</Label>
                  <Select
                    value={editFormData.granja_id || ""}
                    onValueChange={(value) =>
                      setEditFormData({ ...editFormData, granja_id: value || null })
                    }
                    disabled={!canEdit}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {granjas?.map((granja) => (
                        <SelectItem key={granja.id} value={granja.id}>
                          {granja.razao_social}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <div className="flex items-center gap-3 h-10">
                    <Switch
                      checked={editFormData.ativo}
                      onCheckedChange={(checked) =>
                        setEditFormData({ ...editFormData, ativo: checked })
                      }
                      disabled={!canEdit}
                    />
                    <span className={`text-sm font-medium ${editFormData.ativo ? "text-success" : "text-destructive"}`}>
                      {editFormData.ativo ? "Ativo" : "Inativo"}
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>CEP</Label>
                  <div className="relative">
                    <Input
                      value={editFormData.cep || ""}
                      onChange={(e) =>
                        setEditFormData({ ...editFormData, cep: formatCep(e.target.value) })
                      }
                      onBlur={(e) => handleCepBlurEdit(e.target.value)}
                      placeholder="00000-000"
                      maxLength={9}
                      disabled={!canEdit}
                    />
                    {cepLoading && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                  </div>
                </div>
                <div className="space-y-2 lg:col-span-2">
                  <Label>Logradouro</Label>
                  <Input
                    value={editFormData.logradouro || ""}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, logradouro: e.target.value })
                    }
                    disabled={!canEdit}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Número</Label>
                  <Input
                    value={editFormData.numero || ""}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, numero: e.target.value })
                    }
                    disabled={!canEdit}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Complemento</Label>
                  <Input
                    value={editFormData.complemento || ""}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, complemento: e.target.value })
                    }
                    disabled={!canEdit}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Bairro</Label>
                  <Input
                    value={editFormData.bairro || ""}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, bairro: e.target.value })
                    }
                    disabled={!canEdit}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Cidade</Label>
                  <Input
                    value={editFormData.cidade || ""}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, cidade: e.target.value })
                    }
                    disabled={!canEdit}
                  />
                </div>
                <div className="space-y-2">
                  <Label>UF</Label>
                  <Input
                    value={editFormData.uf || ""}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, uf: e.target.value.toUpperCase() })
                    }
                    maxLength={2}
                    disabled={!canEdit}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Telefone</Label>
                  <Input
                    value={formatTelefone(editFormData.telefone || "")}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, telefone: e.target.value.replace(/\D/g, "") })
                    }
                    placeholder="(00) 0000-0000"
                    disabled={!canEdit}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Celular</Label>
                  <Input
                    value={formatTelefone(editFormData.celular || "")}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, celular: e.target.value.replace(/\D/g, "") })
                    }
                    placeholder="(00) 00000-0000"
                    disabled={!canEdit}
                  />
                </div>
                <div className="space-y-2 lg:col-span-2">
                  <Label>E-mail</Label>
                  <Input
                    type="email"
                    value={editFormData.email || ""}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, email: e.target.value })
                    }
                    disabled={!canEdit}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabs de Detalhe */}
          <Card>
            <Tabs defaultValue="inscricoes">
              <CardHeader className="pb-0">
                <TabsList>
                  <TabsTrigger value="inscricoes">Inscrições Estaduais</TabsTrigger>
                  <TabsTrigger value="nfe" disabled>
                    Emitente NFe
                  </TabsTrigger>
                  <TabsTrigger value="conta" disabled>
                    Conta Bancária
                  </TabsTrigger>
                </TabsList>
              </CardHeader>
              <CardContent className="pt-4">
                <TabsContent value="inscricoes" className="mt-0">
                  <InscricoesTab produtorId={selectedProdutor.id} />
                </TabsContent>
                <TabsContent value="nfe" className="mt-0">
                  <p className="text-muted-foreground text-center py-8">
                    Funcionalidade em desenvolvimento
                  </p>
                </TabsContent>
                <TabsContent value="conta" className="mt-0">
                  <p className="text-muted-foreground text-center py-8">
                    Funcionalidade em desenvolvimento
                  </p>
                </TabsContent>
              </CardContent>
            </Tabs>
          </Card>
        </>
      )}

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo Produtor/Sócio</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select
                value={newFormData.tipo_produtor || "produtor"}
                onValueChange={(value) =>
                  setNewFormData({ ...newFormData, tipo_produtor: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_PRODUTOR.map((tipo) => (
                    <SelectItem key={tipo.value} value={tipo.value}>
                      {tipo.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tipo de Pessoa</Label>
              <Select
                value={newFormData.tipo_pessoa || "fisica"}
                onValueChange={(value) =>
                  setNewFormData({ ...newFormData, tipo_pessoa: value, cpf_cnpj: "" })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_PESSOA.map((tipo) => (
                    <SelectItem key={tipo.value} value={tipo.value}>
                      {tipo.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* CPF/CNPJ primeiro quando PJ */}
            <div className="space-y-2">
              <Label>{newFormData.tipo_pessoa === "fisica" || newFormData.tipo_pessoa === "produtor_rural" ? "CPF" : "CNPJ"}</Label>
              <div className="relative">
                <Input
                  value={newFormData.tipo_pessoa === "fisica" || newFormData.tipo_pessoa === "produtor_rural"
                    ? formatCpf(newFormData.cpf_cnpj || "") 
                    : formatCnpj(newFormData.cpf_cnpj || "")}
                  onChange={(e) => setNewFormData({ ...newFormData, cpf_cnpj: e.target.value.replace(/\D/g, "") })}
                  onBlur={(e) => handleCnpjBlurNew(e.target.value)}
                  placeholder={newFormData.tipo_pessoa === "fisica" || newFormData.tipo_pessoa === "produtor_rural" ? "000.000.000-00" : "00.000.000/0000-00"}
                  maxLength={newFormData.tipo_pessoa === "fisica" || newFormData.tipo_pessoa === "produtor_rural" ? 14 : 18}
                />
                {cnpjLoading && newFormData.tipo_pessoa === "juridica" && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Identidade</Label>
              <Input
                value={newFormData.identidade || ""}
                onChange={(e) => setNewFormData({ ...newFormData, identidade: e.target.value })}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Nome Completo *</Label>
              <Input
                value={newFormData.nome}
                onChange={(e) => setNewFormData({ ...newFormData, nome: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Granja</Label>
              <Select
                value={newFormData.granja_id || ""}
                onValueChange={(value) =>
                  setNewFormData({ ...newFormData, granja_id: value || null })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma granja" />
                </SelectTrigger>
                <SelectContent>
                  {granjas?.map((granja) => (
                    <SelectItem key={granja.id} value={granja.id}>
                      {granja.razao_social}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>CEP</Label>
              <div className="relative">
                <Input
                  value={newFormData.cep || ""}
                  onChange={(e) => setNewFormData({ ...newFormData, cep: formatCep(e.target.value) })}
                  onBlur={(e) => handleCepBlurNew(e.target.value)}
                  placeholder="00000-000"
                  maxLength={9}
                />
                {cepLoading && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Logradouro</Label>
              <Input
                value={newFormData.logradouro || ""}
                onChange={(e) => setNewFormData({ ...newFormData, logradouro: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Número</Label>
              <Input
                value={newFormData.numero || ""}
                onChange={(e) => setNewFormData({ ...newFormData, numero: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Complemento</Label>
              <Input
                value={newFormData.complemento || ""}
                onChange={(e) => setNewFormData({ ...newFormData, complemento: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Bairro</Label>
              <Input
                value={newFormData.bairro || ""}
                onChange={(e) => setNewFormData({ ...newFormData, bairro: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Cidade</Label>
              <Input
                value={newFormData.cidade || ""}
                onChange={(e) => setNewFormData({ ...newFormData, cidade: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>UF</Label>
              <Input
                value={newFormData.uf || ""}
                onChange={(e) => setNewFormData({ ...newFormData, uf: e.target.value.toUpperCase() })}
                maxLength={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Telefone</Label>
              <Input
                value={formatTelefone(newFormData.telefone || "")}
                onChange={(e) => setNewFormData({ ...newFormData, telefone: e.target.value.replace(/\D/g, "") })}
                placeholder="(00) 0000-0000"
              />
            </div>
            <div className="space-y-2">
              <Label>Celular</Label>
              <Input
                value={formatTelefone(newFormData.celular || "")}
                onChange={(e) => setNewFormData({ ...newFormData, celular: e.target.value.replace(/\D/g, "") })}
                placeholder="(00) 00000-0000"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>E-mail</Label>
              <Input
                type="email"
                value={newFormData.email || ""}
                onChange={(e) => setNewFormData({ ...newFormData, email: e.target.value })}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSaveNew}
              disabled={!newFormData.nome || createProdutor.isPending}
            >
              {createProdutor.isPending ? "Salvando..." : "Salvar e Continuar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja remover "{selectedProdutor?.nome}"?
              <br /><br />
              <strong>Se houver movimentação</strong> (inscrições ou notas fiscais vinculadas), 
              o cadastro será <strong>marcado como inativo</strong>.
              <br /><br />
              <strong>Se não houver movimentação</strong>, o cadastro será <strong>excluído permanentemente</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
