import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ComboboxFilter } from "@/components/ui/combobox-filter";
import { useSafras } from "@/hooks/useSafras";
import { useProdutos } from "@/hooks/useProdutos";
import { useSilos } from "@/hooks/useSilos";
import { useAllInscricoes } from "@/hooks/useAllInscricoes";
import { useClientesFornecedores } from "@/hooks/useClientesFornecedores";
import { useGranjas } from "@/hooks/useGranjas";
import { useLocaisEntrega } from "@/hooks/useLocaisEntrega";
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
  gerarExtratoCfPdf,
  type DemonstrativoGerencialData,
  type DreReportData,
  type ExtratoCfItem,
} from "@/lib/relatoriosGestao";
import {
  gerarSaldoDisponivelPdf,
  gerarDepositosGeralPdf,
  gerarResumoProdutoresLocalPdf,
  type SaldoDisponivelRow,
  type DepositoRow,
  type ResumoLocalRow,
} from "@/lib/relatoriosEstoque";

import { captureNextRelatorio, cancelPendingCapture, setPendingSheets, type RelatorioPayload, type RelatorioSheet } from "@/lib/relatorioViewer";
import { PreviewRelatorioDialog } from "./PreviewRelatorioDialog";

export type TipoRelatorio = "extrato" | "colheitas" | "vendas" | "demonstrativo_gerencial" | "dre" | "bens_moveis" | "saldo_disponivel" | "depositos_geral" | "resumo_local" | "extrato_cf";

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
  const [localEntregaId, setLocalEntregaId] = useState("");
  const [clienteFornecedorId, setClienteFornecedorId] = useState("");
  const [tipoExtratoCf, setTipoExtratoCf] = useState<"ambos" | "receber" | "pagar">("ambos");
  const [dataInicial, setDataInicial] = useState("");
  const [dataFinal, setDataFinal] = useState("");
  const [tipoFiltro, setTipoFiltro] = useState("ambos");
  const [tipoProdutorFiltro, setTipoProdutorFiltro] = useState("todos");
  const [modoBensMoveis, setModoBensMoveis] = useState("geral_discriminado");
  const [loading, setLoading] = useState(false);
  const [loadingProdutoresSafra, setLoadingProdutoresSafra] = useState(false);
  const [inscricaoIdsComMovimento, setInscricaoIdsComMovimento] = useState<Set<string>>(new Set());
  const [previewPayload, setPreviewPayload] = useState<RelatorioPayload | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const { data: safras } = useSafras();
  const { data: produtos } = useProdutos();
  const { data: silos } = useSilos();
  const { data: inscricoes } = useAllInscricoes();
  const { data: clientes } = useClientesFornecedores();
  const { data: granjas } = useGranjas();
  const { data: locaisEntrega } = useLocaisEntrega();

  // Efeito para definir a granja padrão
  useEffect(() => {
    if (granjas && granjas.length > 0 && !granjaId) {
      const principal = granjas.find(g => g.is_principal);
      if (principal) {
        setGranjaId(principal.id);
      } else {
        // Fallback: ordenar por data de criação
        const sortedGranjas = [...granjas].sort((a, b) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        setGranjaId(sortedGranjas[0].id);
      }
    }
  }, [granjas, granjaId]);

  const compradores = clientes?.filter(c => c.tipo === "cliente" || c.tipo === "ambos") || [];

  useEffect(() => {
    if (tipo !== "extrato" || !safraId) {
      setInscricaoIdsComMovimento(new Set());
      if (tipo === "extrato") setInscricaoId("");
      return;
    }

    let ativo = true;
    setLoadingProdutoresSafra(true);

    const adicionarId = (ids: Set<string>, id: string | null | undefined) => {
      if (id) ids.add(id);
    };

    const carregarProdutoresComMovimento = async () => {
      const [colheitasRes, transferenciasRes, devolucoesRes, notasDepositoRes, comprasRes, contratosRes] = await Promise.all([
        supabase.from("colheitas").select("inscricao_produtor_id").eq("safra_id", safraId),
        supabase.from("transferencias_deposito").select("inscricao_origem_id, inscricao_destino_id").eq("safra_id", safraId),
        supabase.from("devolucoes_deposito").select("inscricao_produtor_id").eq("safra_id", safraId).neq("status", "cancelada"),
        supabase.from("notas_deposito_emitidas").select("inscricao_produtor_id").eq("safra_id", safraId),
        supabase.from("compras_cereais").select("inscricao_vendedor_id, inscricao_comprador_id").eq("safra_id", safraId),
        supabase.from("contratos_venda").select("inscricao_produtor_id").eq("safra_id", safraId),
      ]);

      const erro = colheitasRes.error || transferenciasRes.error || devolucoesRes.error || notasDepositoRes.error || comprasRes.error || contratosRes.error;
      if (erro) throw erro;

      const ids = new Set<string>();
      (colheitasRes.data || []).forEach((row) => adicionarId(ids, row.inscricao_produtor_id));
      (transferenciasRes.data || []).forEach((row) => {
        adicionarId(ids, row.inscricao_origem_id);
        adicionarId(ids, row.inscricao_destino_id);
      });
      (devolucoesRes.data || []).forEach((row) => adicionarId(ids, row.inscricao_produtor_id));
      (notasDepositoRes.data || []).forEach((row) => adicionarId(ids, row.inscricao_produtor_id));
      (comprasRes.data || []).forEach((row) => {
        adicionarId(ids, row.inscricao_vendedor_id);
        adicionarId(ids, row.inscricao_comprador_id);
      });
      (contratosRes.data || []).forEach((row) => adicionarId(ids, row.inscricao_produtor_id));

      if (ativo) {
        setInscricaoIdsComMovimento(ids);
        setInscricaoId((atual) => (atual && ids.has(atual) ? atual : ""));
      }
    };

    carregarProdutoresComMovimento()
      .catch((err: Error) => {
        if (!ativo) return;
        setInscricaoIdsComMovimento(new Set());
        setInscricaoId("");
        toast({
          title: "Erro ao carregar produtores",
          description: err.message,
          variant: "destructive",
        });
      })
      .finally(() => {
        if (ativo) setLoadingProdutoresSafra(false);
      });

    return () => {
      ativo = false;
    };
  }, [tipo, safraId]);

  const produtoresExtratoOptions = (inscricoes || [])
    .filter((inscricao) => inscricaoIdsComMovimento.has(inscricao.id))
    .map((inscricao) => ({
      value: inscricao.id,
      label: `${inscricao.produtores?.nome || inscricao.inscricao_estadual || "Sem nome"} - IE: ${inscricao.inscricao_estadual || "-"}`,
    }))
    .sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));

  const titulos: Record<TipoRelatorio, string> = {
    extrato: "Extrato do Produtor",
    colheitas: "Relatório de Colheitas",
    vendas: "Relatório de Vendas",
    demonstrativo_gerencial: "Demonstrativo Gerencial",
    dre: "DRE - Demonstrativo de Resultado",
    bens_moveis: "Despesas com Bens Móveis",
    saldo_disponivel: "Saldo Disponível - Estoque Geral",
    depositos_geral: "Notas de Depósito",
    resumo_local: "Resumo Produtores por Local",
    extrato_cf: "Extrato de Contas (Cliente/Fornecedor)",
  };

  const gerarRelatorio = async () => {
    if (dataInicial && dataFinal && new Date(dataInicial) > new Date(dataFinal)) {
      toast({
        title: "Período inválido",
        description: "A data inicial não pode ser maior que a data final.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setPreviewOpen(false);
    setPreviewPayload(null);
    const capture = captureNextRelatorio();
    try {
      if (tipo === "extrato") await gerarExtrato();
      else if (tipo === "colheitas") await gerarColheitas();
      else if (tipo === "vendas") await gerarVendas();
      else if (tipo === "demonstrativo_gerencial") await gerarDemonstrativo();
      else if (tipo === "dre") await gerarDre();
      else if (tipo === "bens_moveis") await gerarBensMoveis();
      else if (tipo === "saldo_disponivel") await gerarSaldoDisponivel();
      else if (tipo === "depositos_geral") await gerarDepositos();
      else if (tipo === "resumo_local") await gerarResumoLocal();
      else if (tipo === "extrato_cf") await gerarExtratoCf();

      // Aguarda o payload entregue por qualquer gerador (com timeout de segurança)
      const payload = await Promise.race([
        capture,
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 500)),
      ]);
      if (payload) {
        setPreviewPayload(payload);
        onOpenChange(false);
        setPreviewOpen(true);
      } else {
        cancelPendingCapture();
      }
    } catch (err: any) {
      cancelPendingCapture();
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

  // ========== SALDO DISPONÍVEL ==========
  const gerarSaldoDisponivel = async () => {
    if (!safraId) { toast({ title: "Filtro obrigatório", description: "Selecione a safra.", variant: "destructive" }); return; }
    const safra = safras?.find(s => s.id === safraId);

    // Get all inscricoes with tipo de contrato
    const { data: allInscricoes, error: inscError } = await supabase
      .from("inscricoes_produtor")
      .select("id, inscricao_estadual, granja, tipo, produtores:produtor_id(nome)")
      .eq("ativa", true);

    if (inscError) throw inscError;
    if (!allInscricoes || allInscricoes.length === 0) { toast({ title: "Sem dados", description: "Nenhuma inscrição encontrada." }); return; }

    // Filter by tipo de contrato da inscrição
    let filteredInscricoes = allInscricoes as any[];
    if (tipoProdutorFiltro !== "todos") {
      filteredInscricoes = filteredInscricoes.filter(i => i.tipo === tipoProdutorFiltro);
    }

    const inscricaoIds = filteredInscricoes.map(i => i.id);
    if (inscricaoIds.length === 0) { toast({ title: "Sem dados", description: "Nenhum produtor encontrado com o filtro selecionado." }); return; }

    // Fetch all data for the safra (without .in() filter to avoid URL length limits)
    const [colheitasRes, trDepRes, devRes, comprasRes] = await Promise.all([
      supabase.from("colheitas").select("inscricao_produtor_id, producao_liquida_kg, tipo_colheita, local_entrega_terceiro_id").eq("safra_id", safraId),
      supabase.from("transferencias_deposito").select("inscricao_origem_id, inscricao_destino_id, quantidade_kg").eq("safra_id", safraId),
      supabase.from("devolucoes_deposito").select("inscricao_produtor_id, inscricao_recebe_taxa_id, quantidade_kg, kg_taxa_armazenagem").eq("safra_id", safraId).neq("status", "cancelada"),
      supabase.from("compras_cereais").select("inscricao_vendedor_id, inscricao_comprador_id, quantidade_kg").eq("safra_id", safraId),
    ]);

    // Fetch vendas (remessas via contratos)
    const { data: contratosVenda } = await supabase
      .from("contratos_venda")
      .select("id, inscricao_produtor_id")
      .eq("safra_id", safraId);

    let vendasMap: Record<string, number> = {};
    if (contratosVenda && contratosVenda.length > 0) {
      const contratoIds = contratosVenda.map(c => c.id);
      const { data: remessas } = await supabase
        .from("remessas_venda")
        .select("contrato_venda_id, kg_remessa")
        .in("contrato_venda_id", contratoIds)
        .neq("status", "cancelada");

      if (remessas) {
        const contratoInscricaoMap: Record<string, string> = {};
        contratosVenda.forEach(c => {
          if (c.inscricao_produtor_id) contratoInscricaoMap[c.id] = c.inscricao_produtor_id;
        });
        remessas.forEach(r => {
          const inscId = contratoInscricaoMap[r.contrato_venda_id];
          if (inscId) vendasMap[inscId] = (vendasMap[inscId] || 0) + (r.kg_remessa || 0);
        });
      }
    }

    // Use Set for fast lookup
    const inscricaoSet = new Set(inscricaoIds);

    // Aggregate by inscricao
    const rowMap: Record<string, SaldoDisponivelRow> = {};

    const getRow = (inscId: string): SaldoDisponivelRow => {
      if (!rowMap[inscId]) {
        const insc = filteredInscricoes.find(i => i.id === inscId);
        rowMap[inscId] = {
          produtor_nome: insc?.produtores?.nome || insc?.inscricao_estadual || "-",
          local_entrega: insc?.granja || "-",
          tipo: "INDUST",
          depositos_kg: 0, compras_kg: 0, vendas_kg: 0,
          devolucoes_kg: 0, tr_saida_kg: 0, tr_entrada_kg: 0,
          notas_deposito_kg: 0, saldo_kg: 0,
        };
      }
      return rowMap[inscId];
    };

    // Colheitas
    (colheitasRes.data || []).forEach((c: any) => {
      if (!inscricaoSet.has(c.inscricao_produtor_id)) return;
      const row = getRow(c.inscricao_produtor_id);
      row.depositos_kg += (c.producao_liquida_kg || 0);
      if (c.tipo_colheita === "semente") row.tipo = "SEMENT";
    });

    // Transferências
    (trDepRes.data || []).forEach((t: any) => {
      if (inscricaoSet.has(t.inscricao_origem_id)) {
        getRow(t.inscricao_origem_id).tr_saida_kg += (t.quantidade_kg || 0);
      }
      if (inscricaoSet.has(t.inscricao_destino_id)) {
        getRow(t.inscricao_destino_id).tr_entrada_kg += (t.quantidade_kg || 0);
      }
    });

    // Devoluções
    (devRes.data || []).forEach((d: any) => {
      if (!inscricaoSet.has(d.inscricao_produtor_id)) return;
      getRow(d.inscricao_produtor_id).devolucoes_kg += (d.quantidade_kg || 0);
      // Entr.Arm. = kg de taxa de armazenagem creditados ao SÓCIO que recebe
      if (d.inscricao_recebe_taxa_id && inscricaoSet.has(d.inscricao_recebe_taxa_id)) {
        getRow(d.inscricao_recebe_taxa_id).notas_deposito_kg += (d.kg_taxa_armazenagem || 0);
      }
    });

    // Compras (as buyer = adds stock, as seller = removes stock)
    (comprasRes.data || []).forEach((c: any) => {
      if (inscricaoSet.has(c.inscricao_comprador_id)) {
        getRow(c.inscricao_comprador_id).compras_kg += (c.quantidade_kg || 0);
      }
    });

    // Vendas
    Object.entries(vendasMap).forEach(([inscId, kg]) => {
      if (inscricaoSet.has(inscId)) {
        getRow(inscId).vendas_kg += kg;
      }
    });

    // Calculate saldo
    Object.values(rowMap).forEach(row => {
      row.depositos_kg = Math.round(row.depositos_kg);
      row.compras_kg = Math.round(row.compras_kg);
      row.vendas_kg = Math.round(row.vendas_kg);
      row.devolucoes_kg = Math.round(row.devolucoes_kg);
      row.tr_saida_kg = Math.round(row.tr_saida_kg);
      row.tr_entrada_kg = Math.round(row.tr_entrada_kg);
      row.notas_deposito_kg = Math.round(row.notas_deposito_kg);
      row.saldo_kg = row.depositos_kg + row.compras_kg - row.vendas_kg - row.devolucoes_kg - row.tr_saida_kg + row.tr_entrada_kg - row.notas_deposito_kg;
    });

    const rows = Object.values(rowMap).sort((a, b) => a.produtor_nome.localeCompare(b.produtor_nome));
    if (rows.length === 0) { toast({ title: "Sem dados" }); return; }

    const tipoEntregaLabel: Record<string, string> = {
      "todos": "Todos",
      "1": "Parceria",
      "2": "Arrendamento",
      "3": "Terceiros",
    };


    setPendingSheets([{
      name: "Saldo Disponível",
      header: ["Produtor", "Local", "Tipo", "Depósitos (kg)", "Compras (kg)", "Vendas (kg)", "Devoluções (kg)", "Transf. Saída (kg)", "Transf. Entrada (kg)", "Notas Depósito (kg)", "Saldo (kg)"],
      rows: rows.map(r => [r.produtor_nome, r.local_entrega, r.tipo, r.depositos_kg, r.compras_kg, r.vendas_kg, r.devolucoes_kg, r.tr_saida_kg, r.tr_entrada_kg, r.notas_deposito_kg, r.saldo_kg]),
    }]);

    gerarSaldoDisponivelPdf({
      safraNome: safra?.nome || "-",
      tipoEntrega: tipoEntregaLabel[tipoProdutorFiltro] || "Todos",
      pesoSaco: 60,
      rows,
    });
  };

  // ========== DEPÓSITOS GERAL ==========
  const gerarDepositos = async () => {
    if (!safraId) { toast({ title: "Filtro obrigatório", description: "Selecione a safra.", variant: "destructive" }); return; }
    const safra = safras?.find(s => s.id === safraId);
    const produto = produtoId ? produtos?.find(p => p.id === produtoId) : null;

    let query = supabase
      .from("notas_deposito_emitidas")
      .select(`
        data_emissao, quantidade_kg, status,
        inscricao_produtor:inscricoes_produtor!notas_deposito_emitidas_inscricao_produtor_id_fkey(
          inscricao_estadual,
          produtores:produtor_id(nome)
        ),
        produto:produtos!notas_deposito_emitidas_produto_id_fkey(nome),
        nota_fiscal:notas_fiscais!notas_deposito_emitidas_nota_fiscal_id_fkey(numero)
      `)
      .eq("safra_id", safraId);
    if (produtoId) query = query.eq("produto_id", produtoId);
    const { data, error } = await query.order("data_emissao");
    if (error) throw error;
    if (!data || data.length === 0) { toast({ title: "Sem dados" }); return; }

    const rows: DepositoRow[] = (data as any[]).map(n => ({
      produtor_nome: n.inscricao_produtor?.produtores?.nome || "-",
      inscricao_estadual: n.inscricao_produtor?.inscricao_estadual || "-",
      data_emissao: n.data_emissao,
      quantidade_kg: n.quantidade_kg || 0,
      nota_fiscal: n.nota_fiscal?.numero?.toString() || null,
      status: n.status,
      produto_nome: n.produto?.nome || null,
    }));

    setPendingSheets([{
      name: "Depósitos",
      header: ["Data", "Produtor", "IE", "Produto", "Qtd (kg)", "NF", "Status"],
      rows: rows.map(r => [r.data_emissao ?? "", r.produtor_nome, r.inscricao_estadual, r.produto_nome ?? "", r.quantidade_kg, r.nota_fiscal ?? "", r.status ?? ""]),
    }]);
    gerarDepositosGeralPdf({ safraNome: safra?.nome || "-", produtoNome: produto?.nome || null, rows });
  };

  // ========== RESUMO POR LOCAL ==========
  const gerarResumoLocal = async () => {
    if (!safraId) { toast({ title: "Filtro obrigatório", description: "Selecione a safra.", variant: "destructive" }); return; }
    const safra = safras?.find(s => s.id === safraId);
    const produto = produtoId ? produtos?.find(p => p.id === produtoId) : null;

    // Get inscricoes with local entrega info
    const { data: allInscricoes, error: inscError } = await supabase
      .from("inscricoes_produtor")
      .select("id, granja, produtores:produtor_id(nome)")
      .eq("ativa", true);

    if (inscError) throw inscError;
    if (!allInscricoes || allInscricoes.length === 0) { toast({ title: "Sem dados" }); return; }

    const inscricaoIds = (allInscricoes as any[]).map(i => i.id);

    // Fetch colheitas with local_entrega
    let colheitasQuery = supabase.from("colheitas")
      .select("inscricao_produtor_id, producao_liquida_kg, local_entrega_terceiro_id, locais_entrega:local_entrega_terceiro_id(nome)")
      .eq("safra_id", safraId);
    if (produtoId) colheitasQuery = colheitasQuery.eq("variedade_id", produtoId);
    const { data: colheitas } = await colheitasQuery;

    const [trDepRes, devRes] = await Promise.all([
      supabase.from("transferencias_deposito").select("inscricao_origem_id, inscricao_destino_id, quantidade_kg").eq("safra_id", safraId),
      supabase.from("devolucoes_deposito").select("inscricao_produtor_id, inscricao_recebe_taxa_id, quantidade_kg, kg_taxa_armazenagem").eq("safra_id", safraId).neq("status", "cancelada"),
    ]);

    // Aggregate: key = local + inscricao
    const rowMap: Record<string, ResumoLocalRow> = {};
    const getKey = (local: string, inscId: string) => `${local}::${inscId}`;

    const getRow = (local: string, inscId: string): ResumoLocalRow => {
      const key = getKey(local, inscId);
      if (!rowMap[key]) {
        const insc = (allInscricoes as any[]).find(i => i.id === inscId);
        rowMap[key] = {
          local_entrega: local,
          produtor_nome: insc?.produtores?.nome || "-",
          depositos_kg: 0, devolucoes_kg: 0, tr_saida_kg: 0, tr_entrada_kg: 0, notas_deposito_kg: 0, saldo_kg: 0,
        };
      }
      return rowMap[key];
    };

    // Colheitas grouped by local
    (colheitas || []).forEach((c: any) => {
      const local = c.locais_entrega?.nome || "Sede";
      getRow(local, c.inscricao_produtor_id).depositos_kg += (c.producao_liquida_kg || 0);
    });

    // Transferências
    (trDepRes.data || []).forEach((t: any) => {
      if (inscricaoIds.includes(t.inscricao_origem_id)) {
        getRow("Sede", t.inscricao_origem_id).tr_saida_kg += (t.quantidade_kg || 0);
      }
      if (inscricaoIds.includes(t.inscricao_destino_id)) {
        getRow("Sede", t.inscricao_destino_id).tr_entrada_kg += (t.quantidade_kg || 0);
      }
    });

    // Devoluções + Entr.Arm (kg_taxa_armazenagem creditado ao sócio)
    (devRes.data || []).forEach((d: any) => {
      if (inscricaoIds.includes(d.inscricao_produtor_id)) {
        getRow("Sede", d.inscricao_produtor_id).devolucoes_kg += (d.quantidade_kg || 0);
      }
      if (d.inscricao_recebe_taxa_id && inscricaoIds.includes(d.inscricao_recebe_taxa_id)) {
        getRow("Sede", d.inscricao_recebe_taxa_id).notas_deposito_kg += (d.kg_taxa_armazenagem || 0);
      }
    });

    // Calculate saldo
    Object.values(rowMap).forEach(row => {
      row.depositos_kg = Math.round(row.depositos_kg);
      row.devolucoes_kg = Math.round(row.devolucoes_kg);
      row.tr_saida_kg = Math.round(row.tr_saida_kg);
      row.tr_entrada_kg = Math.round(row.tr_entrada_kg);
      row.notas_deposito_kg = Math.round(row.notas_deposito_kg);
      row.saldo_kg = row.depositos_kg - row.devolucoes_kg - row.tr_saida_kg + row.tr_entrada_kg - row.notas_deposito_kg;
    });

    const rows = Object.values(rowMap).sort((a, b) => a.local_entrega.localeCompare(b.local_entrega) || a.produtor_nome.localeCompare(b.produtor_nome));
    if (rows.length === 0) { toast({ title: "Sem dados" }); return; }

    setPendingSheets([{
      name: "Resumo por Local",
      header: ["Local", "Produtor", "Depósitos (kg)", "Devoluções (kg)", "Transf. Saída (kg)", "Transf. Entrada (kg)", "Notas Depósito (kg)", "Saldo (kg)"],
      rows: rows.map(r => [r.local_entrega, r.produtor_nome, r.depositos_kg, r.devolucoes_kg, r.tr_saida_kg, r.tr_entrada_kg, r.notas_deposito_kg, r.saldo_kg]),
    }]);
    gerarResumoProdutoresLocalPdf({
      safraNome: safra?.nome || "-",
      produtoNome: produto?.nome || null,
      pesoSaco: 60,
      rows,
    });
  };

  // ========== Existing reports ==========
  const gerarExtrato = async () => {
    if (!safraId || !inscricaoId) {
      toast({ title: "Filtros obrigatórios", description: "Selecione a safra e o produtor/inscrição.", variant: "destructive" });
      return;
    }
    const inscricao = inscricoes?.find(i => i.id === inscricaoId);
    const safra = safras?.find(s => s.id === safraId);
    const produto = null;

    const colheitasQuery = supabase
      .from("colheitas")
      .select(colheitasSelect)
      .eq("inscricao_produtor_id", inscricaoId)
      .eq("safra_id", safraId);
    const { data: colheitas, error: colheitasError } = await colheitasQuery.order("data_colheita");
    if (colheitasError) throw colheitasError;

    const trRecQuery = supabase.from("transferencias_deposito").select("data_transferencia, quantidade_kg, inscricao_origem:inscricoes_produtor!transferencias_deposito_inscricao_origem_id_fkey(granja, produtores(nome))")
      .eq("inscricao_destino_id", inscricaoId).eq("safra_id", safraId);
    const { data: trRec } = await trRecQuery.order("data_transferencia");

    const trEnvQuery = supabase.from("transferencias_deposito").select("data_transferencia, quantidade_kg, inscricao_destino:inscricoes_produtor!transferencias_deposito_inscricao_destino_id_fkey(granja, produtores(nome))")
      .eq("inscricao_origem_id", inscricaoId).eq("safra_id", safraId);
    const { data: trEnv } = await trEnvQuery.order("data_transferencia");

    const devQuery = supabase.from("devolucoes_deposito").select("data_devolucao, quantidade_kg, taxa_armazenagem, kg_taxa_armazenagem")
      .eq("inscricao_produtor_id", inscricaoId).eq("safra_id", safraId);
    const { data: devolucoes } = await devQuery.order("data_devolucao");

    const ndQuery = supabase.from("notas_deposito_emitidas").select("data_emissao, quantidade_kg, nota_fiscal:notas_fiscais(numero)")
      .eq("inscricao_produtor_id", inscricaoId).eq("safra_id", safraId);
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
    const PS = 60;
    const sc = (kg: number) => Math.round((kg || 0) / PS);
    const sum = (arr: any[], key: string) => arr.reduce((s, x) => s + (Number(x[key]) || 0), 0);

    const colheitasRows = extratoData.colheitas.map(c => [c.data_colheita ?? "", c.lavoura ?? "", c.peso_bruto ?? 0, c.peso_tara ?? 0, c.producao_kg ?? 0, c.umidade ?? 0, c.impureza ?? 0, c.kg_desconto_total ?? 0, c.producao_liquida_kg ?? 0, sc(Number(c.producao_liquida_kg) || 0)]);
    if (colheitasRows.length) {
      const totLiq = sum(extratoData.colheitas, "producao_liquida_kg");
      colheitasRows.push(["TOTAL", "", sum(extratoData.colheitas, "peso_bruto"), sum(extratoData.colheitas, "peso_tara"), sum(extratoData.colheitas, "producao_kg"), "", "", sum(extratoData.colheitas, "kg_desconto_total"), totLiq, sc(totLiq)]);
    }

    const trRecRows = extratoData.transferenciasRecebidas.map(t => [t.data_transferencia, t.nome_outro ?? "", t.quantidade_kg, sc(Number(t.quantidade_kg) || 0)]);
    if (trRecRows.length) {
      const tot = sum(extratoData.transferenciasRecebidas, "quantidade_kg");
      trRecRows.push(["TOTAL", "", tot, sc(tot)]);
    }

    const trEnvRows = extratoData.transferenciasEnviadas.map(t => [t.data_transferencia, t.nome_outro ?? "", t.quantidade_kg, sc(Number(t.quantidade_kg) || 0)]);
    if (trEnvRows.length) {
      const tot = sum(extratoData.transferenciasEnviadas, "quantidade_kg");
      trEnvRows.push(["TOTAL", "", tot, sc(tot)]);
    }

    const devRows = extratoData.devolucoes.map(d => [d.data_devolucao, d.quantidade_kg, sc(Number(d.quantidade_kg) || 0), d.taxa_armazenagem ?? 0, d.kg_taxa_armazenagem ?? 0]);
    if (devRows.length) {
      const tot = sum(extratoData.devolucoes, "quantidade_kg");
      devRows.push(["TOTAL", tot, sc(tot), "", sum(extratoData.devolucoes, "kg_taxa_armazenagem")]);
    }

    const ndRows = extratoData.notasDeposito.map(n => [n.data_emissao ?? "", n.nota_fiscal_numero ?? "", n.quantidade_kg, sc(Number(n.quantidade_kg) || 0)]);
    if (ndRows.length) {
      const tot = sum(extratoData.notasDeposito, "quantidade_kg");
      ndRows.push(["TOTAL", "", tot, sc(tot)]);
    }

    const totalColheitas = sum(extratoData.colheitas, "producao_liquida_kg");
    const totalTrRec = sum(extratoData.transferenciasRecebidas, "quantidade_kg");
    const totalTrEnv = sum(extratoData.transferenciasEnviadas, "quantidade_kg");
    const totalDev = sum(extratoData.devolucoes, "quantidade_kg");
    const totalKgTaxa = sum(extratoData.devolucoes, "kg_taxa_armazenagem");
    const saldo = totalColheitas + totalTrRec - totalTrEnv - totalDev - totalKgTaxa;

    setPendingSheets([
      { name: "Colheitas", header: ["Data", "Lavoura", "Peso Bruto", "Peso Tara", "Produção (kg)", "Umidade %", "Impureza %", "Desconto (kg)", "Líquido (kg)", "Sacas"], rows: colheitasRows },
      { name: "Transf. Recebidas", header: ["Data", "De", "Qtd (kg)", "Sacas"], rows: trRecRows },
      { name: "Transf. Enviadas", header: ["Data", "Para", "Qtd (kg)", "Sacas"], rows: trEnvRows },
      { name: "Devoluções", header: ["Data", "Qtd (kg)", "Sacas", "Taxa Arm. %", "Kg Taxa"], rows: devRows },
      { name: "Notas Depósito", header: ["Data", "NF", "Qtd (kg)", "Sacas"], rows: ndRows },
      { name: "Resumo Final", header: ["Descrição", "Kg", "Sacas"], rows: [
        ["Total Colheitas", totalColheitas, sc(totalColheitas)],
        ["(+) Transf. Recebidas", totalTrRec, sc(totalTrRec)],
        ["(-) Transf. Enviadas", totalTrEnv, sc(totalTrEnv)],
        ["(-) Devoluções", totalDev, sc(totalDev)],
        ["(-) Kg Taxa Armazenagem", totalKgTaxa, sc(totalKgTaxa)],
        ["SALDO", saldo, sc(saldo)],
      ] },
    ]);
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
    setPendingSheets([{
      name: "Colheitas",
      header: ["Data", "Produtor", "Lavoura", "Placa", "Peso Bruto", "Peso Tara", "Produção (kg)", "Umidade %", "Impureza %", "Desconto (kg)", "Líquido (kg)", "Sacos"],
      rows: mapped.map(m => [m.data_colheita ?? "", m.produtor_nome ?? "", m.lavoura_nome ?? "", m.placa ?? "", m.peso_bruto ?? 0, m.peso_tara ?? 0, m.producao_kg ?? 0, m.umidade ?? 0, m.impureza ?? 0, m.kg_desconto_total ?? 0, m.producao_liquida_kg ?? 0, m.total_sacos ?? 0]),
    }]);
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
    setPendingSheets([{
      name: "Vendas",
      header: ["Nº", "Data", "Comprador", "Produto", "Qtd (kg)", "Preço/kg", "Valor Total", "Carregado (kg)", "Saldo (kg)"],
      rows: mapped.map(m => [m.numero ?? "", m.data_contrato ?? "", m.comprador_nome ?? "", m.produto_nome ?? "", m.quantidade_kg ?? 0, m.preco_kg ?? 0, m.valor_total ?? 0, m.total_carregado_kg ?? 0, m.saldo_kg ?? 0]),
    }]);
    gerarRelatorioVendasPdf(mapped, `Safra: ${safra?.nome || "-"}`);
  };

  // ========== Management reports ==========
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
    
    // 1. Fetch DRE structure
    const { data: dreContas } = await supabase.from("dre_contas").select("*").order("codigo");
    if (!dreContas || dreContas.length === 0) { toast({ title: "Sem estrutura", description: "Cadastre a estrutura do DRE primeiro." }); return; }

    // 2. Fetch all mapping data
    const [{ data: subCentros }, { data: produtosData }, { data: grupos }] = await Promise.all([
      supabase.from("sub_centros_custo").select("id, codigo_dre"),
      supabase.from("produtos").select("id, grupo_id"),
      supabase.from("grupos_produtos").select("id, codigo_dre")
    ]);

    const getDreIdFromCode = (code: string) => dreContas.find(c => c.codigo === code)?.id;

    const mapRecordToDreId = (rec: any) => {
      if (rec.dre_conta_id) return rec.dre_conta_id;
      
      // Map via sub_centro_custo
      if (rec.sub_centro_custo_id) {
        const sc = subCentros?.find(s => s.id === rec.sub_centro_custo_id);
        if (sc?.codigo_dre) return getDreIdFromCode(sc.codigo_dre);
      }

      // Map via produto -> grupo
      if (rec.produto_id) {
        const prod = produtosData?.find(p => p.id === rec.produto_id);
        if (prod?.grupo_id) {
          const grp = grupos?.find(g => g.id === prod.grupo_id);
          if (grp?.codigo_dre) return getDreIdFromCode(grp.codigo_dre);
        }
      }

      return null;
    };

    // 3. Fetch financial data from 3 sources
    const fetchPeriodData = async (start: string | null, end: string) => {
      const queries = [
        supabase.from("lancamentos_financeiros").select("valor, tipo, dre_conta_id, sub_centro_custo_id, produto_id"),
        supabase.from("contas_pagar").select("valor_pago, dre_conta_id, sub_centro_custo_id, produto_id").neq("status", "cancelado"),
        supabase.from("contas_receber").select("valor_pago, dre_conta_id, sub_centro_custo_id, produto_id").neq("status", "cancelado")
      ];

      const scopedQueries = queries.map(q => {
        let sq = q;
        if (start) {
          if ((sq as any).table === 'lancamentos_financeiros') sq = sq.gte("data_lancamento", start);
          else sq = sq.gte("data_emissao", start); // Using emission date for DRE accrual/period
        }
        if (end) {
          if ((sq as any).table === 'lancamentos_financeiros') sq = sq.lte("data_lancamento", end);
          else sq = sq.lte("data_emissao", end);
        }
        if (granjaId) sq = sq.eq("granja_id", granjaId);
        return sq;
      });

      const results = await Promise.all(scopedQueries);
      const allData: any[] = [];
      
      // Normalizar dados
      (results[0].data || []).forEach(l => allData.push({ 
        valor: Number(l.valor), 
        tipo: l.tipo, 
        dre_id: mapRecordToDreId(l) 
      }));
      (results[1].data || []).forEach(l => allData.push({ 
        valor: Number(l.valor_pago || 0), 
        tipo: 'despesa', 
        dre_id: mapRecordToDreId(l) 
      }));
      (results[2].data || []).forEach(l => allData.push({ 
        valor: Number(l.valor_pago || 0), 
        tipo: 'receita', 
        dre_id: mapRecordToDreId(l) 
      }));

      return allData.filter(d => d.dre_id);
    };

    const lancamentos = await fetchPeriodData(dataInicial, dataFinal);
    const lancamentosAnt = await fetchPeriodData(null, new Date(new Date(dataInicial).getTime() - 86400000).toISOString().split('T')[0]);

    // Cache para somas recursivas
    const memoAnt: Record<string, number> = {};
    const memoPeriodo: Record<string, number> = {};

    const getSomaRecursiva = (list: any[], contaId: string, allContas: any[], memo: Record<string, number>): number => {
      if (memo[contaId] !== undefined) return memo[contaId];
      
      let total = list.filter(l => l.dre_id === contaId)
        .reduce((s, l) => s + (l.tipo === 'receita' ? l.valor : -l.valor), 0);
      
      const children = allContas.filter(c => c.parent_id === contaId);
      children.forEach(child => {
        total += getSomaRecursiva(list, child.id, allContas, memo);
      });
      
      memo[contaId] = total;
      return total;
    };

    const contas: DreReportData["contas"] = (dreContas as any[]).map(c => {
      const saldo_anterior = getSomaRecursiva(lancamentosAnt, c.id, dreContas, memoAnt);
      const valor_periodo = getSomaRecursiva(lancamentos, c.id, dreContas, memoPeriodo);
      
      return { 
        codigo: c.codigo, 
        descricao: c.descricao, 
        nivel: c.nivel || 1, 
        saldo_anterior, 
        valor_periodo, 
        saldo_atual: saldo_anterior + valor_periodo 
      };
    });

    if (contas.every(c => c.saldo_anterior === 0 && c.valor_periodo === 0)) {
      toast({ 
        title: "Sem dados para o DRE", 
        description: "Nenhum lançamento vinculado a contas DRE foi encontrado no período selecionado.",
        variant: "default"
      });
    }

    gerarDrePdf({ periodo: `${fmtD(dataInicial)} a ${fmtD(dataFinal)}`, contas });
  };

  const gerarBensMoveis = async () => {
    if (!dataInicial || !dataFinal) { toast({ title: "Filtros obrigatórios", description: "Informe o período.", variant: "destructive" }); return; }
    const { data: gruposMaq } = await supabase.from("grupos_produtos").select("id, nome").eq("maquinas_implementos", true);
    if (!gruposMaq || gruposMaq.length === 0) { toast({ title: "Sem dados", description: "Nenhum grupo classificado como máquinas/implementos." }); return; }

    let query = supabase.from("lancamentos_financeiros" as any)
      .select("data_lancamento, descricao, valor, documento, sub_centros_custo:sub_centro_custo_id(codigo, descricao, plano_contas_gerencial:centro_custo_id(codigo, descricao))")
      .gte("data_lancamento", dataInicial).lte("data_lancamento", dataFinal).eq("tipo", "despesa");
    if (granjaId) query = query.eq("granja_id", granjaId);
    const { data: lancamentos } = await query;

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


  // ========== EXTRATO CONTAS PAGAR/RECEBER POR CLIENTE/FORNECEDOR ==========
  const gerarExtratoCf = async () => {
    if (!clienteFornecedorId) {
      toast({ title: "Filtro obrigatório", description: "Selecione o cliente/fornecedor.", variant: "destructive" });
      return;
    }
    if (!dataInicial || !dataFinal) {
      toast({ title: "Filtro obrigatório", description: "Informe o período (data inicial e final).", variant: "destructive" });
      return;
    }

    const cli = clientes?.find(c => c.id === clienteFornecedorId);
    const itens: ExtratoCfItem[] = [];

    const buscarUltPagto = async (contaIds: string[], tabela: "contas_receber_baixas" | "contas_pagar_baixas") => {
      const map: Record<string, string> = {};
      if (contaIds.length === 0) return map;
      const { data } = await supabase
        .from(tabela)
        .select("conta_id, data_pagamento")
        .in("conta_id", contaIds)
        .order("data_pagamento", { ascending: false });
      (data || []).forEach((b: any) => {
        if (!map[b.conta_id]) map[b.conta_id] = b.data_pagamento;
      });
      return map;
    };

    if (tipoExtratoCf !== "pagar") {
      const { data: cr, error: crErr } = await supabase
        .from("contas_receber")
        .select("id, data_emissao, data_vencimento, documento, parcela, valor_original, valor_pago, juros, multa, desconto, status")
        .eq("cliente_id", clienteFornecedorId)
        .gte("data_emissao", dataInicial)
        .lte("data_emissao", dataFinal)
        .neq("status", "cancelado")
        .order("data_vencimento");
      if (crErr) throw crErr;
      const ultMap = await buscarUltPagto((cr || []).map(c => c.id), "contas_receber_baixas");
      (cr || []).forEach(c => itens.push({
        tipo: "receber",
        data_emissao: c.data_emissao,
        data_vencimento: c.data_vencimento,
        documento: c.documento,
        parcela: c.parcela,
        valor_original: Number(c.valor_original),
        valor_pago: Number(c.valor_pago),
        juros: Number(c.juros),
        multa: Number(c.multa),
        desconto: Number(c.desconto),
        status: c.status,
        data_ult_pagamento: ultMap[c.id] || null,
      }));
    }

    if (tipoExtratoCf !== "receber") {
      const { data: cp, error: cpErr } = await supabase
        .from("contas_pagar")
        .select("id, data_emissao, data_vencimento, documento, parcela, valor_original, valor_pago, juros, multa, desconto, status")
        .eq("fornecedor_id", clienteFornecedorId)
        .gte("data_emissao", dataInicial)
        .lte("data_emissao", dataFinal)
        .neq("status", "cancelado")
        .order("data_vencimento");
      if (cpErr) throw cpErr;
      const ultMap = await buscarUltPagto((cp || []).map(c => c.id), "contas_pagar_baixas");
      (cp || []).forEach(c => itens.push({
        tipo: "pagar",
        data_emissao: c.data_emissao,
        data_vencimento: c.data_vencimento,
        documento: c.documento,
        parcela: c.parcela,
        valor_original: Number(c.valor_original),
        valor_pago: Number(c.valor_pago),
        juros: Number(c.juros),
        multa: Number(c.multa),
        desconto: Number(c.desconto),
        status: c.status,
        data_ult_pagamento: ultMap[c.id] || null,
      }));
    }

    if (itens.length === 0) {
      toast({ title: "Sem dados", description: "Nenhum lançamento encontrado para o filtro." });
      return;
    }

    setPendingSheets([{
      name: "Extrato",
      header: ["Tipo", "Emissão", "Vencimento", "Documento", "Parcela", "Valor Original", "Valor Pago", "Juros", "Multa", "Desconto", "Status", "Último Pagto"],
      rows: itens.map(i => [i.tipo, i.data_emissao ?? "", i.data_vencimento ?? "", i.documento ?? "", i.parcela ?? "", i.valor_original, i.valor_pago, i.juros, i.multa, i.desconto, i.status ?? "", i.data_ult_pagamento ?? ""]),
    }]);
    gerarExtratoCfPdf({
      cliente_nome: cli?.nome || "-",
      cliente_doc: cli?.cpf_cnpj || null,
      periodo: `${fmtD(dataInicial)} a ${fmtD(dataFinal)}`,
      tipoFiltro: tipoExtratoCf,
      itens,
    });
  };

  const isGestao = tipo === "demonstrativo_gerencial" || tipo === "dre" || tipo === "bens_moveis";
  const isEstoque = tipo === "saldo_disponivel" || tipo === "depositos_geral" || tipo === "resumo_local";
  const needsSafra = !isGestao && tipo !== "extrato_cf";
  const needsProduto = tipo === "colheitas" || tipo === "depositos_geral" || tipo === "resumo_local";

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{titulos[tipo]}</DialogTitle>
          <DialogDescription>Selecione os filtros para gerar o relatório em PDF.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Safra */}
          {needsSafra && (
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

          {/* Tipo Produtor - saldo disponível */}
          {tipo === "saldo_disponivel" && (
            <div>
              <Label>Tipo de Contrato</Label>
              <ComboboxFilter
                value={tipoProdutorFiltro}
                onValueChange={setTipoProdutorFiltro}
                options={[
                  { value: "todos", label: "Todos" },
                  { value: "1", label: "Parceria" },
                  { value: "2", label: "Arrendamento" },
                  { value: "3", label: "Terceiros" },
                ]}
                searchPlaceholder="Buscar tipo..."
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
                options={produtoresExtratoOptions}
                placeholder={safraId ? "Selecione o produtor" : "Selecione a safra primeiro"}
                searchPlaceholder="Buscar produtor..."
                emptyText={safraId ? "Nenhum produtor com movimentação nesta safra." : "Selecione a safra primeiro."}
                popoverWidth="w-[400px]"
                disabled={!safraId || loadingProdutoresSafra}
              />
            </div>
          )}

          {/* Cliente/Fornecedor - extrato_cf */}
          {tipo === "extrato_cf" && (
            <>
              <div>
                <Label>Cliente / Fornecedor *</Label>
                <ComboboxFilter
                  value={clienteFornecedorId}
                  onValueChange={setClienteFornecedorId}
                  options={(clientes || []).map(c => ({
                    value: c.id,
                    label: `${c.nome}${c.nome_fantasia ? ` (${c.nome_fantasia})` : ''}`,
                  }))}
                  placeholder="Selecione o cliente/fornecedor"
                  searchPlaceholder="Buscar..."
                  emptyText="Nenhum encontrado."
                  popoverWidth="w-[400px]"
                />
              </div>
              <div>
                <Label>Tipo de Conta</Label>
                <ComboboxFilter
                  value={tipoExtratoCf}
                  onValueChange={(v) => setTipoExtratoCf(v as any)}
                  options={[
                    { value: "ambos", label: "A Receber e A Pagar" },
                    { value: "receber", label: "Apenas A Receber" },
                    { value: "pagar", label: "Apenas A Pagar" },
                  ]}
                  searchPlaceholder="Buscar tipo..."
                />
              </div>
            </>
          )}

          {/* Produto */}
          {needsProduto && (
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
          {!isEstoque && tipo !== "extrato" && (
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Data Inicial {(isGestao || tipo === "extrato_cf") && '*'}</Label><Input type="date" value={dataInicial} onChange={e => setDataInicial(e.target.value)} /></div>
              <div><Label>Data Final {(isGestao || tipo === "extrato_cf") && '*'}</Label><Input type="date" value={dataFinal} onChange={e => setDataFinal(e.target.value)} /></div>
            </div>
          )}

          <Button onClick={gerarRelatorio} disabled={loading} className="w-full">
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileDown className="h-4 w-4 mr-2" />}
            Gerar Relatório
          </Button>
        </div>
      </DialogContent>
    </Dialog>

    <PreviewRelatorioDialog
      payload={previewPayload}
      open={previewOpen}
      onOpenChange={(o) => {
        setPreviewOpen(o);
        if (!o) setPreviewPayload(null);
      }}
    />
    </>
  );
}

