import { useState, useEffect } from "react";
import { labelInscricao } from "@/lib/inscricaoLabel";
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

const normalizeCfopCode = (cfop?: string | null) => (cfop || '').replace(/\D/g, '').slice(0, 4);

const toEntradaCfop = (cfop?: string | null) => {
  const codigo = normalizeCfopCode(cfop);
  if (!codigo || codigo.length < 4) return codigo;
  const map: Record<string, string> = { '5': '1', '6': '2', '7': '3' };
  return (map[codigo[0]] || codigo[0]) + codigo.slice(1);
};

const getMostUsedCfop = (cfops: string[]) => {
  const counts = cfops.reduce<Record<string, number>>((acc, cfop) => {
    if (cfop) acc[cfop] = (acc[cfop] || 0) + 1;
    return acc;
  }, {});
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || '';
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
    const { supabase } = await import('@/integrations/supabase/client');
    const { toast } = await import('sonner');
    try {
      const { data: entrada, error } = await supabase
        .from('entradas_nfe')
        .select(`
          *,
          fornecedor:fornecedor_id(id, nome, cpf_cnpj, inscricao_estadual, email, logradouro, numero, complemento, bairro, cidade, uf, cep),
          granja:granja_id(id, tenant_id),
          itens:entradas_nfe_itens(*, produto:produto_id(id, nome, codigo, ncm, cod_fornecedor))
        `)
        .eq('id', entradaId)
        .single();
      if (error || !entrada) {
        toast.error('Erro ao carregar dados da entrada: ' + (error?.message || 'não encontrada'));
        return;
      }
      const e: any = entrada;
      const f: any = e.fornecedor || {};
      const cpfCnpj = (f.cpf_cnpj || '').replace(/\D/g, '');
      const isDevolucao = modo === 'devolucao';
      const itensSrc: any[] = e.itens || [];

      let cfopHeaderCodigo = '';
      if (e.cfop_id) {
        const { data: cfopHeader } = await supabase
          .from('cfops')
          .select('codigo')
          .eq('id', e.cfop_id)
          .maybeSingle();
        cfopHeaderCodigo = toEntradaCfop((cfopHeader as any)?.codigo);
      }

      const itemCfopsEntrada = itensSrc.map((it) => toEntradaCfop(it.cfop || cfopHeaderCodigo));
      const cfopNotaCodigo = getMostUsedCfop(itemCfopsEntrada) || cfopHeaderCodigo;
      let cfopNota: any = null;
      if (cfopNotaCodigo) {
        const { data: cfopsEntrada } = await supabase
          .from('cfops')
          .select('id, codigo, natureza_operacao')
          .eq('codigo', cfopNotaCodigo)
          .eq('tipo', 'entrada')
          .limit(1);
        cfopNota = cfopsEntrada?.[0] || null;

        if (!cfopNota) {
          const { data: cfopsFallback } = await supabase
            .from('cfops')
            .select('id, codigo, natureza_operacao')
            .eq('codigo', cfopNotaCodigo)
            .limit(1);
          cfopNota = cfopsFallback?.[0] || null;
        }
      }

      const totals = itensSrc.reduce((acc, it) => {
        acc.totalProdutos += Number(it.valor_total || 0);
        acc.totalIcms += Number(it.valor_icms || 0);
        acc.totalPis += Number(it.valor_pis || 0);
        acc.totalCofins += Number(it.valor_cofins || 0);
        return acc;
      }, { totalProdutos: 0, totalIcms: 0, totalPis: 0, totalCofins: 0 });
      const totalNota = totals.totalProdutos;

      // Inscrição do produtor (destinatário da entrada) vira EMITENTE da contra-nota
      let emitenteId: string | null = null;
      if (e.inscricao_produtor_id) {
        const { data: insc } = await supabase
          .from('inscricoes_produtor')
          .select('emitente_id')
          .eq('id', e.inscricao_produtor_id)
          .maybeSingle();
        emitenteId = (insc as any)?.emitente_id || null;
      }

      const notaInsert: any = {
        tenant_id: e.granja?.tenant_id || null,
        granja_id: e.granja_id || null,
        inscricao_produtor_id: e.inscricao_produtor_id || null,
        emitente_id: emitenteId,
        status: 'rascunho',
        operacao: 0,
        finalidade: isDevolucao ? 4 : 1,
        cfop_id: cfopNota?.id || null,
        natureza_operacao: (isDevolucao
          ? 'Devolução de ' + (e.natureza_operacao || 'mercadoria')
          : 'Contra-nota de entrada - ' + (e.natureza_operacao || 'compra')
        ).slice(0, 60),
        data_emissao: new Date().toISOString().slice(0, 10),
        dest_tipo: cpfCnpj.length > 11 ? '1' : '0',
        dest_cpf_cnpj: cpfCnpj,
        dest_nome: f.nome || '',
        dest_ie: (f.inscricao_estadual || '').replace(/\D/g, ''),
        dest_email: f.email || '',
        dest_logradouro: f.logradouro || '',
        dest_numero: f.numero || '',
        dest_complemento: f.complemento || '',
        dest_bairro: f.bairro || '',
        dest_cidade: f.cidade || '',
        dest_uf: f.uf || '',
        dest_cep: (f.cep || '').replace(/\D/g, ''),
        total_produtos: totals.totalProdutos,
        total_nota: totalNota,
        total_icms: totals.totalIcms,
        total_pis: totals.totalPis,
        total_cofins: totals.totalCofins,
        valor_pagamento: totalNota,
      };

      const { data: novaNota, error: errNota } = await supabase
        .from('notas_fiscais')
        .insert(notaInsert)
        .select()
        .single();
      if (errNota || !novaNota) {
        toast.error('Erro ao criar NF-e: ' + (errNota?.message || 'desconhecido'));
        return;
      }

      if (itensSrc.length > 0) {
        const itensInsert = itensSrc.map((it: any, idx: number) => ({
          nota_fiscal_id: novaNota.id,
          numero_item: idx + 1,
          produto_id: it.produto?.id || null,
          codigo: it.produto?.codigo || it.produto_xml_codigo || '',
          descricao: it.produto?.nome || it.produto_xml_descricao || '',
          ncm: it.produto?.ncm || it.produto_xml_ncm || '',
          cfop: itemCfopsEntrada[idx] || cfopNotaCodigo || '',
          unidade: it.unidade_medida || '',
          quantidade: Number(it.quantidade || 0),
          valor_unitario: Number(it.valor_unitario || 0),
          valor_total: Number(it.valor_total || 0),
          valor_desconto: Number(it.valor_desconto || 0),
          origem: 0,
          cst_icms: it.cst_icms || null, base_icms: Number(it.base_icms || 0), aliq_icms: Number(it.aliq_icms || 0), valor_icms: Number(it.valor_icms || 0),
          cst_pis: it.cst_pis || null, base_pis: Number(it.base_pis || 0), aliq_pis: Number(it.aliq_pis || 0), valor_pis: Number(it.valor_pis || 0),
          cst_cofins: it.cst_cofins || null, base_cofins: Number(it.base_cofins || 0), aliq_cofins: Number(it.aliq_cofins || 0), valor_cofins: Number(it.valor_cofins || 0),
          cst_ipi: it.cst_ipi || null, base_ipi: Number(it.base_ipi || 0), aliq_ipi: Number(it.aliq_ipi || 0), valor_ipi: Number(it.valor_ipi || 0),
        }));
        const { error: errItens } = await supabase.from('notas_fiscais_itens').insert(itensInsert);
        if (errItens) {
          toast.error('NF-e criada, mas falhou ao gravar itens: ' + errItens.message);
        }
      }

      const chave = (e.chave_acesso || '').replace(/\D/g, '');
      if (chave.length === 44) {
        await supabase.from('notas_fiscais_referenciadas').insert({
          nota_fiscal_id: novaNota.id,
          tipo: 'nfe',
          chave_nfe: chave,
        });
      }

      toast.success(`${isDevolucao ? 'Devolução' : 'Contra-nota'} gerada com sucesso!`);
      navigate(`/notas-fiscais/${novaNota.id}`);
    } catch (err: any) {
      toast.error('Erro: ' + (err?.message || String(err)));
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
    label: labelInscricao(i) || `${i.nome || ''} (IE: ${i.inscricao_estadual || '-'})`.trim(),
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
                      {e.contra_nota && (
                        <button
                          type="button"
                          onClick={() => navigate(`/notas-fiscais/${e.contra_nota.id}`)}
                          className="ml-1 inline-flex items-center rounded border border-emerald-300 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 hover:bg-emerald-100"
                          title="Ver contra-nota emitida"
                        >
                          CN nº {e.contra_nota.numero}
                        </button>
                      )}
                      {e.devolucao_nota && (
                        <button
                          type="button"
                          onClick={() => navigate(`/notas-fiscais/${e.devolucao_nota.id}`)}
                          className="ml-1 inline-flex items-center rounded border border-blue-300 bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-700 hover:bg-blue-100"
                          title="Ver devolução emitida"
                        >
                          Dev nº {e.devolucao_nota.numero}
                        </button>
                      )}
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
                        <Button
                          size="icon"
                          variant="ghost"
                          disabled={gerandoContraNota || !!e.contra_nota}
                          onClick={() => e.contra_nota ? navigate(`/notas-fiscais/${e.contra_nota.id}`) : handleGerarContraNota(e.id, 'contra')}
                          title={e.contra_nota ? `Contra-nota já emitida (NF-e nº ${e.contra_nota.numero}) — clique no selo para abrir` : 'Emitir Contra-nota de entrada (NF-e do produtor para compra de máquinas/equipamentos)'}
                        >
                          <FileInput className={`h-4 w-4 ${e.contra_nota ? 'text-muted-foreground' : 'text-emerald-600'}`} />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          disabled={gerandoContraNota || !!e.devolucao_nota}
                          onClick={() => e.devolucao_nota ? navigate(`/notas-fiscais/${e.devolucao_nota.id}`) : handleGerarContraNota(e.id, 'devolucao')}
                          title={e.devolucao_nota ? `Devolução já emitida (NF-e nº ${e.devolucao_nota.numero})` : 'Emitir NF-e de Devolução de compra'}
                        >
                          <FileOutput className={`h-4 w-4 ${e.devolucao_nota ? 'text-muted-foreground' : 'text-blue-600'}`} />
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
