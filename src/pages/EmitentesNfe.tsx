import { useState, useEffect } from "react";
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
import { Plus, Pencil, Trash2, Building2, AlertCircle, ShieldCheck, Loader2, Eye, EyeOff } from "lucide-react";
import { useEmitentesNfe, EmitenteNfe, EmitenteNfeInsert } from "@/hooks/useEmitentesNfe";
import { useEmitenteCredentials, useUpsertEmitenteCredentials } from "@/hooks/useEmitenteCredentials";
import { useFocusNfeVerificarEmpresa } from "@/hooks/useFocusNfeVerificarEmpresa";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { getCstIcmsOptions, CST_PIS_COFINS, CST_IPI } from "@/lib/cstTabelas";
import { CST_IBS_CBS, CST_IS } from "@/lib/cstReformaTributaria";
import { isIeGenerica, validarIeUF } from "@/lib/inscricaoEstadualValidator";
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
import { usePaginacao } from "@/hooks/usePaginacao";
import { TablePagination } from "@/components/ui/table-pagination";
import { formatCpfCnpj, formatInscricaoEstadual } from "@/lib/formatters";


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

/**
 * Defaults de alíquotas e CSTs conforme o Regime Tributário (CRT).
 * - Simples Nacional (1, 2): PIS/COFINS recolhidos no DAS; CST ICMS usa CSOSN.
 * - Regime Normal (3): PIS 1,65% / COFINS 7,60%; CST ICMS tradicional.
 * - IBS/CBS: alíquotas de transição 2026 (Reforma Tributária).
 */
function getDefaultsByCrt(crt: number) {
  const simples = crt === 1 || crt === 2;
  return {
    aliq_icms_padrao: 0,
    aliq_pis_padrao: simples ? 0 : 1.65,
    aliq_cofins_padrao: simples ? 0 : 7.6,
    aliq_ibs_padrao: 0.1,
    aliq_cbs_padrao: 0.9,
    aliq_is_padrao: 0,
    cst_icms_padrao: simples ? "102" : "00",
    cst_pis_padrao: simples ? "49" : "01",
    cst_cofins_padrao: simples ? "49" : "01",
    cst_ipi_padrao: "99",
    cst_ibs_padrao: "000",
    cst_cbs_padrao: "000",
    cst_is_padrao: "000",
  };
}

