import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
  DialogDescription,
  DialogFooter,
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
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty";
import { Building, Plus, Pencil, Trash2, Search, Crown, Loader2 } from "lucide-react";
import {
  useTenants,
  useCreateTenant,
  useUpdateTenant,
  useDeleteTenant,
  TenantInput,
  Tenant,
} from "@/hooks/useTenants";
import { useCepLookup } from "@/hooks/useCepLookup";
import { useCnpjLookup, formatCnpj } from "@/hooks/useCnpjLookup";

const emptyTenant: TenantInput = {
  codigo: "",
  razao_social: "",
  nome_fantasia: "",
  cnpj: "",
  inscricao_estadual: "",
  logradouro: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "",
  uf: "",
  cep: "",
  telefone: "",
  email: "",
  ativo: true,
};

export default function Tenants() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [formData, setFormData] = useState<TenantInput>(emptyTenant);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tenantToDelete, setTenantToDelete] = useState<Tenant | null>(null);

  const { data: tenants, isLoading } = useTenants();
  const createMutation = useCreateTenant();
  const updateMutation = useUpdateTenant();
  const deleteMutation = useDeleteTenant();

  const { fetchCep, isLoading: isLoadingCep } = useCepLookup();
  const { fetchCnpj, isLoading: isLoadingCnpj } = useCnpjLookup();

  const filteredTenants = tenants?.filter(
    (tenant) =>
      tenant.razao_social.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tenant.nome_fantasia?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tenant.cnpj?.includes(searchTerm)
  );

  const resetForm = () => {
    setFormData(emptyTenant);
    setEditingId(null);
  };

  const handleEdit = (tenant: Tenant) => {
    setEditingId(tenant.id);
    setFormData({
      codigo: tenant.codigo || "",
      razao_social: tenant.razao_social,
      nome_fantasia: tenant.nome_fantasia || "",
      cnpj: tenant.cnpj || "",
      inscricao_estadual: tenant.inscricao_estadual || "",
      logradouro: tenant.logradouro || "",
      numero: tenant.numero || "",
      complemento: tenant.complemento || "",
      bairro: tenant.bairro || "",
      cidade: tenant.cidade || "",
      uf: tenant.uf || "",
      cep: tenant.cep || "",
      telefone: tenant.telefone || "",
      email: tenant.email || "",
      ativo: tenant.ativo ?? true,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editingId) {
      await updateMutation.mutateAsync({ ...formData, id: editingId });
    } else {
      await createMutation.mutateAsync(formData);
    }

    setIsDialogOpen(false);
    resetForm();
  };

  const handleDelete = async () => {
    if (tenantToDelete) {
      await deleteMutation.mutateAsync(tenantToDelete.id);
      setIsDeleteDialogOpen(false);
      setTenantToDelete(null);
    }
  };

  const handleCnpjBlur = async () => {
    const cnpj = formData.cnpj?.replace(/\D/g, "");
    if (cnpj && cnpj.length === 14) {
      const data = await fetchCnpj(cnpj);
      if (data) {
        setFormData((prev) => ({
          ...prev,
          razao_social: data.razao_social || prev.razao_social,
          nome_fantasia: data.nome_fantasia || prev.nome_fantasia,
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
    }
  };

  const handleCepBlur = async () => {
    const cep = formData.cep?.replace(/\D/g, "");
    if (cep && cep.length === 8) {
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
    }
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Spinner className="h-8 w-8 text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageHeader
        title="Empresas Contratantes"
        description="Gestão das empresas que utilizam o sistema (Super Admin)"
        icon={<Crown className="h-6 w-6" />}
        iconColor="bg-amber-500/10 text-amber-500"
        actions={
          <Button
            onClick={() => {
              resetForm();
              setIsDialogOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Nova Empresa
          </Button>
        }
      />

      <div className="bg-card rounded-xl border shadow-sm">
        <div className="p-4 border-b">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por razão social, nome fantasia ou CNPJ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {filteredTenants?.length === 0 ? (
          <Empty className="py-12">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Building className="h-6 w-6" />
              </EmptyMedia>
              <EmptyTitle>Nenhuma empresa contratante</EmptyTitle>
              <EmptyDescription>
                Cadastre a primeira empresa contratante do sistema.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Razão Social</TableHead>
                <TableHead>Nome Fantasia</TableHead>
                <TableHead>CNPJ</TableHead>
                <TableHead>Cidade/UF</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTenants?.map((tenant) => (
                <TableRow key={tenant.id}>
                  <TableCell className="font-medium">
                    {tenant.razao_social}
                  </TableCell>
                  <TableCell>{tenant.nome_fantasia || "-"}</TableCell>
                  <TableCell>{tenant.cnpj || "-"}</TableCell>
                  <TableCell>
                    {tenant.cidade && tenant.uf
                      ? `${tenant.cidade}/${tenant.uf}`
                      : "-"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={tenant.ativo ? "default" : "secondary"}>
                      {tenant.ativo ? "Ativa" : "Inativa"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(tenant)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => {
                          setTenantToDelete(tenant);
                          setIsDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Form Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Editar Empresa Contratante" : "Nova Empresa Contratante"}
            </DialogTitle>
            <DialogDescription>
              {editingId
                ? "Atualize os dados da empresa contratante."
                : "Preencha os dados para cadastrar uma nova empresa contratante."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* CNPJ primeiro */}
              <div>
                <Label htmlFor="cnpj">CNPJ</Label>
                <div className="relative">
                  <Input
                    id="cnpj"
                    value={formData.cnpj ? formatCnpj(formData.cnpj) : ""}
                    onChange={(e) =>
                      setFormData({ ...formData, cnpj: e.target.value.replace(/\D/g, "") })
                    }
                    onBlur={handleCnpjBlur}
                    placeholder="00.000.000/0000-00"
                    maxLength={18}
                  />
                  {isLoadingCnpj && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="inscricao_estadual">Inscrição Estadual</Label>
                <Input
                  id="inscricao_estadual"
                  value={formData.inscricao_estadual || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, inscricao_estadual: e.target.value })
                  }
                />
              </div>

              <div className="col-span-2">
                <Label htmlFor="razao_social">Razão Social *</Label>
                <Input
                  id="razao_social"
                  value={formData.razao_social}
                  onChange={(e) =>
                    setFormData({ ...formData, razao_social: e.target.value })
                  }
                  required
                />
              </div>

              <div className="col-span-2">
                <Label htmlFor="nome_fantasia">Nome Fantasia</Label>
                <Input
                  id="nome_fantasia"
                  value={formData.nome_fantasia || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, nome_fantasia: e.target.value })
                  }
                />
              </div>

              <div>
                <Label htmlFor="cep">CEP</Label>
                <div className="relative">
                  <Input
                    id="cep"
                    value={formData.cep || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, cep: e.target.value })
                    }
                    onBlur={handleCepBlur}
                    disabled={isLoadingCep}
                  />
                  {isLoadingCep && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="uf">UF</Label>
                <Input
                  id="uf"
                  value={formData.uf || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, uf: e.target.value })
                  }
                  maxLength={2}
                />
              </div>

              <div className="col-span-2">
                <Label htmlFor="logradouro">Logradouro</Label>
                <Input
                  id="logradouro"
                  value={formData.logradouro || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, logradouro: e.target.value })
                  }
                />
              </div>

              <div>
                <Label htmlFor="numero">Número</Label>
                <Input
                  id="numero"
                  value={formData.numero || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, numero: e.target.value })
                  }
                />
              </div>

              <div>
                <Label htmlFor="complemento">Complemento</Label>
                <Input
                  id="complemento"
                  value={formData.complemento || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, complemento: e.target.value })
                  }
                />
              </div>

              <div>
                <Label htmlFor="bairro">Bairro</Label>
                <Input
                  id="bairro"
                  value={formData.bairro || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, bairro: e.target.value })
                  }
                />
              </div>

              <div>
                <Label htmlFor="cidade">Cidade</Label>
                <Input
                  id="cidade"
                  value={formData.cidade || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, cidade: e.target.value })
                  }
                />
              </div>

              <div>
                <Label htmlFor="telefone">Telefone</Label>
                <Input
                  id="telefone"
                  value={formData.telefone || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, telefone: e.target.value })
                  }
                />
              </div>

              <div>
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="ativo"
                  checked={formData.ativo ?? true}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, ativo: checked })
                  }
                />
                <Label htmlFor="ativo">Empresa Ativa</Label>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {createMutation.isPending || updateMutation.isPending
                  ? "Salvando..."
                  : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a empresa "{tenantToDelete?.razao_social}"?
              Esta ação não pode ser desfeita e afetará todos os dados vinculados.
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
