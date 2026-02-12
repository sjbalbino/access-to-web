import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3, FileText, Wheat, ShoppingCart } from "lucide-react";
import { RelatorioDialog } from "@/components/relatorios/RelatorioDialog";

type TipoRelatorio = "extrato" | "colheitas" | "vendas";

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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Extrato do Produtor</CardTitle>
                <CardDescription>Movimentação completa por produtor</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Colheitas, transferências, devoluções, notas de depósito e saldo final.
            </p>
            <Button onClick={() => abrirRelatorio("extrato")} className="w-full">
              Gerar Extrato
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10">
                <Wheat className="h-5 w-5 text-success" />
              </div>
              <div>
                <CardTitle className="text-lg">Relatório de Colheitas</CardTitle>
                <CardDescription>Listagem detalhada de colheitas</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Dados de pesagem, umidade, impureza, descontos e produção líquida.
            </p>
            <Button onClick={() => abrirRelatorio("colheitas")} variant="outline" className="w-full">
              Gerar Relatório
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-info/10">
                <ShoppingCart className="h-5 w-5 text-info" />
              </div>
              <div>
                <CardTitle className="text-lg">Relatório de Vendas</CardTitle>
                <CardDescription>Resumo dos contratos de venda</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Contratos, quantidades, valores, carregado e saldo pendente.
            </p>
            <Button onClick={() => abrirRelatorio("vendas")} variant="outline" className="w-full">
              Gerar Relatório
            </Button>
          </CardContent>
        </Card>
      </div>

      <RelatorioDialog
        tipo={tipoRelatorio}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </AppLayout>
  );
}
