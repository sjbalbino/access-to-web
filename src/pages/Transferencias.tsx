import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Plus, Trash2 } from "lucide-react";
import { useSafras } from "@/hooks/useSafras";
import { useGranjas } from "@/hooks/useGranjas";
import { useSilos } from "@/hooks/useSilos";
import { useProdutos } from "@/hooks/useProdutos";
import { useAllInscricoes } from "@/hooks/useAllInscricoes";
import { useLocaisEntrega } from "@/hooks/useLocaisEntrega";
import { useTransferenciasDeposito, useCreateTransferenciaDeposito, useDeleteTransferenciaDeposito } from "@/hooks/useTransferenciasDeposito";
import { formatNumber } from "@/lib/formatters";
import { toast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function Transferencias() {
  const [safraId, setSafraId] = useState<string>("");
  const [produtoId, setProdutoId] = useState<string>("");
  const [siloId, setSiloId] = useState<string>("");

  // Formulário
  const [granjaOrigemId, setGranjaOrigemId] = useState<string>("");
  const [inscricaoOrigemId, setInscricaoOrigemId] = useState<string>("");
  const [localSaidaId, setLocalSaidaId] = useState<string>("");
  const [granjaDestinoId, setGranjaDestinoId] = useState<string>("");
  const [inscricaoDestinoId, setInscricaoDestinoId] = useState<string>("");
  const [localEntradaId, setLocalEntradaId] = useState<string>("");
  const [quantidadeKg, setQuantidadeKg] = useState<string>("");
  const [observacoes, setObservacoes] = useState<string>("");

  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: safras = [] } = useSafras();
  const { data: granjas = [] } = useGranjas();
  const { data: silos = [] } = useSilos();
  const { data: produtos = [] } = useProdutos();
  const { data: todasInscricoes = [] } = useAllInscricoes();
  const { data: locaisEntrega = [] } = useLocaisEntrega();

  const { data: transferencias = [], isLoading } = useTransferenciasDeposito({
    safraId: safraId || undefined,
    produtoId: produtoId || undefined,
    siloId: siloId || undefined,
  });

  const createTransferencia = useCreateTransferenciaDeposito();
  const deleteTransferencia = useDeleteTransferenciaDeposito();

  // Filtrar inscrições por granja
  const inscricoesOrigem = todasInscricoes.filter(i => 
    !granjaOrigemId || i.granja_id === granjaOrigemId
  );
  const inscricoesDestino = todasInscricoes.filter(i => 
    !granjaDestinoId || i.granja_id === granjaDestinoId
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!safraId || !produtoId || !inscricaoOrigemId || !inscricaoDestinoId || !quantidadeKg) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    if (inscricaoOrigemId === inscricaoDestinoId) {
      toast({
        title: "Erro",
        description: "A inscrição de origem deve ser diferente da inscrição de destino.",
        variant: "destructive",
      });
      return;
    }

    await createTransferencia.mutateAsync({
      data_transferencia: new Date().toISOString().split('T')[0],
      granja_origem_id: granjaOrigemId || null,
      inscricao_origem_id: inscricaoOrigemId,
      granja_destino_id: granjaDestinoId || null,
      inscricao_destino_id: inscricaoDestinoId,
      safra_id: safraId,
      produto_id: produtoId,
      silo_id: siloId || null,
      quantidade_kg: parseFloat(quantidadeKg),
      observacoes: observacoes || null,
      local_saida_id: localSaidaId || null,
      local_entrada_id: localEntradaId || null,
    });

    // Limpar formulário
    setInscricaoOrigemId("");
    setInscricaoDestinoId("");
    setLocalSaidaId("");
    setLocalEntradaId("");
    setQuantidadeKg("");
    setObservacoes("");
  };

  const handleDelete = async () => {
    if (deleteId) {
      await deleteTransferencia.mutateAsync(deleteId);
      setDeleteId(null);
    }
  };

  const getInscricaoLabel = (inscricao: any) => {
    const ie = inscricao.inscricao_estadual || inscricao.cpf_cnpj || "";
    const nome = inscricao.produtores?.nome || inscricao.granja || "";
    return `${ie} - ${nome}`;
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <PageHeader
          title="Transferências de Depósito"
          description="Registrar transferências de saldo entre produtores/inscrições"
        />

        {/* Filtros */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Safra *</Label>
                <Select value={safraId} onValueChange={setSafraId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a safra" />
                  </SelectTrigger>
                  <SelectContent>
                    {safras.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Produto/Variedade *</Label>
                <Select value={produtoId} onValueChange={setProdutoId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o produto" />
                  </SelectTrigger>
                  <SelectContent>
                    {produtos.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Silo</Label>
                <Select value={siloId || "__all__"} onValueChange={(val) => setSiloId(val === "__all__" ? "" : val)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os silos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Todos</SelectItem>
                    {silos.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {safraId && produtoId && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Formulário de Nova Transferência */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Nova Transferência
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Origem */}
                  <div className="space-y-3 p-4 rounded-lg border bg-muted/30">
                    <h4 className="font-medium text-sm text-muted-foreground">SAÍDA (Origem)</h4>
                    
                    <div className="space-y-2">
                      <Label>Local</Label>
                      <Select value={granjaOrigemId || "__all__"} onValueChange={(val) => setGranjaOrigemId(val === "__all__" ? "" : val)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o local" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__all__">Todos</SelectItem>
                          {granjas.map((g) => (
                            <SelectItem key={g.id} value={g.id}>
                              {g.nome_fantasia || g.razao_social}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Inscrição Estadual *</Label>
                      <Select value={inscricaoOrigemId} onValueChange={setInscricaoOrigemId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a inscrição" />
                        </SelectTrigger>
                        <SelectContent>
                          {inscricoesOrigem.map((i) => (
                            <SelectItem key={i.id} value={i.id}>
                              {getInscricaoLabel(i)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Local de Saída (Terceiro)</Label>
                      <Select value={localSaidaId || "__none__"} onValueChange={(val) => setLocalSaidaId(val === "__none__" ? "" : val)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o local de saída" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">Nenhum</SelectItem>
                          {locaisEntrega.map((l) => (
                            <SelectItem key={l.id} value={l.id}>
                              {l.nome} {l.cidade ? `- ${l.cidade}/${l.uf}` : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Seta indicando direção */}
                  <div className="flex justify-center">
                    <ArrowRight className="h-6 w-6 text-muted-foreground" />
                  </div>

                  {/* Destino */}
                  <div className="space-y-3 p-4 rounded-lg border bg-muted/30">
                    <h4 className="font-medium text-sm text-muted-foreground">ENTRADA (Destino)</h4>
                    
                    <div className="space-y-2">
                      <Label>Local</Label>
                      <Select value={granjaDestinoId || "__all__"} onValueChange={(val) => setGranjaDestinoId(val === "__all__" ? "" : val)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o local" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__all__">Todos</SelectItem>
                          {granjas.map((g) => (
                            <SelectItem key={g.id} value={g.id}>
                              {g.nome_fantasia || g.razao_social}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Inscrição Estadual *</Label>
                      <Select value={inscricaoDestinoId} onValueChange={setInscricaoDestinoId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a inscrição" />
                        </SelectTrigger>
                        <SelectContent>
                          {inscricoesDestino.map((i) => (
                            <SelectItem key={i.id} value={i.id}>
                              {getInscricaoLabel(i)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Local de Entrada (Terceiro)</Label>
                      <Select value={localEntradaId || "__none__"} onValueChange={(val) => setLocalEntradaId(val === "__none__" ? "" : val)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o local de entrada" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">Nenhum</SelectItem>
                          {locaisEntrega.map((l) => (
                            <SelectItem key={l.id} value={l.id}>
                              {l.nome} {l.cidade ? `- ${l.cidade}/${l.uf}` : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Quantidade (kg) *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={quantidadeKg}
                        onChange={(e) => setQuantidadeKg(e.target.value)}
                        placeholder="0,00"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Observações</Label>
                    <Textarea
                      value={observacoes}
                      onChange={(e) => setObservacoes(e.target.value)}
                      placeholder="Observações adicionais..."
                      rows={2}
                    />
                  </div>

                  <Button type="submit" className="w-full" disabled={createTransferencia.isPending}>
                    {createTransferencia.isPending ? "Registrando..." : "Registrar Transferência"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Lista de Transferências */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Transferências Realizadas</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Carregando...</div>
                ) : transferencias.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhuma transferência encontrada
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[500px] overflow-y-auto">
                    {transferencias.map((t) => (
                      <div key={t.id} className="p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className="text-xs">
                                #{t.codigo}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {new Date(t.data_transferencia).toLocaleDateString('pt-BR')}
                              </span>
                            </div>
                            
                            <div className="text-sm space-y-1">
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <span className="font-medium text-foreground">
                                  {t.inscricao_origem?.inscricao_estadual || t.inscricao_origem?.cpf_cnpj}
                                </span>
                                <ArrowRight className="h-3 w-3" />
                                <span className="font-medium text-foreground">
                                  {t.inscricao_destino?.inscricao_estadual || t.inscricao_destino?.cpf_cnpj}
                                </span>
                              </div>
                              <div className="text-muted-foreground">
                                {t.produto?.nome} • <span className="font-medium text-foreground">{formatNumber(t.quantidade_kg)} kg</span>
                              </div>
                            </div>
                          </div>
                          
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => setDeleteId(t.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir transferência?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A transferência será removida permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
