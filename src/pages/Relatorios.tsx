import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3, FileText, Wheat, ShoppingCart, PieChart, TrendingUp, Truck } from "lucide-react";
import { RelatorioDialog } from "@/components/relatorios/RelatorioDialog";

type TipoRelatorio = "extrato" | "colheitas" | "vendas" | "demonstrativo_gerencial" | "dre" | "bens_moveis";

export default function Relatorios() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [tipoRelatorio, setTipoRelatorio] = useState<TipoRelatorio>("extrato");

  const abrirRelatorio = (tipo: TipoRelatorio) => {
    setTipoRelatorio(tipo);
    setDialogOpen(true);
  };

  return (
    <AppLayout>
      <PageHeader
        title="Relatórios Gerenciais"
        description="Gere extratos e relatórios em PDF"
        icon={<BarChart3 className="h-6 w-6" />}
      />

      {/* Relatórios Operacionais */}
      <h3 className="text-lg font-semibold mt-6 mb-4">Operacionais</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10"><FileText className="h-5 w-5 text-primary" /></div>
              <div><CardTitle className="text-lg">Extrato do Produtor</CardTitle><CardDescription>Movimentação completa por produtor</CardDescription></div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">Colheitas, transferências, devoluções, notas de depósito e saldo final.</p>
            <Button onClick={() => abrirRelatorio("extrato")} className="w-full">Gerar Extrato</Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10"><Wheat className="h-5 w-5 text-success" /></div>
              <div><CardTitle className="text-lg">Relatório de Colheitas</CardTitle><CardDescription>Listagem detalhada de colheitas</CardDescription></div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">Dados de pesagem, umidade, impureza, descontos e produção líquida.</p>
            <Button onClick={() => abrirRelatorio("colheitas")} variant="outline" className="w-full">Gerar Relatório</Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-info/10"><ShoppingCart className="h-5 w-5 text-info" /></div>
              <div><CardTitle className="text-lg">Relatório de Vendas</CardTitle><CardDescription>Resumo dos contratos de venda</CardDescription></div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">Contratos, quantidades, valores, carregado e saldo pendente.</p>
            <Button onClick={() => abrirRelatorio("vendas")} variant="outline" className="w-full">Gerar Relatório</Button>
          </CardContent>
        </Card>
      </div>

      {/* Relatórios de Gestão */}
      <h3 className="text-lg font-semibold mt-8 mb-4">Gestão Financeira</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="hover:shadow-md transition-shadow border-primary/20">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10"><PieChart className="h-5 w-5 text-primary" /></div>
              <div><CardTitle className="text-lg">Demonstrativo Gerencial</CardTitle><CardDescription>Receitas e despesas por centro de custo</CardDescription></div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">Agrupado por centro e sub-centro de custo, com percentuais e totais.</p>
            <Button onClick={() => abrirRelatorio("demonstrativo_gerencial")} className="w-full">Gerar Relatório</Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow border-primary/20">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10"><TrendingUp className="h-5 w-5 text-success" /></div>
              <div><CardTitle className="text-lg">DRE</CardTitle><CardDescription>Demonstrativo de Resultado</CardDescription></div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">Estrutura hierárquica com saldo anterior, valor do período e saldo atual.</p>
            <Button onClick={() => abrirRelatorio("dre")} variant="outline" className="w-full">Gerar Relatório</Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow border-primary/20">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/10"><Truck className="h-5 w-5 text-warning" /></div>
              <div><CardTitle className="text-lg">Bens Móveis</CardTitle><CardDescription>Despesas com máquinas e implementos</CardDescription></div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">Despesas filtradas por grupos classificados como máquinas/implementos.</p>
            <Button onClick={() => abrirRelatorio("bens_moveis")} variant="outline" className="w-full">Gerar Relatório</Button>
          </CardContent>
        </Card>
      </div>

      <RelatorioDialog tipo={tipoRelatorio} open={dialogOpen} onOpenChange={setDialogOpen} />
    </AppLayout>
  );
}
