import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, FileText, Trash2 } from "lucide-react";
import { useSafras } from "@/hooks/useSafras";
import { useGranjas } from "@/hooks/useGranjas";
import { useSaldosDeposito, useInscricoesComSaldo } from "@/hooks/useSaldosDeposito";
import { useInscricoesCompletas } from "@/hooks/useInscricoesCompletas";
import { useProdutos } from "@/hooks/useProdutos";
import { useCfops } from "@/hooks/useCfops";
import { useEmitentesNfe } from "@/hooks/useEmitentesNfe";
import { formatNumber, formatCpfCnpj } from "@/lib/formatters";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { NotaReferenciadaForm, NotaReferenciadaTemp } from "@/components/deposito/NotaReferenciadaForm";
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

export default function NotasDeposito() {
  const navigate = useNavigate();
  
  // Filtros
  const [granjaId, setGranjaId] = useState<string>("");
  const [safraId, setSafraId] = useState<string>("");
  const [inscricaoId, setInscricaoId] = useState<string>("");
  
  // Dados da NFe a gerar
  const [produtoId, setProdutoId] = useState<string>("");
  const [quantidadeKg, setQuantidadeKg] = useState<string>("");
  
  // Notas referenciadas (temporárias até gerar a NFe)
  const [notasReferenciadas, setNotasReferenciadas] = useState<NotaReferenciadaTemp[]>([]);
  const [showNotaForm, setShowNotaForm] = useState(false);
  const [deleteNotaIndex, setDeleteNotaIndex] = useState<number | null>(null);
  
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: safras = [] } = useSafras();
  const { data: granjas = [] } = useGranjas();
  const { data: produtos = [] } = useProdutos();
  const { cfops } = useCfops();
  const { emitentes } = useEmitentesNfe();
  const { data: todasInscricoes = [] } = useInscricoesCompletas();

  // Buscar inscrições com saldo disponível
  const { data: inscricoesComSaldo = [] } = useInscricoesComSaldo({
    safraId: safraId || undefined,
    granjaId: granjaId || undefined,
  });

  // Buscar saldos por produto para a inscrição selecionada
  const { data: saldos = [], isLoading: loadingSaldos } = useSaldosDeposito({
    inscricaoProdutorId: inscricaoId || undefined,
    safraId: safraId || undefined,
  });

  // Dados da inscrição selecionada
  const inscricaoSelecionada = useMemo(() => {
    return todasInscricoes.find(i => i.id === inscricaoId);
  }, [todasInscricoes, inscricaoId]);

  // CFOP 1905
  const cfop1905 = useMemo(() => {
    return cfops.find(c => c.codigo === '1905');
  }, [cfops]);

  // Emitente da granja
  const emitente = useMemo(() => {
    return emitentes.find(e => e.granja_id === granjaId);
  }, [emitentes, granjaId]);

  // Granja selecionada
  const granjaSelecionada = useMemo(() => {
    return granjas.find(g => g.id === granjaId);
  }, [granjas, granjaId]);

  // Saldo disponível para o produto selecionado
  const saldoProduto = useMemo(() => {
    if (!produtoId) return null;
    return saldos.find(s => s.produto_id === produtoId);
  }, [saldos, produtoId]);

  const handleAddNotaReferenciada = (nota: NotaReferenciadaTemp) => {
    setNotasReferenciadas(prev => [...prev, nota]);
    setShowNotaForm(false);
  };

  const handleRemoveNotaReferenciada = () => {
    if (deleteNotaIndex !== null) {
      setNotasReferenciadas(prev => prev.filter((_, i) => i !== deleteNotaIndex));
      setDeleteNotaIndex(null);
    }
  };

  const handleGerarNfe = async () => {
    if (!granjaId || !inscricaoId || !produtoId || !quantidadeKg || !safraId) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    if (!cfop1905) {
      toast({
        title: "CFOP não encontrado",
        description: "O CFOP 1905 não está cadastrado no sistema.",
        variant: "destructive",
      });
      return;
    }

    if (!emitente) {
      toast({
        title: "Emitente não configurado",
        description: "Configure um emitente de NFe para esta granja.",
        variant: "destructive",
      });
      return;
    }

    const qtdKg = parseFloat(quantidadeKg);
    if (saldoProduto && qtdKg > saldoProduto.saldo_a_emitir_kg) {
      toast({
        title: "Quantidade inválida",
        description: `A quantidade informada (${formatNumber(qtdKg)} kg) é maior que o saldo disponível (${formatNumber(saldoProduto.saldo_a_emitir_kg)} kg).`,
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);

    try {
      // Buscar produto selecionado
      const produto = produtos.find(p => p.id === produtoId);
      
      // Próximo número da nota
      const proximoNumero = (emitente.numero_atual_nfe || 0) + 1;

      // Criar a nota fiscal
      const { data: notaFiscal, error: notaError } = await supabase
        .from('notas_fiscais')
        .insert({
          granja_id: granjaId,
          emitente_id: emitente.id,
          cfop_id: cfop1905.id,
          natureza_operacao: cfop1905.natureza_operacao || 'ENTRADA DE MERCADORIA RECEBIDA PARA DEPOSITO',
          numero: proximoNumero,
          serie: emitente.serie_nfe || 1,
          data_emissao: new Date().toISOString(),
          data_saida_entrada: new Date().toISOString(),
          operacao: 0, // Entrada
          finalidade: 1, // Normal
          inscricao_produtor_id: inscricaoId,
          // Destinatário (produtor)
          dest_tipo: inscricaoSelecionada?.cpf_cnpj && inscricaoSelecionada.cpf_cnpj.length > 11 ? 'juridica' : 'fisica',
          dest_cpf_cnpj: inscricaoSelecionada?.cpf_cnpj,
          dest_nome: inscricaoSelecionada?.produtores?.nome || inscricaoSelecionada?.granja,
          dest_ie: inscricaoSelecionada?.inscricao_estadual,
          dest_logradouro: inscricaoSelecionada?.logradouro,
          dest_numero: inscricaoSelecionada?.numero,
          dest_complemento: inscricaoSelecionada?.complemento,
          dest_bairro: inscricaoSelecionada?.bairro,
          dest_cidade: inscricaoSelecionada?.cidade,
          dest_uf: inscricaoSelecionada?.uf,
          dest_cep: inscricaoSelecionada?.cep,
          dest_telefone: inscricaoSelecionada?.telefone,
          dest_email: inscricaoSelecionada?.email,
          // Totais serão calculados pelo item
          total_produtos: qtdKg * 1, // Valor unitário de R$ 1,00 para depósito
          total_nota: qtdKg * 1,
          status: 'rascunho',
        })
        .select()
        .single();

      if (notaError) throw notaError;

      // Criar item da nota
      const { error: itemError } = await supabase
        .from('notas_fiscais_itens')
        .insert({
          nota_fiscal_id: notaFiscal.id,
          numero_item: 1,
          produto_id: produtoId,
          codigo: produto?.codigo || '',
          descricao: produto?.nome || 'Produto',
          ncm: produto?.ncm || '',
          cfop: cfop1905.codigo,
          unidade: 'KG',
          quantidade: qtdKg,
          valor_unitario: 1, // Valor simbólico para depósito
          valor_total: qtdKg,
          origem: 0,
          cst_icms: cfop1905.cst_icms_padrao || '41',
          cst_pis: cfop1905.cst_pis_padrao || '08',
          cst_cofins: cfop1905.cst_cofins_padrao || '08',
        });

      if (itemError) throw itemError;

      // Criar notas referenciadas
      if (notasReferenciadas.length > 0) {
        const notasParaInserir = notasReferenciadas.map(n => ({
          nota_fiscal_id: notaFiscal.id,
          tipo: n.tipo,
          chave_nfe: n.tipo === 'nfe' ? n.chave_nfe : null,
          nfp_uf: n.tipo === 'nfp' ? n.nfp_uf : null,
          nfp_aamm: n.tipo === 'nfp' ? n.nfp_aamm : null,
          nfp_cnpj: n.tipo === 'nfp' ? n.nfp_cnpj : null,
          nfp_cpf: n.tipo === 'nfp' ? n.nfp_cpf : null,
          nfp_ie: n.tipo === 'nfp' ? n.nfp_ie : null,
          nfp_modelo: n.tipo === 'nfp' ? '04' : null,
          nfp_serie: n.tipo === 'nfp' ? n.nfp_serie : null,
          nfp_numero: n.tipo === 'nfp' ? n.nfp_numero : null,
        }));

        const { error: refError } = await supabase
          .from('notas_fiscais_referenciadas')
          .insert(notasParaInserir);

        if (refError) throw refError;
      }

      // Registrar nota de depósito emitida para controle de saldo
      const { error: depositoError } = await supabase
        .from('notas_deposito_emitidas')
        .insert({
          nota_fiscal_id: notaFiscal.id,
          granja_id: granjaId,
          inscricao_produtor_id: inscricaoId,
          safra_id: safraId,
          produto_id: produtoId,
          quantidade_kg: qtdKg,
          data_emissao: new Date().toISOString().split('T')[0],
        });

      if (depositoError) throw depositoError;

      toast({
        title: "NFe criada com sucesso",
        description: `Nota fiscal ${proximoNumero} criada. Você será redirecionado para revisão.`,
      });

      // Redirecionar para o formulário de NF-e
      navigate(`/notas-fiscais/${notaFiscal.id}`);
    } catch (error: any) {
      toast({
        title: "Erro ao gerar NFe",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <PageHeader
          title="Notas de Depósito"
          description="Emissão de contra-notas (CFOP 1905) para entrada de mercadoria recebida para depósito"
        />

        {/* Filtros */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Selecione o Produtor</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Local (Granja) *</Label>
                <Select value={granjaId} onValueChange={(v) => { setGranjaId(v); setInscricaoId(""); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o local" />
                  </SelectTrigger>
                  <SelectContent>
                    {granjas.map((g) => (
                      <SelectItem key={g.id} value={g.id}>
                        {g.nome_fantasia || g.razao_social}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Safra *</Label>
                <Select value={safraId} onValueChange={(v) => { setSafraId(v); setInscricaoId(""); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a safra" />
                  </SelectTrigger>
                  <SelectContent>
                    {safras.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Inscrição Estadual *</Label>
                <Select 
                  value={inscricaoId} 
                  onValueChange={setInscricaoId}
                  disabled={!granjaId || !safraId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={!granjaId || !safraId ? "Selecione local e safra" : "Selecione a inscrição"} />
                  </SelectTrigger>
                  <SelectContent>
                    {inscricoesComSaldo.map((i) => (
                      <SelectItem key={i.id} value={i.id}>
                        {i.inscricao_estadual || i.cpf_cnpj} - {i.produtor_nome || i.granja}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {inscricaoId && inscricaoSelecionada && (
          <>
            {/* Dados do Produtor */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Dados do Produtor</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <Label className="text-muted-foreground text-xs">Inscrição Estadual</Label>
                    <p className="font-medium">{inscricaoSelecionada.inscricao_estadual || "-"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">CPF/CNPJ</Label>
                    <p className="font-medium">{formatCpfCnpj(inscricaoSelecionada.cpf_cnpj) || "-"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Nome</Label>
                    <p className="font-medium">{inscricaoSelecionada.produtores?.nome || inscricaoSelecionada.granja || "-"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Cidade/UF</Label>
                    <p className="font-medium">
                      {inscricaoSelecionada.cidade ? `${inscricaoSelecionada.cidade}/${inscricaoSelecionada.uf}` : "-"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Saldos por Variedade */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Saldos por Variedade</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingSaldos ? (
                  <div className="text-center py-4 text-muted-foreground">Carregando saldos...</div>
                ) : saldos.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">
                    Nenhum saldo encontrado para esta inscrição/safra
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Variedade</TableHead>
                        <TableHead className="text-right">Depositado</TableHead>
                        <TableHead className="text-right">Transf. Receb.</TableHead>
                        <TableHead className="text-right">Notas Emitidas</TableHead>
                        <TableHead className="text-right">Saldo à Emitir</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {saldos.map((s) => (
                        <TableRow 
                          key={s.produto_id}
                          className={produtoId === s.produto_id ? "bg-accent" : ""}
                        >
                          <TableCell className="font-medium">{s.produto_nome}</TableCell>
                          <TableCell className="text-right">{formatNumber(s.depositado_kg)} kg</TableCell>
                          <TableCell className="text-right">{formatNumber(s.transferencias_recebidas_kg)} kg</TableCell>
                          <TableCell className="text-right">{formatNumber(s.notas_emitidas_kg)} kg</TableCell>
                          <TableCell className="text-right font-medium">
                            <Badge variant={s.saldo_a_emitir_kg > 0 ? "default" : "secondary"}>
                              {formatNumber(s.saldo_a_emitir_kg)} kg
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* Notas do Produtor a Referenciar */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Notas do Produtor a Referenciar</CardTitle>
                <Button variant="outline" size="sm" onClick={() => setShowNotaForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Nota
                </Button>
              </CardHeader>
              <CardContent>
                {notasReferenciadas.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">
                    Nenhuma nota referenciada adicionada
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Número/Série</TableHead>
                        <TableHead>Chave/Dados</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {notasReferenciadas.map((nota, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <Badge variant={nota.tipo === 'nfe' ? 'default' : 'secondary'}>
                              {nota.tipo === 'nfe' ? 'NFe' : 'NFP'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {nota.tipo === 'nfe' 
                              ? '-' 
                              : `${nota.nfp_numero}/${nota.nfp_serie}`
                            }
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {nota.tipo === 'nfe' 
                              ? nota.chave_nfe 
                              : `UF: ${nota.nfp_uf} | AAMM: ${nota.nfp_aamm} | IE: ${nota.nfp_ie}`
                            }
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => setDeleteNotaIndex(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* Dados da Contra-Nota */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Dados da Contra-Nota (NFe CFOP 1905)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Variedade *</Label>
                    <Select value={produtoId} onValueChange={setProdutoId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a variedade" />
                      </SelectTrigger>
                      <SelectContent>
                        {saldos.filter(s => s.saldo_a_emitir_kg > 0).map((s) => (
                          <SelectItem key={s.produto_id} value={s.produto_id}>
                            {s.produto_nome} (Saldo: {formatNumber(s.saldo_a_emitir_kg)} kg)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Quantidade (kg) *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      max={saldoProduto?.saldo_a_emitir_kg}
                      value={quantidadeKg}
                      onChange={(e) => setQuantidadeKg(e.target.value)}
                      placeholder="0,00"
                    />
                    {saldoProduto && (
                      <p className="text-xs text-muted-foreground">
                        Máximo disponível: {formatNumber(saldoProduto.saldo_a_emitir_kg)} kg
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Valor Total</Label>
                    <Input
                      type="text"
                      value={quantidadeKg ? `R$ ${formatNumber(parseFloat(quantidadeKg))}` : "R$ 0,00"}
                      disabled
                      className="bg-muted"
                    />
                    <p className="text-xs text-muted-foreground">Valor simbólico (R$ 1,00/kg)</p>
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-6">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setProdutoId("");
                      setQuantidadeKg("");
                      setNotasReferenciadas([]);
                    }}
                  >
                    Limpar
                  </Button>
                  <Button 
                    onClick={handleGerarNfe}
                    disabled={isGenerating || !produtoId || !quantidadeKg}
                  >
                    {isGenerating ? "Gerando..." : "Gerar NFe"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Dialog para adicionar nota referenciada */}
      <NotaReferenciadaForm
        open={showNotaForm}
        onOpenChange={setShowNotaForm}
        onAdd={handleAddNotaReferenciada}
        inscricao={inscricaoSelecionada}
      />

      {/* Confirmação de exclusão de nota referenciada */}
      <AlertDialog open={deleteNotaIndex !== null} onOpenChange={() => setDeleteNotaIndex(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover nota referenciada?</AlertDialogTitle>
            <AlertDialogDescription>
              A nota será removida da lista de referências.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveNotaReferenciada}>Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
