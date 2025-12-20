import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, Users, Building, Phone, Mail, Loader2, Search } from 'lucide-react';
import { useClientesFornecedores, useCreateClienteFornecedor, useUpdateClienteFornecedor, useDeleteClienteFornecedor, ClienteFornecedorInsert } from '@/hooks/useClientesFornecedores';
import { useGranjas } from '@/hooks/useGranjas';
import { useCepLookup, formatCep } from '@/hooks/useCepLookup';
import { useCnpjLookup, formatCnpj } from '@/hooks/useCnpjLookup';

export default function ClientesFornecedores() {
  const { canEdit } = useAuth();
  const { data: clientesFornecedores, isLoading } = useClientesFornecedores();
  const { data: granjas } = useGranjas();
  const createMutation = useCreateClienteFornecedor();
  const updateMutation = useUpdateClienteFornecedor();
  const deleteMutation = useDeleteClienteFornecedor();
  const { isLoading: cepLoading, fetchCep } = useCepLookup();
  const { isLoading: cnpjLoading, fetchCnpj } = useCnpjLookup();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [formData, setFormData] = useState<ClienteFornecedorInsert>({
    granja_id: null,
    tipo: 'ambos',
    tipo_pessoa: 'juridica',
    nome: '',
    nome_fantasia: '',
    cpf_cnpj: '',
    inscricao_estadual: '',
    logradouro: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    uf: '',
    cep: '',
    telefone: '',
    celular: '',
    email: '',
    contato: '',
    observacoes: '',
    ativo: true,
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

  const handleCnpjLookup = async () => {
    if (formData.tipo_pessoa !== 'juridica' || !formData.cpf_cnpj) return;
    
    const data = await fetchCnpj(formData.cpf_cnpj);
    if (data) {
      setFormData((prev) => ({
        ...prev,
        cpf_cnpj: data.cnpj || prev.cpf_cnpj,
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
  };

  const resetForm = () => {
    setFormData({
      granja_id: null,
      tipo: 'ambos',
      tipo_pessoa: 'juridica',
      nome: '',
      nome_fantasia: '',
      cpf_cnpj: '',
      inscricao_estadual: '',
      logradouro: '',
      numero: '',
      complemento: '',
      bairro: '',
      cidade: '',
      uf: '',
      cep: '',
      telefone: '',
      celular: '',
      email: '',
      contato: '',
      observacoes: '',
      ativo: true,
    });
    setEditingItem(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingItem) {
      await updateMutation.mutateAsync({ id: editingItem.id, ...formData });
    } else {
      await createMutation.mutateAsync(formData);
    }
    setIsDialogOpen(false);
    resetForm();
  };

  const handleEdit = (item: any) => {
    setEditingItem(item);
    setFormData({
      granja_id: item.granja_id,
      tipo: item.tipo,
      tipo_pessoa: item.tipo_pessoa,
      nome: item.nome,
      nome_fantasia: item.nome_fantasia || '',
      cpf_cnpj: item.cpf_cnpj || '',
      inscricao_estadual: item.inscricao_estadual || '',
      logradouro: item.logradouro || '',
      numero: item.numero || '',
      complemento: item.complemento || '',
      bairro: item.bairro || '',
      cidade: item.cidade || '',
      uf: item.uf || '',
      cep: item.cep || '',
      telefone: item.telefone || '',
      celular: item.celular || '',
      email: item.email || '',
      contato: item.contato || '',
      observacoes: item.observacoes || '',
      ativo: item.ativo,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este registro?')) {
      await deleteMutation.mutateAsync(id);
    }
  };

  const getTipoBadge = (tipo: string) => {
    switch (tipo) {
      case 'cliente':
        return <Badge className="bg-sky-500">Cliente</Badge>;
      case 'fornecedor':
        return <Badge className="bg-amber-500">Fornecedor</Badge>;
      default:
        return <Badge className="bg-emerald-500">Ambos</Badge>;
    }
  };

  if (isLoading) {
    return <div className="p-8">Carregando...</div>;
  }

  return (
    <AppLayout>
    <div className="space-y-6">
      <PageHeader
        title="Clientes / Fornecedores"
        description="Gerencie os clientes e fornecedores da empresa"
        icon={<Users className="h-6 w-6" />}
      />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5 text-primary" />
            Lista de Clientes/Fornecedores
          </CardTitle>
          {canEdit && (
            <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Novo Registro
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingItem ? 'Editar' : 'Novo'} Cliente/Fornecedor</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Tipo</Label>
                      <Select value={formData.tipo} onValueChange={(value) => setFormData({ ...formData, tipo: value })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cliente">Cliente</SelectItem>
                          <SelectItem value="fornecedor">Fornecedor</SelectItem>
                          <SelectItem value="ambos">Ambos</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Tipo Pessoa</Label>
                      <Select value={formData.tipo_pessoa || 'juridica'} onValueChange={(value) => setFormData({ ...formData, tipo_pessoa: value })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="fisica">Pessoa Física</SelectItem>
                          <SelectItem value="juridica">Pessoa Jurídica</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Granja</Label>
                      <Select value={formData.granja_id || ''} onValueChange={(value) => setFormData({ ...formData, granja_id: value || null })}>
                        <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                        <SelectContent>
                          {granjas?.map((granja) => (
                            <SelectItem key={granja.id} value={granja.id}>{granja.razao_social}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2 md:col-span-2">
                      <Label>Nome / Razão Social *</Label>
                      <Input value={formData.nome} onChange={(e) => setFormData({ ...formData, nome: e.target.value })} required />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Nome Fantasia</Label>
                      <Input value={formData.nome_fantasia || ''} onChange={(e) => setFormData({ ...formData, nome_fantasia: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>{formData.tipo_pessoa === 'fisica' ? 'CPF' : 'CNPJ'}</Label>
                      <div className="flex gap-2">
                        <Input 
                          value={formData.cpf_cnpj || ''} 
                          onChange={(e) => setFormData({ 
                            ...formData, 
                            cpf_cnpj: formData.tipo_pessoa === 'juridica' ? formatCnpj(e.target.value) : e.target.value 
                          })}
                          placeholder={formData.tipo_pessoa === 'juridica' ? '00.000.000/0000-00' : '000.000.000-00'}
                          maxLength={formData.tipo_pessoa === 'juridica' ? 18 : 14}
                        />
                        {formData.tipo_pessoa === 'juridica' && (
                          <Button 
                            type="button" 
                            variant="outline" 
                            size="icon"
                            onClick={handleCnpjLookup}
                            disabled={cnpjLoading || !formData.cpf_cnpj}
                            title="Buscar dados na Receita Federal"
                          >
                            {cnpjLoading ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Search className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Inscrição Estadual</Label>
                      <Input value={formData.inscricao_estadual || ''} onChange={(e) => setFormData({ ...formData, inscricao_estadual: e.target.value })} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label>CEP</Label>
                      <div className="relative">
                        <Input 
                          value={formData.cep || ''} 
                          onChange={(e) => setFormData({ ...formData, cep: formatCep(e.target.value) })} 
                          onBlur={(e) => handleCepBlur(e.target.value)}
                          placeholder="00000-000"
                          maxLength={9}
                        />
                        {cepLoading && (
                          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                        )}
                      </div>
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>Logradouro</Label>
                      <Input value={formData.logradouro || ''} onChange={(e) => setFormData({ ...formData, logradouro: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Número</Label>
                      <Input value={formData.numero || ''} onChange={(e) => setFormData({ ...formData, numero: e.target.value })} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label>Complemento</Label>
                      <Input value={formData.complemento || ''} onChange={(e) => setFormData({ ...formData, complemento: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Bairro</Label>
                      <Input value={formData.bairro || ''} onChange={(e) => setFormData({ ...formData, bairro: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Cidade</Label>
                      <Input value={formData.cidade || ''} onChange={(e) => setFormData({ ...formData, cidade: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>UF</Label>
                      <Input value={formData.uf || ''} onChange={(e) => setFormData({ ...formData, uf: e.target.value.toUpperCase() })} maxLength={2} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label>Telefone</Label>
                      <Input value={formData.telefone || ''} onChange={(e) => setFormData({ ...formData, telefone: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Celular</Label>
                      <Input value={formData.celular || ''} onChange={(e) => setFormData({ ...formData, celular: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input type="email" value={formData.email || ''} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Contato</Label>
                      <Input value={formData.contato || ''} onChange={(e) => setFormData({ ...formData, contato: e.target.value })} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Observações</Label>
                    <Textarea value={formData.observacoes || ''} onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })} />
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch checked={formData.ativo ?? true} onCheckedChange={(checked) => setFormData({ ...formData, ativo: checked })} />
                    <Label>Ativo</Label>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                    <Button type="submit">Salvar</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>CPF/CNPJ</TableHead>
                <TableHead>Cidade/UF</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead>Status</TableHead>
                {canEdit && <TableHead className="text-right">Ações</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {clientesFornecedores?.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.nome}</TableCell>
                  <TableCell>{getTipoBadge(item.tipo)}</TableCell>
                  <TableCell>{item.cpf_cnpj || '-'}</TableCell>
                  <TableCell>{item.cidade ? `${item.cidade}/${item.uf}` : '-'}</TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1 text-sm">
                      {item.telefone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {item.telefone}</span>}
                      {item.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {item.email}</span>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={item.ativo ? 'default' : 'secondary'}>
                      {item.ativo ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </TableCell>
                  {canEdit && (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
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
              {(!clientesFornecedores || clientesFornecedores.length === 0) && (
                <TableRow>
                  <TableCell colSpan={canEdit ? 7 : 6} className="text-center text-muted-foreground py-8">
                    Nenhum cliente/fornecedor cadastrado
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
    </AppLayout>
  );
}
