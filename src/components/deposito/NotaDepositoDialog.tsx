import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSafras } from '@/hooks/useSafras';
import { useGranjas } from '@/hooks/useGranjas';
import { useInscricoesComSaldo } from '@/hooks/useSaldosDeposito';
import { useProdutosSementes } from '@/hooks/useProdutosSementes';
import { useSaldoDisponivelProdutor } from '@/hooks/useSaldoDisponivelProdutor';
import { useCreateNotaDepositoEmitida, type NotaDepositoEmitida } from '@/hooks/useNotasDepositoEmitidas';
import { toast } from 'sonner';
import { formatNumber } from '@/lib/formatters';

interface NotaDepositoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nota?: NotaDepositoEmitida | null;
  defaultFiltros?: {
    granjaId: string;
    safraId: string;
    produtoId: string;
  };
}

export function NotaDepositoDialog({ open, onOpenChange, nota, defaultFiltros }: NotaDepositoDialogProps) {
  // Campos do formulário
  const [granjaId, setGranjaId] = useState('');
  const [safraId, setSafraId] = useState('');
  const [produtoId, setProdutoId] = useState('');
  const [inscricaoProdutorId, setInscricaoProdutorId] = useState('');
  const [quantidadeKg, setQuantidadeKg] = useState(0);
  const [dataEmissao, setDataEmissao] = useState(new Date().toISOString().split('T')[0]);

  // Dados de referência
  const { data: safras } = useSafras();
  const { data: granjas } = useGranjas();
  const { data: produtos } = useProdutosSementes();

  // Inscrições com saldo
  const { data: inscricoesComSaldo } = useInscricoesComSaldo({
    safraId,
    granjaId,
  });

  // Saldo do produtor selecionado
  const { data: saldoProdutor } = useSaldoDisponivelProdutor({
    inscricaoProdutorId,
    safraId,
    produtoId,
  });

  const createNota = useCreateNotaDepositoEmitida();

  const isEditing = !!nota;

  // Inicializar valores quando abre o dialog
  useEffect(() => {
    if (nota) {
      // Modo edição - carregar dados da nota
      setGranjaId(nota.granja_id || '');
      setSafraId(nota.safra_id || '');
      setProdutoId(nota.produto_id || '');
      setInscricaoProdutorId(nota.inscricao_produtor_id || '');
      setQuantidadeKg(nota.quantidade_kg || 0);
      setDataEmissao(nota.data_emissao || new Date().toISOString().split('T')[0]);
    } else {
      // Modo novo - usar defaults dos filtros se disponível
      resetForm();
      if (defaultFiltros) {
        if (defaultFiltros.granjaId) setGranjaId(defaultFiltros.granjaId);
        if (defaultFiltros.safraId) setSafraId(defaultFiltros.safraId);
        if (defaultFiltros.produtoId) setProdutoId(defaultFiltros.produtoId);
      }
    }
  }, [nota, open, defaultFiltros]);

  const resetForm = () => {
    setGranjaId('');
    setSafraId('');
    setProdutoId('');
    setInscricaoProdutorId('');
    setQuantidadeKg(0);
    setDataEmissao(new Date().toISOString().split('T')[0]);
  };

  // Limpar produtor quando mudar filtros (apenas no modo novo)
  useEffect(() => {
    if (!isEditing) {
      setInscricaoProdutorId('');
    }
  }, [safraId, granjaId, isEditing]);

  const handleSubmit = async () => {
    if (!granjaId || !safraId || !produtoId) {
      toast.error('Selecione Granja, Safra e Produto');
      return;
    }

    if (!inscricaoProdutorId || quantidadeKg <= 0) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    const saldoDisponivel = saldoProdutor?.saldo || 0;
    if (quantidadeKg > saldoDisponivel) {
      toast.error(`Quantidade (${formatNumber(quantidadeKg, 3)} kg) excede o saldo disponível (${formatNumber(saldoDisponivel, 3)} kg)`);
      return;
    }

    const dados = {
      granja_id: granjaId,
      safra_id: safraId,
      produto_id: produtoId,
      inscricao_produtor_id: inscricaoProdutorId,
      quantidade_kg: quantidadeKg,
      data_emissao: dataEmissao,
      nota_fiscal_id: null,
    };

    try {
      await createNota.mutateAsync(dados);
      toast.success('Nota de depósito registrada com sucesso!');
      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error('Erro ao salvar nota de depósito:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Visualizar Nota de Depósito' : 'Nova Nota de Depósito'}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Seleção de Granja */}
          <div className="space-y-2">
            <Label>Granja *</Label>
            <Select value={granjaId} onValueChange={setGranjaId} disabled={isEditing}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {granjas?.map(g => (
                  <SelectItem key={g.id} value={g.id}>{g.razao_social}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Seleção de Safra e Produto */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Safra *</Label>
              <Select value={safraId} onValueChange={setSafraId} disabled={isEditing}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {safras?.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Produto *</Label>
              <Select value={produtoId} onValueChange={setProdutoId} disabled={isEditing}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {produtos?.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Produtor */}
          <div className="space-y-2">
            <Label>Produtor *</Label>
            <Select
              value={inscricaoProdutorId}
              onValueChange={setInscricaoProdutorId}
              disabled={!safraId || !granjaId || isEditing}
            >
              <SelectTrigger>
                <SelectValue placeholder={
                  !safraId || !granjaId
                    ? "Selecione granja e safra primeiro..."
                    : "Selecione o produtor..."
                } />
              </SelectTrigger>
              <SelectContent>
                {inscricoesComSaldo?.map(i => (
                  <SelectItem key={i.id} value={i.id}>
                    {i.produtor_nome} - IE: {i.inscricao_estadual} ({formatNumber(i.total_depositado, 3)} kg)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {inscricaoProdutorId && saldoProdutor && (
              <div className="p-3 bg-muted rounded-md text-sm">
                <p className="font-medium">
                  Saldo disponível: <span className="text-primary">{formatNumber(saldoProdutor.saldo, 3)} kg</span>
                </p>
              </div>
            )}
          </div>

          {/* Data e Quantidade */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data Emissão *</Label>
              <Input
                type="date"
                value={dataEmissao}
                onChange={e => setDataEmissao(e.target.value)}
                disabled={isEditing}
              />
            </div>

            <div className="space-y-2">
              <Label>Quantidade (kg) *</Label>
              <Input
                type="number"
                value={quantidadeKg || ''}
                onChange={e => setQuantidadeKg(Number(e.target.value))}
                min={0}
                step="0.001"
                disabled={isEditing}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {isEditing ? 'Fechar' : 'Cancelar'}
          </Button>
          {!isEditing && (
            <Button onClick={handleSubmit} disabled={createNota.isPending}>
              Registrar Nota
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
