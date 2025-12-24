import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Map, Plus, Pencil, Trash2, Search } from "lucide-react";
import {
  useLavouras,
  useCreateLavoura,
  useUpdateLavoura,
  useDeleteLavoura,
  LavouraInput,
} from "@/hooks/useLavouras";
import { useGranjas } from "@/hooks/useGranjas";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";

const emptyLavoura: LavouraInput = {
  nome: "",
  granja_id: null,
  total_hectares: 0,
  area_nao_aproveitavel: 0,
  area_plantio: 0,
  latitude: null,
  longitude: null,
  observacoes: "",
  ativa: true,
  recebe_terceiros: false,
};

export default function Lavouras() {
  const { data: lavouras, isLoading } = useLavouras();
  const { data: granjas } = useGranjas();
  const createLavoura = useCreateLavoura();
  const updateLavoura = useUpdateLavoura();
  const deleteLavoura = useDeleteLavoura();
  const { canEdit } = useAuth();

  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedLavoura, setSelectedLavoura] = useState<any>(null);
  const [formData, setFormData] = useState<LavouraInput>(emptyLavoura);

  const filteredLavouras = lavouras?.filter(
    (l: any) => l.nome.toLowerCase().includes(search.toLowerCase())
  );

  const handleEdit = (lavoura: any) => {
    setSelectedLavoura(lavoura);
    setFormData({
      nome: lavoura.nome,
      granja_id: lavoura.granja_id,
      total_hectares: lavoura.total_hectares || 0,
      area_nao_aproveitavel: lavoura.area_nao_aproveitavel || 0,
      area_plantio: lavoura.area_plantio || 0,
      latitude: lavoura.latitude,
      longitude: lavoura.longitude,
      observacoes: lavoura.observacoes || "",
      ativa: lavoura.ativa ?? true,
      recebe_terceiros: lavoura.recebe_terceiros ?? false,
    });
    setDialogOpen(true);
  };

  const handleNew = () => {
    setSelectedLavoura(null);
    setFormData(emptyLavoura);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (selectedLavoura) {
      await updateLavoura.mutateAsync({ id: selectedLavoura.id, ...formData });
    } else {
      await createLavoura.mutateAsync(formData);
    }
    setDialogOpen(false);
  };

  const handleDelete = async () => {
    if (selectedLavoura) {
      await deleteLavoura.mutateAsync(selectedLavoura.id);
      setDeleteDialogOpen(false);
      setSelectedLavoura(null);
    }
  };

  // Calculate area_plantio automatically
  const handleAreaChange = (field: "total_hectares" | "area_nao_aproveitavel", value: number) => {
    const newData = { ...formData, [field]: value };
    const total = field === "total_hectares" ? value : formData.total_hectares || 0;
    const naoAproveitavel = field === "area_nao_aproveitavel" ? value : formData.area_nao_aproveitavel || 0;
    newData.area_plantio = Math.max(0, total - naoAproveitavel);
    setFormData(newData);
  };

  return (
    <AppLayout>
      <PageHeader
        title="Lavouras / Talhões"
        description="Gerencie as lavouras e talhões cadastrados"
        icon={<Map className="h-6 w-6" />}
        iconColor="bg-chart-5/10 text-chart-5"
        actions={
          canEdit && (
            <Button onClick={handleNew} className="gap-2">
              <Plus className="h-4 w-4" />
              Nova Lavoura
            </Button>
          )
        }
      />

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <CardTitle>Lista de Lavouras</CardTitle>
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar lavoura..."
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
          ) : filteredLavouras && filteredLavouras.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Granja</TableHead>
                    <TableHead>Total Ha</TableHead>
                    <TableHead>Área Plantio</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLavouras.map((lavoura: any) => (
                    <TableRow key={lavoura.id}>
                      <TableCell className="font-medium">{lavoura.nome}</TableCell>
                      <TableCell>{lavoura.granja?.razao_social || "-"}</TableCell>
                      <TableCell>{lavoura.total_hectares?.toLocaleString("pt-BR") || 0}</TableCell>
                      <TableCell>{lavoura.area_plantio?.toLocaleString("pt-BR") || 0}</TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            lavoura.ativa
                              ? "bg-success/10 text-success"
                              : "bg-destructive/10 text-destructive"
                          }`}
                        >
                          {lavoura.ativa ? "Ativa" : "Inativa"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        {canEdit && (
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(lavoura)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedLavoura(lavoura);
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
              <Map className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhuma lavoura encontrada</h3>
              <p className="text-muted-foreground mb-4">
                {search ? "Tente ajustar sua busca" : "Comece cadastrando uma lavoura"}
              </p>
              {!search && canEdit && (
                <Button onClick={handleNew}>
                  <Plus className="h-4 w-4 mr-2" />
                  Cadastrar Lavoura
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Form Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedLavoura ? "Editar Lavoura" : "Nova Lavoura"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="nome">Nome da Lavoura *</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="granja_id">Granja</Label>
              <Select
                value={formData.granja_id || ""}
                onValueChange={(value) => setFormData({ ...formData, granja_id: value || null })}
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
              <Label htmlFor="total_hectares">Total de Hectares</Label>
              <Input
                id="total_hectares"
                type="number"
                step="0.01"
                value={formData.total_hectares || 0}
                onChange={(e) => handleAreaChange("total_hectares", parseFloat(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="area_nao_aproveitavel">Área Não Aproveitável (Ha)</Label>
              <Input
                id="area_nao_aproveitavel"
                type="number"
                step="0.01"
                value={formData.area_nao_aproveitavel || 0}
                onChange={(e) => handleAreaChange("area_nao_aproveitavel", parseFloat(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="area_plantio">Área de Plantio (Ha) - Calculado</Label>
              <Input
                id="area_plantio"
                type="number"
                step="0.01"
                value={formData.area_plantio || 0}
                readOnly
                className="bg-muted"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="latitude">Latitude</Label>
              <Input
                id="latitude"
                type="number"
                step="0.00000001"
                value={formData.latitude || ""}
                onChange={(e) => setFormData({ ...formData, latitude: parseFloat(e.target.value) || null })}
                placeholder="-23.12345678"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="longitude">Longitude</Label>
              <Input
                id="longitude"
                type="number"
                step="0.00000001"
                value={formData.longitude || ""}
                onChange={(e) => setFormData({ ...formData, longitude: parseFloat(e.target.value) || null })}
                placeholder="-49.12345678"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="observacoes">Observações</Label>
              <Textarea
                id="observacoes"
                value={formData.observacoes || ""}
                onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                rows={3}
              />
            </div>
            <div className="flex items-center gap-4 md:col-span-2">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="recebe_terceiros"
                  checked={formData.recebe_terceiros ?? false}
                  onChange={(e) => setFormData({ ...formData, recebe_terceiros: e.target.checked })}
                  className="h-4 w-4 rounded border-input"
                />
                <Label htmlFor="recebe_terceiros">Recebe Produção de Terceiros</Label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="ativa"
                  checked={formData.ativa ?? true}
                  onChange={(e) => setFormData({ ...formData, ativa: e.target.checked })}
                  className="h-4 w-4 rounded border-input"
                />
                <Label htmlFor="ativa">Ativa</Label>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={!formData.nome || createLavoura.isPending || updateLavoura.isPending}
            >
              {createLavoura.isPending || updateLavoura.isPending ? "Salvando..." : "Salvar"}
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
              Tem certeza que deseja excluir a lavoura "{selectedLavoura?.nome}"?
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