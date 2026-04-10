import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, Upload, FileText, Check, Loader2 } from "lucide-react";
import { useEntradasNfe } from "@/hooks/useEntradasNfe";
import { useNotasFiscais } from "@/hooks/useNotasFiscais";
import { parseNfeXml, NfeParsed } from "@/lib/nfeXmlParser";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatCpfCnpj } from "@/lib/formatters";

export interface ContraNotaData {
  // Source reference
  chaveAcesso: string;
  // Destinatário (emitente da nota original vira destinatário da contra-nota)
  dest_tipo: string;
  dest_cpf_cnpj: string;
  dest_nome: string;
  dest_ie: string;
  dest_email: string;
  dest_logradouro: string;
  dest_numero: string;
  dest_complemento: string;
  dest_bairro: string;
  dest_cidade: string;
  dest_uf: string;
  dest_cep: string;
  // Operação
  natureza_operacao: string;
  finalidade: number;
  operacao: number;
  // Itens
  itens: Array<{
    codigo: string;
    descricao: string;
    ncm: string;
    cfop: string;
    unidade: string;
    quantidade: number;
    valor_unitario: number;
    valor_total: number;
    valor_desconto: number;
    cst_icms: string;
    base_icms: number;
    aliq_icms: number;
    valor_icms: number;
    cst_pis: string;
    base_pis: number;
    aliq_pis: number;
    valor_pis: number;
    cst_cofins: string;
    base_cofins: number;
    aliq_cofins: number;
    valor_cofins: number;
    cst_ipi: string;
    base_ipi: number;
    aliq_ipi: number;
    valor_ipi: number;
  }>;
}

interface ContraNotaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (data: ContraNotaData) => void;
}

function invertCfop(cfop: string): string {
  if (!cfop || cfop.length < 4) return cfop;
  const first = cfop[0];
  // Entrada ↔ Saída: 1↔5, 2↔6, 3↔7
  const map: Record<string, string> = { "1": "5", "5": "1", "2": "6", "6": "2", "3": "7", "7": "3" };
  return (map[first] || first) + cfop.slice(1);
}

