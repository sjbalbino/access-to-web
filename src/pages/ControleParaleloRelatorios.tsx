import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart3 } from "lucide-react";
import { RelatorioControleForm } from "@/components/controle-paralelo/RelatorioControleForm";
import { useControleConjuntos } from "@/hooks/useControleParalelo";

export default function ControleParaleloRelatorios() {
  const { data: conjuntos, isLoading } = useControleConjuntos();
  const [conjuntoId, setConjuntoId] = useState<string | undefined>(undefined);

  const conjunto = (conjuntos ?? []).find((c) => c.id === conjuntoId);

  return (
    <AppLayout>
      <PageHeader
        title="Relatórios Gerenciais"
        description="Gere os relatórios do Controle Gerencial desconsiderando os lançamentos marcados no conjunto selecionado"
        icon={<BarChart3 className="h-6 w-6" />}
      />

      <Card className="mt-6">
        <CardContent className="pt-6 space-y-4">
          <div className="space-y-2 max-w-md">
            <Label>Conjunto de Controle</Label>
            <Select value={conjuntoId} onValueChange={setConjuntoId} disabled={isLoading}>
              <SelectTrigger>
                <SelectValue placeholder={isLoading ? "Carregando..." : "Selecione o conjunto"} />
              </SelectTrigger>
              <SelectContent>
                {(conjuntos ?? []).map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {conjuntoId && conjunto ? (
            <RelatorioControleForm conjuntoId={conjuntoId} conjuntoNome={conjunto.nome} />
          ) : (
            <p className="text-sm text-muted-foreground">
              Selecione um conjunto de controle para configurar e gerar os relatórios.
            </p>
          )}
        </CardContent>
      </Card>
    </AppLayout>
  );
}
