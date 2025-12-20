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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Plus, Pencil, Trash2, Building2, AlertCircle } from "lucide-react";
import { useEmitentesNfe, EmitenteNfe, EmitenteNfeInsert } from "@/hooks/useEmitentesNfe";
import { useGranjas } from "@/hooks/useGranjas";
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const AMBIENTES = [
  { value: 1, label: "Produção" },
  { value: 2, label: "Homologação" },
];

const REGIMES_TRIBUTARIOS = [
  { value: 1, label: "Simples Nacional" },
  { value: 2, label: "Simples Nacional - Excesso de Sublimite" },
  { value: 3, label: "Regime Normal (Lucro Presumido/Real)" },
];

const API_PROVIDERS = [
  { value: "focusnfe", label: "Focus NFe" },
];

export default function EmitentesNfe() {
  const { emitentes, isLoading, createEmitente, updateEmitente, deleteEmitente } = useEmitentesNfe();
  const granjasQuery = useGranjas();
  const granjas = granjasQuery.data || [];
  const { canEdit } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedEmitente, setSelectedEmitente] = useState<EmitenteNfe | null>(null);
  const [formData, setFormData] = useState<EmitenteNfeInsert>({
    granja_id: "",
    ambiente: 2,
    serie_nfe: 1,
    numero_atual_nfe: 0,
    serie_nfce: 1,
    numero_atual_nfce: 0,
    crt: 3,
    aliq_icms_padrao: 0,
    aliq_pis_padrao: 1.65,
    aliq_cofins_padrao: 7.6,
    aliq_ibs_padrao: 0,
    aliq_cbs_padrao: 0,
    aliq_is_padrao: 0,
    api_provider: null,
    api_consumer_key: null,
    api_consumer_secret: null,
    api_access_token: null,
    api_access_token_secret: null,
    api_configurada: false,
    certificado_nome: null,
    certificado_validade: null,
    ativo: true,
  });

  const granjasDisponiveis = granjas.filter(
    (g) => g.ativa && !emitentes.some((e) => e.granja_id === g.id && e.id !== selectedEmitente?.id)
  );

  const resetForm = () => {
    setFormData({
      granja_id: "",
      ambiente: 2,
      serie_nfe: 1,
      numero_atual_nfe: 0,
      serie_nfce: 1,
      numero_atual_nfce: 0,
      crt: 3,
      aliq_icms_padrao: 0,
      aliq_pis_padrao: 1.65,
      aliq_cofins_padrao: 7.6,
      aliq_ibs_padrao: 0,
      aliq_cbs_padrao: 0,
      aliq_is_padrao: 0,
      api_provider: null,
      api_consumer_key: null,
      api_consumer_secret: null,
      api_access_token: null,
      api_access_token_secret: null,
      api_configurada: false,
      certificado_nome: null,
      certificado_validade: null,
      ativo: true,
    });
    setSelectedEmitente(null);
  };

  const handleOpenDialog = (emitente?: EmitenteNfe) => {
    if (emitente) {
      setSelectedEmitente(emitente);
      setFormData({
        granja_id: emitente.granja_id || "",
        ambiente: emitente.ambiente || 2,
        serie_nfe: emitente.serie_nfe || 1,
        numero_atual_nfe: emitente.numero_atual_nfe || 0,
        serie_nfce: emitente.serie_nfce || 1,
        numero_atual_nfce: emitente.numero_atual_nfce || 0,
        crt: emitente.crt || 3,
        aliq_icms_padrao: emitente.aliq_icms_padrao || 0,
        aliq_pis_padrao: emitente.aliq_pis_padrao || 1.65,
        aliq_cofins_padrao: emitente.aliq_cofins_padrao || 7.6,
        aliq_ibs_padrao: emitente.aliq_ibs_padrao || 0,
        aliq_cbs_padrao: emitente.aliq_cbs_padrao || 0,
        aliq_is_padrao: emitente.aliq_is_padrao || 0,
        api_provider: emitente.api_provider,
        api_consumer_key: emitente.api_consumer_key,
        api_consumer_secret: emitente.api_consumer_secret,
        api_access_token: emitente.api_access_token,
        api_access_token_secret: emitente.api_access_token_secret,
        api_configurada: emitente.api_configurada || false,
        certificado_nome: emitente.certificado_nome,
        certificado_validade: emitente.certificado_validade,
        ativo: emitente.ativo ?? true,
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
    if (selectedEmitente) {
      await updateEmitente.mutateAsync({ id: selectedEmitente.id, ...formData });
    } else {
      await createEmitente.mutateAsync(formData);
    }
    handleCloseDialog();
  };

  const handleDelete = async () => {
    if (selectedEmitente) {
      await deleteEmitente.mutateAsync(selectedEmitente.id);
      setIsDeleteDialogOpen(false);
      setSelectedEmitente(null);
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
          title="Emitentes NF-e"
          description="Configuração de emitentes de Nota Fiscal Eletrônica por granja"
        />

        <Alert className="border-green-600 bg-green-50 dark:bg-green-950">
          <AlertCircle className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-700">Focus NFe Integrada</AlertTitle>
          <AlertDescription>
            O token da API Focus NFe está configurado. Certifique-se de que o certificado A1 foi 
            enviado no painel da Focus NFe e marque a opção "API Configurada" no emitente.
          </AlertDescription>
        </Alert>

        <div className="flex justify-between items-center">
          <div className="text-sm text-muted-foreground">
            {emitentes.length} emitente(s) configurado(s)
          </div>
          {canEdit && granjasDisponiveis.length > 0 && (
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Emitente
            </Button>
          )}
        </div>

        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Granja</TableHead>
                <TableHead>CNPJ</TableHead>
                <TableHead>Ambiente</TableHead>
                <TableHead>Regime Tributário</TableHead>
                <TableHead>Série NF-e</TableHead>
                <TableHead>API</TableHead>
                <TableHead>Status</TableHead>
                {canEdit && <TableHead className="w-24">Ações</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {emitentes.map((emitente) => (
                <TableRow key={emitente.id}>
                  <TableCell className="font-medium">
                    {emitente.granja?.nome_fantasia || emitente.granja?.razao_social || "-"}
                  </TableCell>
                  <TableCell className="font-mono">
                    {emitente.granja?.cnpj || "-"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={emitente.ambiente === 1 ? "default" : "secondary"}>
                      {AMBIENTES.find((a) => a.value === emitente.ambiente)?.label || "-"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {REGIMES_TRIBUTARIOS.find((r) => r.value === emitente.crt)?.label || "-"}
                  </TableCell>
                  <TableCell>{emitente.serie_nfe}</TableCell>
                  <TableCell>
                    {emitente.api_configurada ? (
                      <Badge variant="default">
                        {API_PROVIDERS.find((p) => p.value === emitente.api_provider)?.label || "Configurada"}
                      </Badge>
                    ) : (
                      <Badge variant="outline">Não configurada</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={emitente.ativo ? "default" : "secondary"}>
                      {emitente.ativo ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                  {canEdit && (
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDialog(emitente)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedEmitente(emitente);
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
              {emitentes.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={canEdit ? 8 : 7}
                    className="text-center py-8 text-muted-foreground"
                  >
                    Nenhum emitente configurado
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Dialog de Criação/Edição */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {selectedEmitente ? "Editar Emitente NF-e" : "Novo Emitente NF-e"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Granja */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Empresa Emitente</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Label htmlFor="granja_id">Granja *</Label>
                    <Select
                      value={formData.granja_id || ""}
                      onValueChange={(value) =>
                        setFormData({ ...formData, granja_id: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a granja" />
                      </SelectTrigger>
                      <SelectContent>
                        {(selectedEmitente
                          ? granjas.filter((g) => g.ativa || g.id === selectedEmitente.granja_id)
                          : granjasDisponiveis
                        ).map((granja) => (
                          <SelectItem key={granja.id} value={granja.id}>
                            {granja.nome_fantasia || granja.razao_social}
                            {granja.cnpj && ` - ${granja.cnpj}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* Configurações de Emissão */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Configurações de Emissão</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="ambiente">Ambiente</Label>
                      <Select
                        value={String(formData.ambiente)}
                        onValueChange={(value) =>
                          setFormData({ ...formData, ambiente: Number(value) })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {AMBIENTES.map((amb) => (
                            <SelectItem key={amb.value} value={String(amb.value)}>
                              {amb.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="crt">Regime Tributário (CRT)</Label>
                      <Select
                        value={String(formData.crt)}
                        onValueChange={(value) =>
                          setFormData({ ...formData, crt: Number(value) })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {REGIMES_TRIBUTARIOS.map((regime) => (
                            <SelectItem key={regime.value} value={String(regime.value)}>
                              {regime.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="serie_nfe">Série NF-e</Label>
                      <Input
                        id="serie_nfe"
                        type="number"
                        value={formData.serie_nfe || 1}
                        onChange={(e) =>
                          setFormData({ ...formData, serie_nfe: Number(e.target.value) })
                        }
                        min={1}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="numero_atual_nfe">Último Nº NF-e</Label>
                      <Input
                        id="numero_atual_nfe"
                        type="number"
                        value={formData.numero_atual_nfe || 0}
                        onChange={(e) =>
                          setFormData({ ...formData, numero_atual_nfe: Number(e.target.value) })
                        }
                        min={0}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="serie_nfce">Série NFC-e</Label>
                      <Input
                        id="serie_nfce"
                        type="number"
                        value={formData.serie_nfce || 1}
                        onChange={(e) =>
                          setFormData({ ...formData, serie_nfce: Number(e.target.value) })
                        }
                        min={1}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="numero_atual_nfce">Último Nº NFC-e</Label>
                      <Input
                        id="numero_atual_nfce"
                        type="number"
                        value={formData.numero_atual_nfce || 0}
                        onChange={(e) =>
                          setFormData({ ...formData, numero_atual_nfce: Number(e.target.value) })
                        }
                        min={0}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Alíquotas Padrão */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Alíquotas Padrão (%)</CardTitle>
                  <CardDescription>
                    Valores padrão para novos itens de NF-e (podem ser alterados por item)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="aliq_icms_padrao">ICMS</Label>
                      <Input
                        id="aliq_icms_padrao"
                        type="number"
                        step="0.01"
                        value={formData.aliq_icms_padrao || 0}
                        onChange={(e) =>
                          setFormData({ ...formData, aliq_icms_padrao: Number(e.target.value) })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="aliq_pis_padrao">PIS</Label>
                      <Input
                        id="aliq_pis_padrao"
                        type="number"
                        step="0.0001"
                        value={formData.aliq_pis_padrao || 1.65}
                        onChange={(e) =>
                          setFormData({ ...formData, aliq_pis_padrao: Number(e.target.value) })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="aliq_cofins_padrao">COFINS</Label>
                      <Input
                        id="aliq_cofins_padrao"
                        type="number"
                        step="0.0001"
                        value={formData.aliq_cofins_padrao || 7.6}
                        onChange={(e) =>
                          setFormData({ ...formData, aliq_cofins_padrao: Number(e.target.value) })
                        }
                      />
                    </div>
                  </div>

                  <Separator />
                  <p className="text-sm text-muted-foreground">NT 2025.002 - Novos Tributos</p>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="aliq_ibs_padrao">IBS</Label>
                      <Input
                        id="aliq_ibs_padrao"
                        type="number"
                        step="0.0001"
                        value={formData.aliq_ibs_padrao || 0}
                        onChange={(e) =>
                          setFormData({ ...formData, aliq_ibs_padrao: Number(e.target.value) })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="aliq_cbs_padrao">CBS</Label>
                      <Input
                        id="aliq_cbs_padrao"
                        type="number"
                        step="0.0001"
                        value={formData.aliq_cbs_padrao || 0}
                        onChange={(e) =>
                          setFormData({ ...formData, aliq_cbs_padrao: Number(e.target.value) })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="aliq_is_padrao">IS (Imposto Seletivo)</Label>
                      <Input
                        id="aliq_is_padrao"
                        type="number"
                        step="0.0001"
                        value={formData.aliq_is_padrao || 0}
                        onChange={(e) =>
                          setFormData({ ...formData, aliq_is_padrao: Number(e.target.value) })
                        }
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* API de Integração - Focus NFe */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">API Focus NFe</CardTitle>
                  <CardDescription>
                    O token foi configurado globalmente. Marque como configurada após enviar o certificado A1 no painel Focus NFe.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="api_provider">Provedor</Label>
                      <Select
                        value={formData.api_provider || "focusnfe"}
                        onValueChange={(value) =>
                          setFormData({ ...formData, api_provider: value || "focusnfe" })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o provedor" />
                        </SelectTrigger>
                        <SelectContent>
                          {API_PROVIDERS.map((provider) => (
                            <SelectItem key={provider.value} value={provider.value}>
                              {provider.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center space-x-2 pt-8">
                      <Switch
                        id="api_configurada"
                        checked={formData.api_configurada || false}
                        onCheckedChange={(checked) =>
                          setFormData({ ...formData, api_configurada: checked })
                        }
                      />
                      <Label htmlFor="api_configurada">API Configurada e Testada</Label>
                    </div>
                  </div>
                  
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Passos para ativar:</strong>
                      <ol className="list-decimal ml-4 mt-2 space-y-1">
                        <li>Acesse o painel da Focus NFe</li>
                        <li>Faça upload do certificado A1 desta granja</li>
                        <li>Teste uma emissão em homologação</li>
                        <li>Marque "API Configurada e Testada" acima</li>
                      </ol>
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>

              {/* Certificado Digital */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Certificado Digital</CardTitle>
                  <CardDescription>
                    O certificado A1 deve ser enviado ao provedor de NF-e
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="certificado_nome">Nome do Certificado</Label>
                      <Input
                        id="certificado_nome"
                        value={formData.certificado_nome || ""}
                        onChange={(e) =>
                          setFormData({ ...formData, certificado_nome: e.target.value || null })
                        }
                        placeholder="Ex: empresa_certificado_2024.pfx"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="certificado_validade">Validade</Label>
                      <Input
                        id="certificado_validade"
                        type="date"
                        value={formData.certificado_validade || ""}
                        onChange={(e) =>
                          setFormData({ ...formData, certificado_validade: e.target.value || null })
                        }
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Status */}
              <div className="flex items-center space-x-2">
                <Switch
                  id="ativo"
                  checked={formData.ativo ?? true}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, ativo: checked })
                  }
                />
                <Label htmlFor="ativo">Emitente Ativo</Label>
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
                  disabled={createEmitente.isPending || updateEmitente.isPending || !formData.granja_id}
                >
                  {createEmitente.isPending || updateEmitente.isPending
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
                Tem certeza que deseja excluir a configuração de emitente NF-e para "
                {selectedEmitente?.granja?.nome_fantasia || selectedEmitente?.granja?.razao_social}"? 
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
    </AppLayout>
  );
}
