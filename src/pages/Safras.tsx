import { useState } from "react";
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
import { Calendar, Plus, Pencil, Trash2, Search } from "lucide-react";
import {
  useSafras,
  useCreateSafra,
  useUpdateSafra,
  useDeleteSafra,
  SafraInput,
} from "@/hooks/useSafras";
import { useCulturas } from "@/hooks/useCulturas";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";

const emptySafra: SafraInput = {
  codigo: "",
  nome: "",
  cultura_id: null,
  ano_colheita: new Date().getFullYear(),
  data_inicio: null,
  data_fim: null,
  status: "ativa",
};

export default function Safras() {
  const { data: safras, isLoading } = useSafras();
  const { data: culturas } = useCulturas();
  const createSafra = useCreateSafra();
  const updateSafra = useUpdateSafra();
  const deleteSafra = useDeleteSafra();
  const { canEdit } = useAuth();

  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedSafra, setSelectedSafra] = useState<any>(null);
  const [formData, setFormData] = useState<SafraInput>(emptySafra);

  const filteredSafras = safras?.filter(
    (s: any) =>
      s.nome.toLowerCase().includes(search.toLowerCase()) ||
      s.codigo?.toLowerCase().includes(search.toLowerCase())
  );

  const handleEdit = (safra: any) => {
    setSelectedSafra(safra);
    setFormData({
      codigo: safra.codigo || "",
      nome: safra.nome,
      cultura_id: safra.cultura_id,
      ano_colheita: safra.ano_colheita || new Date().getFullYear(),
      data_inicio: safra.data_inicio,
      data_fim: safra.data_fim,
      status: safra.status || "ativa",
    });
    setDialogOpen(true);
  };

  const handleNew = () => {
    setSelectedSafra(null);
    setFormData(emptySafra);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (selectedSafra) {
      await updateSafra.mutateAsync({ id: selectedSafra.id, ...formData });
    } else {
      await createSafra.mutateAsync(formData);
    }
    setDialogOpen(false);
  };

  const handleDelete = async () => {
    if (selectedSafra) {
      await deleteSafra.mutateAsync(selectedSafra.id);
      setDeleteDialogOpen(false);
      setSelectedSafra(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ativa":
        return "bg-success/10 text-success";
      case "encerrada":
        return "bg-muted text-muted-foreground";
      case "planejada":
        return "bg-info/10 text-info";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <AppLayout>
      <PageHeader
        title="Safras"
        description="Gerencie as safras do sistema"
        icon={<Calendar className="h-6 w-6" />}
        iconColor="bg-warning/10 text-warning"
        actions={
          canEdit && (
            <Button onClick={handleNew} className="gap-2">
              <Plus className="h-4 w-4" />
              Nova Safra
            </Button>
          )
        }
      />

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <CardTitle>Lista de Safras</CardTitle>
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar safra..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredSafras && filteredSafras.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Cultura</TableHead>
                    <TableHead>Ano Colheita</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSafras.map((safra: any) => (
                    <TableRow key={safra.id}>
                      <TableCell className="font-medium">{safra.codigo || "-"}</TableCell>
                      <TableCell className="font-medium">{safra.nome}</TableCell>
                      <TableCell>{safra.culturas?.nome || "-"}</TableCell>
                      <TableCell>{safra.ano_colheita || "-"}</TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${getStatusColor(safra.status)}`}
                        >
                          {safra.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        {canEdit && (
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(safra)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedSafra(safra);
                                setDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhuma safra encontrada</h3>
              <p className="text-muted-foreground mb-4">
                {search ? "Tente ajustar sua busca" : "Comece cadastrando uma safra"}
              </p>
              {!search && canEdit && (
                <Button onClick={handleNew}>
                  <Plus className="h-4 w-4 mr-2" />
                  Cadastrar Safra
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Form Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {selectedSafra ? "Editar Safra" : "Nova Safra"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="codigo">Código</Label>
                <Input
                  id="codigo"
                  value={formData.codigo || ""}
                  onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ano_colheita">Ano da Colheita</Label>
                <Input
                  id="ano_colheita"
                  type="number"
                  value={formData.ano_colheita || new Date().getFullYear()}
                  onChange={(e) => setFormData({ ...formData, ano_colheita: parseInt(e.target.value) })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="nome">Nome da Safra *</Label>
              <Input
                id="nome"
                placeholder="Ex: SOJA 2024/2025"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value.toUpperCase() })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cultura_id">Cultura</Label>
              <Select
                value={formData.cultura_id || ""}
                onValueChange={(value) => setFormData({ ...formData, cultura_id: value || null })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma cultura" />
                </SelectTrigger>
                <SelectContent>
                  {culturas?.map((cultura) => (
                    <SelectItem key={cultura.id} value={cultura.id}>
                      {cultura.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="data_inicio">Data Início</Label>
                <Input
                  id="data_inicio"
                  type="date"
                  value={formData.data_inicio || ""}
                  onChange={(e) => setFormData({ ...formData, data_inicio: e.target.value || null })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="data_fim">Data Fim</Label>
                <Input
                  id="data_fim"
                  type="date"
                  value={formData.data_fim || ""}
                  onChange={(e) => setFormData({ ...formData, data_fim: e.target.value || null })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status || "ativa"}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="planejada">Planejada</SelectItem>
                  <SelectItem value="ativa">Ativa</SelectItem>
                  <SelectItem value="encerrada">Encerrada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={!formData.nome || createSafra.isPending || updateSafra.isPending}
            >
              {createSafra.isPending || updateSafra.isPending ? "Salvando..." : "Salvar"}
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
              Tem certeza que deseja excluir a safra "{selectedSafra?.nome}"?
              Esta ação não pode ser desfeita.
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