import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSafras } from "@/hooks/useSafras";
import { useProdutos } from "@/hooks/useProdutos";
import { useSilos } from "@/hooks/useSilos";
import { useAllInscricoes } from "@/hooks/useAllInscricoes";
import { useClientesFornecedores } from "@/hooks/useClientesFornecedores";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { FileDown, Loader2 } from "lucide-react";
import {
  gerarExtratoProdutorPdf,
  gerarRelatorioColheitasPdf,
  gerarRelatorioVendasPdf,
  type ExtratoData,
  type RelColheita,
  type RelContratoVenda,
} from "@/lib/relatoriosPdf";

type TipoRelatorio = "extrato" | "colheitas" | "vendas";

interface Props {
  tipo: TipoRelatorio;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RelatorioDialog({ tipo, open, onOpenChange }: Props) {
  const [safraId, setSafraId] = useState("");
  const [inscricaoId, setInscricaoId] = useState("");
  const [produtoId, setProdutoId] = useState("");
  const [siloId, setSiloId] = useState("");
  const [compradorId, setCompradorId] = useState("");
  const [dataInicial, setDataInicial] = useState("");
  const [dataFinal, setDataFinal] = useState("");
  const [loading, setLoading] = useState(false);

  const { data: safras } = useSafras();
  const { data: produtos } = useProdutos();
  const { data: silos } = useSilos();
  const { data: inscricoes } = useAllInscricoes();
  const { data: clientes } = useClientesFornecedores();

  const compradores = clientes?.filter(c => c.tipo === "cliente" || c.tipo === "ambos") || [];

  const titulos: Record<TipoRelatorio, string> = {
    extrato: "Extrato do Produtor",
    colheitas: "Relatório de Colheitas",
    vendas: "Relatório de Vendas",
  };

  const gerarRelatorio = async () => {
    setLoading(true);
    try {
      if (tipo === "extrato") {
        await gerarExtrato();
      } else if (tipo === "colheitas") {
        await gerarColheitas();
      } else {
        await gerarVendas();
      }
    } catch (err: any) {
      toast({ title: "Erro ao gerar relatório", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const gerarExtrato = async () => {
    if (!safraId || !inscricaoId) {
      toast({ title: "Filtros obrigatórios", description: "Selecione a safra e o produtor/inscrição.", variant: "destructive" });
      return;
    }

    const inscricao = inscricoes?.find(i => i.id === inscricaoId);
    const safra = safras?.find(s => s.id === safraId);
    const produto = produtoId ? produtos?.find(p => p.id === produtoId) : null;

    // Colheitas
    let colheitasQuery = supabase.from("colheitas").select("data_colheita, peso_bruto, peso_tara, producao_kg, umidade, impureza, kg_desconto_total, producao_liquida_kg, lavouras(nome)")
      .eq("inscricao_produtor_id", inscricaoId).eq("safra_id", safraId);
    if (produtoId) colheitasQuery = colheitasQuery.eq("variedade_id", produtoId);
    if (dataInicial) colheitasQuery = colheitasQuery.gte("data_colheita", dataInicial);
    if (dataFinal) colheitasQuery = colheitasQuery.lte("data_colheita", dataFinal);
    const { data: colheitas } = await colheitasQuery.order("data_colheita");

    // Transferências recebidas
    let trRecQuery = supabase.from("transferencias_deposito").select("data_transferencia, quantidade_kg, inscricao_origem:inscricoes_produtor!transferencias_deposito_inscricao_origem_id_fkey(granja, produtores(nome))")
      .eq("inscricao_destino_id", inscricaoId).eq("safra_id", safraId);
    if (produtoId) trRecQuery = trRecQuery.eq("produto_id", produtoId);
    if (dataInicial) trRecQuery = trRecQuery.gte("data_transferencia", dataInicial);
    if (dataFinal) trRecQuery = trRecQuery.lte("data_transferencia", dataFinal);
    const { data: trRec } = await trRecQuery.order("data_transferencia");

    // Transferências enviadas
    let trEnvQuery = supabase.from("transferencias_deposito").select("data_transferencia, quantidade_kg, inscricao_destino:inscricoes_produtor!transferencias_deposito_inscricao_destino_id_fkey(granja, produtores(nome))")
      .eq("inscricao_origem_id", inscricaoId).eq("safra_id", safraId);
    if (produtoId) trEnvQuery = trEnvQuery.eq("produto_id", produtoId);
    if (dataInicial) trEnvQuery = trEnvQuery.gte("data_transferencia", dataInicial);
    if (dataFinal) trEnvQuery = trEnvQuery.lte("data_transferencia", dataFinal);
    const { data: trEnv } = await trEnvQuery.order("data_transferencia");

    // Devoluções
    let devQuery = supabase.from("devolucoes_deposito").select("data_devolucao, quantidade_kg, taxa_armazenagem, kg_taxa_armazenagem")
      .eq("inscricao_produtor_id", inscricaoId).eq("safra_id", safraId);
    if (produtoId) devQuery = devQuery.eq("produto_id", produtoId);
    if (dataInicial) devQuery = devQuery.gte("data_devolucao", dataInicial);
    if (dataFinal) devQuery = devQuery.lte("data_devolucao", dataFinal);
    const { data: devolucoes } = await devQuery.order("data_devolucao");

    // Notas depósito
    let ndQuery = supabase.from("notas_deposito_emitidas").select("data_emissao, quantidade_kg, nota_fiscal:notas_fiscais(numero)")
      .eq("inscricao_produtor_id", inscricaoId).eq("safra_id", safraId);
    if (produtoId) ndQuery = ndQuery.eq("produto_id", produtoId);
    const { data: notasDep } = await ndQuery.order("data_emissao");

    const extratoData: ExtratoData = {
      produtorNome: inscricao?.produtores?.nome || inscricao?.inscricao_estadual || "-",
      cpfCnpj: null,
      inscricaoEstadual: inscricao?.inscricao_estadual || null,
      safraNome: safra?.nome || "-",
      produtoNome: produto?.nome || null,
      colheitas: (colheitas || []).map((c: any) => ({
        data_colheita: c.data_colheita,
        lavoura: c.lavouras?.nome,
        peso_bruto: c.peso_bruto,
        peso_tara: c.peso_tara,
        producao_kg: c.producao_kg,
        umidade: c.umidade,
        impureza: c.impureza,
        kg_desconto_total: c.kg_desconto_total,
        producao_liquida_kg: c.producao_liquida_kg,
      })),
      transferenciasRecebidas: (trRec || []).map((t: any) => ({
        data_transferencia: t.data_transferencia,
        nome_outro: t.inscricao_origem?.produtores?.nome || t.inscricao_origem?.granja || null,
        quantidade_kg: t.quantidade_kg,
      })),
      transferenciasEnviadas: (trEnv || []).map((t: any) => ({
        data_transferencia: t.data_transferencia,
        nome_outro: t.inscricao_destino?.produtores?.nome || t.inscricao_destino?.granja || null,
        quantidade_kg: t.quantidade_kg,
      })),
      devolucoes: (devolucoes || []).map((d: any) => ({
        data_devolucao: d.data_devolucao,
        quantidade_kg: d.quantidade_kg,
        taxa_armazenagem: d.taxa_armazenagem,
        kg_taxa_armazenagem: d.kg_taxa_armazenagem,
      })),
      notasDeposito: (notasDep || []).map((n: any) => ({
        data_emissao: n.data_emissao,
        nota_fiscal_numero: n.nota_fiscal?.numero?.toString() || null,
        quantidade_kg: n.quantidade_kg,
      })),
    };

    gerarExtratoProdutorPdf(extratoData);
  };

  const gerarColheitas = async () => {
    if (!safraId) {
      toast({ title: "Filtro obrigatório", description: "Selecione a safra.", variant: "destructive" });
      return;
    }

    let query = supabase.from("colheitas").select(`
      data_colheita, peso_bruto, peso_tara, producao_kg, umidade, impureza, kg_desconto_total, producao_liquida_kg, total_sacos,
      inscricao_produtor:inscricoes_produtor!colheitas_inscricao_produtor_id_fkey(produtores(nome)),
      lavouras(nome),
      placas(placa)
    `).eq("safra_id", safraId);

    if (produtoId) query = query.eq("variedade_id", produtoId);
    if (siloId) query = query.eq("silo_id", siloId);
    if (dataInicial) query = query.gte("data_colheita", dataInicial);
    if (dataFinal) query = query.lte("data_colheita", dataFinal);

    const { data } = await query.order("data_colheita");

    if (!data || data.length === 0) {
      toast({ title: "Sem dados", description: "Nenhuma colheita encontrada com os filtros selecionados." });
      return;
    }

    const safra = safras?.find(s => s.id === safraId);
    const prod = produtoId ? produtos?.find(p => p.id === produtoId) : null;
    const filtros = [`Safra: ${safra?.nome || "-"}`, prod ? `Produto: ${prod.nome}` : null].filter(Boolean).join(" | ");

    const mapped: RelColheita[] = data.map((c: any) => ({
      data_colheita: c.data_colheita,
      produtor_nome: c.inscricao_produtor?.produtores?.nome || null,
      lavoura_nome: c.lavouras?.nome || null,
      placa: c.placas?.placa || null,
      peso_bruto: c.peso_bruto,
      peso_tara: c.peso_tara,
      producao_kg: c.producao_kg,
      umidade: c.umidade,
      impureza: c.impureza,
      kg_desconto_total: c.kg_desconto_total,
      producao_liquida_kg: c.producao_liquida_kg,
      total_sacos: c.total_sacos,
    }));

    gerarRelatorioColheitasPdf(mapped, filtros);
  };

  const gerarVendas = async () => {
    if (!safraId) {
      toast({ title: "Filtro obrigatório", description: "Selecione a safra.", variant: "destructive" });
      return;
    }

    let query = supabase.from("contratos_venda").select(`
      id, numero, data_contrato, quantidade_kg, preco_kg, valor_total,
      comprador:clientes_fornecedores(nome),
      produto:produtos(nome)
    `).eq("safra_id", safraId);

    if (compradorId) query = query.eq("comprador_id", compradorId);
    if (dataInicial) query = query.gte("data_contrato", dataInicial);
    if (dataFinal) query = query.lte("data_contrato", dataFinal);

    const { data: contratos } = await query.order("numero");

    if (!contratos || contratos.length === 0) {
      toast({ title: "Sem dados", description: "Nenhum contrato encontrado com os filtros selecionados." });
      return;
    }

    // Buscar totais de remessas por contrato
    const mapped: RelContratoVenda[] = await Promise.all(
      contratos.map(async (c: any) => {
        const { data: remessas } = await supabase
          .from("remessas_venda")
          .select("kg_remessa")
          .eq("contrato_venda_id", c.id || "")
          .neq("status", "cancelada");

        const total_carregado_kg = remessas?.reduce((s, r) => s + (Number(r.kg_remessa) || 0), 0) || 0;
        return {
          numero: c.numero,
          data_contrato: c.data_contrato,
          comprador_nome: c.comprador?.nome || null,
          produto_nome: c.produto?.nome || null,
          quantidade_kg: c.quantidade_kg,
          preco_kg: c.preco_kg,
          valor_total: c.valor_total,
          total_carregado_kg,
          saldo_kg: (c.quantidade_kg || 0) - total_carregado_kg,
        };
      })
    );

    const safra = safras?.find(s => s.id === safraId);
    const filtros = `Safra: ${safra?.nome || "-"}`;
    gerarRelatorioVendasPdf(mapped, filtros);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{titulos[tipo]}</DialogTitle>
          <DialogDescription>Selecione os filtros para gerar o relatório em PDF.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Safra - sempre */}
          <div>
            <Label>Safra *</Label>
            <Select value={safraId} onValueChange={setSafraId}>
              <SelectTrigger><SelectValue placeholder="Selecione a safra" /></SelectTrigger>
              <SelectContent>
                {safras?.map(s => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Inscrição/Produtor - extrato */}
          {tipo === "extrato" && (
            <div>
              <Label>Produtor/Inscrição *</Label>
              <Select value={inscricaoId} onValueChange={setInscricaoId}>
                <SelectTrigger><SelectValue placeholder="Selecione o produtor" /></SelectTrigger>
                <SelectContent>
                  {inscricoes?.map(i => (
                    <SelectItem key={i.id} value={i.id}>
                      {i.produtores?.nome || i.inscricao_estadual || "Sem nome"} - IE: {i.inscricao_estadual || "-"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Produto - extrato e colheitas */}
          {(tipo === "extrato" || tipo === "colheitas") && (
            <div>
              <Label>Produto</Label>
              <Select value={produtoId} onValueChange={setProdutoId}>
                <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {produtos?.map(p => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Silo - colheitas */}
          {tipo === "colheitas" && (
            <div>
              <Label>Silo</Label>
              <Select value={siloId} onValueChange={setSiloId}>
                <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {silos?.map(s => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Comprador - vendas */}
          {tipo === "vendas" && (
            <div>
              <Label>Comprador</Label>
              <Select value={compradorId} onValueChange={setCompradorId}>
                <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {compradores.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Período */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Data Inicial</Label>
              <Input type="date" value={dataInicial} onChange={e => setDataInicial(e.target.value)} />
            </div>
            <div>
              <Label>Data Final</Label>
              <Input type="date" value={dataFinal} onChange={e => setDataFinal(e.target.value)} />
            </div>
          </div>

          <Button onClick={gerarRelatorio} disabled={loading} className="w-full">
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileDown className="h-4 w-4 mr-2" />}
            Gerar PDF
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
