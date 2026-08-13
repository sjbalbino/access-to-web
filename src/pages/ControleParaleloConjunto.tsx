import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, ClipboardCheck, FileDown } from "lucide-react";
import { useSafras } from "@/hooks/useSafras";
import { MarcacoesTab } from "@/components/controle-paralelo/MarcacoesTab";
import { RelatorioControleDialog } from "@/components/controle-paralelo/RelatorioControleDialog";
import {
  TIPOS_DOCUMENTO,
  useControleConjunto,
  useControleMarcacoes,
  type DocumentoTipoMarcavel,
} from "@/hooks/useControleParalelo";

export default function ControleParaleloConjunto() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: conjunto } = useControleConjunto(id);
  const { data: marcacoes } = useControleMarcacoes(id);
  const { data: safras } = useSafras();

  const [safraId, setSafraId] = useState<string | undefined>(undefined);
  const [dataInicial, setDataInicial] = useState("");
  const [dataFinal, setDataFinal] = useState("");
  const [busca, setBusca] = useState("");
  const [aba, setAba] = useState<DocumentoTipoMarcavel>("transferencia_deposito");
  const [relatorioOpen, setRelatorioOpen] = useState(false);

  const filtros = useMemo(
    () => ({
      safraId,
      dataInicial: dataInicial || undefined,
      dataFinal: dataFinal || undefined,
      busca: busca.trim() || undefined,
    }),
    [safraId, dataInicial, dataFinal, busca]
  );

  const marcadosPorTipo = useMemo(() => {
    const mapa = new Map<DocumentoTipoMarcavel, Set<string>>();
    TIPOS_DOCUMENTO.forEach((t) => mapa.set(t.tipo, new Set<string>()));
    (marcacoes ?? []).forEach((m) => {
      mapa.get(m.documento_tipo)?.add(m.documento_id);
    });
    return mapa;
  }, [marcacoes]);

  return (
    <AppLayout>
      <PageHeader
        title={conjunto?.nome ?? "Conjunto de Controle"}
        description={conjunto?.descricao || "Marque os lançamentos que devem ser desconsiderados nos relatórios deste controle"}
        icon={<ClipboardCheck className="h-6 w-6" />}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate("/controle-paralelo")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <Button onClick={() => setRelatorioOpen(true)} disabled={!id}>
              <FileDown className="h-4 w-4 mr-2" />
              Relatórios
            </Button>
          </div>
        }
      />

      <Card className="mt-6">
        <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="space-y-2">
            <Label>Safra</Label>
            <Select value={safraId} onValueChange={(v) => setSafraId(v === "todas" ? undefined : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Todas as safras" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas as safras</SelectItem>
                {(safras ?? []).map((s: any) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="filtro-data-ini">Data inicial</Label>
            <Input id="filtro-data-ini" type="date" value={dataInicial} onChange={(e) => setDataInicial(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="filtro-data-fim">Data final</Label>
            <Input id="filtro-data-fim" type="date" value={dataFinal} onChange={(e) => setDataFinal(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="filtro-busca">Buscar</Label>
            <Input
              id="filtro-busca"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Produtor, produto, local, nº..."
            />
          </div>
        </CardContent>
      </Card>

      <Tabs value={aba} onValueChange={(v) => setAba(v as DocumentoTipoMarcavel)} className="mt-6">
        <TabsList className="flex flex-wrap h-auto">
          {TIPOS_DOCUMENTO.map((t) => (
            <TabsTrigger key={t.tipo} value={t.tipo}>
              {t.plural}
            </TabsTrigger>
          ))}
        </TabsList>

        {TIPOS_DOCUMENTO.map((t) => (
          <TabsContent key={t.tipo} value={t.tipo} className="mt-4">
            {id && aba === t.tipo && (
              <MarcacoesTab
                conjuntoId={id}
                tipo={t.tipo}
                filtros={filtros}
                marcados={marcadosPorTipo.get(t.tipo) ?? new Set()}
              />
            )}
          </TabsContent>
        ))}
      </Tabs>

      {id && (
        <RelatorioControleDialog
          open={relatorioOpen}
          onOpenChange={setRelatorioOpen}
          conjuntoId={id}
          conjuntoNome={conjunto?.nome ?? "-"}
        />
      )}
    </AppLayout>
  );
}
