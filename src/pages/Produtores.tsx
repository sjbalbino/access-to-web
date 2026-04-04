import { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Plus, Pencil, Trash2, Loader2, Phone, Mail, FileText } from "lucide-react";
import {
  useProdutores, useCreateProdutor, useUpdateProdutor, useDeleteProdutor, ProdutorInput,
} from "@/hooks/useProdutores";
import { useGranjas } from "@/hooks/useGranjas";
import { useAuth } from "@/contexts/AuthContext";
import { useCepLookup, formatCep } from "@/hooks/useCepLookup";
import { useCnpjLookup, formatCnpj } from "@/hooks/useCnpjLookup";
import { InscricoesTab } from "@/components/produtores/InscricoesTab";
import { useCreateInscricao } from "@/hooks/useInscricoesProdutor";
import { formatCpf, formatCpfCnpj, formatTelefone, validateCpf, validateCnpj } from "@/lib/formatters";
import { toast } from "sonner";

const TIPOS_PRODUTOR = [
  { value: "produtor", label: "Produtor" },
  { value: "socio", label: "Sócio" },
];

const TIPOS_PESSOA = [
  { value: "fisica", label: "Pessoa Física" },
  { value: "juridica", label: "Pessoa Jurídica" },
  { value: "estrangeiro", label: "Estrangeiro" },
  { value: "produtor_rural", label: "Produtor Rural" },
];

const emptyProdutor: ProdutorInput = {
  nome: "",
  tipo_pessoa: "fisica",
  tipo_produtor: "produtor",
  cpf_cnpj: "",
  identidade: "",
  granja_id: null,
  logradouro: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "",
  uf: "",
  cep: "",
  telefone: "",
  celular: "",
  email: "",
  ativo: true,
};

