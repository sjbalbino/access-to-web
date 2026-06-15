import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Search, Download, FileText, Check, X, HelpCircle, Loader2, Import, Globe } from "lucide-react";
import { useInscricoesCompletas } from "@/hooks/useInscricoesCompletas";
import { useMde, type NfeRecebida } from "@/hooks/useMde";
import { formatNumber } from "@/lib/formatters";
import { parseNfeXml } from "@/lib/nfeXmlParser";
import { useCreateEntradaNfe } from "@/hooks/useEntradasNfe";
import { supabase } from "@/integrations/supabase/client";

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

function formatCpfCnpj(value?: string | null) {
  if (!value) return "";
  const v = value.replace(/\D/g, "");
  if (v.length === 14) return v.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
  if (v.length === 11) return v.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4");
  return v;
}

export function MdeDialog({ open, onOpenChange }: MdeDialogProps) {
  const [inscricaoId, setInscricaoId] = useState<string>("");
  const { data: inscricoes } = useInscricoesCompletas();
  const { isLoading, nfesRecebidas, consultarDestinatarias, manifestar, downloadXml, downloadDanfe } = useMde();
  const createEntrada = useCreateEntradaNfe();
  const [importingChave, setImportingChave] = useState<string | null>(null);

  const inscricoesEmissoras = useMemo(() => {
    return (inscricoes || []).filter((i: any) => {
      if (!i.ativa || !i.emitente_id) return false;
      const len = (i.cpf_cnpj || "").replace(/\D/g, "").length;
      return len === 11 || len === 14;
    });
  }, [inscricoes]);

  const inscricaoSelecionada = useMemo(
    () => inscricoesEmissoras.find((i: any) => i.id === inscricaoId),
    [inscricoesEmissoras, inscricaoId]
  );

  const handleConsultar = () => {
    if (!inscricaoId) return;
    consultarDestinatarias(inscricaoId);
  };

  const handleManifestar = async (chave: string, tipo: string) => {
    if (!inscricaoId) return;
    const ok = await manifestar(inscricaoId, chave, tipo);
    if (ok) consultarDestinatarias(inscricaoId);
  };

  const handleImportar = async (nfe: NfeRecebida) => {
    if (!inscricaoId) return;
    setImportingChave(nfe.chave);
    try {
      const xmlText = await downloadXml(inscricaoId, nfe.chave);
      if (!xmlText) return;

      const parsed = parseNfeXml(xmlText);

      // 1. Buscar granja_id e tenant_id a partir da inscrição
      const { data: insc } = await supabase
        .from("inscricoes_produtor")
        .select("granja_id, granjas(tenant_id)")
        .eq("id", inscricaoId)
        .maybeSingle();

      const granjaId = insc?.granja_id;
      const tenantId = (insc?.granjas as any)?.tenant_id;

      if (!granjaId || !tenantId) {
        throw new Error("Inscrição sem granja ou empresa contratante vinculada.");
      }

      // 2. Buscar ou Criar Fornecedor
      const cnpjCpf = (parsed.emitente.cnpj || parsed.emitente.cpf || "").replace(/\D/g, "");
      let fornecedorId = null;

      if (cnpjCpf) {
        const { data: fornecedores } = await supabase
          .from("clientes_fornecedores")
          .select("id")
          .or(`cpf_cnpj.eq.${cnpjCpf},cpf_cnpj.eq.${formatCpfCnpj(cnpjCpf)}`)
          .maybeSingle();

        if (fornecedores) {
          fornecedorId = fornecedores.id;
        } else {
          // Criar fornecedor
          const { data: novoFornecedor, error: createError } = await supabase
            .from("clientes_fornecedores")
            .insert({
              nome: parsed.emitente.nome,
              cpf_cnpj: cnpjCpf,
              inscricao_estadual: parsed.emitente.inscricaoEstadual,
              logradouro: parsed.emitente.logradouro,
              numero: parsed.emitente.numero,
              bairro: parsed.emitente.bairro,
              cidade: parsed.emitente.cidade,
              uf: parsed.emitente.uf,
              cep: parsed.emitente.cep,
              ativo: true,
              tenant_id: tenantId,
              tipo: 'fornecedor'
            })
            .select("id")
            .single();
          
          if (!createError && novoFornecedor) {
            fornecedorId = novoFornecedor.id;
          }
        }
      }

      const header: Record<string, unknown> = {
        granja_id: granjaId,
        inscricao_produtor_id: inscricaoId,
        fornecedor_id: fornecedorId,
        numero_nfe: parsed.numero,
        serie: parsed.serie,
        chave_acesso: nfe.chave,
        data_emissao: parsed.dataEmissao,
        data_entrada: new Date().toISOString().split("T")[0],
        natureza_operacao: parsed.naturezaOperacao,
        valor_produtos: parsed.totais.valorProdutos,
        valor_frete: parsed.totais.valorFrete,
        valor_seguro: parsed.totais.valorSeguro,
        valor_desconto: parsed.totais.valorDesconto,
        valor_outras_despesas: parsed.totais.valorOutrasDespesas,
        valor_ipi: parsed.totais.valorIpi,
        valor_icms: parsed.totais.valorIcms,
        valor_icms_st: parsed.totais.valorIcmsSt,
        valor_pis: parsed.totais.valorPis,
        valor_cofins: parsed.totais.valorCofins,
        valor_total: parsed.totais.valorTotal,
        modo_entrada: "xml",
        status: "pendente",
        xml_content: xmlText,
        _duplicatas: parsed.duplicatas,
      };

      // 3. Preparar itens e tentar auto-vincular produtos
      const itens = await Promise.all(parsed.itens.map(async (item) => {
        const { data: existingProd } = await supabase
          .from("produtos")
          .select("id")
          .or(`cod_fornecedor.eq.${item.codigoProduto},nome.ilike.${item.descricao}`)
          .eq('ativo', true)
          .maybeSingle();

        return {
          produto_id: existingProd?.id || null,
          produto_xml_codigo: item.codigoProduto,
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
          vinculado: !!existingProd?.id,
        };
      }));

      await createEntrada.mutateAsync({ ...header, itens });
    } catch (error) {
      console.error("Erro ao importar NF-e:", error);
    } finally {
      setImportingChave(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <Globe className="h-6 w-6 text-blue-600" />
            NF-es Recebidas (DFe)
          </DialogTitle>
          <DialogDescription>
            Notas fiscais emitidas contra o CNPJ desta empresa e manifestação do destinatário.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6 mt-4">
          <div className="bg-white p-4 rounded-lg border shadow-sm flex flex-col items-center justify-center text-center">
            <span className="text-sm text-muted-foreground uppercase font-semibold">Total</span>
            <span className="text-3xl font-bold mt-1">{nfesRecebidas.length}</span>
          </div>
          <div className="bg-white p-4 rounded-lg border shadow-sm flex flex-col items-center justify-center text-center border-l-4 border-l-amber-500">
            <span className="text-sm text-amber-600 uppercase font-semibold">Sem manifestação</span>
            <span className="text-3xl font-bold mt-1 text-amber-600">
              {nfesRecebidas.filter(n => !n.manifestacao_destinatario).length}
            </span>
          </div>
          <div className="bg-white p-4 rounded-lg border shadow-sm flex flex-col items-center justify-center text-center border-l-4 border-l-blue-500">
            <span className="text-sm text-blue-600 uppercase font-semibold">Ciência</span>
            <span className="text-3xl font-bold mt-1 text-blue-600">
              {nfesRecebidas.filter(n => n.manifestacao_destinatario === "ciencia").length}
            </span>
          </div>
          <div className="bg-white p-4 rounded-lg border shadow-sm flex flex-col items-center justify-center text-center border-l-4 border-l-green-500">
            <span className="text-sm text-green-600 uppercase font-semibold">Confirmadas</span>
            <span className="text-3xl font-bold mt-1 text-green-600">
              {nfesRecebidas.filter(n => n.manifestacao_destinatario === "confirmacao").length}
            </span>
          </div>
          <div className="bg-white p-4 rounded-lg border shadow-sm flex flex-col items-center justify-center text-center border-l-4 border-l-orange-500">
            <span className="text-sm text-orange-600 uppercase font-semibold">Desconhecidas</span>
            <span className="text-3xl font-bold mt-1 text-orange-600">
              {nfesRecebidas.filter(n => n.manifestacao_destinatario === "desconhecimento").length}
            </span>
          </div>
          <div className="bg-white p-4 rounded-lg border shadow-sm flex flex-col items-center justify-center text-center border-l-4 border-l-red-500">
            <span className="text-sm text-red-600 uppercase font-semibold">Não realizadas</span>
            <span className="text-3xl font-bold mt-1 text-red-600">
              {nfesRecebidas.filter(n => n.manifestacao_destinatario === "nao_realizada").length}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 items-end mb-6 bg-slate-50 p-6 rounded-lg border">
          <div className="flex-1 min-w-[300px]">
            <label className="text-sm font-medium mb-1.5 block">Inscrição do Produtor (CNPJ Destinatário)</label>
            <Select isSearchable value={inscricaoId || undefined} onValueChange={setInscricaoId}>
              <SelectTrigger className="bg-white h-11">
                <SelectValue placeholder="Selecione a inscrição para consultar" />
              </SelectTrigger>
              <SelectContent>
                {inscricoesEmissoras.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-muted-foreground">
                    Nenhuma inscrição com emitente NF-e configurado.
                  </div>
                ) : (
                  inscricoesEmissoras.map((i: any) => (
                    <SelectItem key={i.id} value={i.id}>
                      {(i.nome || "").toUpperCase()} — {formatCpfCnpj(i.cpf_cnpj)}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {inscricaoSelecionada?.granjas?.razao_social && (
              <p className="text-xs text-muted-foreground mt-1.5 ml-1">
                Granja vinculada: <span className="font-medium">{inscricaoSelecionada.granjas.razao_social}</span>
              </p>
            )}
          </div>
          <Button 
            onClick={handleConsultar} 
            disabled={!inscricaoId || isLoading} 
            className="bg-blue-600 hover:bg-blue-700 h-11 px-8 font-semibold shadow-md"
          >
            {isLoading ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <Search className="h-5 w-5 mr-2" />}
            Sincronizar DFe
          </Button>
        </div>

        <div className="rounded-xl border shadow-sm overflow-hidden">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow className="hover:bg-slate-50 border-b-2">
                <TableHead className="whitespace-nowrap font-bold text-slate-700 py-4 px-6">Emitente</TableHead>
                <TableHead className="whitespace-nowrap font-bold text-slate-700 py-4 px-6">Nº / Série</TableHead>
                <TableHead className="whitespace-nowrap font-bold text-slate-700 py-4 px-6 text-center">Emissão</TableHead>
                <TableHead className="whitespace-nowrap font-bold text-slate-700 py-4 px-6 text-right">Valor</TableHead>
                <TableHead className="whitespace-nowrap font-bold text-slate-700 py-4 px-6">Status</TableHead>
                <TableHead className="text-right whitespace-nowrap font-bold text-slate-700 py-4 px-6">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {nfesRecebidas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-20 text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <Search className="h-10 w-10 text-slate-200" />
                      <p className="text-lg font-medium text-slate-400">
                        {isLoading ? "Consultando SEFAZ..." : "Selecione uma inscrição e clique em Sincronizar DFe"}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                nfesRecebidas.map((nfe) => (
                  <TableRow key={nfe.chave} className="hover:bg-blue-50/30 transition-colors border-b last:border-0">
                    <TableCell className="py-4 px-6">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-bold text-[13px] text-slate-900 uppercase leading-tight">{nfe.nome || "-"}</span>
                        <span className="text-xs font-medium text-slate-500">{formatCpfCnpj(nfe.cnpj)}</span>
                        <span className="text-[10px] text-slate-400 font-mono mt-1 select-all">{nfe.chave}</span>
                      </div>
                    </TableCell>
                    <TableCell className="px-6">
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-slate-700">{nfe.numero || "-"}</span>
                        <span className="text-xs text-slate-400 font-mono">/ {nfe.serie || "-"}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center text-sm px-6 text-slate-600">
                      {nfe.data_emissao
                        ? new Date(nfe.data_emissao).toLocaleDateString("pt-BR")
                        : "-"}
                    </TableCell>
                    <TableCell className="text-right font-bold text-slate-800 px-6">
                      {formatNumber(nfe.valor || 0)}
                    </TableCell>
                    <TableCell className="px-6">
                      <div className="flex flex-col gap-1.5">
                        {nfe.manifestacao_destinatario ? (
                          <Badge variant={manifestacaoVariants[nfe.manifestacao_destinatario] || "secondary"} className="w-fit text-[11px] h-5">
                            {manifestacaoLabels[nfe.manifestacao_destinatario] || nfe.manifestacao_destinatario}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50 w-fit text-[11px] h-5">Sem manifestação</Badge>
                        )}
                        <Badge variant="outline" className="text-[10px] w-fit h-4 text-slate-400 border-slate-100">{nfe.situacao || "-"}</Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-right px-6">
                      <div className="flex gap-2 justify-end items-center">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-9 px-3 flex items-center gap-2 text-xs font-semibold hover:bg-slate-100"
                          disabled={isLoading}
                          onClick={() => downloadXml(inscricaoId, nfe.chave)}
                        >
                          <Download className="h-4 w-4" /> XML
                        </Button>

                        <Button
                          variant="default"
                          size="sm"
                          className="h-9 px-3 flex items-center gap-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 shadow-sm"
                          disabled={isLoading || importingChave === nfe.chave}
                          onClick={() => handleImportar(nfe)}
                        >
                          {importingChave === nfe.chave ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Import className="h-4 w-4" />
                          )}
                          Dar entrada
                        </Button>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="sm" className="h-9 bg-blue-600 hover:bg-blue-700 text-xs font-bold px-4 shadow-sm">
                              Manifestar
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-60 p-2">
                            <DropdownMenuItem className="rounded-md py-2.5 cursor-pointer" onClick={() => handleManifestar(nfe.chave, "ciencia")}>
                              <HelpCircle className="h-4 w-4 mr-2 text-blue-500" /> Ciência da Operação
                            </DropdownMenuItem>
                            <DropdownMenuItem className="rounded-md py-2.5 cursor-pointer" onClick={() => handleManifestar(nfe.chave, "confirmacao")}>
                              <Check className="h-4 w-4 mr-2 text-green-500" /> Confirmação da Operação
                            </DropdownMenuItem>
                            <DropdownMenuItem className="rounded-md py-2.5 cursor-pointer" onClick={() => handleManifestar(nfe.chave, "desconhecimento")}>
                              <X className="h-4 w-4 mr-2 text-orange-500" /> Desconhecimento da Operação
                            </DropdownMenuItem>
                            <DropdownMenuItem className="rounded-md py-2.5 cursor-pointer" onClick={() => handleManifestar(nfe.chave, "nao_realizada")}>
                              <X className="h-4 w-4 mr-2 text-red-500" /> Operação Não Realizada
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>

                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-9 w-9 text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                          title="Baixar DANFe"
                          disabled={isLoading}
                          onClick={() => downloadDanfe(inscricaoId, nfe.chave)}
                        >
                          <FileText className="h-5 w-5" />
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