export function ContraNotaDialog({ open, onOpenChange, onSelect }: ContraNotaDialogProps) {
  const [tab, setTab] = useState<string>("sistema");
  const [search, setSearch] = useState("");
  const [xmlParsed, setXmlParsed] = useState<NfeParsed | null>(null);
  const [isLoadingXml, setIsLoadingXml] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: entradasNfe = [] } = useEntradasNfe();
  const { notasFiscais } = useNotasFiscais();

  // Combine entradas_nfe (inbound) and notas_fiscais (outbound) for search
  const allNotas = [
    ...entradasNfe.map((e: any) => ({
      id: e.id,
      source: "entrada" as const,
      numero: e.numero_nfe,
      serie: e.serie,
      chave_acesso: e.chave_acesso,
      data_emissao: e.data_emissao,
      fornecedor_nome: e.fornecedor?.nome || "-",
      fornecedor_cpf_cnpj: e.fornecedor?.cpf_cnpj || "",
      valor_total: e.valor_total,
      natureza_operacao: e.natureza_operacao,
      xml_content: e.xml_content,
      status: e.status,
    })),
    ...notasFiscais
      .filter((n) => (n.status === "autorizada" || n.status === "autorizado"))
      .map((n) => ({
        id: n.id,
        source: "nfe_saida" as const,
        numero: String(n.numero || ""),
        serie: String(n.serie || ""),
        chave_acesso: n.chave_acesso,
        data_emissao: n.data_emissao,
        fornecedor_nome: n.dest_nome || "-",
        fornecedor_cpf_cnpj: n.dest_cpf_cnpj || "",
        valor_total: n.total_nota,
        natureza_operacao: n.natureza_operacao,
        xml_content: null as string | null,
        status: n.status,
      })),
  ];

  const filtered = allNotas.filter((n) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      n.numero?.toLowerCase().includes(s) ||
      n.chave_acesso?.toLowerCase().includes(s) ||
      n.fornecedor_nome?.toLowerCase().includes(s) ||
      n.fornecedor_cpf_cnpj?.includes(search)
    );
  }).slice(0, 50);

  const handleSelectFromSystem = (nota: (typeof allNotas)[0]) => {
    // If the nota has XML, parse it for full data
    if (nota.xml_content) {
      try {
        const parsed = parseNfeXml(nota.xml_content);
        onSelect(buildContraNotaFromParsed(parsed));
        onOpenChange(false);
        resetState();
        return;
      } catch (e) {
        // Fall through to manual mapping
      }
    }

    // For NF-e de saída (from notas_fiscais) — use stored data directly
    if (nota.source === "nfe_saida") {
      const nf = notasFiscais.find((n) => n.id === nota.id);
      if (nf) {
        onSelect({
          chaveAcesso: nf.chave_acesso || "",
          dest_tipo: nf.dest_tipo || "1",
          dest_cpf_cnpj: nf.dest_cpf_cnpj || "",
          dest_nome: nf.dest_nome || "",
          dest_ie: nf.dest_ie || "",
          dest_email: nf.dest_email || "",
          dest_logradouro: nf.dest_logradouro || "",
          dest_numero: nf.dest_numero || "",
          dest_complemento: nf.dest_complemento || "",
          dest_bairro: nf.dest_bairro || "",
          dest_cidade: nf.dest_cidade || "",
          dest_uf: nf.dest_uf || "",
          dest_cep: nf.dest_cep || "",
          natureza_operacao: "Devolução de " + (nf.natureza_operacao || "mercadoria"),
          finalidade: 4, // Devolução
          operacao: nf.operacao === 1 ? 0 : 1, // Inverter operação
          itens: [],
        });
        onOpenChange(false);
        resetState();
        return;
      }
    }

    // Fallback for entradas_nfe without XML
    const entry = entradasNfe.find((e: any) => e.id === nota.id);
    if (entry) {
      const fornecedor = (entry as any).fornecedor;
      onSelect({
        chaveAcesso: nota.chave_acesso || "",
        dest_tipo: (fornecedor?.cpf_cnpj || "").replace(/\D/g, "").length > 11 ? "1" : "0",
        dest_cpf_cnpj: fornecedor?.cpf_cnpj || "",
        dest_nome: fornecedor?.nome || "",
        dest_ie: "",
        dest_email: "",
        dest_logradouro: "",
        dest_numero: "",
        dest_complemento: "",
        dest_bairro: "",
        dest_cidade: "",
        dest_uf: "",
        dest_cep: "",
        natureza_operacao: "Devolução de " + (nota.natureza_operacao || "mercadoria"),
        finalidade: 4,
        operacao: 1, // Saída (devolvendo ao fornecedor)
        itens: [],
      });
      onOpenChange(false);
      resetState();
    }
  };

  const handleXmlUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsLoadingXml(true);
    try {
      const text = await file.text();
      const parsed = parseNfeXml(text);
      setXmlParsed(parsed);
      toast.success(`XML interpretado: NF-e ${parsed.numero} - ${parsed.emitente.nome}`);
    } catch (err: any) {
      toast.error(`Erro ao interpretar XML: ${err.message}`);
      setXmlParsed(null);
    } finally {
      setIsLoadingXml(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleConfirmXml = () => {
    if (!xmlParsed) return;
    onSelect(buildContraNotaFromParsed(xmlParsed));
    onOpenChange(false);
    resetState();
  };

  const buildContraNotaFromParsed = (parsed: NfeParsed): ContraNotaData => {
    const emit = parsed.emitente;
    const cpfCnpj = (emit.cnpj || emit.cpf || "").replace(/\D/g, "");
    return {
      chaveAcesso: parsed.chaveAcesso,
      dest_tipo: cpfCnpj.length > 11 ? "1" : "0",
      dest_cpf_cnpj: cpfCnpj,
      dest_nome: emit.nome,
      dest_ie: emit.inscricaoEstadual || "",
      dest_email: "",
      dest_logradouro: emit.logradouro || "",
      dest_numero: emit.numero || "",
      dest_complemento: "",
      dest_bairro: emit.bairro || "",
      dest_cidade: emit.cidade || "",
      dest_uf: emit.uf || "",
      dest_cep: emit.cep || "",
      natureza_operacao: "Devolução de " + (parsed.naturezaOperacao || "mercadoria"),
      finalidade: 4,
      operacao: 1, // Saída (devolução ao fornecedor/emitente original)
      itens: parsed.itens.map((item) => ({
        codigo: item.codigoProduto,
        descricao: item.descricao,
        ncm: item.ncm,
        cfop: invertCfop(item.cfop),
        unidade: item.unidade,
        quantidade: item.quantidade,
        valor_unitario: item.valorUnitario,
        valor_total: item.valorTotal,
        valor_desconto: item.valorDesconto,
        cst_icms: item.cstIcms,
        base_icms: item.baseIcms,
        aliq_icms: item.aliqIcms,
        valor_icms: item.valorIcms,
        cst_pis: item.cstPis,
        base_pis: item.basePis,
        aliq_pis: item.aliqPis,
        valor_pis: item.valorPis,
        cst_cofins: item.cstCofins,
        base_cofins: item.baseCofins,
        aliq_cofins: item.aliqCofins,
        valor_cofins: item.valorCofins,
        cst_ipi: item.cstIpi,
        base_ipi: item.baseIpi,
        aliq_ipi: item.aliqIpi,
        valor_ipi: item.valorIpi,
      })),
    };
  };

  const resetState = () => {
    setSearch("");
    setXmlParsed(null);
    setTab("sistema");
  };

  const formatCurrency = (value: number | null) => {
    if (!value) return "R$ 0,00";
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetState(); onOpenChange(v); }}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Emitir Contra-Nota (Devolução)</DialogTitle>
          <DialogDescription>
            Selecione uma NF-e do sistema ou importe o XML para gerar automaticamente uma contra-nota de devolução.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-full">
            <TabsTrigger value="sistema" className="flex-1">
              <Search className="h-4 w-4 mr-2" />
              Buscar no Sistema
            </TabsTrigger>
            <TabsTrigger value="xml" className="flex-1">
              <Upload className="h-4 w-4 mr-2" />
              Importar XML
            </TabsTrigger>
          </TabsList>

          <TabsContent value="sistema" className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por número, chave de acesso, fornecedor..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="border rounded-lg overflow-hidden max-h-[400px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Número</TableHead>
                    <TableHead>Origem</TableHead>
                    <TableHead>Fornecedor/Dest.</TableHead>
                    <TableHead>Data Emissão</TableHead>
                    <TableHead className="text-right">Valor Total</TableHead>
                    <TableHead className="w-20"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((nota) => (
                    <TableRow key={`${nota.source}-${nota.id}`} className="cursor-pointer hover:bg-muted/50">
                      <TableCell className="font-mono">{nota.numero || "-"}</TableCell>
                      <TableCell>
                        <Badge variant={nota.source === "entrada" ? "outline" : "secondary"}>
                          {nota.source === "entrada" ? "Entrada" : "Saída"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium truncate max-w-[200px]">{nota.fornecedor_nome}</div>
                          <div className="text-xs text-muted-foreground font-mono">
                            {formatCpfCnpj(nota.fornecedor_cpf_cnpj)}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {nota.data_emissao
                          ? format(new Date(nota.data_emissao.split("T")[0] + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR })
                          : "-"}
                      </TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(nota.valor_total)}</TableCell>
                      <TableCell>
                        <Button size="sm" onClick={() => handleSelectFromSystem(nota)}>
                          <Check className="h-4 w-4 mr-1" />
                          Usar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        Nenhuma nota encontrada
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="xml" className="space-y-4">
            <div className="border-2 border-dashed rounded-lg p-8 text-center space-y-4">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground" />
              <div>
                <p className="font-medium">Importe o XML da NF-e</p>
                <p className="text-sm text-muted-foreground">
                  O sistema irá extrair os dados do emitente, itens e valores para preencher a contra-nota.
                </p>
              </div>
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xml"
                  onChange={handleXmlUpload}
                  className="hidden"
                  id="xml-contranota"
                />
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoadingXml}
                >
                  {isLoadingXml ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                  Selecionar arquivo XML
                </Button>
              </div>
            </div>

            {xmlParsed && (
              <div className="border rounded-lg p-4 space-y-3">
                <h4 className="font-semibold text-sm">Dados extraídos do XML</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Número:</span>{" "}
                    <span className="font-medium">{xmlParsed.numero}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Série:</span>{" "}
                    <span className="font-medium">{xmlParsed.serie}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Emitente:</span>{" "}
                    <span className="font-medium">{xmlParsed.emitente.nome}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">CNPJ/CPF:</span>{" "}
                    <span className="font-mono">{formatCpfCnpj(xmlParsed.emitente.cnpj || xmlParsed.emitente.cpf)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Nat. Operação:</span>{" "}
                    <span className="font-medium">{xmlParsed.naturezaOperacao}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Valor Total:</span>{" "}
                    <span className="font-medium">{formatCurrency(xmlParsed.totais.valorTotal)}</span>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">
                  {xmlParsed.itens.length} item(ns) encontrado(s)
                </div>
                <div className="text-xs font-mono text-muted-foreground truncate">
                  Chave: {xmlParsed.chaveAcesso}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => { resetState(); onOpenChange(false); }}>
            Cancelar
          </Button>
          {tab === "xml" && xmlParsed && (
            <Button onClick={handleConfirmXml}>
              <Check className="h-4 w-4 mr-2" />
              Gerar Contra-Nota
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
