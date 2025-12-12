import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Leaf, Plus, Pencil, Trash2, Search } from "lucide-react";
import {
  useCulturas,
  useCreateCultura,
  useUpdateCultura,
  useDeleteCultura,
  Cultura,
  CulturaInput,
} from "@/hooks/useCulturas";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";

const emptyCultura: CulturaInput = {
  codigo: "",
  nome: "",
  peso_saco_industria: 60,
  peso_saco_semente: 60,
  informar_ph: false,
  ativa: true,
};

export default function Culturas() {
  const { data: culturas, isLoading } = useCulturas();
  const createCultura = useCreateCultura();
  const updateCultura = useUpdateCultura();
  const deleteCultura = useDeleteCultura();
  const { canEdit } = useAuth();

  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedCultura, setSelectedCultura] = useState<Cultura | null>(null);
  const [formData, setFormData] = useState<CulturaInput>(emptyCultura);

  const filteredCulturas = culturas?.filter(
    (c) =>
      c.nome.toLowerCase().includes(search.toLowerCase()) ||
      c.codigo?.toLowerCase().includes(search.toLowerCase())
  );

  const handleEdit = (cultura: Cultura) => {
    setSelectedCultura(cultura);
    setFormData({
      codigo: cultura.codigo || "",
      nome: cultura.nome,
      peso_saco_industria: cultura.peso_saco_industria || 60,
      peso_saco_semente: cultura.peso_saco_semente || 60,
      informar_ph: cultura.informar_ph || false,
      ativa: cultura.ativa ?? true,
    });
    setDialogOpen(true);
  };

  const handleNew = () => {
    setSelectedCultura(null);
    setFormData(emptyCultura);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (selectedCultura) {
      await updateCultura.mutateAsync({ id: selectedCultura.id, ...formData });
    } else {
      await createCultura.mutateAsync(formData);
    }
    setDialogOpen(false);
  };

  const handleDelete = async () => {
    if (selectedCultura) {
      await deleteCultura.mutateAsync(selectedCultura.id);
      setDeleteDialogOpen(false);
      setSelectedCultura(null);
    }
  };

  return (
    <AppLayout>
      <PageHeader
        title="Culturas"
        description="Gerencie os tipos de culturas do sistema"
        icon={<Leaf className="h-6 w-6" />}
        iconColor="bg-success/10 text-success"
        actions={
          canEdit && (
            <Button onClick={handleNew} className="gap-2">
              <Plus className="h-4 w-4" />
              Nova Cultura
            </Button>
          )
        }
      />

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <CardTitle>Lista de Culturas</CardTitle>
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar cultura..."
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
          ) : filteredCulturas && filteredCulturas.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Peso Saco Indústria</TableHead>
                    <TableHead>Peso Saco Semente</TableHead>
                    <TableHead>Informar PH</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCulturas.map((cultura) => (
                    <TableRow key={cultura.id}>
                      <TableCell className="font-medium">{cultura.codigo || "-"}</TableCell>
                      <TableCell className="font-medium">{cultura.nome}</TableCell>
                      <TableCell>{cultura.peso_saco_industria || 60} kg</TableCell>
                      <TableCell>{cultura.peso_saco_semente || 60} kg</TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            cultura.informar_ph
                              ? "bg-info/10 text-info"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {cultura.informar_ph ? "Sim" : "Não"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            cultura.ativa
                              ? "bg-success/10 text-success"
                              : "bg-destructive/10 text-destructive"
                          }`}
                        >
                          {cultura.ativa ? "Ativa" : "Inativa"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        {canEdit && (
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(cultura)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedCultura(cultura);
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
              <Leaf className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhuma cultura encontrada</h3>
              <p className="text-muted-foreground mb-4">
                {search ? "Tente ajustar sua busca" : "Comece cadastrando uma cultura"}
              </p>
              {!search && canEdit && (
                <Button onClick={handleNew}>
                  <Plus className="h-4 w-4 mr-2" />
                  Cadastrar Cultura
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
              {selectedCultura ? "Editar Cultura" : "Nova Cultura"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="codigo">Código</Label>
                <Input
                  id="codigo"
                  value={formData.codigo || ""}
                  onChange={(e) => setFormData({ ...formData, codigo: e.target.value.toUpperCase() })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nome">Nome *</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value.toUpperCase() })}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="peso_saco_industria">Peso Saco Indústria (kg)</Label>
                <Input
                  id="peso_saco_industria"
                  type="number"
                  value={formData.peso_saco_industria || 60}
                  onChange={(e) => setFormData({ ...formData, peso_saco_industria: parseFloat(e.target.value) || 60 })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="peso_saco_semente">Peso Saco Semente (kg)</Label>
                <Input
                  id="peso_saco_semente"
                  type="number"
                  value={formData.peso_saco_semente || 60}
                  onChange={(e) => setFormData({ ...formData, peso_saco_semente: parseFloat(e.target.value) || 60 })}
                />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="informar_ph"
                checked={formData.informar_ph || false}
                onCheckedChange={(checked) => setFormData({ ...formData, informar_ph: !!checked })}
              />
              <Label htmlFor="informar_ph" className="cursor-pointer">
                Informar PH na colheita
              </Label>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={!formData.nome || createCultura.isPending || updateCultura.isPending}
            >
              {createCultura.isPending || updateCultura.isPending ? "Salvando..." : "Salvar"}
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
              Tem certeza que deseja excluir a cultura "{selectedCultura?.nome}"?
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