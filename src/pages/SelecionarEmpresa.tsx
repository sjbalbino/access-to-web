import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Building2, Crown, Search, Check, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTenants } from "@/hooks/useTenants";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import { Navigate } from "react-router-dom";

export default function SelecionarEmpresa() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, profile, isSuperAdmin, isLoading } = useAuth();
  const { data: tenants = [], isLoading: loadingTenants } = useTenants();
  const [busca, setBusca] = useState("");
  const [trocando, setTrocando] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Spinner className="h-8 w-8 text-primary" />
      </div>
    );
  }

  if (!isSuperAdmin) {
    return <Navigate to="/" replace />;
  }

  const tenantAtivoId = profile?.tenant_id ?? null;

  const filtrados = tenants.filter((t) => {
    if (!t.ativo) return false;
    const q = busca.trim().toLowerCase();
    if (!q) return true;
    return (
      t.razao_social?.toLowerCase().includes(q) ||
      t.nome_fantasia?.toLowerCase().includes(q) ||
      t.cnpj?.toLowerCase().includes(q)
    );
  });

  const trocarEmpresa = async (novoTenantId: string | null, nome: string) => {
    if (!user) return;
    setTrocando(novoTenantId ?? "__null__");
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ tenant_id: novoTenantId })
        .eq("id", user.id);

      if (error) throw error;

      // Limpa todo o cache porque os dados visíveis mudam
      queryClient.clear();

      toast.success(`Empresa ativa: ${nome}`);

      // Recarrega a página para garantir que tudo seja recarregado com o novo contexto
      setTimeout(() => {
        window.location.href = "/";
      }, 400);
    } catch (err: any) {
      toast.error(`Erro ao trocar empresa: ${err.message}`);
      setTrocando(null);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 rounded-2xl bg-primary/10">
            <Crown className="h-8 w-8 text-amber-500" />
          </div>
          <h1 className="text-3xl font-bold">Selecionar Empresa Contratante</h1>
          <p className="text-muted-foreground">
            Escolha em qual empresa você deseja atuar agora
          </p>
        </div>

        <div className="relative max-w-md mx-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por razão social, nome fantasia ou CNPJ..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Modo Super Admin */}
        <Card
          className={`cursor-pointer transition-all hover:shadow-md ${
            tenantAtivoId === null ? "ring-2 ring-amber-500 bg-amber-50/30 dark:bg-amber-950/20" : ""
          }`}
          onClick={() => tenantAtivoId !== null && trocarEmpresa(null, "Modo Super Admin (todas as empresas)")}
        >
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/20">
                  <Crown className="h-6 w-6 text-amber-500" />
                </div>
                <div>
                  <CardTitle>Modo Super Admin</CardTitle>
                  <CardDescription>Visualizar dados de todas as empresas</CardDescription>
                </div>
              </div>
              {tenantAtivoId === null ? (
                <div className="flex items-center gap-2 text-sm font-medium text-amber-600">
                  <Check className="h-4 w-4" /> Ativa
                </div>
              ) : trocando === "__null__" ? (
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              ) : null}
            </div>
          </CardHeader>
        </Card>

        {/* Empresas */}
        {loadingTenants ? (
          <div className="flex justify-center py-12">
            <Spinner className="h-8 w-8 text-primary" />
          </div>
        ) : filtrados.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Nenhuma empresa encontrada
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filtrados.map((t) => {
              const ativa = tenantAtivoId === t.id;
              const carregando = trocando === t.id;
              return (
                <Card
                  key={t.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    ativa ? "ring-2 ring-primary bg-primary/5" : ""
                  }`}
                  onClick={() => !ativa && trocarEmpresa(t.id, t.nome_fantasia || t.razao_social)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                          <Building2 className="h-5 w-5 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <CardTitle className="text-base truncate">
                            {t.razao_social}
                            {t.nome_fantasia && (
                              <span className="text-muted-foreground font-normal"> ({t.nome_fantasia})</span>
                            )}
                          </CardTitle>
                          <CardDescription className="text-xs">
                            {t.cnpj || "CNPJ não informado"}
                            {t.cidade && t.uf && ` • ${t.cidade}/${t.uf}`}
                          </CardDescription>
                        </div>
                      </div>
                      {ativa ? (
                        <div className="flex items-center gap-1 text-sm font-medium text-primary shrink-0">
                          <Check className="h-4 w-4" /> Ativa
                        </div>
                      ) : carregando ? (
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground shrink-0" />
                      ) : null}
                    </div>
                  </CardHeader>
                </Card>
              );
            })}
          </div>
        )}

        <div className="flex justify-center pt-4">
          <Button variant="outline" onClick={() => navigate(-1)}>
            Voltar
          </Button>
        </div>
      </div>
    </div>
  );
}
