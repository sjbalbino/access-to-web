import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { useAplicacoes, useCreateAplicacao, useUpdateAplicacao, useDeleteAplicacao, AplicacaoInput, TipoAplicacao, TIPOS_APLICACAO } from '@/hooks/useAplicacoes';
import { useSafras } from '@/hooks/useSafras';
import { useLavouras } from '@/hooks/useLavouras';
import { usePlantios } from '@/hooks/usePlantios';
import { useProdutos } from '@/hooks/useProdutos';
import { useUnidadesMedida } from '@/hooks/useUnidadesMedida';
import { format } from 'date-fns';

interface AplicacoesTabProps {
  tipo: TipoAplicacao;
  safraId: string | null;
  lavouraId: string | null;
}

export function AplicacoesTab({ tipo, safraId, lavouraId }: AplicacoesTabProps) {
  const { canEdit } = useAuth();
  const { data: aplicacoes, isLoading } = useAplicacoes(tipo, safraId, lavouraId);
  const { data: safras } = useSafras();
  const { data: lavouras } = useLavouras();
  const { data: plantios } = usePlantios(safraId, lavouraId);
  const { data: produtos } = useProdutos();
  const { data: unidades } = useUnidadesMedida();

  const tipoLabel = TIPOS_APLICACAO.find(t => t.value === tipo)?.label || 'Aplicação';

  const emptyAplicacao: AplicacaoInput = {
    tipo,
    safra_id: safraId,
    lavoura_id: lavouraId || '',
    plantio_id: null,
    produto_id: null,
    data_aplicacao: null,
    area_aplicada: 0,
    dose_ha: 0,
    quantidade_total: 0,
    unidade_medida_id: null,
    aplicador: null,
    equipamento: null,
    condicao_climatica: null,
    observacoes: null,
  };

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<AplicacaoInput>(emptyAplicacao);

  const createMutation = useCreateAplicacao();
  const updateMutation = useUpdateAplicacao();
  const deleteMutation = useDeleteAplicacao();

  const handleNew = () => {
    setFormData({
      ...emptyAplicacao,
      safra_id: safraId,
      lavoura_id: lavouraId || '',
    });
    setEditingId(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (aplicacao: any) => {
    setFormData({
      tipo: aplicacao.tipo,
      safra_id: aplicacao.safra_id,
      lavoura_id: aplicacao.lavoura_id,
      plantio_id: aplicacao.plantio_id,
      produto_id: aplicacao.produto_id,
      data_aplicacao: aplicacao.data_aplicacao,
      area_aplicada: aplicacao.area_aplicada || 0,
      dose_ha: aplicacao.dose_ha || 0,
      quantidade_total: aplicacao.quantidade_total || 0,
      unidade_medida_id: aplicacao.unidade_medida_id,
      aplicador: aplicacao.aplicador,
      equipamento: aplicacao.equipamento,
      condicao_climatica: aplicacao.condicao_climatica,
      observacoes: aplicacao.observacoes,
    });
    setEditingId(aplicacao.id);
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm(`Tem certeza que deseja excluir esta ${tipoLabel.toLowerCase()}?`)) {
      deleteMutation.mutate(id);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      updateMutation.mutate({ id: editingId, ...formData }, {
        onSuccess: () => setIsDialogOpen(false),
      });
    } else {
      createMutation.mutate(formData, {
        onSuccess: () => setIsDialogOpen(false),
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {canEdit && (
        <div className="flex justify-end">
          <Button onClick={handleNew} className="gap-2">
            <Plus className="h-4 w-4" />
            Nova {tipoLabel}
          </Button>
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Lavoura</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead className="text-right">Área (ha)</TableHead>
                <TableHead className="text-right">Dose/ha</TableHead>
                <TableHead className="text-right">Qtd Total</TableHead>
                {canEdit && <TableHead className="w-24">Ações</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {aplicacoes?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={canEdit ? 7 : 6} className="text-center text-muted-foreground py-8">
                    Nenhuma {tipoLabel.toLowerCase()} cadastrada
                  </TableCell>
                </TableRow>
              ) : (
                aplicacoes?.map((aplicacao) => (
                  <TableRow key={aplicacao.id}>
                    <TableCell>
                      {aplicacao.data_aplicacao ? format(new Date(aplicacao.data_aplicacao), 'dd/MM/yyyy') : '-'}
                    </TableCell>
                    <TableCell>{aplicacao.lavouras?.nome || '-'}</TableCell>
                    <TableCell>{aplicacao.produtos?.nome || '-'}</TableCell>
                    <TableCell className="text-right">{aplicacao.area_aplicada?.toLocaleString('pt-BR') || '0'}</TableCell>
                    <TableCell className="text-right">{aplicacao.dose_ha?.toLocaleString('pt-BR') || '0'}</TableCell>
                    <TableCell className="text-right">
                      {aplicacao.quantidade_total?.toLocaleString('pt-BR') || '0'} {aplicacao.unidades_medida?.sigla || ''}
                    </TableCell>
                    {canEdit && (
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(aplicacao)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(aplicacao.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? `Editar ${tipoLabel}` : `Nova ${tipoLabel}`}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Safra</Label>
                <Select
                  value={formData.safra_id || "none"}
                  onValueChange={(value) => setFormData({ ...formData, safra_id: value === "none" ? null : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma</SelectItem>
                    {safras?.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Lavoura *</Label>
                <Select
                  value={formData.lavoura_id || ""}
                  onValueChange={(value) => setFormData({ ...formData, lavoura_id: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {lavouras?.map((l) => (
                      <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Plantio</Label>
                <Select
                  value={formData.plantio_id || "none"}
                  onValueChange={(value) => setFormData({ ...formData, plantio_id: value === "none" ? null : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {plantios?.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.data_plantio ? format(new Date(p.data_plantio), 'dd/MM/yyyy') : 'Sem data'} - {p.culturas?.nome || 'Sem cultura'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Data da Aplicação</Label>
                <Input
                  type="date"
                  value={formData.data_aplicacao || ''}
                  onChange={(e) => setFormData({ ...formData, data_aplicacao: e.target.value || null })}
                />
              </div>

              <div className="space-y-2">
                <Label>Produto</Label>
                <Select
                  value={formData.produto_id || "none"}
                  onValueChange={(value) => setFormData({ ...formData, produto_id: value === "none" ? null : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {produtos?.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Área Aplicada (ha)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.area_aplicada || ''}
                  onChange={(e) => setFormData({ ...formData, area_aplicada: parseFloat(e.target.value) || 0 })}
                />
              </div>

              <div className="space-y-2">
                <Label>Dose/ha</Label>
                <Input
                  type="number"
                  step="0.001"
                  value={formData.dose_ha || ''}
                  onChange={(e) => setFormData({ ...formData, dose_ha: parseFloat(e.target.value) || 0 })}
                />
              </div>

              <div className="space-y-2">
                <Label>Quantidade Total</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.quantidade_total || ''}
                  onChange={(e) => setFormData({ ...formData, quantidade_total: parseFloat(e.target.value) || 0 })}
                />
              </div>

              <div className="space-y-2">
                <Label>Unidade de Medida</Label>
                <Select
                  value={formData.unidade_medida_id || "none"}
                  onValueChange={(value) => setFormData({ ...formData, unidade_medida_id: value === "none" ? null : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma</SelectItem>
                    {unidades?.map((u) => (
                      <SelectItem key={u.id} value={u.id}>{u.descricao} ({u.sigla})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Aplicador</Label>
                <Input
                  value={formData.aplicador || ''}
                  onChange={(e) => setFormData({ ...formData, aplicador: e.target.value || null })}
                />
              </div>

              <div className="space-y-2">
                <Label>Equipamento</Label>
                <Input
                  value={formData.equipamento || ''}
                  onChange={(e) => setFormData({ ...formData, equipamento: e.target.value || null })}
                />
              </div>

              <div className="space-y-2">
                <Label>Condição Climática</Label>
                <Select
                  value={formData.condicao_climatica || "none"}
                  onValueChange={(value) => setFormData({ ...formData, condicao_climatica: value === "none" ? null : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Não informada</SelectItem>
                    <SelectItem value="ensolarado">Ensolarado</SelectItem>
                    <SelectItem value="nublado">Nublado</SelectItem>
                    <SelectItem value="chuvoso">Chuvoso</SelectItem>
                    <SelectItem value="ventoso">Ventoso</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea
                value={formData.observacoes || ''}
                onChange={(e) => setFormData({ ...formData, observacoes: e.target.value || null })}
                rows={3}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {editingId ? 'Salvar' : 'Cadastrar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
