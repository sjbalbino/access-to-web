import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Upload, Search, Trash2, Eye, CheckCircle, Globe, Undo2, FileOutput, FileInput } from "lucide-react";
import { useEntradasNfe, useDeleteEntradaNfe, useFinalizarEntrada, useEstornarEntrada, useEntradaNfe } from "@/hooks/useEntradasNfe";

import { useGranjas } from "@/hooks/useGranjas";
import { useSafras } from "@/hooks/useSafras";
import { useInscricoesCompletas } from "@/hooks/useInscricoesCompletas";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ComboboxFilter } from "@/components/ui/combobox-filter";
import { formatNumber } from "@/lib/formatters";
import { EntradaNfeFormDialog } from "@/components/entradas-nfe/EntradaNfeFormDialog";
import { ImportarXmlDialog } from "@/components/entradas-nfe/ImportarXmlDialog";
import { MdeDialog } from "@/components/entradas-nfe/MdeDialog";
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

const statusLabels: Record<string, string> = {
  pendente: 'Pendente',
  conferido: 'Conferido',
  finalizado: 'Finalizado',
};

const statusVariants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pendente: 'secondary',
  conferido: 'outline',
  finalizado: 'default',
};

export default function EntradasNfe() {
  const [granjaId, setGranjaId] = useState<string>('all');
  const [safraId, setSafraId] = useState<string>('all');
  const [inscricaoId, setInscricaoId] = useState<string>('all');
  const [busca, setBusca] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [xmlOpen, setXmlOpen] = useState(false);
  const [mdeOpen, setMdeOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: granjas } = useGranjas();
  const { data: safras } = useSafras();
  const { data: inscricoes } = useInscricoesCompletas();
  const { data: entradas, isLoading } = useEntradasNfe(
    granjaId === 'all' ? null : granjaId,
    safraId === 'all' ? null : safraId,
    inscricaoId === 'all' ? null : inscricaoId
  );
  const deleteMutation = useDeleteEntradaNfe();
  const finalizarMutation = useFinalizarEntrada();
  const estornarMutation = useEstornarEntrada();
  const [estornarId, setEstornarId] = useState<string | null>(null);
  const { data: entradaEstorno } = useEntradaNfe(estornarId);
  const navigate = useNavigate();
  const [gerandoContraNota, setGerandoContraNota] = useState(false);

  const handleGerarContraNota = async (entradaId: string, modo: 'contra' | 'devolucao') => {
    if (gerandoContraNota) return;
    setGerandoContraNota(true);
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      const { data: entrada, error } = await supabase
        .from('entradas_nfe')
        .select(`
          *,
          fornecedor:fornecedor_id(id, nome, cpf_cnpj, inscricao_estadual, email, logradouro, numero, complemento, bairro, cidade, uf, cep),
          itens:entradas_nfe_itens(*, produto:produto_id(id, nome, codigo, ncm, cod_fornecedor))
        `)
        .eq('id', entradaId)
        .single();
      if (error || !entrada) {
        const { toast } = await import('sonner');
        toast.error('Erro ao carregar dados da entrada: ' + (error?.message || 'não encontrada'));
        return;
      }
      const f: any = (entrada as any).fornecedor || {};
      const cpfCnpj = (f.cpf_cnpj || '').replace(/\D/g, '');
      const isDevolucao = modo === 'devolucao';
      const data = {
        chaveAcesso: (entrada as any).chave_acesso || '',
        dest_tipo: cpfCnpj.length > 11 ? '1' : '0',
        dest_cpf_cnpj: cpfCnpj,
        dest_nome: f.nome || '',
        dest_ie: f.inscricao_estadual || '',
        dest_email: f.email || '',
        dest_logradouro: f.logradouro || '',
        dest_numero: f.numero || '',
        dest_complemento: f.complemento || '',
        dest_bairro: f.bairro || '',
        dest_cidade: f.cidade || '',
        dest_uf: f.uf || '',
        dest_cep: (f.cep || '').replace(/\D/g, ''),
        natureza_operacao: isDevolucao
          ? 'Devolução de ' + ((entrada as any).natureza_operacao || 'mercadoria')
          : 'Contra-nota de entrada - ' + ((entrada as any).natureza_operacao || 'compra'),
        finalidade: isDevolucao ? 4 : 1,
        operacao: 0,
        itens: ((entrada as any).itens || []).map((it: any) => ({
          codigo: it.produto?.codigo || it.produto_xml_codigo || '',
          descricao: it.produto?.nome || it.produto_xml_descricao || '',
          ncm: it.produto?.ncm || it.produto_xml_ncm || '',
          cfop: it.cfop || '',
          unidade: it.unidade_medida || '',
          quantidade: Number(it.quantidade || 0),
          valor_unitario: Number(it.valor_unitario || 0),
          valor_total: Number(it.valor_total || 0),
          valor_desconto: Number(it.valor_desconto || 0),
          cst_icms: it.cst_icms || '', base_icms: Number(it.base_icms || 0), aliq_icms: Number(it.aliq_icms || 0), valor_icms: Number(it.valor_icms || 0),
          cst_pis: it.cst_pis || '', base_pis: Number(it.base_pis || 0), aliq_pis: Number(it.aliq_pis || 0), valor_pis: Number(it.valor_pis || 0),
          cst_cofins: it.cst_cofins || '', base_cofins: Number(it.base_cofins || 0), aliq_cofins: Number(it.aliq_cofins || 0), valor_cofins: Number(it.valor_cofins || 0),
          cst_ipi: it.cst_ipi || '', base_ipi: Number(it.base_ipi || 0), aliq_ipi: Number(it.aliq_ipi || 0), valor_ipi: Number(it.valor_ipi || 0),
        })),
      };
      navigate('/notas-fiscais/nova', { state: { contraNotaData: data } });
    } finally {
      setGerandoContraNota(false);
    }
  };




  const safraOptions = (safras || []).map((s: any) => ({
    value: s.id,
    label: s.nome,
  }));

  const inscricaoOptions = (inscricoes || []).map((i: any) => ({
    value: i.id,
    label: `${i.nome || ''} (IE: ${i.inscricao_estadual || '-'})`.trim(),
    sublabel: i.granjas?.razao_social || '',
  }));

  const filtered = (entradas || []).filter((e: any) => {
    if (!busca) return true;
    const term = busca.toLowerCase();
    return (
      e.numero_nfe?.toLowerCase().includes(term) ||
      e.fornecedor?.nome?.toLowerCase().includes(term) ||
      e.chave_acesso?.toLowerCase().includes(term)
    );
  });

  return (
    <AppLayout>
      <div className="space-y-6">
        <PageHeader title="Entradas NF-e" description="Entrada de produtos no estoque via Notas Fiscais de compra"
          actions={
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setMdeOpen(true)}>
                <Globe className="h-4 w-4 mr-2" /> Buscar no SEFAZ
              </Button>
              <Button variant="outline" onClick={() => setXmlOpen(true)}>
                <Upload className="h-4 w-4 mr-2" /> Importar XML
              </Button>
              <Button onClick={() => { setEditId(null); setFormOpen(true); }}>
                <Plus className="h-4 w-4 mr-2" /> Entrada Manual
              </Button>
            </div>
          }
        />

        {formOpen ? (
          <EntradaNfeFormDialog open={formOpen} onOpenChange={setFormOpen} entradaId={editId} />
        ) : (
          <>
        <div className="flex flex-wrap gap-4 items-end">
          <div className="w-48">
            <label className="text-sm font-medium mb-1 block">Granja</label>
            <Select isSearchable value={granjaId} onValueChange={setGranjaId}>
              <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {granjas?.map((g: any) => (
                  <SelectItem key={g.id} value={g.id}>{g.razao_social}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-56">
            <label className="text-sm font-medium mb-1 block">Safra</label>
            <ComboboxFilter
              value={safraId === 'all' ? '' : safraId}
              onValueChange={(v) => setSafraId(v || 'all')}
              options={safraOptions}
              placeholder="Todas"
              searchPlaceholder="Buscar safra..."
              allLabel="Todas"
            />
          </div>
          <div className="w-72">
            <label className="text-sm font-medium mb-1 block">IE do Produtor</label>
            <ComboboxFilter
              value={inscricaoId === 'all' ? '' : inscricaoId}
              onValueChange={(v) => setInscricaoId(v || 'all')}
              options={inscricaoOptions}
              placeholder="Todas"
              searchPlaceholder="Buscar inscrição..."
              allLabel="Todas"
            />
          </div>
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar por número, fornecedor ou chave..." value={busca} onChange={(e) => setBusca(e.target.value)} className="pl-10" />
          </div>
        </div>

        <div className="rounded-lg border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="whitespace-nowrap">Nº NF-e</TableHead>
                <TableHead className="whitespace-nowrap">Série</TableHead>
                <TableHead className="whitespace-nowrap">Fornecedor</TableHead>
                <TableHead className="whitespace-nowrap">Safra</TableHead>
                <TableHead className="whitespace-nowrap">IE Produtor</TableHead>
                <TableHead className="whitespace-nowrap">Data Emissão</TableHead>
                <TableHead className="whitespace-nowrap">Data Entrada</TableHead>
                <TableHead className="whitespace-nowrap text-right">Valor Total</TableHead>
                <TableHead className="whitespace-nowrap">Modo</TableHead>
                <TableHead className="whitespace-nowrap">Status</TableHead>
                <TableHead className="text-right whitespace-nowrap">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={11} className="text-center py-8">Carregando...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={11} className="text-center py-8 text-muted-foreground">Nenhuma entrada encontrada</TableCell></TableRow>
              ) : (
                filtered.map((e: any) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium">{e.numero_nfe || '-'}</TableCell>
                    <TableCell>{e.serie || '-'}</TableCell>
                    <TableCell>{e.fornecedor?.nome || '-'}</TableCell>
                    <TableCell>{e.safra?.nome || '-'}</TableCell>
                    <TableCell>{e.inscricao?.inscricao_estadual ? `IE ${e.inscricao.inscricao_estadual}` : (e.inscricao?.nome || '-')}</TableCell>
                    <TableCell>{e.data_emissao ? new Date(e.data_emissao + 'T00:00:00').toLocaleDateString('pt-BR') : '-'}</TableCell>
                    <TableCell>{e.data_entrada ? new Date(e.data_entrada + 'T00:00:00').toLocaleDateString('pt-BR') : '-'}</TableCell>
                    <TableCell className="text-right">{formatNumber(e.valor_total || 0)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{e.modo_entrada === 'xml' ? 'XML' : 'Manual'}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariants[e.status] || 'secondary'}>{statusLabels[e.status] || e.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        <Button size="icon" variant="ghost" onClick={() => { setEditId(e.id); setFormOpen(true); }}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        {e.status !== 'finalizado' && (
                          <>
                            <Button size="icon" variant="ghost" onClick={() => finalizarMutation.mutate(e.id)} title="Finalizar e dar entrada no estoque">
                              <CheckCircle className="h-4 w-4 text-success" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => setDeleteId(e.id)} title="Excluir">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </>
                        )}
                        {e.status === 'finalizado' && (
                          <Button size="icon" variant="ghost" disabled={estornarMutation.isPending} onClick={() => setEstornarId(e.id)} title="Estornar e reabrir entrada">
                            <Undo2 className="h-4 w-4 text-amber-600" />
                          </Button>
                        )}
                        <Button size="icon" variant="ghost" onClick={() => { setContraNotaModo('contra'); setContraNotaId(e.id); }} title="Emitir Contra-nota de entrada (NF-e do produtor para compra de máquinas/equipamentos)">
                          <FileInput className="h-4 w-4 text-emerald-600" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => { setContraNotaModo('devolucao'); setContraNotaId(e.id); }} title="Emitir NF-e de Devolução de compra">
                          <FileOutput className="h-4 w-4 text-blue-600" />
                        </Button>



                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
          </>
        )}
      </div>




      <ImportarXmlDialog open={xmlOpen} onOpenChange={setXmlOpen} />
      <MdeDialog open={mdeOpen} onOpenChange={setMdeOpen} />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir entrada?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (deleteId) { deleteMutation.mutate(deleteId); setDeleteId(null); } }}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!estornarId} onOpenChange={() => setEstornarId(null)}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>
              Estornar entrada {entradaEstorno?.numero_nfe ? `Nº ${entradaEstorno.numero_nfe}` : ''}?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  O estoque dos itens abaixo será revertido, a entrada voltará para "Pendente" e as contas a pagar sem baixas serão removidas. Contas já pagas serão mantidas.
                </p>
                {(() => {
                  const itens = (entradaEstorno as any)?.itens?.filter((i: any) => i.produto_id && i.vinculado) || [];
                  if (!entradaEstorno) return <p className="text-sm text-muted-foreground">Carregando itens...</p>;
                  if (itens.length === 0) return <p className="text-sm text-amber-600">Nenhum item vinculado a produto será revertido.</p>;
                  return (
                    <div className="rounded-md border max-h-64 overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Produto</TableHead>
                            <TableHead className="text-right">Qtd. a reverter</TableHead>
                            <TableHead>Lote</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {itens.map((it: any) => (
                            <TableRow key={it.id}>
                              <TableCell>{it.produto?.nome || it.descricao || '-'}</TableCell>
                              <TableCell className="text-right">
                                {formatNumber(Number(it.quantidade_conferida ?? it.quantidade ?? 0))}
                              </TableCell>
                              <TableCell>{it.lote || '-'}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  );
                })()}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={!entradaEstorno || estornarMutation.isPending}
              onClick={() => { if (estornarId) { estornarMutation.mutate(estornarId); setEstornarId(null); } }}
            >
              Confirmar Estorno
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </AppLayout>
  );
}
