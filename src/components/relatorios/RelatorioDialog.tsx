import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ComboboxFilter } from "@/components/ui/combobox-filter";
import { useSafras } from "@/hooks/useSafras";
import { useProdutos } from "@/hooks/useProdutos";
import { useSilos } from "@/hooks/useSilos";
import { useAllInscricoes } from "@/hooks/useAllInscricoes";
import { useClientesFornecedores } from "@/hooks/useClientesFornecedores";
import { useGranjas } from "@/hooks/useGranjas";
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
import {
  gerarDemonstrativoGerencialPdf,
  gerarDrePdf,
  gerarBensMoveisPdf,
  type DemonstrativoGerencialData,
  type DreReportData,
} from "@/lib/relatoriosGestao";

type TipoRelatorio = "extrato" | "colheitas" | "vendas" | "demonstrativo_gerencial" | "dre" | "bens_moveis";

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
  const [granjaId, setGranjaId] = useState("");
  const [dataInicial, setDataInicial] = useState("");
  const [dataFinal, setDataFinal] = useState("");
  const [tipoFiltro, setTipoFiltro] = useState("ambos");
  const [modoBensMoveis, setModoBensMoveis] = useState("geral_discriminado");
  const [loading, setLoading] = useState(false);

  const { data: safras } = useSafras();
  const { data: produtos } = useProdutos();
  const { data: silos } = useSilos();
  const { data: inscricoes } = useAllInscricoes();
  const { data: clientes } = useClientesFornecedores();
  const { data: granjas } = useGranjas();

  const compradores = clientes?.filter(c => c.tipo === "cliente" || c.tipo === "ambos") || [];

  const titulos: Record<TipoRelatorio, string> = {
    extrato: "Extrato do Produtor",
    colheitas: "Relatório de Colheitas",
    vendas: "Relatório de Vendas",
    demonstrativo_gerencial: "Demonstrativo Gerencial",
    dre: "DRE - Demonstrativo de Resultado",
    bens_moveis: "Despesas com Bens Móveis",
  };

  const gerarRelatorio = async () => {
    setLoading(true);
    try {
      if (tipo === "extrato") await gerarExtrato();
      else if (tipo === "colheitas") await gerarColheitas();
      else if (tipo === "vendas") await gerarVendas();
      else if (tipo === "demonstrativo_gerencial") await gerarDemonstrativo();
      else if (tipo === "dre") await gerarDre();
      else if (tipo === "bens_moveis") await gerarBensMoveis();
    } catch (err: any) {
      toast({ title: "Erro ao gerar relatório", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const colheitasSelect = `
    data_colheita,
    peso_bruto,
    peso_tara,
    producao_kg,
    umidade,
    impureza,
    kg_desconto_total,
    producao_liquida_kg,
    total_sacos,
    placas(placa),
    inscricao_produtor:inscricoes_produtor!colheitas_inscricao_produtor_id_fkey(
      produtores:produtor_id(nome)
    ),
    controle_lavoura:controle_lavouras!colheitas_controle_lavoura_id_fkey(
      lavouras(nome)
    )
  `;

  // ========== Existing reports ==========
  const gerarExtrato = async () => {
    if (!safraId || !inscricaoId) {
      toast({ title: "Filtros obrigatórios", description: "Selecione a safra e o produtor/inscrição.", variant: "destructive" });
      return;
    }
    const inscricao = inscricoes?.find(i => i.id === inscricaoId);
    const safra = safras?.find(s => s.id === safraId);
    const produto = produtoId ? produtos?.find(p => p.id === produtoId) : null;

    let colheitasQuery = supabase
      .from("colheitas")
      .select(colheitasSelect)
      .eq("inscricao_produtor_id", inscricaoId)
      .eq("safra_id", safraId);
    if (produtoId) colheitasQuery = colheitasQuery.eq("variedade_id", produtoId);
    if (dataInicial) colheitasQuery = colheitasQuery.gte("data_colheita", dataInicial);
    if (dataFinal) colheitasQuery = colheitasQuery.lte("data_colheita", dataFinal);
    const { data: colheitas, error: colheitasError } = await colheitasQuery.order("data_colheita");
    if (colheitasError) throw colheitasError;

    let trRecQuery = supabase.from("transferencias_deposito").select("data_transferencia, quantidade_kg, inscricao_origem:inscricoes_produtor!transferencias_deposito_inscricao_origem_id_fkey(granja, produtores(nome))")
      .eq("inscricao_destino_id", inscricaoId).eq("safra_id", safraId);
    if (produtoId) trRecQuery = trRecQuery.eq("produto_id", produtoId);
    if (dataInicial) trRecQuery = trRecQuery.gte("data_transferencia", dataInicial);
    if (dataFinal) trRecQuery = trRecQuery.lte("data_transferencia", dataFinal);
    const { data: trRec } = await trRecQuery.order("data_transferencia");

    let trEnvQuery = supabase.from("transferencias_deposito").select("data_transferencia, quantidade_kg, inscricao_destino:inscricoes_produtor!transferencias_deposito_inscricao_destino_id_fkey(granja, produtores(nome))")
      .eq("inscricao_origem_id", inscricaoId).eq("safra_id", safraId);
    if (produtoId) trEnvQuery = trEnvQuery.eq("produto_id", produtoId);
    if (dataInicial) trEnvQuery = trEnvQuery.gte("data_transferencia", dataInicial);
    if (dataFinal) trEnvQuery = trEnvQuery.lte("data_transferencia", dataFinal);
    const { data: trEnv } = await trEnvQuery.order("data_transferencia");

    let devQuery = supabase.from("devolucoes_deposito").select("data_devolucao, quantidade_kg, taxa_armazenagem, kg_taxa_armazenagem")
      .eq("inscricao_produtor_id", inscricaoId).eq("safra_id", safraId);
    if (produtoId) devQuery = devQuery.eq("produto_id", produtoId);
    if (dataInicial) devQuery = devQuery.gte("data_devolucao", dataInicial);
    if (dataFinal) devQuery = devQuery.lte("data_devolucao", dataFinal);
    const { data: devolucoes } = await devQuery.order("data_devolucao");

    let ndQuery = supabase.from("notas_deposito_emitidas").select("data_emissao, quantidade_kg, nota_fiscal:notas_fiscais(numero)")
      .eq("inscricao_produtor_id", inscricaoId).eq("safra_id", safraId);
    if (produtoId) ndQuery = ndQuery.eq("produto_id", produtoId);
    const { data: notasDep } = await ndQuery.order("data_emissao");

    const extratoData: ExtratoData = {
      produtorNome: inscricao?.produtores?.nome || inscricao?.inscricao_estadual || "-",
      cpfCnpj: null, inscricaoEstadual: inscricao?.inscricao_estadual || null,
      safraNome: safra?.nome || "-", produtoNome: produto?.nome || null,
      colheitas: (colheitas || []).map((c: any) => ({ data_colheita: c.data_colheita, lavoura: c.controle_lavoura?.lavouras?.nome || null, peso_bruto: c.peso_bruto, peso_tara: c.peso_tara, producao_kg: c.producao_kg, umidade: c.umidade, impureza: c.impureza, kg_desconto_total: c.kg_desconto_total, producao_liquida_kg: c.producao_liquida_kg })),
      transferenciasRecebidas: (trRec || []).map((t: any) => ({ data_transferencia: t.data_transferencia, nome_outro: t.inscricao_origem?.produtores?.nome || t.inscricao_origem?.granja || null, quantidade_kg: t.quantidade_kg })),
      transferenciasEnviadas: (trEnv || []).map((t: any) => ({ data_transferencia: t.data_transferencia, nome_outro: t.inscricao_destino?.produtores?.nome || t.inscricao_destino?.granja || null, quantidade_kg: t.quantidade_kg })),
      devolucoes: (devolucoes || []).map((d: any) => ({ data_devolucao: d.data_devolucao, quantidade_kg: d.quantidade_kg, taxa_armazenagem: d.taxa_armazenagem, kg_taxa_armazenagem: d.kg_taxa_armazenagem })),
      notasDeposito: (notasDep || []).map((n: any) => ({ data_emissao: n.data_emissao, nota_fiscal_numero: n.nota_fiscal?.numero?.toString() || null, quantidade_kg: n.quantidade_kg })),
    };
    gerarExtratoProdutorPdf(extratoData);
  };

  const gerarColheitas = async () => {
    if (!safraId) { toast({ title: "Filtro obrigatório", description: "Selecione a safra.", variant: "destructive" }); return; }
    let query = supabase.from("colheitas").select(colheitasSelect).eq("safra_id", safraId);
    if (produtoId) query = query.eq("variedade_id", produtoId);
    if (siloId) query = query.eq("silo_id", siloId);
    if (dataInicial) query = query.gte("data_colheita", dataInicial);
    if (dataFinal) query = query.lte("data_colheita", dataFinal);
    const { data, error } = await query.order("data_colheita");
    if (error) throw error;
    if (!data || data.length === 0) { toast({ title: "Sem dados", description: "Nenhuma colheita encontrada." }); return; }
    const safra = safras?.find(s => s.id === safraId);
    const prod = produtoId ? produtos?.find(p => p.id === produtoId) : null;
    const filtros = [`Safra: ${safra?.nome || "-"}`, prod ? `Produto: ${prod.nome}` : null].filter(Boolean).join(" | ");
    const mapped: RelColheita[] = data.map((c: any) => ({ data_colheita: c.data_colheita, produtor_nome: c.inscricao_produtor?.produtores?.nome || null, lavoura_nome: c.controle_lavoura?.lavouras?.nome || null, placa: c.placas?.placa || null, peso_bruto: c.peso_bruto, peso_tara: c.peso_tara, producao_kg: c.producao_kg, umidade: c.umidade, impureza: c.impureza, kg_desconto_total: c.kg_desconto_total, producao_liquida_kg: c.producao_liquida_kg, total_sacos: c.total_sacos }));
    gerarRelatorioColheitasPdf(mapped, filtros);
  };

  const gerarVendas = async () => {
    if (!safraId) { toast({ title: "Filtro obrigatório", description: "Selecione a safra.", variant: "destructive" }); return; }
    let query = supabase.from("contratos_venda").select(`id, numero, data_contrato, quantidade_kg, preco_kg, valor_total, comprador:clientes_fornecedores(nome, nome_fantasia), produto:produtos(nome)`).eq("safra_id", safraId);
    if (compradorId) query = query.eq("comprador_id", compradorId);
    if (dataInicial) query = query.gte("data_contrato", dataInicial);
    if (dataFinal) query = query.lte("data_contrato", dataFinal);
    const { data: contratos } = await query.order("numero");
    if (!contratos || contratos.length === 0) { toast({ title: "Sem dados", description: "Nenhum contrato encontrado." }); return; }
    const mapped: RelContratoVenda[] = await Promise.all(contratos.map(async (c: any) => {
      const { data: remessas } = await supabase.from("remessas_venda").select("kg_remessa").eq("contrato_venda_id", c.id || "").neq("status", "cancelada");
      const total_carregado_kg = remessas?.reduce((s, r) => s + (Number(r.kg_remessa) || 0), 0) || 0;
      return { numero: c.numero, data_contrato: c.data_contrato, comprador_nome: c.comprador?.nome_fantasia ? `${c.comprador.nome} (${c.comprador.nome_fantasia})` : c.comprador?.nome || null, produto_nome: c.produto?.nome || null, quantidade_kg: c.quantidade_kg, preco_kg: c.preco_kg, valor_total: c.valor_total, total_carregado_kg, saldo_kg: (c.quantidade_kg || 0) - total_carregado_kg };
    }));
    const safra = safras?.find(s => s.id === safraId);
    gerarRelatorioVendasPdf(mapped, `Safra: ${safra?.nome || "-"}`);
  };

  // ========== New management reports ==========
  const gerarDemonstrativo = async () => {
    if (!dataInicial || !dataFinal) { toast({ title: "Filtros obrigatórios", description: "Informe o período.", variant: "destructive" }); return; }
    let query = supabase.from("lancamentos_financeiros" as any)
      .select("valor, tipo, sub_centros_custo:sub_centro_custo_id(codigo, descricao, plano_contas_gerencial:centro_custo_id(codigo, descricao, tipo))")
      .gte("data_lancamento", dataInicial).lte("data_lancamento", dataFinal);
    if (granjaId) query = query.eq("granja_id", granjaId);
    if (tipoFiltro !== "ambos") query = query.eq("tipo", tipoFiltro);
    const { data, error } = await query;
    if (error) throw error;
    if (!data || data.length === 0) { toast({ title: "Sem dados", description: "Nenhum lançamento encontrado no período." }); return; }
    const lancamentos = (data as any[]).filter(l => l.sub_centros_custo?.plano_contas_gerencial).map(l => ({
      centro_codigo: l.sub_centros_custo.plano_contas_gerencial.codigo,
      centro_descricao: l.sub_centros_custo.plano_contas_gerencial.descricao,
      centro_tipo: l.sub_centros_custo.plano_contas_gerencial.tipo,
      sub_codigo: l.sub_centros_custo.codigo,
      sub_descricao: l.sub_centros_custo.descricao,
      valor: Number(l.valor),
    }));
    gerarDemonstrativoGerencialPdf({ periodo: `${fmtD(dataInicial)} a ${fmtD(dataFinal)}`, tipo: tipoFiltro, lancamentos });
  };

  const gerarDre = async () => {
    if (!dataInicial || !dataFinal) { toast({ title: "Filtros obrigatórios", description: "Informe o período.", variant: "destructive" }); return; }
    // Get DRE structure
    const { data: dreContas } = await supabase.from("dre_contas" as any).select("*").order("ordem").order("codigo");
    if (!dreContas || dreContas.length === 0) { toast({ title: "Sem estrutura", description: "Cadastre a estrutura do DRE primeiro." }); return; }

    // Get lancamentos with DRE link
    let query = supabase.from("lancamentos_financeiros" as any).select("valor, tipo, dre_conta_id")
      .gte("data_lancamento", dataInicial).lte("data_lancamento", dataFinal).not("dre_conta_id", "is", null);
    if (granjaId) query = query.eq("granja_id", granjaId);
    const { data: lancamentos } = await query;

    // Get lancamentos before period for saldo anterior
    let queryAnterior = supabase.from("lancamentos_financeiros" as any).select("valor, tipo, dre_conta_id")
      .lt("data_lancamento", dataInicial).not("dre_conta_id", "is", null);
    if (granjaId) queryAnterior = queryAnterior.eq("granja_id", granjaId);
    const { data: lancamentosAnt } = await queryAnterior;

    const somaPorConta = (list: any[], contaId: string) => {
      return (list || []).filter(l => l.dre_conta_id === contaId)
        .reduce((s, l) => s + (l.tipo === 'receita' ? Number(l.valor) : -Number(l.valor)), 0);
    };

    const contas: DreReportData["contas"] = (dreContas as any[]).map(c => {
      const saldo_anterior = somaPorConta(lancamentosAnt || [], c.id);
      const valor_periodo = somaPorConta(lancamentos || [], c.id);
      return { codigo: c.codigo, descricao: c.descricao, nivel: c.nivel, saldo_anterior, valor_periodo, saldo_atual: saldo_anterior + valor_periodo };
    });

    gerarDrePdf({ periodo: `${fmtD(dataInicial)} a ${fmtD(dataFinal)}`, contas });
  };

  const gerarBensMoveis = async () => {
    if (!dataInicial || !dataFinal) { toast({ title: "Filtros obrigatórios", description: "Informe o período.", variant: "destructive" }); return; }
    // Get groups with maquinas_implementos
    const { data: gruposMaq } = await supabase.from("grupos_produtos").select("id, nome").eq("maquinas_implementos", true);
    if (!gruposMaq || gruposMaq.length === 0) { toast({ title: "Sem dados", description: "Nenhum grupo classificado como máquinas/implementos." }); return; }

    // Get lancamentos linked to sub-centros that have matching centro_custo linked to these groups
    // For simplicity, get all lancamentos in period and filter by description/grupo
    let query = supabase.from("lancamentos_financeiros" as any)
      .select("data_lancamento, descricao, valor, documento, sub_centros_custo:sub_centro_custo_id(codigo, descricao, plano_contas_gerencial:centro_custo_id(codigo, descricao))")
      .gte("data_lancamento", dataInicial).lte("data_lancamento", dataFinal).eq("tipo", "despesa");
    if (granjaId) query = query.eq("granja_id", granjaId);
    const { data: lancamentos } = await query;

    // Map lancamentos - using grupos as category
    const despesas = (lancamentos as any[] || []).map(l => ({
      grupo_nome: l.sub_centros_custo?.plano_contas_gerencial?.descricao || 'Sem classificação',
      produto_nome: null,
      data_lancamento: l.data_lancamento,
      descricao: l.descricao,
      valor: Number(l.valor),
      documento: l.documento,
    }));

    if (despesas.length === 0) { toast({ title: "Sem dados", description: "Nenhuma despesa encontrada no período." }); return; }

    gerarBensMoveisPdf(despesas, `${fmtD(dataInicial)} a ${fmtD(dataFinal)}`, modoBensMoveis);
  };

  const fmtD = (d: string) => { try { const [y, m, day] = d.split('-'); return `${day}/${m}/${y}`; } catch { return d; } };

  const isGestao = tipo === "demonstrativo_gerencial" || tipo === "dre" || tipo === "bens_moveis";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{titulos[tipo]}</DialogTitle>
          <DialogDescription>Selecione os filtros para gerar o relatório em PDF.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Safra - operational reports */}
          {!isGestao && (
            <div>
              <Label>Safra *</Label>
              <ComboboxFilter
                value={safraId}
                onValueChange={setSafraId}
                options={safras?.map(s => ({ value: s.id, label: s.nome })) || []}
                placeholder="Selecione a safra"
                searchPlaceholder="Buscar safra..."
                emptyText="Nenhuma safra encontrada."
                allLabel="Todas"
              />
            </div>
          )}

          {/* Inscrição/Produtor - extrato */}
          {tipo === "extrato" && (
            <div>
              <Label>Produtor/Inscrição *</Label>
              <ComboboxFilter
                value={inscricaoId}
                onValueChange={setInscricaoId}
                options={inscricoes?.map(i => ({ value: i.id, label: `${i.produtores?.nome || i.inscricao_estadual || "Sem nome"} - IE: ${i.inscricao_estadual || "-"}` })) || []}
                placeholder="Selecione o produtor"
                searchPlaceholder="Buscar produtor..."
                emptyText="Nenhum produtor encontrado."
                popoverWidth="w-[400px]"
              />
            </div>
          )}

          {/* Produto - extrato e colheitas */}
          {(tipo === "extrato" || tipo === "colheitas") && (
            <div>
              <Label>Produto</Label>
              <ComboboxFilter
                value={produtoId}
                onValueChange={setProdutoId}
                options={produtos?.map(p => ({ value: p.id, label: p.nome })) || []}
                searchPlaceholder="Buscar produto..."
                emptyText="Nenhum produto encontrado."
              />
            </div>
          )}

          {/* Silo - colheitas */}
          {tipo === "colheitas" && (
            <div>
              <Label>Silo</Label>
              <ComboboxFilter
                value={siloId}
                onValueChange={setSiloId}
                options={silos?.map(s => ({ value: s.id, label: s.nome })) || []}
                searchPlaceholder="Buscar silo..."
                emptyText="Nenhum silo encontrado."
              />
            </div>
          )}

          {/* Comprador - vendas */}
          {tipo === "vendas" && (
            <div>
              <Label>Comprador</Label>
              <ComboboxFilter
                value={compradorId}
                onValueChange={setCompradorId}
                options={compradores.map(c => ({ value: c.id, label: c.nome + (c.nome_fantasia ? ` (${c.nome_fantasia})` : '') }))}
                searchPlaceholder="Buscar comprador..."
                emptyText="Nenhum comprador encontrado."
                popoverWidth="w-[350px]"
              />
            </div>
          )}

          {/* Granja - management reports */}
          {isGestao && (
            <div>
              <Label>Granja</Label>
              <ComboboxFilter
                value={granjaId}
                onValueChange={setGranjaId}
                options={granjas?.map(g => ({ value: g.id, label: g.razao_social })) || []}
                searchPlaceholder="Buscar granja..."
                emptyText="Nenhuma granja encontrada."
                allLabel="Todas"
              />
            </div>
          )}

          {/* Tipo - demonstrativo gerencial */}
          {tipo === "demonstrativo_gerencial" && (
            <div>
              <Label>Tipo</Label>
              <ComboboxFilter
                value={tipoFiltro}
                onValueChange={setTipoFiltro}
                options={[
                  { value: 'ambos', label: 'Receitas e Despesas' },
                  { value: 'receita', label: 'Apenas Receitas' },
                  { value: 'despesa', label: 'Apenas Despesas' },
                ]}
                searchPlaceholder="Buscar tipo..."
              />
            </div>
          )}

          {/* Modo - bens móveis */}
          {tipo === "bens_moveis" && (
            <div>
              <Label>Modo do Relatório</Label>
              <ComboboxFilter
                value={modoBensMoveis}
                onValueChange={setModoBensMoveis}
                options={[
                  { value: 'geral_discriminado', label: 'Geral Discriminado' },
                  { value: 'geral_totais', label: 'Geral Totais' },
                ]}
                searchPlaceholder="Buscar modo..."
              />
            </div>
          )}

          {/* Período */}
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Data Inicial {isGestao && '*'}</Label><Input type="date" value={dataInicial} onChange={e => setDataInicial(e.target.value)} /></div>
            <div><Label>Data Final {isGestao && '*'}</Label><Input type="date" value={dataFinal} onChange={e => setDataFinal(e.target.value)} /></div>
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
