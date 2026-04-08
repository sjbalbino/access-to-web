import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Search, Download, FileText, Check, X, HelpCircle, FileDown, Loader2, Import } from "lucide-react";
import { useGranjas } from "@/hooks/useGranjas";
import { useMde, type NfeRecebida } from "@/hooks/useMde";
import { formatNumber } from "@/lib/formatters";
import { parseNfeXml } from "@/lib/nfeXmlParser";
import { useCreateEntradaNfe } from "@/hooks/useEntradasNfe";

interface MdeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const manifestacaoLabels: Record<string, string> = {
  ciencia: "Ciência",
  confirmacao: "Confirmada",
  desconhecimento: "Desconhecida",
  nao_realizada: "Não Realizada",
};

const manifestacaoVariants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  ciencia: "outline",
  confirmacao: "default",
  desconhecimento: "destructive",
  nao_realizada: "secondary",
};

export function MdeDialog({ open, onOpenChange }: MdeDialogProps) {
  const [granjaId, setGranjaId] = useState<string>("");
  const { data: granjas } = useGranjas();
  const { isLoading, nfesRecebidas, consultarDestinatarias, manifestar, downloadXml, downloadDanfe } = useMde();
  const createEntrada = useCreateEntradaNfe();
  const [importingChave, setImportingChave] = useState<string | null>(null);

  const handleConsultar = () => {
    if (!granjaId) return;
    consultarDestinatarias(granjaId);
  };

  const handleManifestar = async (chave: string, tipo: string) => {
    if (!granjaId) return;
    const ok = await manifestar(granjaId, chave, tipo);
    if (ok) consultarDestinatarias(granjaId);
  };

  const handleImportar = async (nfe: NfeRecebida) => {
    if (!granjaId) return;
    setImportingChave(nfe.chave);
    try {
      const xmlText = await downloadXml(granjaId, nfe.chave);
      if (!xmlText) return;

      const parsed = parseNfeXml(xmlText);

      const header: Record<string, unknown> = {
        granja_id: granjaId,
        numero_nfe: parsed.numero,
        serie: parsed.serie,
        chave_acesso: nfe.chave,
        data_emissao: parsed.dataEmissao,
        data_entrada: new Date().toISOString().split("T")[0],
        natureza_operacao: parsed.naturezaOperacao,
        valor_produtos: parsed.valorProdutos,
        valor_frete: parsed.valorFrete,
        valor_seguro: parsed.valorSeguro,
        valor_desconto: parsed.valorDesconto,
        valor_outras_despesas: parsed.valorOutrasDespesas,
        valor_ipi: parsed.valorIpi,
        valor_icms: parsed.valorIcms,
        valor_icms_st: parsed.valorIcmsSt,
        valor_pis: parsed.valorPis,
        valor_cofins: parsed.valorCofins,
        valor_total: parsed.valorTotal,
        modo_entrada: "xml",
        status: "pendente",
        xml_content: xmlText,
      };

      const itens = parsed.itens.map((item) => ({
        produto_xml_codigo: item.codigo,
        produto_xml_descricao: item.descricao,
        produto_xml_ncm: item.ncm,
        cfop: item.cfop,
        unidade_medida: item.unidade,
        quantidade: item.quantidade,
        valor_unitario: item.valorUnitario,
        valor_total: item.valorTotal,
        valor_desconto: item.valorDesconto,
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
        vinculado: false,
      }));

      await createEntrada.mutateAsync({ ...header, itens });
    } catch {
      // errors handled inside hooks
    } finally {
      setImportingChave(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manifesto do Destinatário (MD-e)</DialogTitle>
          <DialogDescription>
            Consulte NF-es emitidas contra o CNPJ da granja, manifeste e importe o XML.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap gap-4 items-end mb-4">
          <div className="w-64">
            <label className="text-sm font-medium mb-1 block">Granja</label>
            <Select value={granjaId} onValueChange={setGranjaId}>
              <SelectTrigger><SelectValue placeholder="Selecione a granja" /></SelectTrigger>
              <SelectContent>
                {granjas?.map((g: any) => (
                  <SelectItem key={g.id} value={g.id}>{g.razao_social}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleConsultar} disabled={!granjaId || isLoading}>
            {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
            Consultar SEFAZ
          </Button>
        </div>

        <div className="rounded-lg border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="whitespace-nowrap">Nº NF-e</TableHead>
                <TableHead className="whitespace-nowrap">Emitente</TableHead>
                <TableHead className="whitespace-nowrap">CNPJ</TableHead>
                <TableHead className="whitespace-nowrap">Data Emissão</TableHead>
                <TableHead className="whitespace-nowrap text-right">Valor</TableHead>
                <TableHead className="whitespace-nowrap">Situação</TableHead>
                <TableHead className="whitespace-nowrap">Manifestação</TableHead>
                <TableHead className="text-right whitespace-nowrap">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {nfesRecebidas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    {isLoading ? "Consultando SEFAZ..." : "Selecione uma granja e clique em Consultar"}
                  </TableCell>
                </TableRow>
              ) : (
                nfesRecebidas.map((nfe) => (
                  <TableRow key={nfe.chave}>
                    <TableCell className="font-medium">{nfe.numero || "-"}</TableCell>
                    <TableCell className="max-w-[200px] truncate" title={nfe.nome}>{nfe.nome || "-"}</TableCell>
                    <TableCell>{nfe.cnpj || "-"}</TableCell>
                    <TableCell>
                      {nfe.data_emissao
                        ? new Date(nfe.data_emissao).toLocaleDateString("pt-BR")
                        : "-"}
                    </TableCell>
                    <TableCell className="text-right">{formatNumber(nfe.valor || 0)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{nfe.situacao || "-"}</Badge>
                    </TableCell>
                    <TableCell>
                      {nfe.manifestacao_destinatario ? (
                        <Badge variant={manifestacaoVariants[nfe.manifestacao_destinatario] || "secondary"}>
                          {manifestacaoLabels[nfe.manifestacao_destinatario] || nfe.manifestacao_destinatario}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">Pendente</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="sm" variant="outline" disabled={isLoading}>
                              Manifestar
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleManifestar(nfe.chave, "ciencia")}>
                              <HelpCircle className="h-4 w-4 mr-2" /> Ciência da Operação
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleManifestar(nfe.chave, "confirmacao")}>
                              <Check className="h-4 w-4 mr-2" /> Confirmação da Operação
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleManifestar(nfe.chave, "desconhecimento")}>
                              <X className="h-4 w-4 mr-2" /> Desconhecimento da Operação
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleManifestar(nfe.chave, "nao_realizada")}>
                              <X className="h-4 w-4 mr-2" /> Operação Não Realizada
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>

                        <Button
                          size="icon"
                          variant="ghost"
                          title="Baixar XML"
                          disabled={isLoading}
                          onClick={() => downloadXml(granjaId, nfe.chave)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>

                        <Button
                          size="icon"
                          variant="ghost"
                          title="Baixar DANFe"
                          disabled={isLoading}
                          onClick={() => downloadDanfe(granjaId, nfe.chave)}
                        >
                          <FileText className="h-4 w-4" />
                        </Button>

                        <Button
                          size="sm"
                          variant="default"
                          title="Importar para Entradas NF-e"
                          disabled={isLoading || importingChave === nfe.chave}
                          onClick={() => handleImportar(nfe)}
                        >
                          {importingChave === nfe.chave ? (
                            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                          ) : (
                            <Import className="h-4 w-4 mr-1" />
                          )}
                          Importar
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
