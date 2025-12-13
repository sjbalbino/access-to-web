import { useState } from "react";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, Trash2, Loader2, User } from "lucide-react";
import { useUpdateProdutor, useDeleteProdutor, ProdutorInput } from "@/hooks/useProdutores";
import { useEmpresas } from "@/hooks/useEmpresas";
import { useAuth } from "@/contexts/AuthContext";
import { useCepLookup, formatCep } from "@/hooks/useCepLookup";
import { InscricoesTab } from "./InscricoesTab";

interface Produtor {
  id: string;
  nome: string;
  tipo_pessoa: string | null;
  cpf_cnpj: string | null;
  identidade: string | null;
  empresa_id: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  cep: string | null;
  telefone: string | null;
  celular: string | null;
  email: string | null;
  ativo: boolean | null;
  empresas?: { razao_social: string } | null;
}

interface ProdutorDetalheProps {
  produtor: Produtor;
  onBack: () => void;
}

export function ProdutorDetalhe({ produtor, onBack }: ProdutorDetalheProps) {
  const { data: empresas } = useEmpresas();
  const updateProdutor = useUpdateProdutor();
  const deleteProdutor = useDeleteProdutor();
  const { canEdit } = useAuth();
  const { isLoading: cepLoading, fetchCep } = useCepLookup();

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [formData, setFormData] = useState<ProdutorInput>({
    nome: produtor.nome,
    tipo_pessoa: produtor.tipo_pessoa || "fisica",
    cpf_cnpj: produtor.cpf_cnpj || "",
    identidade: produtor.identidade || "",
    empresa_id: produtor.empresa_id,
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
    await updateProdutor.mutateAsync({ id: produtor.id, ...formData });
  };

  const handleDelete = async () => {
    await deleteProdutor.mutateAsync(produtor.id);
    setDeleteDialogOpen(false);
    onBack();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-accent/10 flex items-center justify-center">
              <User className="h-5 w-5 text-accent" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">{produtor.nome}</h1>
              <p className="text-sm text-muted-foreground">
                {produtor.cpf_cnpj || "CPF/CNPJ não informado"}
              </p>
            </div>
          </div>
        </div>
        {canEdit && (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setDeleteDialogOpen(true)}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Excluir Produtor
          </Button>
        )}
      </div>

      {/* Master Data Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Dados do Produtor</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tipo_pessoa">Tipo de Pessoa</Label>
              <Select
                value={formData.tipo_pessoa || "fisica"}
                onValueChange={(value) => setFormData({ ...formData, tipo_pessoa: value })}
                disabled={!canEdit}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fisica">Pessoa Física</SelectItem>
                  <SelectItem value="juridica">Pessoa Jurídica</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="nome">Nome Completo *</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                disabled={!canEdit}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cpf_cnpj">
                {formData.tipo_pessoa === "fisica" ? "CPF" : "CNPJ"}
              </Label>
              <Input
                id="cpf_cnpj"
                value={formData.cpf_cnpj || ""}
                onChange={(e) => setFormData({ ...formData, cpf_cnpj: e.target.value })}
                disabled={!canEdit}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="identidade">Identidade</Label>
              <Input
                id="identidade"
                value={formData.identidade || ""}
                onChange={(e) => setFormData({ ...formData, identidade: e.target.value })}
                disabled={!canEdit}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="empresa_id">Empresa Consolidada</Label>
              <Select
                value={formData.empresa_id || ""}
                onValueChange={(value) => setFormData({ ...formData, empresa_id: value || null })}
                disabled={!canEdit}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma empresa" />
                </SelectTrigger>
                <SelectContent>
                  {empresas?.map((empresa) => (
                    <SelectItem key={empresa.id} value={empresa.id}>
                      {empresa.razao_social}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cep">CEP</Label>
              <div className="relative">
                <Input
                  id="cep"
                  value={formData.cep || ""}
                  onChange={(e) => setFormData({ ...formData, cep: formatCep(e.target.value) })}
                  onBlur={(e) => handleCepBlur(e.target.value)}
                  placeholder="00000-000"
                  maxLength={9}
                  disabled={!canEdit}
                />
                {cepLoading && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                )}
              </div>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="logradouro">Logradouro</Label>
              <Input
                id="logradouro"
                value={formData.logradouro || ""}
                onChange={(e) => setFormData({ ...formData, logradouro: e.target.value })}
                disabled={!canEdit}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="numero">Número</Label>
              <Input
                id="numero"
                value={formData.numero || ""}
                onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
                disabled={!canEdit}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="complemento">Complemento</Label>
              <Input
                id="complemento"
                value={formData.complemento || ""}
                onChange={(e) => setFormData({ ...formData, complemento: e.target.value })}
                disabled={!canEdit}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bairro">Bairro</Label>
              <Input
                id="bairro"
                value={formData.bairro || ""}
                onChange={(e) => setFormData({ ...formData, bairro: e.target.value })}
                disabled={!canEdit}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cidade">Cidade</Label>
              <Input
                id="cidade"
                value={formData.cidade || ""}
                onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                disabled={!canEdit}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="uf">UF</Label>
              <Input
                id="uf"
                value={formData.uf || ""}
                onChange={(e) => setFormData({ ...formData, uf: e.target.value.toUpperCase() })}
                maxLength={2}
                disabled={!canEdit}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="telefone">Telefone</Label>
              <Input
                id="telefone"
                value={formData.telefone || ""}
                onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                disabled={!canEdit}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="celular">Celular</Label>
              <Input
                id="celular"
                value={formData.celular || ""}
                onChange={(e) => setFormData({ ...formData, celular: e.target.value })}
                disabled={!canEdit}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={formData.email || ""}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                disabled={!canEdit}
              />
            </div>
          </div>
          {canEdit && (
            <div className="flex justify-end mt-6">
              <Button
                onClick={handleSave}
                disabled={!formData.nome || updateProdutor.isPending}
              >
                {updateProdutor.isPending ? "Salvando..." : "Salvar Dados do Produtor"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Inscricoes Tab */}
      <InscricoesTab produtorId={produtor.id} />

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o produtor "{produtor.nome}"?
              Todas as inscrições estaduais vinculadas também serão excluídas.
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
