import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Pencil, Trash2, Search, FileText } from "lucide-react";
import { useCfops, Cfop, CfopInsert } from "@/hooks/useCfops";
import { useAuth } from "@/contexts/AuthContext";
import { Spinner } from "@/components/ui/spinner";
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

const TIPOS_CFOP = [
  { value: "entrada", label: "Entrada" },
  { value: "saida", label: "Saída" },
  { value: "devolucao", label: "Devolução" },
  { value: "transferencia", label: "Transferência" },
  { value: "remessa", label: "Remessa" },
];

export default function Cfops() {
  const { cfops, isLoading, createCfop, updateCfop, deleteCfop } = useCfops();
  const { canEdit } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedCfop, setSelectedCfop] = useState<Cfop | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [tipoFilter, setTipoFilter] = useState<string>("todos");
  const [formData, setFormData] = useState<CfopInsert>({
    codigo: "",
    descricao: "",
    natureza_operacao: "",
    tipo: "saida",
    aplicacao: "",
    ativo: true,
  });

  const resetForm = () => {
    setFormData({
      codigo: "",
      descricao: "",
      natureza_operacao: "",
      tipo: "saida",
      aplicacao: "",
      ativo: true,
    });
    setSelectedCfop(null);
  };

  const handleOpenDialog = (cfop?: Cfop) => {
    if (cfop) {
      setSelectedCfop(cfop);
      setFormData({
        codigo: cfop.codigo,
        descricao: cfop.descricao,
        natureza_operacao: cfop.natureza_operacao || "",
        tipo: cfop.tipo || "saida",
        aplicacao: cfop.aplicacao || "",
        ativo: cfop.ativo ?? true,
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    resetForm();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedCfop) {
      await updateCfop.mutateAsync({ id: selectedCfop.id, ...formData });
    } else {
      await createCfop.mutateAsync(formData);
    }
    handleCloseDialog();
  };

  const handleDelete = async () => {
    if (selectedCfop) {
      await deleteCfop.mutateAsync(selectedCfop.id);
      setIsDeleteDialogOpen(false);
      setSelectedCfop(null);
    }
  };

  const filteredCfops = cfops.filter((cfop) => {
    const matchesSearch =
      cfop.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cfop.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (cfop.natureza_operacao?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
    const matchesTipo = tipoFilter === "todos" || cfop.tipo === tipoFilter;
    return matchesSearch && matchesTipo;
  });

  const getTipoBadgeVariant = (tipo: string | null) => {
    switch (tipo) {
      case "entrada":
        return "default";
      case "saida":
        return "secondary";
      case "devolucao":
        return "destructive";
      case "transferencia":
        return "outline";
      case "remessa":
        return "outline";
      default:
        return "outline";
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
          title="CFOPs"
          description="Cadastro de Códigos Fiscais de Operações e Prestações"
        />

        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por código, descrição..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={tipoFilter} onValueChange={setTipoFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os tipos</SelectItem>
                {TIPOS_CFOP.map((tipo) => (
                  <SelectItem key={tipo.value} value={tipo.value}>
                    {tipo.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {canEdit && (
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Novo CFOP
            </Button>
          )}
        </div>

        <div className="text-sm text-muted-foreground">
          {filteredCfops.length} CFOP(s) encontrado(s)
        </div>

        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">Código</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="w-40">Natureza Op.</TableHead>
                <TableHead className="w-32">Tipo</TableHead>
                <TableHead className="w-20">Status</TableHead>
                {canEdit && <TableHead className="w-24">Ações</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCfops.map((cfop) => (
                <TableRow key={cfop.id}>
                  <TableCell className="font-mono font-medium">
                    {cfop.codigo}
                  </TableCell>
                  <TableCell className="max-w-md truncate">
                    {cfop.descricao}
                  </TableCell>
                  <TableCell>{cfop.natureza_operacao || "-"}</TableCell>
                  <TableCell>
                    <Badge variant={getTipoBadgeVariant(cfop.tipo)}>
                      {TIPOS_CFOP.find((t) => t.value === cfop.tipo)?.label ||
                        cfop.tipo}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={cfop.ativo ? "default" : "secondary"}>
                      {cfop.ativo ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                  {canEdit && (
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDialog(cfop)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedCfop(cfop);
                            setIsDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
              {filteredCfops.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={canEdit ? 6 : 5}
                    className="text-center py-8 text-muted-foreground"
                  >
                    Nenhum CFOP encontrado
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Dialog de Criação/Edição */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {selectedCfop ? "Editar CFOP" : "Novo CFOP"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="codigo">Código *</Label>
                  <Input
                    id="codigo"
                    value={formData.codigo}
                    onChange={(e) =>
                      setFormData({ ...formData, codigo: e.target.value })
                    }
                    placeholder="Ex: 5101"
                    maxLength={4}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tipo">Tipo *</Label>
                  <Select
                    value={formData.tipo || "saida"}
                    onValueChange={(value) =>
                      setFormData({ ...formData, tipo: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIPOS_CFOP.map((tipo) => (
                        <SelectItem key={tipo.value} value={tipo.value}>
                          {tipo.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="descricao">Descrição *</Label>
                <Textarea
                  id="descricao"
                  value={formData.descricao}
                  onChange={(e) =>
                    setFormData({ ...formData, descricao: e.target.value })
                  }
                  placeholder="Descrição do CFOP"
                  rows={3}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="natureza_operacao">Natureza da Operação</Label>
                  <Input
                    id="natureza_operacao"
                    value={formData.natureza_operacao || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        natureza_operacao: e.target.value,
                      })
                    }
                    placeholder="Ex: Venda de Produção"
                    maxLength={60}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="aplicacao">Aplicação</Label>
                  <Input
                    id="aplicacao"
                    value={formData.aplicacao || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, aplicacao: e.target.value })
                    }
                    placeholder="Ex: venda_producao"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="ativo"
                  checked={formData.ativo ?? true}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, ativo: checked })
                  }
                />
                <Label htmlFor="ativo">CFOP Ativo</Label>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseDialog}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={createCfop.isPending || updateCfop.isPending}
                >
                  {createCfop.isPending || updateCfop.isPending
                    ? "Salvando..."
                    : "Salvar"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Dialog de Confirmação de Exclusão */}
        <AlertDialog
          open={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir o CFOP "{selectedCfop?.codigo} -{" "}
                {selectedCfop?.descricao}"? Esta ação não pode ser desfeita.
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
      </div>
    </AppLayout>
  );
}
