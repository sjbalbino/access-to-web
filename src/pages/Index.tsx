import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/page-header";
import { DataCard } from "@/components/ui/data-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import {
  LayoutDashboard,
  Building2,
  Leaf,
  Calendar,
  Users,
  Map,
  ArrowRight,
  TrendingUp,
  Wheat,
} from "lucide-react";
import { useEmpresas } from "@/hooks/useEmpresas";
import { useCulturas } from "@/hooks/useCulturas";
import { useSafras } from "@/hooks/useSafras";
import { useProdutores } from "@/hooks/useProdutores";
import { useLavouras } from "@/hooks/useLavouras";

const quickAccessItems = [
  {
    title: "Nova Empresa",
    description: "Cadastrar granja ou empresa",
    icon: Building2,
    path: "/empresas",
    color: "bg-info/10 text-info",
  },
  {
    title: "Nova Cultura",
    description: "Cadastrar tipo de cultura",
    icon: Leaf,
    path: "/culturas",
    color: "bg-success/10 text-success",
  },
  {
    title: "Nova Safra",
    description: "Iniciar nova safra",
    icon: Calendar,
    path: "/safras",
    color: "bg-warning/10 text-warning",
  },
  {
    title: "Novo Produtor",
    description: "Cadastrar produtor/sócio",
    icon: Users,
    path: "/produtores",
    color: "bg-accent/10 text-accent",
  },
];

export default function Index() {
  const { data: empresas, isLoading: loadingEmpresas } = useEmpresas();
  const { data: culturas, isLoading: loadingCulturas } = useCulturas();
  const { data: safras, isLoading: loadingSafras } = useSafras();
  const { data: produtores, isLoading: loadingProdutores } = useProdutores();
  const { data: lavouras, isLoading: loadingLavouras } = useLavouras();

  const safrasAtivas = safras?.filter((s) => s.status === "ativa") || [];
  const totalHectares = lavouras?.reduce((acc, l) => acc + (l.total_hectares || 0), 0) || 0;

  return (
    <AppLayout>
      <PageHeader
        title="Dashboard"
        description="Visão geral do sistema de gerenciamento agropecuário"
        icon={<LayoutDashboard className="h-6 w-6" />}
        iconColor="bg-primary/10 text-primary"
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <DataCard
          title="Empresas/Granjas"
          value={loadingEmpresas ? "..." : empresas?.length || 0}
          description="Cadastradas no sistema"
          icon={<Building2 className="h-5 w-5" />}
          iconColor="bg-info/10 text-info"
        />
        <DataCard
          title="Culturas"
          value={loadingCulturas ? "..." : culturas?.length || 0}
          description="Tipos de cultivo"
          icon={<Leaf className="h-5 w-5" />}
          iconColor="bg-success/10 text-success"
        />
        <DataCard
          title="Safras Ativas"
          value={loadingSafras ? "..." : safrasAtivas.length}
          description={`De ${safras?.length || 0} safras cadastradas`}
          icon={<Calendar className="h-5 w-5" />}
          iconColor="bg-warning/10 text-warning"
        />
        <DataCard
          title="Total Hectares"
          value={loadingLavouras ? "..." : totalHectares.toLocaleString("pt-BR")}
          description="Área total de lavouras"
          icon={<Map className="h-5 w-5" />}
          iconColor="bg-chart-5/10 text-chart-5"
        />
      </div>

      {/* Quick Access */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Acesso Rápido
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickAccessItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.path} to={item.path}>
                  <Card className="card-hover border-2 border-transparent hover:border-primary/20 cursor-pointer h-full">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className={`icon-badge ${item.color}`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-foreground">{item.title}</h3>
                          <p className="text-sm text-muted-foreground">{item.description}</p>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-accent" />
              Produtores
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingProdutores ? (
              <p className="text-muted-foreground">Carregando...</p>
            ) : produtores && produtores.length > 0 ? (
              <div className="space-y-3">
                {produtores.slice(0, 5).map((produtor: any) => (
                  <div
                    key={produtor.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div>
                      <p className="font-medium">{produtor.nome}</p>
                      <p className="text-sm text-muted-foreground">
                        {produtor.cpf_cnpj || "CPF/CNPJ não informado"}
                      </p>
                    </div>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        produtor.ativo
                          ? "bg-success/10 text-success"
                          : "bg-destructive/10 text-destructive"
                      }`}
                    >
                      {produtor.ativo ? "Ativo" : "Inativo"}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
                <p className="text-muted-foreground">Nenhum produtor cadastrado</p>
                <Button asChild variant="link" className="mt-2">
                  <Link to="/produtores">Cadastrar produtor</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Map className="h-5 w-5 text-chart-5" />
              Lavouras
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingLavouras ? (
              <p className="text-muted-foreground">Carregando...</p>
            ) : lavouras && lavouras.length > 0 ? (
              <div className="space-y-3">
                {lavouras.slice(0, 5).map((lavoura: any) => (
                  <div
                    key={lavoura.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div>
                      <p className="font-medium">{lavoura.nome}</p>
                      <p className="text-sm text-muted-foreground">
                        {lavoura.empresas?.razao_social || "Sem empresa vinculada"}
                      </p>
                    </div>
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                      {lavoura.total_hectares?.toLocaleString("pt-BR") || 0} ha
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Map className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
                <p className="text-muted-foreground">Nenhuma lavoura cadastrada</p>
                <Button asChild variant="link" className="mt-2">
                  <Link to="/lavouras">Cadastrar lavoura</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}