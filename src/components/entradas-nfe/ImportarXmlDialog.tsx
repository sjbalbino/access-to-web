import { useState, useRef, useMemo, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useGranjas } from "@/hooks/useGranjas";
import { useClientesFornecedores } from "@/hooks/useClientesFornecedores";
import { useProdutos } from "@/hooks/useProdutos";
import { useCfops } from "@/hooks/useCfops";
import { useCreateEntradaNfe } from "@/hooks/useEntradasNfe";
import { useInscricoesCompletas } from "@/hooks/useInscricoesCompletas";
import { useSafras } from "@/hooks/useSafras";
import { useContasBancarias } from "@/hooks/useContasBancarias";
import { parseNfeXml, NfeParsed } from "@/lib/nfeXmlParser";
import { toast } from "sonner";
import { Upload, CheckCircle2, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ParsedFile {
  fileName: string;
  nfe: NfeParsed | null;
  error?: string;
  fornecedorId?: string;
}

const FORMAS = [
  { value: 'pix', label: 'PIX' },
  { value: 'dinheiro', label: 'Dinheiro' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'boleto', label: 'Boleto' },
  { value: 'cartao', label: 'Cartão' },
  { value: 'prazo', label: 'A prazo' },
  { value: 'outro', label: 'Outro' },
];
const FORMAS_AVISTA = ['pix', 'dinheiro', 'cheque', 'cartao'];

export function ImportarXmlDialog({ open, onOpenChange }: Props) {
  const [granjaId, setGranjaId] = useState<string | undefined>(undefined);
  const [inscricaoId, setInscricaoId] = useState<string | undefined>(undefined);
  const [safraId, setSafraId] = useState<string | undefined>(undefined);
  const [formaPagamento, setFormaPagamento] = useState<string | undefined>(undefined);
  const [contaBancariaId, setContaBancariaId] = useState<string | undefined>(undefined);
  const [jaPago, setJaPago] = useState(false);
  const [numeroCheque, setNumeroCheque] = useState('');
  const [parsedFiles, setParsedFiles] = useState<ParsedFile[]>([]);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: granjas } = useGranjas();
  const { data: clientes } = useClientesFornecedores();
  const { data: produtos } = useProdutos();
  const { cfops } = useCfops();
  const { data: inscricoes } = useInscricoesCompletas();
  const { data: safras } = useSafras();
  const { data: contasBancarias } = useContasBancarias({ ativo: true });
  const createMutation = useCreateEntradaNfe();

  const inscricoesFiltradas = useMemo(() => {
    if (!granjaId) return [];
    return (inscricoes || []).filter((i) => i.granja_id === granjaId && i.ativa);
  }, [inscricoes, granjaId]);

  // Pré-seleciona IE principal quando granja muda
  useEffect(() => {
    if (!granjaId) { setInscricaoId(undefined); return; }
    const principal = (inscricoes || []).find(
      (i: any) => i.granja_id === granjaId && i.ativa && i.is_emitente_principal
    );
    setInscricaoId(principal?.id);
  }, [granjaId, inscricoes]);

  const isAvista = formaPagamento && FORMAS_AVISTA.includes(formaPagamento);

  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const results: ParsedFile[] = [];
    let processed = 0;
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const xml = ev.target?.result as string;
        try {
          const nfe = parseNfeXml(xml);
          const cnpjEmitente = (nfe.emitente.cnpj || nfe.emitente.cpf || '').replace(/\D/g, '');
          const fornecedor = clientes?.find((c: any) => {
            const cfDoc = (c.cpf_cnpj || '').replace(/\D/g, '');
            return cfDoc && cfDoc === cnpjEmitente;
          });
          results.push({ fileName: file.name, nfe, fornecedorId: fornecedor?.id });
        } catch (err: any) {
          results.push({ fileName: file.name, nfe: null, error: err.message });
        }
        processed++;
        if (processed === files.length) setParsedFiles(results);
      };
      reader.readAsText(file);
    });
  };

  const vincularProdutos = (nfe: NfeParsed) => nfe.itens.map((item) => {
    const prodByCod = produtos?.find((p: any) => p.cod_fornecedor && p.cod_fornecedor === item.codigoProduto);
    const prodByNcm = !prodByCod ? produtos?.find((p: any) => p.ncm && p.ncm === item.ncm) : null;
    const prod = prodByCod || prodByNcm;
    return {
      produto_id: prod?.id || null,
      produto_xml_codigo: item.codigoProduto,
      produto_xml_descricao: item.descricao,
      produto_xml_ncm: item.ncm,
      cfop: item.cfop,
      unidade_medida: item.unidade,
      quantidade: item.quantidade,
      valor_unitario: item.valorUnitario,
      valor_total: item.valorTotal,
      valor_desconto: item.valorDesconto,
      valor_frete_rateio: item.valorFreteRateio,
      cst_icms: item.cstIcms, base_icms: item.baseIcms, aliq_icms: item.aliqIcms, valor_icms: item.valorIcms,
      cst_ipi: item.cstIpi, base_ipi: item.baseIpi, aliq_ipi: item.aliqIpi, valor_ipi: item.valorIpi,
      cst_pis: item.cstPis, base_pis: item.basePis, aliq_pis: item.aliqPis, valor_pis: item.valorPis,
      cst_cofins: item.cstCofins, base_cofins: item.baseCofins, aliq_cofins: item.aliqCofins, valor_cofins: item.valorCofins,
      vinculado: !!prod,
    };
  });

  const resetAll = () => {
    setParsedFiles([]);
    setGranjaId(undefined); setInscricaoId(undefined); setSafraId(undefined);
    setFormaPagamento(undefined); setContaBancariaId(undefined); setJaPago(false); setNumeroCheque('');
  };

  const handleImportar = async () => {
    if (!granjaId) return toast.error('Selecione uma granja.');
    if (!inscricaoId) return toast.error('Selecione a inscrição do produtor.');
    if (!safraId) return toast.error('Selecione a safra.');
    if (!formaPagamento) return toast.error('Selecione a forma de pagamento.');
    if (formaPagamento === 'cheque' && !numeroCheque.trim()) return toast.error('Informe o número do cheque.');
    const validFiles = parsedFiles.filter((f) => f.nfe);
    if (!validFiles.length) return toast.error('Nenhum XML válido para importar.');

    setImporting(true);
    let success = 0;
    for (const pf of validFiles) {
      const nfe = pf.nfe!;
      try {
        const itens = vincularProdutos(nfe);
        // Deriva CFOP do cabeçalho a partir do CFOP mais frequente nos itens
        const cfopCounts: Record<string, number> = {};
        itens.forEach((it: any) => {
          const c = (it.cfop || '').toString().trim();
          if (c) cfopCounts[c] = (cfopCounts[c] || 0) + 1;
        });
        const cfopMaisUsado = Object.entries(cfopCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
        const cfopHeader = cfopMaisUsado
          ? (cfops || []).find((c: any) => String(c.codigo) === cfopMaisUsado && c.tipo === 'entrada')
          : null;

        await createMutation.mutateAsync({
          granja_id: granjaId,
          inscricao_produtor_id: inscricaoId,
          safra_id: safraId,
          forma_pagamento: formaPagamento,
          conta_bancaria_id: isAvista ? (contaBancariaId || null) : null,
          fornecedor_id: pf.fornecedorId || null,
          numero_nfe: nfe.numero,
          serie: nfe.serie,
          chave_acesso: nfe.chaveAcesso,
          data_emissao: nfe.dataEmissao || null,
          cfop_id: cfopHeader?.id || null,
          natureza_operacao: nfe.naturezaOperacao,
          valor_produtos: nfe.totais.valorProdutos,
          valor_frete: nfe.totais.valorFrete,
          valor_seguro: nfe.totais.valorSeguro,
          valor_desconto: nfe.totais.valorDesconto,
          valor_outras_despesas: nfe.totais.valorOutrasDespesas,
          valor_ipi: nfe.totais.valorIpi,
          valor_icms: nfe.totais.valorIcms,
          valor_icms_st: nfe.totais.valorIcmsSt,
          valor_pis: nfe.totais.valorPis,
          valor_cofins: nfe.totais.valorCofins,
          valor_total: nfe.totais.valorTotal,
          modo_entrada: 'xml',
          xml_content: nfe.xmlContent,
          itens,
          _duplicatas: nfe.duplicatas,
          _pagamento: {
            forma_pagamento: formaPagamento,
            conta_bancaria_id: isAvista ? (contaBancariaId || null) : null,
            ja_pago: jaPago && !!isAvista,
          },
        });
        success++;
      } catch (err: any) {
        console.error('Erro ao importar NF-e:', nfe.numero, err);
      }
    }
    setImporting(false);
    toast.success(`${success} de ${validFiles.length} NF-e(s) importada(s)!`);
    resetAll();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!importing) { if (!v) resetAll(); onOpenChange(v); } }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importar XML de NF-e</DialogTitle>
          <DialogDescription>
            Selecione os arquivos XML. O sistema gera Contas a Pagar automaticamente
            (das duplicatas do XML, ou parcela única se à vista).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label>Granja *</Label>
              <Select isSearchable value={granjaId} onValueChange={setGranjaId}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {granjas?.map((g: any) => (<SelectItem key={g.id} value={g.id}>{g.razao_social}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>IE do Produtor *</Label>
              <Select isSearchable value={inscricaoId} onValueChange={setInscricaoId} disabled={!granjaId}>
                <SelectTrigger><SelectValue placeholder={granjaId ? 'Selecione...' : 'Escolha granja'} /></SelectTrigger>
                <SelectContent>
                  {inscricoesFiltradas.map((i) => (
                    <SelectItem key={i.id} value={i.id}>
                      {(i.inscricao_estadual || i.cpf_cnpj || '—').toUpperCase()} {i.nome ? `— ${i.nome.toUpperCase()}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Safra *</Label>
              <Select isSearchable value={safraId} onValueChange={setSafraId}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {safras?.map((s: any) => (<SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Forma de Pagamento *</Label>
              <Select isSearchable value={formaPagamento} onValueChange={(v) => { setFormaPagamento(v); setJaPago(false); }}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {FORMAS.map((f) => (<SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            {isAvista && (
              <div>
                <Label>Conta Bancária</Label>
                <Select isSearchable value={contaBancariaId} onValueChange={setContaBancariaId}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {(contasBancarias || []).map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {isAvista && (
              <div className="flex items-end">
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={jaPago} onCheckedChange={(v) => setJaPago(!!v)} />
                  Já está pago (gerar baixa automática)
                </label>
              </div>
            )}
          </div>

          <div className="border-2 border-dashed rounded-lg p-6 text-center">
            <input ref={fileRef} type="file" accept=".xml" multiple className="hidden" onChange={handleFilesSelected} />
            <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground mb-2">Selecione um ou mais arquivos XML</p>
            <Button variant="outline" onClick={() => fileRef.current?.click()}>Selecionar Arquivos</Button>
          </div>

          {parsedFiles.length > 0 && (
            <ScrollArea className="max-h-60">
              <div className="space-y-2">
                {parsedFiles.map((pf, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 border rounded-lg">
                    {pf.error ? <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" />
                              : <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{pf.fileName}</p>
                      {pf.nfe ? (
                        <p className="text-xs text-muted-foreground">
                          NF-e {pf.nfe.numero} | {pf.nfe.emitente.nome} | {pf.nfe.itens.length} itens
                          {pf.nfe.duplicatas.length > 0 && (
                            <Badge variant="outline" className="ml-2 text-xs">{pf.nfe.duplicatas.length} duplicata(s)</Badge>
                          )}
                          {pf.fornecedorId && <Badge variant="outline" className="ml-2 text-xs">Fornecedor vinculado</Badge>}
                        </p>
                      ) : (
                        <p className="text-xs text-destructive">{pf.error}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => { resetAll(); onOpenChange(false); }} disabled={importing}>Cancelar</Button>
            <Button onClick={handleImportar} disabled={importing || !parsedFiles.some((f) => f.nfe)}>
              {importing ? 'Importando...' : `Importar ${parsedFiles.filter((f) => f.nfe).length} NF-e(s)`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
