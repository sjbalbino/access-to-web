import { useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ComboboxFilter } from "@/components/ui/combobox-filter";
import { Plus, Pencil, Trash2, Search, Landmark } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useBancos } from "@/hooks/useBancos";
import {
  useContasBancarias,
  useCreateContaBancaria,
  useUpdateContaBancaria,
  useDeleteContaBancaria,
  ContaBancariaInput,
} from "@/hooks/useContasBancarias";
import { useProdutores } from "@/hooks/useProdutores";
import { useGranjas } from "@/hooks/useGranjas";
import { usePaginacao } from "@/hooks/usePaginacao";
import { TablePagination } from "@/components/ui/table-pagination";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty";

const TIPOS: { value: ContaBancariaInput["tipo"]; label: string }[] = [
  { value: "corrente", label: "Corrente" },
  { value: "poupanca", label: "Poupança" },
  { value: "investimento", label: "Investimento" },
  { value: "caixa", label: "Caixa" },
  { value: "outro", label: "Outro" },
];

const PIX_TIPOS = ["cpf", "cnpj", "email", "telefone", "aleatoria"] as const;

const emptyForm = (): Partial<ContaBancariaInput> => ({
  codigo_legado: null,
  nome: "",
  banco_id: null,
  agencia: null,
  agencia_dv: null,
  conta: null,
  conta_dv: null,
  tipo: "corrente",
  socio_produtor_id: null,
  granja_id: null,
  titular: null,
  cpf_cnpj_titular: null,
  pix_chave: null,
  pix_tipo: null,
  saldo_inicial: 0,
  data_saldo_inicial: null,
  ativo: true,
  is_padrao_granja: false,
  observacoes: null,
});

