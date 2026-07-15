import { useState } from "react";
import { useLocation } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  BarChart3, FileText, Wheat, ShoppingCart, PieChart, TrendingUp,
  Truck, Package, MapPin, Warehouse, Users, ClipboardList, LucideIcon,
} from "lucide-react";
import { RelatorioDialog } from "@/components/relatorios/RelatorioDialog";

type TipoRelatorio =
  | "extrato" | "resumo_produtor" | "colheitas" | "colheita_diaria" | "vendas"
  | "demonstrativo_gerencial" | "dre" | "bens_moveis"
  | "saldo_disponivel" | "depositos_geral" | "resumo_local" | "extrato_cf";


type Secao = "producao" | "comercial" | "financeiro" | "todos";

interface RelatorioCard {
  tipo: TipoRelatorio;
  titulo: string;
  descricao: string;
  detalhe: string;
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
  primario?: boolean;
}

interface Grupo {
  secao: Secao;
  titulo: string;
  cards: RelatorioCard[];
}

const GRUPOS: Grupo[] = [
  {
    secao: "producao",
    titulo: "Produção / Estoque",
    cards: [
      { tipo: "extrato", titulo: "Extrato do Produtor", descricao: "Movimentação completa por produtor",
        detalhe: "Colheitas, transferências, devoluções, notas de depósito e saldo final.",
        icon: FileText, iconBg: "bg-primary/10", iconColor: "text-primary", primario: true },
      { tipo: "resumo_produtor", titulo: "Resumo do Produtor", descricao: "Resumo geral por local, cultura e safra",
        detalhe: "Uma linha por inscrição com depósitos, compras, vendas, devoluções, transferências e saldo.",
        icon: ClipboardList, iconBg: "bg-primary/10", iconColor: "text-primary", primario: true },
      { tipo: "colheitas", titulo: "Relatório de Colheitas", descricao: "Listagem detalhada de colheitas",
        detalhe: "Dados de pesagem, umidade, impureza, descontos e produção líquida.",
        icon: Wheat, iconBg: "bg-success/10", iconColor: "text-success" },
      { tipo: "saldo_disponivel", titulo: "Saldo Disponível", descricao: "Estoque geral por produtor",
        detalhe: "Depósitos, compras, vendas, devoluções, transferências e saldo por produtor.",
        icon: Package, iconBg: "bg-emerald-500/10", iconColor: "text-emerald-600", primario: true },
      { tipo: "depositos_geral", titulo: "Depósitos Geral", descricao: "Notas de depósito emitidas",
        detalhe: "Listagem completa de notas de depósito por produtor, safra e produto.",
        icon: Warehouse, iconBg: "bg-amber-500/10", iconColor: "text-amber-600" },
      { tipo: "resumo_local", titulo: "Resumo por Local", descricao: "Produtores por local de entrega",
        detalhe: "Resumo agrupado por local de entrega com saldos por produtor.",
        icon: MapPin, iconBg: "bg-blue-500/10", iconColor: "text-blue-600" },
    ],
  },
  {
    secao: "comercial",
    titulo: "Comercial",
    cards: [
      { tipo: "vendas", titulo: "Relatório de Vendas", descricao: "Resumo dos contratos de venda",
        detalhe: "Contratos, quantidades, valores, carregado e saldo pendente.",
        icon: ShoppingCart, iconBg: "bg-info/10", iconColor: "text-info", primario: true },
    ],
  },
  {
    secao: "financeiro",
    titulo: "Gestão Financeira",
    cards: [
      { tipo: "demonstrativo_gerencial", titulo: "Demonstrativo Gerencial", descricao: "Receitas e despesas por centro de custo",
        detalhe: "Agrupado por centro e sub-centro de custo, com percentuais e totais.",
        icon: PieChart, iconBg: "bg-primary/10", iconColor: "text-primary", primario: true },
      { tipo: "dre", titulo: "DRE", descricao: "Demonstrativo de Resultado",
        detalhe: "Estrutura hierárquica com saldo anterior, valor do período e saldo atual.",
        icon: TrendingUp, iconBg: "bg-success/10", iconColor: "text-success" },
      { tipo: "bens_moveis", titulo: "Bens Móveis", descricao: "Despesas com máquinas e implementos",
        detalhe: "Despesas filtradas por grupos classificados como máquinas/implementos.",
        icon: Truck, iconBg: "bg-warning/10", iconColor: "text-warning" },
      { tipo: "extrato_cf", titulo: "Extrato Cliente/Fornecedor", descricao: "Contas a Pagar e Receber por parceiro",
        detalhe: "Lançamentos do cliente/fornecedor no período com valores, pagos, saldo e status.",
        icon: Users, iconBg: "bg-emerald-500/10", iconColor: "text-emerald-600" },
    ],
  },
];

const TITULOS_PAGINA: Record<Secao, { title: string; description: string }> = {
  producao: { title: "Relatórios de Produção", description: "Extratos e relatórios de colheitas, estoque e depósitos" },
  comercial: { title: "Relatórios Comerciais", description: "Relatórios de vendas e contratos" },
  financeiro: { title: "Relatórios Financeiros", description: "DRE, demonstrativos e extratos financeiros" },
  todos: { title: "Relatórios Gerenciais", description: "Gere extratos e relatórios em PDF" },
};

function detectarSecao(pathname: string): Secao {
  if (pathname.includes("/relatorios/producao")) return "producao";
  if (pathname.includes("/relatorios/comercial")) return "comercial";
  if (pathname.includes("/relatorios/financeiro")) return "financeiro";
  return "todos";
}

export default function Relatorios() {
  const { pathname } = useLocation();
  const secao = detectarSecao(pathname);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [tipoRelatorio, setTipoRelatorio] = useState<TipoRelatorio>("extrato");

  const abrirRelatorio = (tipo: TipoRelatorio) => {
    setTipoRelatorio(tipo);
    setDialogOpen(true);
  };

  const gruposExibidos = secao === "todos" ? GRUPOS : GRUPOS.filter((g) => g.secao === secao);
  const cabecalho = TITULOS_PAGINA[secao];

  return (
    <AppLayout>
      <PageHeader
        title={cabecalho.title}
        description={cabecalho.description}
        icon={<BarChart3 className="h-6 w-6" />}
      />

      {gruposExibidos.map((grupo, idx) => (
        <div key={grupo.secao}>
          {secao === "todos" && (
            <h3 className={`text-lg font-semibold mb-4 ${idx === 0 ? "mt-6" : "mt-8"}`}>{grupo.titulo}</h3>
          )}
          <div className={`grid grid-cols-1 md:grid-cols-3 gap-6 ${secao !== "todos" ? "mt-6" : ""}`}>
            {grupo.cards.map((card) => {
              const Icon = card.icon;
              return (
                <Card key={card.tipo} className="hover:shadow-md transition-shadow border-primary/20">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${card.iconBg}`}>
                        <Icon className={`h-5 w-5 ${card.iconColor}`} />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{card.titulo}</CardTitle>
                        <CardDescription>{card.descricao}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">{card.detalhe}</p>
                    <Button
                      onClick={() => abrirRelatorio(card.tipo)}
                      variant={card.primario ? "default" : "outline"}
                      className="w-full"
                    >
                      Gerar Relatório
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ))}

      <RelatorioDialog tipo={tipoRelatorio} open={dialogOpen} onOpenChange={setDialogOpen} />
    </AppLayout>
  );
}