export default function Produtores() {
  const { data: produtores, isLoading } = useProdutores();
  const { data: granjas } = useGranjas();
  const createProdutor = useCreateProdutor();
  const updateProdutor = useUpdateProdutor();
  const deleteProdutor = useDeleteProdutor();
  const createInscricao = useCreateInscricao();
  const { canEdit } = useAuth();
  const { isLoading: cepLoading, fetchCep } = useCepLookup();
  const { isLoading: cnpjLoading, fetchCnpj } = useCnpjLookup();

  // Filtros
  const [filtroNome, setFiltroNome] = useState("");
  const [filtroCpfCnpj, setFiltroCpfCnpj] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [filtroCidade, setFiltroCidade] = useState("");
  const [filtroAtivo, setFiltroAtivo] = useState("ativo");
  const [paginaAtual, setPaginaAtual] = useState(1);
  const itensPorPagina = 20;

  // Dialog
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [formData, setFormData] = useState<ProdutorInput>(emptyProdutor);
  const [activeTab, setActiveTab] = useState<string>("dados");

  const dadosFiltrados = useMemo(() => {
    let dados = produtores || [];
    if (filtroNome) {
      const termo = filtroNome.toLowerCase();
      dados = dados.filter((p: any) => p.nome?.toLowerCase().includes(termo));
    }
    if (filtroCpfCnpj) {
      const termo = filtroCpfCnpj.replace(/\D/g, "");
      dados = dados.filter((p: any) => p.cpf_cnpj?.replace(/\D/g, "").includes(termo));
    }
    if (filtroTipo !== "todos") {
      dados = dados.filter((p: any) => p.tipo_produtor === filtroTipo);
    }
    if (filtroCidade) {
      const termo = filtroCidade.toLowerCase();
      dados = dados.filter((p: any) => p.cidade?.toLowerCase().includes(termo));
    }
    if (filtroAtivo !== "todos") {
      dados = dados.filter((p: any) => filtroAtivo === "ativo" ? p.ativo !== false : p.ativo === false);
    }
    return dados;
  }, [produtores, filtroNome, filtroCpfCnpj, filtroTipo, filtroCidade, filtroAtivo]);

  const totalPaginas = Math.max(1, Math.ceil(dadosFiltrados.length / itensPorPagina));
  const dadosPaginados = dadosFiltrados.slice((paginaAtual - 1) * itensPorPagina, paginaAtual * itensPorPagina);

  const resetForm = () => {
    setFormData(emptyProdutor);
    setEditingItem(null);
    setActiveTab("dados");
  };

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

  const handleCnpjBlur = async (cnpj: string) => {
    if (formData.tipo_pessoa !== "juridica") return;
    const cleanCnpj = cnpj.replace(/\D/g, "");
    if (cleanCnpj.length !== 14) return;
    const data = await fetchCnpj(cnpj);
    if (data) {
      setFormData((prev) => ({
        ...prev,
        nome: data.razao_social || prev.nome,
        logradouro: data.logradouro || prev.logradouro,
        numero: data.numero || prev.numero,
        complemento: data.complemento || prev.complemento,
        bairro: data.bairro || prev.bairro,
        cidade: data.cidade || prev.cidade,
        uf: data.uf || prev.uf,
        cep: data.cep?.replace(/\D/g, "") || prev.cep,
        telefone: data.telefone || prev.telefone,
        email: data.email || prev.email,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.cpf_cnpj && formData.cpf_cnpj.length > 0) {
      const doc = formData.cpf_cnpj.replace(/\D/g, "");
      if (formData.tipo_pessoa === "fisica" || formData.tipo_pessoa === "produtor_rural") {
        if (doc.length > 0 && !validateCpf(doc)) { toast.error("CPF inválido!"); return; }
      } else {
        if (doc.length > 0 && !validateCnpj(doc)) { toast.error("CNPJ inválido!"); return; }
      }
    }
    if (editingItem) {
      await updateProdutor.mutateAsync({ id: editingItem.id, ...formData });
      toast.success("Produtor atualizado com sucesso!");
    } else {
      const result = await createProdutor.mutateAsync(formData);
      // Manter dialog aberto, setar o item criado e criar 1ª inscrição
      setEditingItem(result);
      try {
        await createInscricao.mutateAsync({
          produtor_id: result.id,
          nome: formData.nome || "",
          tipo: "",
          inscricao_estadual: "",
          cpf_cnpj: formData.cpf_cnpj || "",
          cep: formData.cep || "",
          logradouro: formData.logradouro || "",
          numero: formData.numero || "",
          complemento: formData.complemento || "",
          bairro: formData.bairro || "",
          cidade: formData.cidade || "",
          uf: formData.uf || "",
          telefone: formData.telefone || "",
          email: formData.email || "",
          granja: "",
          granja_id: formData.granja_id || null,
          ativa: true,
          emitente_id: null,
          conta_bancaria: null,
          is_emitente_principal: false,
        });
      } catch {
        // Inscrição pode falhar por granja_id nulo; não bloquear o fluxo
      }
      setActiveTab("inscricoes");
      return; // Não fechar o dialog
    }
  };

  const handleEdit = (item: any) => {
    setEditingItem(item);
    setFormData({
      nome: item.nome,
      tipo_pessoa: item.tipo_pessoa || "fisica",
      tipo_produtor: item.tipo_produtor || "produtor",
      cpf_cnpj: item.cpf_cnpj || "",
      identidade: item.identidade || "",
      granja_id: item.granja_id,
      logradouro: item.logradouro || "",
      numero: item.numero || "",
      complemento: item.complemento || "",
      bairro: item.bairro || "",
      cidade: item.cidade || "",
      uf: item.uf || "",
      cep: item.cep || "",
      telefone: item.telefone || "",
      celular: item.celular || "",
      email: item.email || "",
      ativo: item.ativo ?? true,
    });
    setActiveTab("dados");
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Tem certeza que deseja excluir este registro?")) {
      await deleteProdutor.mutateAsync(id);
    }
  };

  const getTipoBadge = (tipo: string) => {
    switch (tipo) {
      case "socio":
        return <Badge className="bg-secondary text-secondary-foreground">Sócio</Badge>;
      default:
        return <Badge className="bg-accent/80 text-accent-foreground">Produtor</Badge>;
    }
  };

  const isFisica = formData.tipo_pessoa === "fisica" || formData.tipo_pessoa === "produtor_rural";

  if (isLoading) {
    return <div className="p-8">Carregando...</div>;
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <PageHeader
          title="Cadastro de Sócios e Produtores"
          description="Produtores depositam produção para devolução/compra. Sócios são parceiros na Granja."
          icon={<Users className="h-6 w-6" />}
        />

        <Card>
          <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Lista de Sócios e Produtores
            </CardTitle>
            {canEdit && (
              <Button className="gap-2" size="sm" onClick={() => { resetForm(); setIsDialogOpen(true); }}>
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Novo Registro</span>
              </Button>
            )}
          </CardHeader>
          <CardContent className="min-w-0 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Nome</Label>
                <Input placeholder="Buscar..." value={filtroNome} onChange={(e) => { setFiltroNome(e.target.value); setPaginaAtual(1); }} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">CPF/CNPJ</Label>
                <Input placeholder="Buscar..." value={filtroCpfCnpj} onChange={(e) => { setFiltroCpfCnpj(e.target.value); setPaginaAtual(1); }} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Tipo</Label>
                <Select value={filtroTipo} onValueChange={(v) => { setFiltroTipo(v); setPaginaAtual(1); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="produtor">Produtores</SelectItem>
                    <SelectItem value="socio">Sócios</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Cidade</Label>
                <Input placeholder="Buscar..." value={filtroCidade} onChange={(e) => { setFiltroCidade(e.target.value); setPaginaAtual(1); }} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Status</Label>
                <Select value={filtroAtivo} onValueChange={(v) => { setFiltroAtivo(v); setPaginaAtual(1); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ativo">Ativos</SelectItem>
                    <SelectItem value="inativo">Inativos</SelectItem>
                    <SelectItem value="todos">Todos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="hidden sm:table-cell">CPF/CNPJ</TableHead>
                    <TableHead className="hidden md:table-cell">Cidade/UF</TableHead>
                    <TableHead className="hidden md:table-cell">Contato</TableHead>
                    <TableHead className="hidden sm:table-cell">Status</TableHead>
                    {canEdit && <TableHead className="text-right sticky right-0 bg-background">Ações</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dadosPaginados.map((item: any) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.nome}</TableCell>
                      <TableCell>{getTipoBadge(item.tipo_produtor)}</TableCell>
                      <TableCell className="hidden sm:table-cell">{formatCpfCnpj(item.cpf_cnpj) || "-"}</TableCell>
                      <TableCell className="hidden md:table-cell">{item.cidade ? `${item.cidade}/${item.uf}` : "-"}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="flex flex-col gap-1 text-sm">
                          {item.telefone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {formatTelefone(item.telefone)}</span>}
                          {item.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {item.email}</span>}
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Badge variant={item.ativo !== false ? "default" : "secondary"}>
                          {item.ativo !== false ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                      {canEdit && (
                        <TableCell className="text-right sticky right-0 bg-background">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => handleEdit(item)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                  {dadosPaginados.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={canEdit ? 7 : 6} className="text-center text-muted-foreground py-8">
                        {dadosFiltrados.length === 0 && (produtores?.length || 0) > 0
                          ? "Nenhum registro encontrado com os filtros aplicados"
                          : "Nenhum produtor/sócio cadastrado"}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            {totalPaginas > 1 && (
              <div className="flex items-center justify-between pt-4">
                <span className="text-sm text-muted-foreground">
                  {dadosFiltrados.length} registro(s) — Página {paginaAtual} de {totalPaginas}
                </span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={paginaAtual <= 1} onClick={() => setPaginaAtual((p) => p - 1)}>Anterior</Button>
                  <Button variant="outline" size="sm" disabled={paginaAtual >= totalPaginas} onClick={() => setPaginaAtual((p) => p + 1)}>Próxima</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialog unificado com abas */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Editar" : "Novo"} Produtor/Sócio</DialogTitle>
          </DialogHeader>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="dados">
                <Users className="h-4 w-4 mr-2" />
                Dados do Produtor
              </TabsTrigger>
              <TabsTrigger value="inscricoes" disabled={!editingItem}>
                <FileText className="h-4 w-4 mr-2" />
                Inscrições Estaduais
              </TabsTrigger>
            </TabsList>

            <TabsContent value="dados">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>Tipo</Label>
                    <Select value={formData.tipo_produtor || "produtor"} onValueChange={(v) => setFormData({ ...formData, tipo_produtor: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {TIPOS_PRODUTOR.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Tipo Pessoa</Label>
                    <Select value={formData.tipo_pessoa || "fisica"} onValueChange={(v) => setFormData({ ...formData, tipo_pessoa: v, cpf_cnpj: "" })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {TIPOS_PESSOA.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{isFisica ? "CPF" : "CNPJ"}</Label>
                    <div className="relative">
                      <Input
                        value={isFisica ? formatCpf(formData.cpf_cnpj || "") : formatCnpj(formData.cpf_cnpj || "")}
                        onChange={(e) => setFormData({ ...formData, cpf_cnpj: e.target.value.replace(/\D/g, "") })}
                        onBlur={(e) => handleCnpjBlur(e.target.value)}
                        placeholder={isFisica ? "000.000.000-00" : "00.000.000/0000-00"}
                        maxLength={isFisica ? 14 : 18}
                      />
                      {cnpjLoading && formData.tipo_pessoa === "juridica" && (
                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Identidade</Label>
                    <Input value={formData.identidade || ""} onChange={(e) => setFormData({ ...formData, identidade: e.target.value })} />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2 md:col-span-2">
                    <Label>Nome Completo *</Label>
                    <Input value={formData.nome} onChange={(e) => setFormData({ ...formData, nome: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Granja</Label>
                    <Select value={formData.granja_id || ""} onValueChange={(v) => setFormData({ ...formData, granja_id: v || null })}>
                      <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                      <SelectContent>
                        {granjas?.map((g) => <SelectItem key={g.id} value={g.id}>{g.razao_social}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>CEP</Label>
                    <div className="relative">
                      <Input
                        value={formData.cep || ""}
                        onChange={(e) => setFormData({ ...formData, cep: formatCep(e.target.value) })}
                        onBlur={(e) => handleCepBlur(e.target.value)}
                        placeholder="00000-000"
                        maxLength={9}
                      />
                      {cepLoading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />}
                    </div>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Logradouro</Label>
                    <Input value={formData.logradouro || ""} onChange={(e) => setFormData({ ...formData, logradouro: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Número</Label>
                    <Input value={formData.numero || ""} onChange={(e) => setFormData({ ...formData, numero: e.target.value })} />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>Complemento</Label>
                    <Input value={formData.complemento || ""} onChange={(e) => setFormData({ ...formData, complemento: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Bairro</Label>
                    <Input value={formData.bairro || ""} onChange={(e) => setFormData({ ...formData, bairro: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Cidade</Label>
                    <Input value={formData.cidade || ""} onChange={(e) => setFormData({ ...formData, cidade: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>UF</Label>
                    <Input value={formData.uf || ""} onChange={(e) => setFormData({ ...formData, uf: e.target.value.toUpperCase() })} maxLength={2} />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>Telefone</Label>
                    <Input value={formatTelefone(formData.telefone || "")} onChange={(e) => setFormData({ ...formData, telefone: e.target.value.replace(/\D/g, "") })} placeholder="(00) 0000-0000" />
                  </div>
                  <div className="space-y-2">
                    <Label>Celular</Label>
                    <Input value={formatTelefone(formData.celular || "")} onChange={(e) => setFormData({ ...formData, celular: e.target.value.replace(/\D/g, "") })} placeholder="(00) 00000-0000" />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>E-mail</Label>
                    <Input type="email" value={formData.email || ""} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Switch checked={formData.ativo ?? true} onCheckedChange={(checked) => setFormData({ ...formData, ativo: checked })} />
                  <Label>Ativo</Label>
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                  <Button type="submit" disabled={!formData.nome || createProdutor.isPending || updateProdutor.isPending}>
                    {(createProdutor.isPending || updateProdutor.isPending) ? "Salvando..." : editingItem ? "Salvar" : "Salvar e Continuar"}
                  </Button>
                </div>
              </form>
            </TabsContent>

            <TabsContent value="inscricoes">
              {editingItem && <InscricoesTab produtorId={editingItem.id} />}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}