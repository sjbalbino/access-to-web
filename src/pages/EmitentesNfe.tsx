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
import { Plus, Pencil, Trash2, Building2, AlertCircle, User } from "lucide-react";
import { useEmitentesNfe, EmitenteNfe, EmitenteNfeInsert } from "@/hooks/useEmitentesNfe";
import { useGranjas } from "@/hooks/useGranjas";
import { useAllInscricoes } from "@/hooks/useAllInscricoes";
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

const TIPO_EMITENTE = [
  { value: "granja", label: "Granja (PJ - NF-e)" },
  { value: "inscricao", label: "Inscrição do Produtor (PF - NFP-e)" },
];

export default function EmitentesNfe() {
  const { emitentes, isLoading, createEmitente, updateEmitente, deleteEmitente } = useEmitentesNfe();
  const granjasQuery = useGranjas();
  const inscricoesQuery = useAllInscricoes();
  const granjas = granjasQuery.data || [];
  const inscricoes = inscricoesQuery.data || [];
  const { canEdit } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedEmitente, setSelectedEmitente] = useState<EmitenteNfe | null>(null);
  const [tipoEmitente, setTipoEmitente] = useState<"granja" | "inscricao">("granja");
  const [formData, setFormData] = useState<EmitenteNfeInsert>({
    granja_id: null,
    inscricao_produtor_id: null,
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
    cst_icms_padrao: "00",
    cst_pis_padrao: "01",
    cst_cofins_padrao: "01",
    cst_ipi_padrao: "53",
    cst_ibs_padrao: "00",
    cst_cbs_padrao: "00",
    cst_is_padrao: "00",
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

  // Granjas que não têm emitente (ou é a granja do emitente sendo editado)
  const granjasDisponiveis = granjas.filter(
    (g) => g.ativa && !emitentes.some((e) => e.granja_id === g.id && e.id !== selectedEmitente?.id)
  );

  // Inscrições que não têm emitente (ou é a inscrição do emitente sendo editado)
  const inscricoesDisponiveis = inscricoes.filter(
    (i) => i.ativa && !emitentes.some((e) => e.inscricao_produtor_id === i.id && e.id !== selectedEmitente?.id)
  );

  const resetForm = () => {
    setFormData({
      granja_id: null,
      inscricao_produtor_id: null,
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
      cst_icms_padrao: "00",
      cst_pis_padrao: "01",
      cst_cofins_padrao: "01",
      cst_ipi_padrao: "53",
      cst_ibs_padrao: "00",
      cst_cbs_padrao: "00",
      cst_is_padrao: "00",
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
    setTipoEmitente("granja");
  };

  const handleOpenDialog = (emitente?: EmitenteNfe) => {
    if (emitente) {
      setSelectedEmitente(emitente);
      // Determina o tipo de emitente baseado nos dados
      if (emitente.inscricao_produtor_id) {
        setTipoEmitente("inscricao");
      } else {
        setTipoEmitente("granja");
      }
      setFormData({
        granja_id: emitente.granja_id,
        inscricao_produtor_id: emitente.inscricao_produtor_id,
        ambiente: emitente.ambiente || 2,
        serie_nfe: emitente.serie_nfe || 1,
        numero_atual_nfe: emitente.numero_atual_nfe || 0,
        serie_nfce: emitente.serie_nfce || 1,
        numero_atual_nfce: emitente.numero_atual_nfce || 0,
        crt: emitente.crt || 3,
        aliq_icms_padrao: emitente.aliq_icms_padrao || 0,
        aliq_pis_padrao: emitente.aliq_pis_padrao ?? 1.65,
        aliq_cofins_padrao: emitente.aliq_cofins_padrao ?? 7.6,
        aliq_ibs_padrao: emitente.aliq_ibs_padrao || 0,
        aliq_cbs_padrao: emitente.aliq_cbs_padrao || 0,
        aliq_is_padrao: emitente.aliq_is_padrao || 0,
        cst_icms_padrao: emitente.cst_icms_padrao ?? "00",
        cst_pis_padrao: emitente.cst_pis_padrao ?? "01",
        cst_cofins_padrao: emitente.cst_cofins_padrao ?? "01",
        cst_ipi_padrao: emitente.cst_ipi_padrao ?? "53",
        cst_ibs_padrao: emitente.cst_ibs_padrao ?? "00",
        cst_cbs_padrao: emitente.cst_cbs_padrao ?? "00",
        cst_is_padrao: emitente.cst_is_padrao ?? "00",
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
          title="Emitentes NF-e / NFP-e"
          description="Configuração de emitentes de Nota Fiscal Eletrônica (Granja) ou Nota Fiscal do Produtor (Inscrição)"
        />

        <Alert className="border-blue-600 bg-blue-50 dark:bg-blue-950">
          <AlertCircle className="h-4 w-4 text-blue-600" />
          <AlertTitle className="text-blue-700">Configuração Focus NFe</AlertTitle>
          <AlertDescription>
            Configure o token da API Focus NFe em cada emitente, correspondendo ao ambiente (homologação ou produção).
            Certifique-se de que o certificado A1 foi enviado no painel da Focus NFe.
          </AlertDescription>
        </Alert>

        <div className="flex justify-between items-center">
          <div className="text-sm text-muted-foreground">
            {emitentes.length} emitente(s) configurado(s)
          </div>
          {canEdit && (granjasDisponiveis.length > 0 || inscricoesDisponiveis.length > 0) && (
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
                <TableHead>Tipo</TableHead>
                <TableHead>Emitente</TableHead>
                <TableHead>CPF/CNPJ</TableHead>
                <TableHead>IE</TableHead>
                <TableHead>Ambiente</TableHead>
                <TableHead>Série</TableHead>
                <TableHead>API</TableHead>
                <TableHead>Status</TableHead>
                {canEdit && <TableHead className="w-24">Ações</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {emitentes.map((emitente) => {
                const isInscricao = !!emitente.inscricao_produtor_id;
                const nomeEmitente = isInscricao
                  ? emitente.inscricao_produtor?.produtores?.nome || emitente.inscricao_produtor?.granja || "-"
                  : emitente.granja?.nome_fantasia || emitente.granja?.razao_social || "-";
                const cpfCnpj = isInscricao
                  ? emitente.inscricao_produtor?.cpf_cnpj || "-"
                  : emitente.granja?.cnpj || "-";
                const ie = isInscricao
                  ? emitente.inscricao_produtor?.inscricao_estadual || "-"
                  : "-";
                
                return (
                  <TableRow key={emitente.id}>
                    <TableCell>
                      <Badge variant={isInscricao ? "outline" : "secondary"}>
                        {isInscricao ? (
                          <><User className="h-3 w-3 mr-1" /> NFP-e</>
                        ) : (
                          <><Building2 className="h-3 w-3 mr-1" /> NF-e</>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      {nomeEmitente}
                      {isInscricao && emitente.inscricao_produtor?.cidade && (
                        <span className="text-muted-foreground text-xs block">
                          {emitente.inscricao_produtor.cidade}/{emitente.inscricao_produtor.uf}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {cpfCnpj}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {ie}
                    </TableCell>
                    <TableCell>
                      <Badge variant={emitente.ambiente === 1 ? "default" : "secondary"}>
                        {AMBIENTES.find((a) => a.value === emitente.ambiente)?.label || "-"}
                      </Badge>
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
                );
              })}
              {emitentes.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={canEdit ? 9 : 8}
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
              {/* Tipo de Emitente */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Tipo de Emitente</CardTitle>
                  <CardDescription>
                    Selecione se a emissão será por Granja (NF-e) ou por Inscrição do Produtor (NFP-e)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="tipo_emitente">Tipo *</Label>
                    <Select
                      value={tipoEmitente}
                      onValueChange={(value: "granja" | "inscricao") => {
                        setTipoEmitente(value);
                        // Limpa a seleção do tipo anterior
                        setFormData({
                          ...formData,
                          granja_id: value === "granja" ? formData.granja_id : null,
                          inscricao_produtor_id: value === "inscricao" ? formData.inscricao_produtor_id : null,
                        });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TIPO_EMITENTE.map((tipo) => (
                          <SelectItem key={tipo.value} value={tipo.value}>
                            {tipo.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {tipoEmitente === "granja" ? (
                    <div className="space-y-2">
                      <Label htmlFor="granja_id">Granja *</Label>
                      <Select
                        value={formData.granja_id || ""}
                        onValueChange={(value) =>
                          setFormData({ ...formData, granja_id: value, inscricao_produtor_id: null })
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
                  ) : (
                    <div className="space-y-2">
                      <Label htmlFor="inscricao_produtor_id">Inscrição do Produtor *</Label>
                      <Select
                        value={formData.inscricao_produtor_id || ""}
                        onValueChange={(value) =>
                          setFormData({ ...formData, inscricao_produtor_id: value, granja_id: null })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a inscrição do produtor" />
                        </SelectTrigger>
                        <SelectContent>
                          {(selectedEmitente
                            ? inscricoes.filter((i) => i.ativa || i.id === selectedEmitente.inscricao_produtor_id)
                            : inscricoesDisponiveis
                          ).map((inscricao) => (
                            <SelectItem key={inscricao.id} value={inscricao.id}>
                              {inscricao.produtores?.nome || inscricao.granjas?.razao_social || "Produtor"} - IE: {inscricao.inscricao_estadual || "N/A"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
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
                        value={formData.aliq_pis_padrao ?? 1.65}
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
                        value={formData.aliq_cofins_padrao ?? 7.6}
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

              {/* CST Padrões */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">CST Padrões</CardTitle>
                  <CardDescription>
                    Códigos de Situação Tributária padrão para novos itens de NF-e
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="cst_icms_padrao">CST ICMS</Label>
                      <Select
                        value={formData.cst_icms_padrao || "00"}
                        onValueChange={(value) =>
                          setFormData({ ...formData, cst_icms_padrao: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="00">00 - Tributada integralmente</SelectItem>
                          <SelectItem value="10">10 - Trib. com cobrança ICMS ST</SelectItem>
                          <SelectItem value="20">20 - Com redução de BC</SelectItem>
                          <SelectItem value="30">30 - Isenta/não trib. com ST</SelectItem>
                          <SelectItem value="40">40 - Isenta</SelectItem>
                          <SelectItem value="41">41 - Não tributada</SelectItem>
                          <SelectItem value="50">50 - Suspensão</SelectItem>
                          <SelectItem value="51">51 - Diferimento</SelectItem>
                          <SelectItem value="60">60 - Cobrado ant. por ST</SelectItem>
                          <SelectItem value="70">70 - Redução BC com ST</SelectItem>
                          <SelectItem value="90">90 - Outras</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cst_pis_padrao">CST PIS</Label>
                      <Select
                        value={formData.cst_pis_padrao || "01"}
                        onValueChange={(value) =>
                          setFormData({ ...formData, cst_pis_padrao: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="01">01 - Op. tributável</SelectItem>
                          <SelectItem value="02">02 - Op. trib. alíq. diferenciada</SelectItem>
                          <SelectItem value="03">03 - Op. trib. alíq. unidade</SelectItem>
                          <SelectItem value="04">04 - Op. trib. monofásica</SelectItem>
                          <SelectItem value="05">05 - Op. trib. ST</SelectItem>
                          <SelectItem value="06">06 - Op. trib. alíq. zero</SelectItem>
                          <SelectItem value="07">07 - Op. isenta</SelectItem>
                          <SelectItem value="08">08 - Op. sem incidência</SelectItem>
                          <SelectItem value="09">09 - Op. com suspensão</SelectItem>
                          <SelectItem value="49">49 - Outras saídas</SelectItem>
                          <SelectItem value="99">99 - Outras operações</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cst_cofins_padrao">CST COFINS</Label>
                      <Select
                        value={formData.cst_cofins_padrao || "01"}
                        onValueChange={(value) =>
                          setFormData({ ...formData, cst_cofins_padrao: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="01">01 - Op. tributável</SelectItem>
                          <SelectItem value="02">02 - Op. trib. alíq. diferenciada</SelectItem>
                          <SelectItem value="03">03 - Op. trib. alíq. unidade</SelectItem>
                          <SelectItem value="04">04 - Op. trib. monofásica</SelectItem>
                          <SelectItem value="05">05 - Op. trib. ST</SelectItem>
                          <SelectItem value="06">06 - Op. trib. alíq. zero</SelectItem>
                          <SelectItem value="07">07 - Op. isenta</SelectItem>
                          <SelectItem value="08">08 - Op. sem incidência</SelectItem>
                          <SelectItem value="09">09 - Op. com suspensão</SelectItem>
                          <SelectItem value="49">49 - Outras saídas</SelectItem>
                          <SelectItem value="99">99 - Outras operações</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cst_ipi_padrao">CST IPI</Label>
                      <Select
                        value={formData.cst_ipi_padrao || "53"}
                        onValueChange={(value) =>
                          setFormData({ ...formData, cst_ipi_padrao: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="00">00 - Entrada com recuperação</SelectItem>
                          <SelectItem value="01">01 - Entrada tributável alíq. zero</SelectItem>
                          <SelectItem value="02">02 - Entrada isenta</SelectItem>
                          <SelectItem value="03">03 - Entrada não tributável</SelectItem>
                          <SelectItem value="04">04 - Entrada imune</SelectItem>
                          <SelectItem value="05">05 - Entrada com suspensão</SelectItem>
                          <SelectItem value="49">49 - Outras entradas</SelectItem>
                          <SelectItem value="50">50 - Saída tributável</SelectItem>
                          <SelectItem value="51">51 - Saída tributável alíq. zero</SelectItem>
                          <SelectItem value="52">52 - Saída isenta</SelectItem>
                          <SelectItem value="53">53 - Saída não tributável</SelectItem>
                          <SelectItem value="54">54 - Saída imune</SelectItem>
                          <SelectItem value="55">55 - Saída com suspensão</SelectItem>
                          <SelectItem value="99">99 - Outras saídas</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Separator />
                  <p className="text-sm text-muted-foreground">NT 2025.002 - Novos Tributos</p>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="cst_ibs_padrao">CST IBS</Label>
                      <Select
                        value={formData.cst_ibs_padrao || "00"}
                        onValueChange={(value) =>
                          setFormData({ ...formData, cst_ibs_padrao: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="00">00 - Tributação normal</SelectItem>
                          <SelectItem value="10">10 - Tributação monofásica</SelectItem>
                          <SelectItem value="20">20 - Diferimento</SelectItem>
                          <SelectItem value="30">30 - Imunidade</SelectItem>
                          <SelectItem value="40">40 - Isenção</SelectItem>
                          <SelectItem value="50">50 - Suspensão</SelectItem>
                          <SelectItem value="51">51 - Red. alíquota</SelectItem>
                          <SelectItem value="90">90 - Outras</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cst_cbs_padrao">CST CBS</Label>
                      <Select
                        value={formData.cst_cbs_padrao || "00"}
                        onValueChange={(value) =>
                          setFormData({ ...formData, cst_cbs_padrao: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="00">00 - Tributação normal</SelectItem>
                          <SelectItem value="10">10 - Tributação monofásica</SelectItem>
                          <SelectItem value="20">20 - Diferimento</SelectItem>
                          <SelectItem value="30">30 - Imunidade</SelectItem>
                          <SelectItem value="40">40 - Isenção</SelectItem>
                          <SelectItem value="50">50 - Suspensão</SelectItem>
                          <SelectItem value="51">51 - Red. alíquota</SelectItem>
                          <SelectItem value="90">90 - Outras</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cst_is_padrao">CST IS</Label>
                      <Select
                        value={formData.cst_is_padrao || "00"}
                        onValueChange={(value) =>
                          setFormData({ ...formData, cst_is_padrao: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="00">00 - Tributação normal</SelectItem>
                          <SelectItem value="10">10 - Tributação monofásica</SelectItem>
                          <SelectItem value="30">30 - Imunidade</SelectItem>
                          <SelectItem value="40">40 - Não incidência</SelectItem>
                          <SelectItem value="50">50 - Suspensão</SelectItem>
                          <SelectItem value="90">90 - Outras</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* API de Integração - Focus NFe */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">API Focus NFe</CardTitle>
                  <CardDescription>
                    Configure o token da API correspondente ao ambiente selecionado.
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

                  <div className="space-y-2">
                    <Label htmlFor="api_access_token">Token Focus NFe *</Label>
                    <Input
                      id="api_access_token"
                      type="password"
                      value={formData.api_access_token || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, api_access_token: e.target.value || null })
                      }
                      placeholder={formData.ambiente === 2 ? "Token de homologação (inicia com T)" : "Token de produção"}
                    />
                    <p className="text-xs text-muted-foreground">
                      {formData.ambiente === 2 
                        ? "Para homologação, use o token que inicia com 'T'" 
                        : "Para produção, use o token principal da sua conta Focus NFe"}
                    </p>
                  </div>
                  
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Passos para ativar:</strong>
                      <ol className="list-decimal ml-4 mt-2 space-y-1">
                        <li>Obtenha o token no painel da Focus NFe (corresponde ao ambiente)</li>
                        <li>Faça upload do certificado A1 desta granja no painel Focus NFe</li>
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
