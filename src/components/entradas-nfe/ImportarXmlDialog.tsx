import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useGranjas } from "@/hooks/useGranjas";
import { useClientesFornecedores } from "@/hooks/useClientesFornecedores";
import { useProdutos } from "@/hooks/useProdutos";
import { useCreateEntradaNfe } from "@/hooks/useEntradasNfe";
import { parseNfeXml, NfeParsed } from "@/lib/nfeXmlParser";
import { toast } from "sonner";
import { Upload, FileText, CheckCircle2, AlertCircle } from "lucide-react";
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

export function ImportarXmlDialog({ open, onOpenChange }: Props) {
  const [granjaId, setGranjaId] = useState('');
  const [parsedFiles, setParsedFiles] = useState<ParsedFile[]>([]);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: granjas } = useGranjas();
  const { data: clientes } = useClientesFornecedores();
  const { data: produtos } = useProdutos();
  const createMutation = useCreateEntradaNfe();

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
          // Tentar encontrar fornecedor pelo CNPJ/CPF
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
        if (processed === files.length) {
          setParsedFiles(results);
        }
      };
      reader.readAsText(file);
    });
  };

  const vincularProdutos = (nfe: NfeParsed) => {
    return nfe.itens.map((item) => {
      // Tentar vincular por cod_fornecedor ou NCM
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
        cst_icms: item.cstIcms,
        base_icms: item.baseIcms,
        aliq_icms: item.aliqIcms,
        valor_icms: item.valorIcms,
        cst_ipi: item.cstIpi,
        base_ipi: item.baseIpi,
        aliq_ipi: item.aliqIpi,
        valor_ipi: item.valorIpi,
        cst_pis: item.cstPis,
        base_pis: item.basePis,
        aliq_pis: item.aliqPis,
        valor_pis: item.valorPis,
        cst_cofins: item.cstCofins,
        base_cofins: item.baseCofins,
        aliq_cofins: item.aliqCofins,
        valor_cofins: item.valorCofins,
        vinculado: !!prod,
      };
    });
  };

  const handleImportar = async () => {
    if (!granjaId) {
      toast.error('Selecione uma granja.');
      return;
    }
    const validFiles = parsedFiles.filter((f) => f.nfe);
    if (!validFiles.length) {
      toast.error('Nenhum XML válido para importar.');
      return;
    }

    setImporting(true);
    let success = 0;
    for (const pf of validFiles) {
      const nfe = pf.nfe!;
      try {
        const itens = vincularProdutos(nfe);
        await createMutation.mutateAsync({
          granja_id: granjaId,
          fornecedor_id: pf.fornecedorId || null,
          numero_nfe: nfe.numero,
          serie: nfe.serie,
          chave_acesso: nfe.chaveAcesso,
          data_emissao: nfe.dataEmissao || null,
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
        });
        success++;
      } catch (err: any) {
        console.error('Erro ao importar NF-e:', nfe.numero, err);
      }
    }
    setImporting(false);
    toast.success(`${success} de ${validFiles.length} NF-e(s) importada(s) com sucesso!`);
    setParsedFiles([]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!importing) { setParsedFiles([]); onOpenChange(v); } }}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Importar XML de NF-e</DialogTitle>
          <DialogDescription>Selecione os arquivos XML das notas fiscais de compra para importar.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Granja *</label>
            <Select value={granjaId} onValueChange={setGranjaId}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {granjas?.map((g: any) => (
                  <SelectItem key={g.id} value={g.id}>{g.razao_social}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="border-2 border-dashed rounded-lg p-6 text-center">
            <input ref={fileRef} type="file" accept=".xml" multiple className="hidden" onChange={handleFilesSelected} />
            <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground mb-2">Arraste arquivos XML ou clique para selecionar</p>
            <Button variant="outline" onClick={() => fileRef.current?.click()}>Selecionar Arquivos</Button>
          </div>

          {parsedFiles.length > 0 && (
            <ScrollArea className="max-h-60">
              <div className="space-y-2">
                {parsedFiles.map((pf, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 border rounded-lg">
                    {pf.error ? (
                      <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" />
                    ) : (
                      <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{pf.fileName}</p>
                      {pf.nfe ? (
                        <p className="text-xs text-muted-foreground">
                          NF-e {pf.nfe.numero} | {pf.nfe.emitente.nome} | {pf.nfe.itens.length} itens
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
            <Button variant="outline" onClick={() => { setParsedFiles([]); onOpenChange(false); }} disabled={importing}>Cancelar</Button>
            <Button onClick={handleImportar} disabled={importing || !parsedFiles.some((f) => f.nfe)}>
              {importing ? 'Importando...' : `Importar ${parsedFiles.filter((f) => f.nfe).length} NF-e(s)`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
