import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSilos } from '@/hooks/useSilos';
import { useInscricoesSocio } from '@/hooks/useInscricoesSocio';
import { useInscricoesComSaldo, useSaldosDeposito } from '@/hooks/useSaldosDeposito';
import { useProdutosSementes } from '@/hooks/useProdutosSementes';
import { useSaldoDisponivelProdutor } from '@/hooks/useSaldoDisponivelProdutor';
import { useCreateDevolucao, useUpdateDevolucao, DevolucaoDeposito } from '@/hooks/useDevolucoes';
import { toast } from 'sonner';
import { CurrencyInput } from '@/components/ui/currency-input';

interface DevolucaoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  devolucao?: DevolucaoDeposito | null;
  filtros: {
    granjaId: string;
    safraId: string;
    produtoId: string;
  };
}

export function DevolucaoDialog({ open, onOpenChange, devolucao, filtros }: DevolucaoDialogProps) {
  const [dataDevolucao, setDataDevolucao] = useState(new Date().toISOString().split('T')[0]);
  const [siloId, setSiloId] = useState('');
  const [inscricaoEmitenteId, setInscricaoEmitenteId] = useState('');
  const [inscricaoProdutorId, setInscricaoProdutorId] = useState('');
  const [quantidadeKg, setQuantidadeKg] = useState(0);
  const [valorUnitario, setValorUnitario] = useState(0);
  const [valorTotal, setValorTotal] = useState(0);
  const [taxaArmazenagem, setTaxaArmazenagem] = useState(0);
  const [observacao, setObservacao] = useState('');

  const { data: silos } = useSilos();
  const { data: inscricoesSocio } = useInscricoesSocio();
  const { data: inscricoesComSaldo } = useInscricoesComSaldo({ 
    safraId: filtros.safraId, 
    granjaId: filtros.granjaId 
  });
  const { data: produtos } = useProdutosSementes();

  const { data: saldoProdutor } = useSaldoDisponivelProdutor({
    inscricaoProdutorId,
    safraId: filtros.safraId,
    produtoId: filtros.produtoId,
  });

  const createDevolucao = useCreateDevolucao();
  const updateDevolucao = useUpdateDevolucao();

  const isEditing = !!devolucao;

  useEffect(() => {
    if (devolucao) {
      setDataDevolucao(devolucao.data_devolucao || new Date().toISOString().split('T')[0]);
      setSiloId(devolucao.silo_id || '');
      setInscricaoEmitenteId(devolucao.inscricao_emitente_id || '');
      setInscricaoProdutorId(devolucao.inscricao_produtor_id || '');
      setQuantidadeKg(devolucao.quantidade_kg || 0);
      setValorUnitario(devolucao.valor_unitario || 0);
      setValorTotal(devolucao.valor_total || 0);
      setTaxaArmazenagem(devolucao.taxa_armazenagem || 0);
      setObservacao(devolucao.observacao || '');
    } else {
      resetForm();
    }
  }, [devolucao, open]);

  useEffect(() => {
    setValorTotal(quantidadeKg * valorUnitario);
  }, [quantidadeKg, valorUnitario]);

  const resetForm = () => {
    setDataDevolucao(new Date().toISOString().split('T')[0]);
    setSiloId('');
    setInscricaoEmitenteId('');
    setInscricaoProdutorId('');
    setQuantidadeKg(0);
    setValorUnitario(0);
    setValorTotal(0);
    setTaxaArmazenagem(0);
    setObservacao('');
  };

  const handleSubmit = async () => {
    if (!filtros.granjaId || !filtros.safraId || !filtros.produtoId) {
      toast.error('Selecione Granja, Safra e Produto nos filtros');
      return;
    }

    if (!inscricaoEmitenteId || !inscricaoProdutorId || quantidadeKg <= 0) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    const saldoDisponivel = saldoProdutor?.saldo || 0;
    const quantidadeOriginal = devolucao?.quantidade_kg || 0;
    const saldoAjustado = saldoDisponivel + quantidadeOriginal;

    if (quantidadeKg > saldoAjustado) {
      toast.error(`Quantidade excede o saldo disponível (${saldoAjustado.toLocaleString('pt-BR')} kg)`);
      return;
    }

    const dados = {
      granja_id: filtros.granjaId,
      safra_id: filtros.safraId,
      produto_id: filtros.produtoId,
      inscricao_emitente_id: inscricaoEmitenteId,
      inscricao_produtor_id: inscricaoProdutorId,
      silo_id: siloId || null,
      data_devolucao: dataDevolucao,
      quantidade_kg: quantidadeKg,
      valor_unitario: valorUnitario,
      valor_total: valorTotal,
      taxa_armazenagem: taxaArmazenagem,
      observacao,
    };

    try {
      if (isEditing && devolucao) {
        await updateDevolucao.mutateAsync({ id: devolucao.id, ...dados });
        toast.success('Devolução atualizada com sucesso!');
      } else {
        await createDevolucao.mutateAsync(dados);
        toast.success('Devolução registrada com sucesso!');
      }
      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error('Erro ao salvar devolução:', error);
    }
  };

  const produtoSelecionado = produtos?.find(p => p.id === filtros.produtoId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Devolução' : 'Nova Devolução de Depósito'}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Info do Produto selecionado */}
          {produtoSelecionado && (
            <div className="p-3 bg-muted rounded-lg">
              <span className="text-sm text-muted-foreground">Produto: </span>
              <span className="font-medium">{produtoSelecionado.nome}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data da Devolução</Label>
              <Input
                type="date"
                value={dataDevolucao}
                onChange={e => setDataDevolucao(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Silo</Label>
              <Select value={siloId} onValueChange={setSiloId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {silos?.map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Emitente (Sócio)</Label>
            <Select value={inscricaoEmitenteId} onValueChange={setInscricaoEmitenteId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o emitente..." />
              </SelectTrigger>
              <SelectContent>
                {inscricoesSocio?.map(i => (
                  <SelectItem key={i.id} value={i.id}>
                    {i.produtores?.nome} - IE: {i.inscricao_estadual}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Produtor (Destinatário)</Label>
            <Select value={inscricaoProdutorId} onValueChange={setInscricaoProdutorId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o produtor..." />
              </SelectTrigger>
              <SelectContent>
              {inscricoesComSaldo?.map(i => (
                  <SelectItem key={i.id} value={i.id}>
                    {i.produtor_nome} - IE: {i.inscricao_estadual} ({i.total_depositado?.toLocaleString('pt-BR')} kg)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {saldoProdutor && (
              <p className="text-sm text-muted-foreground">
                Saldo disponível: <span className="font-medium">{saldoProdutor.saldo?.toLocaleString('pt-BR')} kg</span>
              </p>
            )}
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Quantidade (kg)</Label>
              <Input
                type="number"
                value={quantidadeKg || ''}
                onChange={e => setQuantidadeKg(Number(e.target.value))}
                min={0}
              />
            </div>

            <div className="space-y-2">
              <Label>Valor Unitário</Label>
              <CurrencyInput
                value={valorUnitario}
                onChange={setValorUnitario}
              />
            </div>

            <div className="space-y-2">
              <Label>Valor Total</Label>
              <CurrencyInput
                value={valorTotal}
                onChange={setValorTotal}
                disabled
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Taxa de Armazenagem</Label>
            <CurrencyInput
              value={taxaArmazenagem}
              onChange={setTaxaArmazenagem}
            />
          </div>

          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea
              value={observacao}
              onChange={e => setObservacao(e.target.value)}
              placeholder="Observações..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={createDevolucao.isPending || updateDevolucao.isPending}>
            {isEditing ? 'Salvar' : 'Registrar Devolução'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
