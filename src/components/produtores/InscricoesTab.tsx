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
import { Plus, Pencil, Trash2, FileText, Building2, Banknote, Crown } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
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
import { useGranjas } from "@/hooks/useGranjas";
import { useEmitentesNfe } from "@/hooks/useEmitentesNfe";
import { useCepLookup, formatCep } from "@/hooks/useCepLookup";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { formatCpfCnpj, formatTelefone } from "@/lib/formatters";
import { useProdutor } from "@/hooks/useProdutores";

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
  cep: "",
  logradouro: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "",
  uf: "",
  telefone: "",
  email: "",
  granja: "",
  granja_id: null,
  ativa: true,
  emitente_id: null,
  conta_bancaria: null,
  is_emitente_principal: false,
};

export function InscricoesTab({ produtorId }: InscricoesTabProps) {
  const { data: inscricoes, isLoading } = useInscricoesByProdutor(produtorId);
  const { data: produtor } = useProdutor(produtorId);
  const { data: granjas } = useGranjas();
  const { emitentes } = useEmitentesNfe();
  const createInscricao = useCreateInscricao();
  const updateInscricao = useUpdateInscricao();
  const deleteInscricao = useDeleteInscricao();
  const { canEdit } = useAuth();
  const { isLoading: isLoadingCep, fetchCep } = useCepLookup();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedInscricao, setSelectedInscricao] = useState<InscricaoProdutor | null>(null);
  const [formData, setFormData] = useState<InscricaoInput>(emptyInscricao);

  const handleNew = () => {
    setSelectedInscricao(null);
    // Preencher automaticamente com dados do produtor
    setFormData({ 
      ...emptyInscricao, 
      produtor_id: produtorId,
      cpf_cnpj: produtor?.cpf_cnpj || "",
      cep: produtor?.cep || "",
      logradouro: produtor?.logradouro || "",
      numero: produtor?.numero || "",
      complemento: produtor?.complemento || "",
      bairro: produtor?.bairro || "",
      cidade: produtor?.cidade || "",
      uf: produtor?.uf || "",
      telefone: produtor?.telefone || "",
      email: produtor?.email || "",
      granja_id: produtor?.granja_id || null,
    });
    setDialogOpen(true);
  };

  const handleEdit = (inscricao: InscricaoProdutor) => {
    setSelectedInscricao(inscricao);
    setFormData({
      produtor_id: inscricao.produtor_id,
      tipo: inscricao.tipo || "",
      inscricao_estadual: inscricao.inscricao_estadual || "",
      cpf_cnpj: inscricao.cpf_cnpj || "",
      cep: inscricao.cep || "",
      logradouro: inscricao.logradouro || "",
      numero: inscricao.numero || "",
      complemento: inscricao.complemento || "",
      bairro: inscricao.bairro || "",
      cidade: inscricao.cidade || "",
      uf: inscricao.uf || "",
      telefone: inscricao.telefone || "",
      email: inscricao.email || "",
      granja: inscricao.granja || "",
      granja_id: inscricao.granja_id || null,
      ativa: inscricao.ativa ?? true,
      emitente_id: inscricao.emitente_id || null,
      conta_bancaria: inscricao.conta_bancaria || null,
      is_emitente_principal: inscricao.is_emitente_principal ?? false,
    });
    setDialogOpen(true);
  };

  // Handler para marcar/desmarcar inscrição principal
  const handleToggleEmitentePrincipal = async (inscricao: InscricaoProdutor) => {
    if (!inscricao.granja_id) {
      toast({
        title: "Granja não vinculada",
        description: "Esta inscrição não está vinculada a uma granja.",
        variant: "destructive",
      });
      return;
    }

    const novoValor = !inscricao.is_emitente_principal;

    try {
      // Se estiver marcando como principal, desmarcar outras da mesma granja primeiro
      if (novoValor) {
        await supabase
          .from("inscricoes_produtor")
          .update({ is_emitente_principal: false })
          .eq("granja_id", inscricao.granja_id)
          .eq("is_emitente_principal", true);
      }

      // Atualizar a inscrição atual
      await updateInscricao.mutateAsync({
        id: inscricao.id,
        produtor_id: inscricao.produtor_id,
        tipo: inscricao.tipo,
        inscricao_estadual: inscricao.inscricao_estadual,
        cpf_cnpj: inscricao.cpf_cnpj,
        cep: inscricao.cep,
        logradouro: inscricao.logradouro,
        numero: inscricao.numero,
        complemento: inscricao.complemento,
        bairro: inscricao.bairro,
        cidade: inscricao.cidade,
        uf: inscricao.uf,
        telefone: inscricao.telefone,
        email: inscricao.email,
        granja: inscricao.granja,
        granja_id: inscricao.granja_id,
        ativa: inscricao.ativa,
        emitente_id: inscricao.emitente_id,
        conta_bancaria: inscricao.conta_bancaria,
        is_emitente_principal: novoValor,
      });
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleCepBlur = async () => {
    const cep = formData.cep?.replace(/\D/g, "") || "";
    if (cep.length === 8) {
      const data = await fetchCep(cep);
      if (data) {
        setFormData({
          ...formData,
          logradouro: data.logradouro || formData.logradouro,
          bairro: data.bairro || formData.bairro,
          cidade: data.localidade || formData.cidade,
          uf: data.uf || formData.uf,
        });
      }
    }
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

  // Emitentes ativos para seleção
  const emitentesAtivos = emitentes.filter(e => e.ativo);

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
                <TableHead>Emitente</TableHead>
                <TableHead>Principal</TableHead>
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
                  <TableCell className="font-mono">{formatCpfCnpj(inscricao.cpf_cnpj) || "-"}</TableCell>
                  <TableCell>
                    {inscricao.cidade && inscricao.uf
                      ? `${inscricao.cidade}/${inscricao.uf}`
                      : inscricao.cidade || inscricao.uf || "-"}
                  </TableCell>
                  <TableCell>
                    {inscricao.granja_id
                      ? granjas?.find(e => e.id === inscricao.granja_id)?.nome_fantasia 
                        || granjas?.find(e => e.id === inscricao.granja_id)?.razao_social 
                        || "-"
                      : inscricao.granja || "-"}
                  </TableCell>
                  <TableCell>
                    {inscricao.emitente ? (
                      <Badge variant="outline" className="gap-1">
                        <Building2 className="h-3 w-3" />
                        {inscricao.emitente.granja?.nome_fantasia || inscricao.emitente.granja?.razao_social || "Configurado"}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-xs">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {inscricao.granja_id && inscricao.emitente_id ? (
                      <Button
                        variant={inscricao.is_emitente_principal ? "default" : "ghost"}
                        size="sm"
                        className={inscricao.is_emitente_principal ? "gap-1 bg-amber-500 hover:bg-amber-600" : "gap-1"}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleEmitentePrincipal(inscricao);
                        }}
                        disabled={updateInscricao.isPending}
                      >
                        <Crown className="h-3 w-3" />
                        {inscricao.is_emitente_principal ? "Principal" : "Definir"}
                      </Button>
                    ) : (
                      <span className="text-muted-foreground text-xs">-</span>
                    )}
                  </TableCell>
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedInscricao ? "Editar Inscrição" : "Nova Inscrição"}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Dados da Inscrição */}
            <div className="space-y-4">
              <h5 className="text-sm font-medium text-muted-foreground border-b pb-2">Dados da Inscrição</h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  <Label htmlFor="granja_id">Granja</Label>
                  <Select
                    value={formData.granja_id || ""}
                    onValueChange={(value) => setFormData({ ...formData, granja_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a granja" />
                    </SelectTrigger>
                    <SelectContent>
                      {granjas?.filter(e => e.ativa).map((granja) => (
                        <SelectItem key={granja.id} value={granja.id}>
                          {granja.nome_fantasia || granja.razao_social}
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
                    value={formatCpfCnpj(formData.cpf_cnpj || "")}
                    onChange={(e) => setFormData({ ...formData, cpf_cnpj: e.target.value.replace(/\D/g, "") })}
                    placeholder="000.000.000-00"
                  />
                </div>
              </div>
            </div>

            {/* Endereço */}
            <div className="space-y-4">
              <h5 className="text-sm font-medium text-muted-foreground border-b pb-2">Endereço</h5>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cep">CEP</Label>
                  <Input
                    id="cep"
                    value={formData.cep ? formatCep(formData.cep) : ""}
                    onChange={(e) => setFormData({ ...formData, cep: e.target.value.replace(/\D/g, "") })}
                    onBlur={handleCepBlur}
                    placeholder="00000-000"
                    maxLength={9}
                    disabled={isLoadingCep}
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
                  <Label htmlFor="numero">Número</Label>
                  <Input
                    id="numero"
                    value={formData.numero || ""}
                    onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="complemento">Complemento</Label>
                  <Input
                    id="complemento"
                    value={formData.complemento || ""}
                    onChange={(e) => setFormData({ ...formData, complemento: e.target.value })}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="bairro">Bairro</Label>
                  <Input
                    id="bairro"
                    value={formData.bairro || ""}
                    onChange={(e) => setFormData({ ...formData, bairro: e.target.value })}
                  />
                </div>
                <div className="space-y-2 md:col-span-3">
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
              </div>
            </div>

            {/* Contato */}
            <div className="space-y-4">
              <h5 className="text-sm font-medium text-muted-foreground border-b pb-2">Contato</h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="telefone">Telefone</Label>
                  <Input
                    id="telefone"
                    value={formatTelefone(formData.telefone || "")}
                    onChange={(e) => setFormData({ ...formData, telefone: e.target.value.replace(/\D/g, "") })}
                    placeholder="(00) 0000-0000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email || ""}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="email@exemplo.com"
                  />
                </div>
              </div>
            </div>

            {/* Emitente NF-e */}
            <div className="space-y-4">
              <h5 className="text-sm font-medium text-muted-foreground border-b pb-2 flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Emitente NF-e
              </h5>
              <div className="space-y-2">
                <Label htmlFor="emitente_id">Emitente para emissão de NFP-e</Label>
                <Select
                  value={formData.emitente_id || "none"}
                  onValueChange={(value) => setFormData({ ...formData, emitente_id: value === "none" ? null : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o emitente" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {emitentesAtivos.map((emitente) => (
                      <SelectItem key={emitente.id} value={emitente.id}>
                        {emitente.granja?.nome_fantasia || emitente.granja?.razao_social || "Emitente"}
                        {emitente.ambiente === 1 ? " (Produção)" : " (Homologação)"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Selecione o emitente que será usado para emissão de NFP-e desta inscrição
                </p>
              </div>
              {formData.emitente_id && (
                <div className="p-3 bg-muted/50 rounded-md text-sm">
                  {(() => {
                    const emitente = emitentes.find(e => e.id === formData.emitente_id);
                    if (!emitente) return null;
                    return (
                      <div className="space-y-1">
                        <p><span className="font-medium">Ambiente:</span> {emitente.ambiente === 1 ? "Produção" : "Homologação"}</p>
                        <p><span className="font-medium">Série:</span> {emitente.serie_nfe}</p>
                        <p><span className="font-medium">API:</span> {emitente.api_configurada ? "Configurada" : "Não configurada"}</p>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>

            {/* Conta Bancária */}
            <div className="space-y-4">
              <h5 className="text-sm font-medium text-muted-foreground border-b pb-2 flex items-center gap-2">
                <Banknote className="h-4 w-4" />
                Conta Bancária
              </h5>
              <div className="space-y-2">
                <Label htmlFor="conta_bancaria">Dados da Conta Bancária</Label>
                <Textarea
                  id="conta_bancaria"
                  value={formData.conta_bancaria || ""}
                  onChange={(e) => setFormData({ ...formData, conta_bancaria: e.target.value })}
                  placeholder="Ex: Banco do Brasil - Ag: 1234-5 - CC: 12345-6 - PIX: email@exemplo.com"
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  Informe os dados bancários para recebimento de pagamentos
                </p>
              </div>
            </div>

            {/* Status */}
            <div className="flex items-center space-x-2 pt-2">
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
