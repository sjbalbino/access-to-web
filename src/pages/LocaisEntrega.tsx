import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Plus, Pencil, Trash2, Search, MapPin, Loader2 } from "lucide-react";
import { useLocaisEntrega, useCreateLocalEntrega, useUpdateLocalEntrega, useDeleteLocalEntrega, LocalEntregaInsert } from "@/hooks/useLocaisEntrega";
import { useGranjas } from "@/hooks/useGranjas";
import { useCnpjLookup, formatCnpj } from "@/hooks/useCnpjLookup";
import { useCepLookup, formatCep } from "@/hooks/useCepLookup";

const UF_OPTIONS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", 
  "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"
];

const emptyLocal: LocalEntregaInsert = {
  granja_id: null,
  codigo: null,
  nome: "",
  nome_fantasia: null,
  tipo_pessoa: "juridica",
  cpf_cnpj: null,
  inscricao_estadual: null,
  logradouro: null,
  numero: null,
  complemento: null,
  bairro: null,
  cidade: null,
  uf: null,
  cep: null,
  telefone: null,
  email: null,
  observacoes: null,
  ativo: true,
  is_sede: false,
};

export default function LocaisEntrega() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<LocalEntregaInsert>(emptyLocal);
  const [searchTerm, setSearchTerm] = useState("");
  const [granjaFilter, setGranjaFilter] = useState<string>("");

  const { data: locais = [], isLoading } = useLocaisEntrega();
  const { data: granjas = [] } = useGranjas();
  const createMutation = useCreateLocalEntrega();
  const updateMutation = useUpdateLocalEntrega();
  const deleteMutation = useDeleteLocalEntrega();
  
  const { isLoading: isLoadingCnpj, fetchCnpj } = useCnpjLookup();
  const { isLoading: isLoadingCep, fetchCep } = useCepLookup();

  // Filtrar locais
  const filteredLocais = locais.filter((local) => {
    const matchesSearch = 
      local.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      local.cpf_cnpj?.includes(searchTerm) ||
      local.cidade?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesGranja = !granjaFilter || local.granja_id === granjaFilter;
    
    return matchesSearch && matchesGranja;
  });

  const handleNew = () => {
    setFormData(emptyLocal);
    setEditingId(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (local: any) => {
    setFormData({
      granja_id: local.granja_id,
      codigo: local.codigo,
      nome: local.nome,
      nome_fantasia: local.nome_fantasia,
      tipo_pessoa: local.tipo_pessoa || "juridica",
      cpf_cnpj: local.cpf_cnpj,
      inscricao_estadual: local.inscricao_estadual,
      logradouro: local.logradouro,
      numero: local.numero,
      complemento: local.complemento,
      bairro: local.bairro,
      cidade: local.cidade,
      uf: local.uf,
      cep: local.cep,
      telefone: local.telefone,
      email: local.email,
      observacoes: local.observacoes,
      ativo: local.ativo ?? true,
      is_sede: local.is_sede ?? false,
    });
    setEditingId(local.id);
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Tem certeza que deseja excluir este local de entrega?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      updateMutation.mutate({ id: editingId, ...formData }, {
        onSuccess: () => setIsDialogOpen(false),
      });
    } else {
      createMutation.mutate(formData, {
        onSuccess: () => setIsDialogOpen(false),
      });
    }
  };

  const handleCnpjBlur = async () => {
    if (formData.tipo_pessoa === "juridica" && formData.cpf_cnpj) {
      const cnpjLimpo = formData.cpf_cnpj.replace(/\D/g, '');
      if (cnpjLimpo.length === 14) {
        const data = await fetchCnpj(formData.cpf_cnpj);
        if (data) {
          setFormData(prev => ({
            ...prev,
            nome: data.razao_social || prev.nome,
            nome_fantasia: data.nome_fantasia || prev.nome_fantasia,
            logradouro: data.logradouro || prev.logradouro,
            numero: data.numero || prev.numero,
            complemento: data.complemento || prev.complemento,
            bairro: data.bairro || prev.bairro,
            cidade: data.cidade || prev.cidade,
            uf: data.uf || prev.uf,
            cep: data.cep || prev.cep,
            telefone: data.telefone || prev.telefone,
            email: data.email || prev.email,
          }));
        }
      }
    }
  };

  const handleCepBlur = async () => {
    if (formData.cep) {
      const data = await fetchCep(formData.cep);
      if (data) {
        setFormData(prev => ({
          ...prev,
          logradouro: data.logradouro || prev.logradouro,
          bairro: data.bairro || prev.bairro,
          cidade: data.localidade || prev.cidade,
          uf: data.uf || prev.uf,
        }));
      }
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <PageHeader
          title="Locais de Entrega"
          description="Cadastro de locais de entrega para terceiros e granjas parceiras"
        />

        {/* Filtros */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Buscar por nome, CNPJ/CPF ou cidade..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="w-full md:w-64">
                <Select value={granjaFilter || "__all__"} onValueChange={(val) => setGranjaFilter(val === "__all__" ? "" : val)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas as granjas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Todas as granjas</SelectItem>
                    {granjas.map((g) => (
                      <SelectItem key={g.id} value={g.id}>
                        {g.nome_fantasia || g.razao_social}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleNew} className="gap-2">
                <Plus className="h-4 w-4" />
                Novo Local
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tabela */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex justify-center items-center py-12">
                <Spinner className="h-8 w-8" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>CNPJ/CPF</TableHead>
                    <TableHead>Cidade/UF</TableHead>
                    <TableHead>Granja</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-24">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLocais.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        Nenhum local de entrega encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredLocais.map((local) => (
                      <TableRow key={local.id}>
                        <TableCell className="font-mono">{local.codigo || "-"}</TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{local.nome}</div>
                            {local.nome_fantasia && (
                              <div className="text-sm text-muted-foreground">{local.nome_fantasia}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{local.cpf_cnpj || "-"}</TableCell>
                        <TableCell>
                          {local.cidade && local.uf ? `${local.cidade}/${local.uf}` : "-"}
                        </TableCell>
                        <TableCell>
                          {local.granjas?.nome_fantasia || local.granjas?.razao_social || "-"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={local.ativo ? "default" : "secondary"}>
                            {local.ativo ? "Ativo" : "Inativo"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => handleEdit(local)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(local.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Dialog de Cadastro/Edição */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                {editingId ? "Editar Local de Entrega" : "Novo Local de Entrega"}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Dados Principais */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Granja</Label>
                  <Select 
                    value={formData.granja_id || "__none__"} 
                    onValueChange={(val) => setFormData({ ...formData, granja_id: val === "__none__" ? null : val })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a granja" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Nenhuma</SelectItem>
                      {granjas.map((g) => (
                        <SelectItem key={g.id} value={g.id}>
                          {g.nome_fantasia || g.razao_social}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Código</Label>
                  <Input
                    value={formData.codigo || ""}
                    onChange={(e) => setFormData({ ...formData, codigo: e.target.value || null })}
                    placeholder="Código opcional"
                  />
                </div>
              </div>

              {/* Tipo de Pessoa e Documento */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Tipo de Pessoa</Label>
                  <Select 
                    value={formData.tipo_pessoa || "juridica"} 
                    onValueChange={(val) => setFormData({ ...formData, tipo_pessoa: val })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="juridica">Pessoa Jurídica</SelectItem>
                      <SelectItem value="fisica">Pessoa Física</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>{formData.tipo_pessoa === "juridica" ? "CNPJ" : "CPF"}</Label>
                  <div className="relative">
                    <Input
                      value={formData.cpf_cnpj || ""}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        cpf_cnpj: formData.tipo_pessoa === "juridica" 
                          ? formatCnpj(e.target.value) 
                          : e.target.value 
                      })}
                      onBlur={handleCnpjBlur}
                      placeholder={formData.tipo_pessoa === "juridica" ? "00.000.000/0000-00" : "000.000.000-00"}
                    />
                    {isLoadingCnpj && (
                      <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Inscrição Estadual</Label>
                  <Input
                    value={formData.inscricao_estadual || ""}
                    onChange={(e) => setFormData({ ...formData, inscricao_estadual: e.target.value || null })}
                    placeholder="Inscrição Estadual"
                  />
                </div>
              </div>

              {/* Nome */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome / Razão Social *</Label>
                  <Input
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    required
                    placeholder="Nome ou Razão Social"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Nome Fantasia</Label>
                  <Input
                    value={formData.nome_fantasia || ""}
                    onChange={(e) => setFormData({ ...formData, nome_fantasia: e.target.value || null })}
                    placeholder="Nome Fantasia"
                  />
                </div>
              </div>

              {/* Endereço */}
              <div className="space-y-4">
                <h4 className="font-medium text-sm text-muted-foreground">Endereço</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>CEP</Label>
                    <div className="relative">
                      <Input
                        value={formData.cep || ""}
                        onChange={(e) => setFormData({ ...formData, cep: formatCep(e.target.value) })}
                        onBlur={handleCepBlur}
                        placeholder="00000-000"
                        maxLength={9}
                      />
                      {isLoadingCep && (
                        <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                      )}
                    </div>
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label>Logradouro</Label>
                    <Input
                      value={formData.logradouro || ""}
                      onChange={(e) => setFormData({ ...formData, logradouro: e.target.value || null })}
                      placeholder="Rua, Avenida, etc."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Número</Label>
                    <Input
                      value={formData.numero || ""}
                      onChange={(e) => setFormData({ ...formData, numero: e.target.value || null })}
                      placeholder="Nº"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>Complemento</Label>
                    <Input
                      value={formData.complemento || ""}
                      onChange={(e) => setFormData({ ...formData, complemento: e.target.value || null })}
                      placeholder="Apto, Sala, etc."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Bairro</Label>
                    <Input
                      value={formData.bairro || ""}
                      onChange={(e) => setFormData({ ...formData, bairro: e.target.value || null })}
                      placeholder="Bairro"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Cidade</Label>
                    <Input
                      value={formData.cidade || ""}
                      onChange={(e) => setFormData({ ...formData, cidade: e.target.value || null })}
                      placeholder="Cidade"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>UF</Label>
                    <Select 
                      value={formData.uf || "__none__"} 
                      onValueChange={(val) => setFormData({ ...formData, uf: val === "__none__" ? null : val })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="UF" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Selecione</SelectItem>
                        {UF_OPTIONS.map((uf) => (
                          <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Contato */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Telefone</Label>
                  <Input
                    value={formData.telefone || ""}
                    onChange={(e) => setFormData({ ...formData, telefone: e.target.value || null })}
                    placeholder="(00) 00000-0000"
                  />
                </div>

                <div className="space-y-2">
                  <Label>E-mail</Label>
                  <Input
                    type="email"
                    value={formData.email || ""}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value || null })}
                    placeholder="email@exemplo.com"
                  />
                </div>
              </div>

              {/* Observações e Status */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Observações</Label>
                  <Textarea
                    value={formData.observacoes || ""}
                    onChange={(e) => setFormData({ ...formData, observacoes: e.target.value || null })}
                    placeholder="Observações adicionais..."
                    rows={3}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.is_sede ?? false}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_sede: checked })}
                  />
                  <Label>É Sede/Granja Receptora (Local padrão de entrega)</Label>
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.ativo ?? true}
                    onCheckedChange={(checked) => setFormData({ ...formData, ativo: checked })}
                  />
                  <Label>Ativo</Label>
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {createMutation.isPending || updateMutation.isPending ? "Salvando..." : "Salvar"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