export default function EmitentesNfe() {
  const { emitentes, isLoading, createEmitente, updateEmitente, deleteEmitente } = useEmitentesNfe();

  // Carregar todas as inscrições ativas com CPF/CNPJ para escolher como emitente
  const { data: inscricoes = [] } = useQuery({
    queryKey: ["inscricoes_produtor", "para-emitente"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inscricoes_produtor")
        .select("id, nome, nome_fantasia, nome_inscricao, cpf_cnpj, inscricao_estadual, tipo, granja_id, cidade, uf, ativa, produtor_id, produtores:produtor_id!inner(id, nome, tipo_produtor), granjas:granja_id(id, razao_social, nome_fantasia)")
        .eq("ativa", true)
        .eq("produtores.tipo_produtor", "socio")
        .not("cpf_cnpj", "is", null)
        .order("nome");
      if (error) throw error;
      return data as Array<{
        id: string; nome: string | null; nome_fantasia: string | null; nome_inscricao: string | null; cpf_cnpj: string | null; inscricao_estadual: string | null;
        tipo: string | null; granja_id: string | null; cidade: string | null; uf: string | null;
        ativa: boolean | null; produtor_id: string | null;
        produtores?: { id: string; nome: string; tipo_produtor: string | null } | null;
        granjas?: { id: string; razao_social: string; nome_fantasia: string | null } | null;
      }>;
    },
  });

  const { canEdit } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedEmitente, setSelectedEmitente] = useState<EmitenteNfe | null>(null);
  const [credentials, setCredentials] = useState<{
    api_consumer_key: string | null;
    api_consumer_secret: string | null;
    api_access_token_principal_producao: string | null;
    api_access_token: string | null;
    api_access_token_homologacao: string | null;
    api_access_token_secret: string | null;
  }>({ api_consumer_key: null, api_consumer_secret: null, api_access_token_principal_producao: null, api_access_token: null, api_access_token_homologacao: null, api_access_token_secret: null });
  const upsertCredentials = useUpsertEmitenteCredentials();
  const credentialsQuery = useEmitenteCredentials(selectedEmitente?.id ?? null);
  const verificarEmpresa = useFocusNfeVerificarEmpresa();
  const [verificandoId, setVerificandoId] = useState<string | null>(null);
  const [showToken, setShowToken] = useState(false);
  const [showTokenHom, setShowTokenHom] = useState(false);
  const [showTokenPrincipal, setShowTokenPrincipal] = useState(false);
  const [nomeFantasia, setNomeFantasia] = useState<string>("");

  const handleVerificarHabilitacao = async (emitente: EmitenteNfe) => {
    setVerificandoId(emitente.id);
    try {
      // Buscar inscrições vinculadas e priorizar a marcada como emitente principal
      const { data: inscricoes } = await supabase
        .from("inscricoes_produtor")
        .select("cpf_cnpj, nome, is_emitente_principal")
        .eq("emitente_id", emitente.id)
        .not("cpf_cnpj", "is", null);

      const principal = inscricoes?.find((i: any) => i.is_emitente_principal);
      const escolhida = principal ?? inscricoes?.[0];
      const cpfCnpj = escolhida?.cpf_cnpj;
      const nomeInscricao = escolhida?.nome;

      if (!cpfCnpj) {
        toast.error("Nenhuma inscrição vinculada a este emitente", {
          description: "Vincule este emitente a uma inscrição de produtor (com CPF/CNPJ) para poder verificar a habilitação.",
        });
        return;
      }

      const res = await verificarEmpresa.verificar({
        emitente_id: emitente.id,
        cpf_cnpj: cpfCnpj,
      });

      const consultado = `Consultado: ${nomeInscricao ?? "—"} • CPF/CNPJ ${cpfCnpj}${principal ? " (emitente principal)" : ""}`;

      if (!res.success) {
        toast.error("Não foi possível verificar", { description: `${res.error || "Erro desconhecido"}\n${consultado}` });
        return;
      }

      if (res.habilitada) {
        toast.success(`Habilitada na Focus NFe (${res.ambiente_label})`, {
          description: `${res.nome ?? cpfCnpj} está pronta para emitir em ${res.ambiente_label}.\n${consultado}`,
        });
      } else {
        const diag = typeof res.detalhes === "object" && res.detalhes !== null ? res.detalhes as {
          token_prefix?: string;
          ambiente_label?: string;
          status_http?: number;
          orientacao?: string[];
        } : null;
        const titulo = res.codigo === "empresa_nao_cadastrada"
          ? "Empresa não cadastrada na Focus"
          : res.codigo === "token_invalido_ou_sem_permissao"
            ? "Token sem acesso na Focus"
            : res.codigo === "requisicao_invalida"
              ? "Consulta rejeitada pela Focus"
              : res.codigo === "nao_habilitada_no_ambiente"
                ? "Emitente NÃO habilitado"
                : "Verificação não concluída";
        const detalhesExtras = [
          diag?.token_prefix ? `Token usado: ${diag.token_prefix}` : null,
          `Ambiente: ${res.ambiente_label ?? diag?.ambiente_label ?? "não informado"}`,
          diag?.status_http ? `HTTP Focus: ${diag.status_http}` : null,
          ...(diag?.orientacao ?? []),
        ].filter(Boolean).join("\n");

        toast.warning(titulo, {
          description: `${res.mensagem || "Cadastre/habilite a empresa no painel da Focus NFe."}\n${consultado}${detalhesExtras ? `\n${detalhesExtras}` : ""}`,
          duration: 10000,
        });
      }
    } finally {
      setVerificandoId(null);
    }
  };

  const [formData, setFormData] = useState<EmitenteNfeInsert>({
    inscricao_produtor_id: null,
    granja_id: null,
    ambiente: 2,
    serie_nfe: 1,
    numero_atual_nfe: 0,
    serie_nfce: 1,
    numero_atual_nfce: 0,
    crt: 3,
    ...getDefaultsByCrt(3),
    api_provider: null,
    api_configurada: false,
    certificado_nome: null,
    certificado_validade: null,
    ativo: true,
    email_emitente: null,
    email_contador: null,
  });

  // Inscrições que ainda não têm emitente (ou é a inscrição do emitente sendo editado)
  const inscricoesDisponiveis = inscricoes.filter(
    (i) => !emitentes.some((e) => e.inscricao_produtor_id === i.id && e.id !== selectedEmitente?.id)
  );

  const resetForm = () => {
    setFormData({
      inscricao_produtor_id: null,
      granja_id: null,
      ambiente: 2,
      serie_nfe: 1,
      numero_atual_nfe: 0,
      serie_nfce: 1,
      numero_atual_nfce: 0,
      crt: 3,
      ...getDefaultsByCrt(3),
      api_provider: null,
      api_configurada: false,
      certificado_nome: null,
      certificado_validade: null,
      ativo: true,
      email_emitente: null,
      email_contador: null,
    });
    setSelectedEmitente(null);
  };

  const handleOpenDialog = (emitente?: EmitenteNfe) => {
    if (emitente) {
      setSelectedEmitente(emitente);
      setNomeFantasia((emitente as any).inscricao?.nome_fantasia || "");
      
      setFormData({
        inscricao_produtor_id: emitente.inscricao_produtor_id,
        granja_id: emitente.granja_id,
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
        cst_ibs_padrao: emitente.cst_ibs_padrao ?? "000",
        cst_cbs_padrao: emitente.cst_cbs_padrao ?? "000",
        cst_is_padrao: emitente.cst_is_padrao ?? "000",
        api_provider: emitente.api_provider,
        api_configurada: emitente.api_configurada || false,
        certificado_nome: emitente.certificado_nome,
        certificado_validade: emitente.certificado_validade,
        ativo: emitente.ativo ?? true,
        email_emitente: (emitente as any).email_emitente ?? null,
        email_contador: (emitente as any).email_contador ?? null,
      });
    } else {
      resetForm();
      setNomeFantasia("");
      
    }
    setIsDialogOpen(true);
  };


  // Carrega credenciais quando o usuário (admin/gerente) abre o emitente para edição
  useEffect(() => {
    if (credentialsQuery.data) {
      setCredentials({
        api_consumer_key: credentialsQuery.data.api_consumer_key ?? null,
        api_consumer_secret: credentialsQuery.data.api_consumer_secret ?? null,
        api_access_token_principal_producao: credentialsQuery.data.api_access_token_principal_producao ?? null,
        api_access_token: credentialsQuery.data.api_access_token ?? null,
        api_access_token_homologacao: credentialsQuery.data.api_access_token_homologacao ?? null,
        api_access_token_secret: credentialsQuery.data.api_access_token_secret ?? null,
      });
    }
  }, [credentialsQuery.data]);

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    resetForm();
    setCredentials({ api_consumer_key: null, api_consumer_secret: null, api_access_token_principal_producao: null, api_access_token: null, api_access_token_homologacao: null, api_access_token_secret: null });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validação uniforme de IE: rejeita genéricas e confere DV por UF na inscrição vinculada
    const inscVinculada = inscricoes.find((i) => i.id === formData.inscricao_produtor_id);
    if (inscVinculada) {
      const ie = (inscVinculada.inscricao_estadual || "").trim();
      const uf = (inscVinculada.uf || "").trim();
      if (!ie) {
        toast.error("Inscrição sem IE cadastrada. Cadastre a IE do sócio antes de vincular.");
        return;
      }
      if (isIeGenerica(ie)) {
        toast.error("IE genérica não é permitida", {
          description: "A inscrição vinculada possui uma IE genérica (zeros, sequências ou repetições). Corrija o cadastro da inscrição do sócio.",
        });
        return;
      }
      const r = validarIeUF(ie, uf);
      if (!r.valida) {
        toast.error("Inscrição Estadual inválida", {
          description: r.motivo ?? `A IE ${ie} não é válida para ${uf}. Corrija no cadastro da inscrição do sócio.`,
        });
        return;
      }
    }

    let emitenteId: string | undefined = selectedEmitente?.id;
    if (selectedEmitente) {
      await updateEmitente.mutateAsync({ id: selectedEmitente.id, ...formData });
    } else {
      const created = await createEmitente.mutateAsync(formData);
      emitenteId = (created as any)?.id;
    }
    // Persistir credenciais separadamente (apenas admin/gerente conseguem)
    if (emitenteId) {
      const norm = (v: string | null | undefined) => (v && v.trim() ? v.trim() : null);
      try {
        await upsertCredentials.mutateAsync({
          emitente_id: emitenteId,
          granja_id: formData.granja_id,
          api_consumer_key: norm(credentials.api_consumer_key),
          api_consumer_secret: norm(credentials.api_consumer_secret),
          api_access_token_principal_producao: norm(credentials.api_access_token_principal_producao),
          api_access_token: norm(credentials.api_access_token),
          api_access_token_homologacao: norm(credentials.api_access_token_homologacao),
          api_access_token_secret: norm(credentials.api_access_token_secret),
        });
      } catch {
        // toast já exibido pelo hook
      }
    }
    // Persistir Nome Fantasia e Nome da Inscrição na inscrição vinculada
    if (formData.inscricao_produtor_id) {
      await supabase
        .from("inscricoes_produtor")
        .update({
          nome_fantasia: nomeFantasia.trim() || null,
        } as any)
        .eq("id", formData.inscricao_produtor_id);
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

  const {
    dadosPaginados,
    paginaAtual,
    totalPaginas,
    totalRegistros,
    setPaginaAtual,
    gerarNumerosPaginas,
  } = usePaginacao(emitentes || []);

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
          description="Configuração de emitentes de Nota Fiscal Eletrônica por Granja"
        />

        <Alert className="border-blue-600 bg-blue-50 dark:bg-blue-950">
          <AlertCircle className="h-4 w-4 text-blue-600" />
          <AlertTitle className="text-blue-700">Configuração Focus NFe</AlertTitle>
          <AlertDescription>
            Configure o token da API Focus NFe em cada emitente, correspondendo ao ambiente (homologação ou produção).
            Certifique-se de que o certificado A1 foi enviado no painel da Focus NFe.
            Para vincular um emitente a uma inscrição do produtor (NFP-e), acesse o cadastro da inscrição na aba do produtor.
          </AlertDescription>
        </Alert>

        <div className="flex justify-between items-center">
          <div className="text-sm text-muted-foreground">
            {emitentes.length} emitente(s) configurado(s)
          </div>
          {canEdit && inscricoesDisponiveis.length > 0 && (
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Emitente
            </Button>
          )}
        </div>

        <div className="border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <Table className="min-w-[600px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Sócio / Inscrição</TableHead>
                  <TableHead className="hidden md:table-cell">CPF/CNPJ</TableHead>
                  <TableHead className="hidden lg:table-cell">Granja</TableHead>
                  <TableHead className="hidden sm:table-cell">Ambiente</TableHead>
                  <TableHead className="hidden md:table-cell">Série</TableHead>
                  <TableHead className="hidden md:table-cell">API</TableHead>
                  <TableHead className="hidden sm:table-cell">Status</TableHead>
                  {canEdit && <TableHead className="w-32 sticky right-0 bg-background">Ações</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {dadosPaginados.map((emitente) => (
                  <TableRow key={emitente.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-start gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground hidden sm:block flex-shrink-0 mt-1" />
                        <div className="flex flex-col min-w-0">
                          {emitente.inscricao ? (
                            <>
                              <span className="truncate">
                                {emitente.inscricao.nome_fantasia
                                  ? emitente.inscricao.nome_fantasia
                                  : emitente.inscricao.produtores?.nome || emitente.inscricao.nome || "—"}
                              </span>
                              <span className="text-xs text-muted-foreground truncate">
                                {[
                                  emitente.inscricao.nome_fantasia
                                    ? (emitente.inscricao.produtores?.nome || emitente.inscricao.nome || null)
                                    : null,
                                  emitente.inscricao.inscricao_estadual
                                    ? `IE: ${formatInscricaoEstadual(emitente.inscricao.inscricao_estadual)}`
                                    : null,
                                  emitente.inscricao.cpf_cnpj
                                    ? formatCpfCnpj(emitente.inscricao.cpf_cnpj)
                                    : null,
                                ].filter(Boolean).join(" • ")}
                              </span>
                            </>
                          ) : (
                            <span className="text-destructive">Sem inscrição vinculada</span>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{emitente.inscricao?.cpf_cnpj ? formatCpfCnpj(emitente.inscricao.cpf_cnpj) : "-"}</TableCell>

                    <TableCell className="hidden lg:table-cell">
                      {emitente.granja
                        ? emitente.granja.nome_fantasia || emitente.granja.razao_social
                        : "-"}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Badge variant={emitente.ambiente === 1 ? "default" : "secondary"}>
                        {AMBIENTES.find((a) => a.value === emitente.ambiente)?.label || "-"}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{emitente.serie_nfe}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      {emitente.api_configurada ? (
                        <Badge variant="default">{API_PROVIDERS.find((p) => p.value === emitente.api_provider)?.label || "Configurada"}</Badge>
                      ) : (
                        <Badge variant="outline">Não configurada</Badge>
                      )}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Badge variant={emitente.ativo ? "default" : "secondary"}>{emitente.ativo ? "Ativo" : "Inativo"}</Badge>
                    </TableCell>
                    {canEdit && (
                      <TableCell className="sticky right-0 bg-background">
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Verificar habilitação na Focus NFe"
                            disabled={verificandoId === emitente.id || !emitente.api_configurada}
                            onClick={() => handleVerificarHabilitacao(emitente)}
                          >
                            {verificandoId === emitente.id
                              ? <Loader2 className="h-4 w-4 animate-spin" />
                              : <ShieldCheck className="h-4 w-4" />}
                          </Button>
                          <Button variant="ghost" size="icon" title="Editar" onClick={() => handleOpenDialog(emitente)}><Pencil className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" title="Excluir" onClick={() => { setSelectedEmitente(emitente); setIsDeleteDialogOpen(true); }}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
                {emitentes.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={canEdit ? 8 : 7} className="text-center py-8 text-muted-foreground">Nenhum emitente configurado</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <div className="px-4">
            <TablePagination paginaAtual={paginaAtual} totalPaginas={totalPaginas} totalRegistros={totalRegistros} setPaginaAtual={setPaginaAtual} gerarNumerosPaginas={gerarNumerosPaginas} />
          </div>
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
              {/* Inscrição do Produtor (Sócio Emitente) */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Inscrição do Produtor</CardTitle>
                  <CardDescription>
                    Selecione a inscrição do sócio (CPF/CNPJ + IE) que será o emitente desta NF-e. Cada sócio deve ter seu próprio emitente, espelhando o cadastro na Focus NFe.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="inscricao_produtor_id">Inscrição *</Label>
                    <Select isSearchable
                      value={formData.inscricao_produtor_id || ""}
                      onValueChange={(value) => {
                        const insc = inscricoes.find((i) => i.id === value);
                        setFormData({
                          ...formData,
                          inscricao_produtor_id: value,
                          granja_id: insc?.granja_id ?? null,
                        });
                      }}
                      disabled={!!selectedEmitente}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a inscrição do sócio" />
                      </SelectTrigger>
                      <SelectContent>
                        {inscricoes.map((insc) => {
                          const vinculadoEmitente = emitentes.find((e) => e.inscricao_produtor_id === insc.id);
                          const jaVinculada = !!vinculadoEmitente && vinculadoEmitente.id !== selectedEmitente?.id;
                          const produtorNome = insc.produtores?.nome || "—";
                          const inscNome = insc.nome?.trim();
                          const fantasia = insc.nome_fantasia?.trim();
                          const granjaNome = insc.granjas?.nome_fantasia || insc.granjas?.razao_social || "";
                          const principal = fantasia ? `${fantasia} — ${produtorNome}` : produtorNome;
                          const ieRaw = (insc.inscricao_estadual || "").trim();
                          const ieInvalida = !!ieRaw && (isIeGenerica(ieRaw) || !validarIeUF(ieRaw, insc.uf || "").valida);
                          return (
                            <SelectItem key={insc.id} value={insc.id} disabled={jaVinculada}>
                              {principal}{inscNome ? ` — ${inscNome}` : ""} — {insc.cpf_cnpj || "sem CPF/CNPJ"}{insc.inscricao_estadual ? ` • IE ${insc.inscricao_estadual}` : ""}{granjaNome ? ` • ${granjaNome}` : ""}{jaVinculada ? " • (já vinculada)" : ""}{ieInvalida ? " • ⚠ IE inválida" : ""}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    {selectedEmitente && (
                      <p className="text-xs text-muted-foreground">
                        A inscrição vinculada não pode ser alterada após a criação. Para mudar, exclua e crie um novo emitente.
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nome_fantasia">Nome Fantasia (identificação do emitente)</Label>
                    <Input
                      id="nome_fantasia"
                      value={nomeFantasia}
                      onChange={(e) => setNomeFantasia(e.target.value)}
                      placeholder="Ex.: Fazenda Boa Vista, Filial Matriz, IE Principal..."
                    />
                    <p className="text-xs text-muted-foreground">
                      Aparece nos selects em todo o sistema para facilitar a identificação desta inscrição.
                    </p>
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
                      <Select isSearchable
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
                      <Label htmlFor="crt">Regime Tributário</Label>
                      <Select isSearchable
                        value={String(formData.crt)}
                        onValueChange={(value) =>
                          setFormData({ ...formData, crt: Number(value), ...getDefaultsByCrt(Number(value)) })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {REGIMES_TRIBUTARIOS.map((reg) => (
                            <SelectItem key={reg.value} value={String(reg.value)}>
                              {reg.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Separator />
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
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="numero_atual_nfe">Número Atual</Label>
                      <Input
                        id="numero_atual_nfe"
                        type="number"
                        value={formData.numero_atual_nfe || 0}
                        onChange={(e) =>
                          setFormData({ ...formData, numero_atual_nfe: Number(e.target.value) })
                        }
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
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="numero_atual_nfce">Número Atual</Label>
                      <Input
                        id="numero_atual_nfce"
                        type="number"
                        value={formData.numero_atual_nfce || 0}
                        onChange={(e) =>
                          setFormData({ ...formData, numero_atual_nfce: Number(e.target.value) })
                        }
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
                    Valores padrão que serão aplicados nos itens da nota
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
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
                        step="0.01"
                        value={formData.aliq_pis_padrao || 0}
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
                        step="0.01"
                        value={formData.aliq_cofins_padrao || 0}
                        onChange={(e) =>
                          setFormData({ ...formData, aliq_cofins_padrao: Number(e.target.value) })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="aliq_ibs_padrao">IBS</Label>
                      <Input
                        id="aliq_ibs_padrao"
                        type="number"
                        step="0.01"
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
                        step="0.01"
                        value={formData.aliq_cbs_padrao || 0}
                        onChange={(e) =>
                          setFormData({ ...formData, aliq_cbs_padrao: Number(e.target.value) })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="aliq_is_padrao">IS</Label>
                      <Input
                        id="aliq_is_padrao"
                        type="number"
                        step="0.01"
                        value={formData.aliq_is_padrao || 0}
                        onChange={(e) =>
                          setFormData({ ...formData, aliq_is_padrao: Number(e.target.value) })
                        }
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* CST Padrão */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">CST Padrão</CardTitle>
                  <CardDescription>
                    Códigos de situação tributária padrão
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="cst_icms_padrao">CST ICMS {formData.crt === 1 || formData.crt === 2 ? "(CSOSN)" : ""}</Label>
                      <Select isSearchable
                        value={formData.cst_icms_padrao || undefined}
                        onValueChange={(v) => setFormData({ ...formData, cst_icms_padrao: v })}
                      >
                        <SelectTrigger id="cst_icms_padrao"><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          {getCstIcmsOptions(formData.crt).map((o) => (
                            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cst_pis_padrao">CST PIS</Label>
                      <Select isSearchable
                        value={formData.cst_pis_padrao || undefined}
                        onValueChange={(v) => setFormData({ ...formData, cst_pis_padrao: v })}
                      >
                        <SelectTrigger id="cst_pis_padrao"><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          {CST_PIS_COFINS.map((o) => (
                            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cst_cofins_padrao">CST COFINS</Label>
                      <Select isSearchable
                        value={formData.cst_cofins_padrao || undefined}
                        onValueChange={(v) => setFormData({ ...formData, cst_cofins_padrao: v })}
                      >
                        <SelectTrigger id="cst_cofins_padrao"><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          {CST_PIS_COFINS.map((o) => (
                            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cst_ipi_padrao">CST IPI</Label>
                      <Select isSearchable
                        value={formData.cst_ipi_padrao || undefined}
                        onValueChange={(v) => setFormData({ ...formData, cst_ipi_padrao: v })}
                      >
                        <SelectTrigger id="cst_ipi_padrao"><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          {CST_IPI.map((o) => (
                            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cst_ibs_padrao">CST IBS</Label>
                      <Select isSearchable
                        value={formData.cst_ibs_padrao || undefined}
                        onValueChange={(v) => setFormData({ ...formData, cst_ibs_padrao: v })}
                      >
                        <SelectTrigger id="cst_ibs_padrao"><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          {CST_IBS_CBS.map((o) => (
                            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cst_cbs_padrao">CST CBS</Label>
                      <Select isSearchable
                        value={formData.cst_cbs_padrao || undefined}
                        onValueChange={(v) => setFormData({ ...formData, cst_cbs_padrao: v })}
                      >
                        <SelectTrigger id="cst_cbs_padrao"><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          {CST_IBS_CBS.map((o) => (
                            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2 lg:col-span-1">
                      <Label htmlFor="cst_is_padrao">CST IS</Label>
                      <Select isSearchable
                        value={formData.cst_is_padrao || undefined}
                        onValueChange={(v) => setFormData({ ...formData, cst_is_padrao: v })}
                      >
                        <SelectTrigger id="cst_is_padrao"><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          {CST_IS.map((o) => (
                            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* API Integration */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Integração API</CardTitle>
                  <CardDescription>
                    Configuração da API para emissão de notas fiscais
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="api_provider">Provedor</Label>
                      <Select isSearchable
                        value={formData.api_provider || ""}
                        onValueChange={(value) =>
                          setFormData({ ...formData, api_provider: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o provedor" />
                        </SelectTrigger>
                        <SelectContent>
                          {API_PROVIDERS.map((prov) => (
                            <SelectItem key={prov.value} value={prov.value}>
                              {prov.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="api_access_token_principal_producao">Token Principal de Produção</Label>
                      <div className="relative">
                        <Input
                          id="api_access_token_principal_producao"
                          type={showTokenPrincipal ? "text" : "password"}
                          value={credentials.api_access_token_principal_producao || ""}
                          onChange={(e) =>
                            setCredentials({ ...credentials, api_access_token_principal_producao: e.target.value })
                          }
                          placeholder="Token principal de produção da Focus NFe"
                          className="pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full w-10"
                          onClick={() => setShowTokenPrincipal((v) => !v)}
                          title={showTokenPrincipal ? "Ocultar token" : "Mostrar token"}
                        >
                          {showTokenPrincipal ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="api_access_token_homologacao">Token de Homologação</Label>
                      <div className="relative">
                        <Input
                          id="api_access_token_homologacao"
                          type={showTokenHom ? "text" : "password"}
                          value={credentials.api_access_token_homologacao || ""}
                          onChange={(e) =>
                            setCredentials({ ...credentials, api_access_token_homologacao: e.target.value })
                          }
                          placeholder="Token de Homologação da Focus NFe"
                          className="pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full w-10"
                          onClick={() => setShowTokenHom((v) => !v)}
                          title={showTokenHom ? "Ocultar token" : "Mostrar token"}
                        >
                          {showTokenHom ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="api_access_token">Token de Produção</Label>
                      <div className="relative">
                        <Input
                          id="api_access_token"
                          type={showToken ? "text" : "password"}
                          value={credentials.api_access_token || ""}
                          onChange={(e) =>
                            setCredentials({ ...credentials, api_access_token: e.target.value })
                          }
                          placeholder="Token de Produção da Focus NFe"
                          className="pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full w-10"
                          onClick={() => setShowToken((v) => !v)}
                          title={showToken ? "Ocultar token" : "Mostrar token"}
                        >
                          {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Verificação/cadastro de empresa e APIs acessórias usam o Token Principal de Produção. Emissão usa o token do ambiente configurado no emitente (1 = Produção, 2 = Homologação).
                  </p>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="api_configurada"
                      checked={formData.api_configurada || false}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, api_configurada: checked })
                      }
                    />
                    <Label htmlFor="api_configurada">API Configurada</Label>
                  </div>
                </CardContent>
              </Card>

              {/* Certificado Digital */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Certificado Digital</CardTitle>
                  <CardDescription>
                    O certificado A1 deve ser enviado no painel da Focus NFe
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="certificado_nome">Nome do Certificado</Label>
                      <Input
                        id="certificado_nome"
                        value={formData.certificado_nome || ""}
                        onChange={(e) =>
                          setFormData({ ...formData, certificado_nome: e.target.value })
                        }
                        placeholder="Descrição do certificado"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="certificado_validade">Validade</Label>
                      <Input
                        id="certificado_validade"
                        type="date"
                        value={formData.certificado_validade || ""}
                        onChange={(e) =>
                          setFormData({ ...formData, certificado_validade: e.target.value })
                        }
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Emails para envio de DANFE/XML */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Emails para Envio de NFe</CardTitle>
                  <CardDescription>
                    Usados como destinatários padrão ao enviar DANFE e XML pelo botão "Enviar Email" na lista de NFe.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email_emitente">Email do Emitente</Label>
                    <Input
                      id="email_emitente"
                      type="email"
                      value={formData.email_emitente ?? ""}
                      onChange={(e) => setFormData({ ...formData, email_emitente: e.target.value || null })}
                      placeholder="empresa@dominio.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email_contador">Email do Contador</Label>
                    <Input
                      id="email_contador"
                      type="email"
                      value={formData.email_contador ?? ""}
                      onChange={(e) => setFormData({ ...formData, email_contador: e.target.value || null })}
                      placeholder="contador@dominio.com"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Status */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Status do Emitente</CardTitle>
                </CardHeader>
                <CardContent>
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
                </CardContent>
              </Card>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleCloseDialog}>
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={createEmitente.isPending || updateEmitente.isPending || !formData.inscricao_produtor_id}
                >
                  {createEmitente.isPending || updateEmitente.isPending
                    ? "Salvando..."
                    : selectedEmitente
                    ? "Salvar Alterações"
                    : "Criar Emitente"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Dialog de Confirmação de Exclusão */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir este emitente? Esta ação não pode ser desfeita.
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
