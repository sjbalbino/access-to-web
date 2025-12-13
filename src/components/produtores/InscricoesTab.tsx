import { useState } from "react";
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
import { Plus, Pencil, Trash2, FileText } from "lucide-react";
import {
  useInscricoesByProdutor,
  useCreateInscricao,
  useUpdateInscricao,
  useDeleteInscricao,
  InscricaoInput,
  InscricaoProdutor,
} from "@/hooks/useInscricoesProdutor";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";

const TIPOS_INSCRICAO = [
  { value: "parceria", label: "Parceria" },
  { value: "arrendamento", label: "Arrendamento" },
  { value: "terceiros", label: "Terceiros" },
];

interface InscricoesTabProps {
  produtorId: string;
}

const emptyInscricao: InscricaoInput = {
  produtor_id: null,
  tipo: "",
  inscricao_estadual: "",
  cpf_cnpj: "",
  logradouro: "",
  cidade: "",
  uf: "",
  granja: "",
  ativa: true,
};

export function InscricoesTab({ produtorId }: InscricoesTabProps) {
  const { data: inscricoes, isLoading } = useInscricoesByProdutor(produtorId);
  const createInscricao = useCreateInscricao();
  const updateInscricao = useUpdateInscricao();
  const deleteInscricao = useDeleteInscricao();
  const { canEdit } = useAuth();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedInscricao, setSelectedInscricao] = useState<InscricaoProdutor | null>(null);
  const [formData, setFormData] = useState<InscricaoInput>(emptyInscricao);

  const handleNew = () => {
    setSelectedInscricao(null);
    setFormData({ ...emptyInscricao, produtor_id: produtorId });
    setDialogOpen(true);
  };

  const handleEdit = (inscricao: InscricaoProdutor) => {
    setSelectedInscricao(inscricao);
    setFormData({
      produtor_id: inscricao.produtor_id,
      tipo: inscricao.tipo || "",
      inscricao_estadual: inscricao.inscricao_estadual || "",
      cpf_cnpj: inscricao.cpf_cnpj || "",
      logradouro: inscricao.logradouro || "",
      cidade: inscricao.cidade || "",
      uf: inscricao.uf || "",
      granja: inscricao.granja || "",
      ativa: inscricao.ativa ?? true,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (selectedInscricao) {
      await updateInscricao.mutateAsync({ id: selectedInscricao.id, ...formData });
    } else {
      await createInscricao.mutateAsync(formData);
    }
    setDialogOpen(false);
  };

  const handleDelete = async () => {
    if (selectedInscricao) {
      await deleteInscricao.mutateAsync({ id: selectedInscricao.id, produtorId });
      setDeleteDialogOpen(false);
      setSelectedInscricao(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Inscrições Estaduais
        </h4>
        {canEdit && (
          <Button onClick={handleNew} size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            Nova Inscrição
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : inscricoes && inscricoes.length > 0 ? (
        <div className="overflow-x-auto border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead>Inscrição Estadual</TableHead>
                <TableHead>CPF/CNPJ</TableHead>
                <TableHead>Cidade/UF</TableHead>
                <TableHead>Granja</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {inscricoes.map((inscricao) => (
                <TableRow key={inscricao.id}>
                  <TableCell>
                    {TIPOS_INSCRICAO.find(t => t.value === inscricao.tipo)?.label || inscricao.tipo || "-"}
                  </TableCell>
                  <TableCell className="font-medium">{inscricao.inscricao_estadual || "-"}</TableCell>
                  <TableCell>{inscricao.cpf_cnpj || "-"}</TableCell>
                  <TableCell>
                    {inscricao.cidade && inscricao.uf
                      ? `${inscricao.cidade}/${inscricao.uf}`
                      : inscricao.cidade || inscricao.uf || "-"}
                  </TableCell>
                  <TableCell>{inscricao.granja || "-"}</TableCell>
                  <TableCell>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        inscricao.ativa
                          ? "bg-success/10 text-success"
                          : "bg-destructive/10 text-destructive"
                      }`}
                    >
                      {inscricao.ativa ? "Ativa" : "Inativa"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    {canEdit && (
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(inscricao)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedInscricao(inscricao);
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
        <div className="text-center py-6 border rounded-md">
          <FileText className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground mb-3">
            Nenhuma inscrição estadual cadastrada
          </p>
          {canEdit && (
            <Button onClick={handleNew} variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Inscrição
            </Button>
          )}
        </div>
      )}

      {/* Form Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {selectedInscricao ? "Editar Inscrição" : "Nova Inscrição"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="tipo">Tipo</Label>
              <Select
                value={formData.tipo || ""}
                onValueChange={(value) => setFormData({ ...formData, tipo: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_INSCRICAO.map((tipo) => (
                    <SelectItem key={tipo.value} value={tipo.value}>
                      {tipo.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="inscricao_estadual">Inscrição Estadual</Label>
              <Input
                id="inscricao_estadual"
                value={formData.inscricao_estadual || ""}
                onChange={(e) => setFormData({ ...formData, inscricao_estadual: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cpf_cnpj">CPF/CNPJ</Label>
              <Input
                id="cpf_cnpj"
                value={formData.cpf_cnpj || ""}
                onChange={(e) => setFormData({ ...formData, cpf_cnpj: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="granja">Granja</Label>
              <Input
                id="granja"
                value={formData.granja || ""}
                onChange={(e) => setFormData({ ...formData, granja: e.target.value })}
                placeholder="Nome da propriedade"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="logradouro">Logradouro</Label>
              <Input
                id="logradouro"
                value={formData.logradouro || ""}
                onChange={(e) => setFormData({ ...formData, logradouro: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cidade">Cidade</Label>
              <Input
                id="cidade"
                value={formData.cidade || ""}
                onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="uf">UF</Label>
              <Input
                id="uf"
                value={formData.uf || ""}
                onChange={(e) => setFormData({ ...formData, uf: e.target.value.toUpperCase() })}
                maxLength={2}
              />
            </div>
            <div className="flex items-center space-x-2 md:col-span-2">
              <Switch
                id="ativa"
                checked={formData.ativa ?? true}
                onCheckedChange={(checked) => setFormData({ ...formData, ativa: checked })}
              />
              <Label htmlFor="ativa">Inscrição Ativa</Label>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={createInscricao.isPending || updateInscricao.isPending}
            >
              {createInscricao.isPending || updateInscricao.isPending ? "Salvando..." : "Salvar"}
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
              Tem certeza que deseja excluir esta inscrição estadual?
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
    </div>
  );
}
