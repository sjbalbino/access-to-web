import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ClipboardCheck, Plus, Pencil, Trash2, ListChecks } from "lucide-react";
import { format, parseISO } from "date-fns";
import { confirmarExclusao } from "@/components/ui/confirm-dialog-provider";
import { ConjuntoFormDialog } from "@/components/controle-paralelo/ConjuntoFormDialog";
import {
  useControleConjuntos,
  useDeleteConjunto,
  type ControleConjunto,
} from "@/hooks/useControleParalelo";

export default function ControleParalelo() {
  const navigate = useNavigate();
  const { data: conjuntos, isLoading } = useControleConjuntos();
  const excluir = useDeleteConjunto();
  const [formOpen, setFormOpen] = useState(false);
  const [editando, setEditando] = useState<ControleConjunto | null>(null);

  const abrirNovo = () => {
    setEditando(null);
    setFormOpen(true);
  };

  const abrirEdicao = (conjunto: ControleConjunto) => {
    setEditando(conjunto);
    setFormOpen(true);
  };

  const handleExcluir = async (conjunto: ControleConjunto) => {
    const ok = await confirmarExclusao({
      title: "Excluir conjunto de controle",
      description: `Excluir "${conjunto.nome}" e todas as suas marcações? Nenhum lançamento do sistema será afetado.`,
    });
    if (ok) excluir.mutate(conjunto.id);
  };

  return (
    <AppLayout>
      <PageHeader
        title="Controle Paralelo"
        description="Conjuntos de marcações para relatórios que desconsideram lançamentos selecionados"
        icon={<ClipboardCheck className="h-6 w-6" />}
        actions={
          <Button onClick={abrirNovo}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Conjunto
          </Button>
        }
      />

      <Card className="mt-6">
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground mb-4">
            Este módulo é totalmente independente: marcar lançamentos aqui não altera saldos, extratos, notas
            fiscais nem os relatórios existentes do sistema.
          </p>

          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Situação</TableHead>
                    <TableHead>Criado em</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(conjuntos ?? []).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        Nenhum conjunto criado. Clique em "Novo Conjunto" para começar.
                      </TableCell>
                    </TableRow>
                  )}
                  {(conjuntos ?? []).map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.nome}</TableCell>
                      <TableCell className="max-w-[320px] truncate" title={c.descricao ?? ""}>
                        {c.descricao || "-"}
                      </TableCell>
                      <TableCell>
                        {c.ativo ? <Badge>Ativo</Badge> : <Badge variant="secondary">Inativo</Badge>}
                      </TableCell>
                      <TableCell>{format(parseISO(c.created_at), "dd/MM/yyyy")}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigate(`/controle-paralelo/${c.id}`)}
                          >
                            <ListChecks className="h-4 w-4 mr-1" />
                            Marcações
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => abrirEdicao(c)} aria-label="Editar">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleExcluir(c)}
                            aria-label="Excluir"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <ConjuntoFormDialog open={formOpen} onOpenChange={setFormOpen} conjunto={editando} />
    </AppLayout>
  );
}