export default function ContasBancarias() {
  const { canEdit } = useAuth();
  const [filtroSocio, setFiltroSocio] = useState<string>("");
  const [filtroBanco, setFiltroBanco] = useState<string>("");
  const [busca, setBusca] = useState("");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<ContaBancariaInput>>(emptyForm());

  const { data: bancos = [] } = useBancos();
  const { data: produtores = [] } = useProdutores();
  const { data: granjas = [] } = useGranjas();
  const { data: contas = [], isLoading } = useContasBancarias({
    socioProdutorId: filtroSocio || undefined,
    busca: busca || undefined,
  });

  const contasFiltradas = useMemo(
    () => contas.filter(c => !filtroBanco || c.banco_id === filtroBanco),
    [contas, filtroBanco]
  );

  const pag = usePaginacao(contasFiltradas, 20);

  const create = useCreateContaBancaria();
  const update = useUpdateContaBancaria();
  const del = useDeleteContaBancaria();

  const handleNew = () => {
    setEditingId(null);
    setForm(emptyForm());
    setOpen(true);
  };

  const handleEdit = (c: any) => {
    setEditingId(c.id);
    setForm({
      codigo_legado: c.codigo_legado,
      nome: c.nome,
      banco_id: c.banco_id,
      agencia: c.agencia,
      agencia_dv: c.agencia_dv,
      conta: c.conta,
      conta_dv: c.conta_dv,
      tipo: c.tipo,
      socio_produtor_id: c.socio_produtor_id,
      granja_id: c.granja_id,
      titular: c.titular,
      cpf_cnpj_titular: c.cpf_cnpj_titular,
      pix_chave: c.pix_chave,
      pix_tipo: c.pix_tipo,
      saldo_inicial: Number(c.saldo_inicial) || 0,
      data_saldo_inicial: c.data_saldo_inicial,
      ativo: c.ativo,
      is_padrao_granja: !!c.is_padrao_granja,
      observacoes: c.observacoes,
    });
    setOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.nome) return;
    if (editingId) {
      await update.mutateAsync({ id: editingId, ...(form as ContaBancariaInput) });
    } else {
      await create.mutateAsync(form as ContaBancariaInput);
    }
    setOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir esta conta bancária?")) return;
    await del.mutateAsync(id);
  };

  const bancoOptions = bancos.map(b => ({ value: b.id, label: `${b.codigo} - ${b.nome}` }));
  const socioOptions = produtores.map(p => ({ value: p.id, label: p.nome }));

  return (
    <AppLayout>
      <PageHeader
        title="Contas Bancárias"
        description="Cadastro de contas dos sócios e da granja, usadas nas baixas financeiras."
        icon={<Landmark className="h-6 w-6" />}
        actions={
          canEdit && (
            <Button onClick={handleNew}>
              <Plus className="h-4 w-4 mr-2" /> Nova conta
            </Button>
          )
        }
      />

      <Card className="mb-4">
        <CardContent className="pt-4 grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-2">
            <Label>Buscar</Label>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input className="pl-8" placeholder="Nome..." value={busca} onChange={(e) => setBusca(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Sócio</Label>
            <ComboboxFilter
              value={filtroSocio}
              onValueChange={setFiltroSocio}
              options={socioOptions}
              placeholder="Todos"
              allLabel="Todos"
            />
          </div>
          <div>
            <Label>Banco</Label>
            <ComboboxFilter
              value={filtroBanco}
              onValueChange={setFiltroBanco}
              options={bancoOptions}
              placeholder="Todos"
              allLabel="Todos"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : pag.dadosPaginados.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia><Landmark className="h-10 w-10 text-muted-foreground" /></EmptyMedia>
                <EmptyTitle>Nenhuma conta bancária</EmptyTitle>
                <EmptyDescription>
                  {canEdit ? "Crie a primeira clicando em \"Nova conta\"." : "Nenhuma conta cadastrada ainda."}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Banco</TableHead>
                    <TableHead>Agência / Conta</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Sócio</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-20"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pag.dadosPaginados.map((c: any) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.nome}</TableCell>
                      <TableCell>{c.banco ? `${c.banco.codigo} - ${c.banco.nome}` : "-"}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {c.agencia ? `${c.agencia}${c.agencia_dv ? "-" + c.agencia_dv : ""}` : "-"}
                        {" / "}
                        {c.conta ? `${c.conta}${c.conta_dv ? "-" + c.conta_dv : ""}` : "-"}
                      </TableCell>
                      <TableCell><Badge variant="outline">{c.tipo}</Badge></TableCell>
                      <TableCell className="text-sm">{c.socio?.nome || "-"}</TableCell>
                      <TableCell>
                        {c.ativo
                          ? <Badge variant="default">Ativa</Badge>
                          : <Badge variant="secondary">Inativa</Badge>}
                      </TableCell>
                      <TableCell>
                        {canEdit && (
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" onClick={() => handleEdit(c)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => handleDelete(c.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <TablePagination
                paginaAtual={pag.paginaAtual}
                totalPaginas={pag.totalPaginas}
                setPaginaAtual={pag.setPaginaAtual}
                totalRegistros={pag.totalRegistros}
                gerarNumerosPaginas={pag.gerarNumerosPaginas}
              />
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar conta bancária" : "Nova conta bancária"}</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <Label>Nome / Apelido *</Label>
              <Input value={form.nome || ""} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Ex.: Itaú PJ Principal" />
            </div>
            <div>
              <Label>Tipo</Label>
              <Select isSearchable value={form.tipo} onValueChange={(v: any) => setForm({ ...form, tipo: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TIPOS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-3">
              <Label>Banco</Label>
              <ComboboxFilter
                value={form.banco_id || ""}
                onValueChange={(v) => setForm({ ...form, banco_id: v || null })}
                options={bancoOptions}
                placeholder="Selecione um banco"
                allLabel="(nenhum)"
                popoverWidth="w-[500px]"
              />
            </div>

            <div>
              <Label>Agência</Label>
              <Input value={form.agencia || ""} onChange={(e) => setForm({ ...form, agencia: e.target.value || null })} />
            </div>
            <div>
              <Label>DV Agência</Label>
              <Input value={form.agencia_dv || ""} onChange={(e) => setForm({ ...form, agencia_dv: e.target.value || null })} />
            </div>
            <div></div>

            <div>
              <Label>Conta</Label>
              <Input value={form.conta || ""} onChange={(e) => setForm({ ...form, conta: e.target.value || null })} />
            </div>
            <div>
              <Label>DV Conta</Label>
              <Input value={form.conta_dv || ""} onChange={(e) => setForm({ ...form, conta_dv: e.target.value || null })} />
            </div>
            <div>
              <Label>Saldo inicial</Label>
              <CurrencyInput
                value={form.saldo_inicial ?? null}
                onChange={(v) => setForm({ ...form, saldo_inicial: v ?? 0 })}
              />
            </div>

            <div>
              <Label>Sócio vinculado</Label>
              <ComboboxFilter
                value={form.socio_produtor_id || ""}
                onValueChange={(v) => setForm({ ...form, socio_produtor_id: v || null })}
                options={socioOptions}
                placeholder="(nenhum)"
                allLabel="(nenhum)"
              />
            </div>
            <div>
              <Label>Granja vinculada</Label>
              <Select isSearchable
                value={form.granja_id || "_none"}
                onValueChange={(v) => setForm({ ...form, granja_id: v === "_none" ? null : v })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">(nenhuma)</SelectItem>
                  {granjas.map(g => <SelectItem key={g.id} value={g.id}>{g.razao_social}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Código legado</Label>
              <Input value={form.codigo_legado || ""} onChange={(e) => setForm({ ...form, codigo_legado: e.target.value || null })} />
            </div>

            <div className="md:col-span-2">
              <Label>Titular</Label>
              <Input value={form.titular || ""} onChange={(e) => setForm({ ...form, titular: e.target.value || null })} />
            </div>
            <div>
              <Label>CPF/CNPJ Titular</Label>
              <Input value={form.cpf_cnpj_titular || ""} onChange={(e) => setForm({ ...form, cpf_cnpj_titular: e.target.value || null })} />
            </div>

            <div className="md:col-span-2">
              <Label>Chave PIX</Label>
              <Input value={form.pix_chave || ""} onChange={(e) => setForm({ ...form, pix_chave: e.target.value || null })} />
            </div>
            <div>
              <Label>Tipo PIX</Label>
              <Select isSearchable
                value={form.pix_tipo || "_none"}
                onValueChange={(v) => setForm({ ...form, pix_tipo: v === "_none" ? null : (v as any) })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">(nenhum)</SelectItem>
                  {PIX_TIPOS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-3">
              <Label>Observações</Label>
              <Textarea rows={2} value={form.observacoes || ""} onChange={(e) => setForm({ ...form, observacoes: e.target.value || null })} />
            </div>

            <div className="flex items-center gap-2">
              <Switch checked={!!form.ativo} onCheckedChange={(v) => setForm({ ...form, ativo: v })} />
              <Label>Ativa</Label>
            </div>
            <div className="flex items-center gap-2 md:col-span-2">
              <Switch
                checked={!!form.is_padrao_granja}
                onCheckedChange={(v) => setForm({ ...form, is_padrao_granja: v })}
                disabled={!form.granja_id}
              />
              <Label>Conta padrão da granja {form.granja_id ? '' : '(vincule uma granja)'}</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={!form.nome || create.isPending || update.isPending}>
              {editingId ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
