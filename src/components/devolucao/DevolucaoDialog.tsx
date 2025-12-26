import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSilos } from '@/hooks/useSilos';
import { useGranjas } from '@/hooks/useGranjas';
import { useSafras } from '@/hooks/useSafras';
import { useInscricoesSocio } from '@/hooks/useInscricoesSocio';
import { useInscricoesComSaldo } from '@/hooks/useSaldosDeposito';
import { useProdutosSementes } from '@/hooks/useProdutosSementes';
import { useLocaisEntrega } from '@/hooks/useLocaisEntrega';
import { useSaldoDisponivelProdutor } from '@/hooks/useSaldoDisponivelProdutor';
import { useCreateDevolucao, useUpdateDevolucao, type DevolucaoDeposito } from '@/hooks/useDevolucoes';
import { toast } from 'sonner';
import { CurrencyInput } from '@/components/ui/currency-input';
import { formatNumber } from '@/lib/formatters';

interface DevolucaoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  devolucao?: DevolucaoDeposito | null;
  defaultFiltros?: {
    granjaId: string;
    safraId: string;
    produtoId: string;
  };
}

export function DevolucaoDialog({ open, onOpenChange, devolucao, defaultFiltros }: DevolucaoDialogProps) {
  // Campos do formulário (incluindo seleção de granja, safra e produto)
  const [granjaId, setGranjaId] = useState('');
  const [safraId, setSafraId] = useState('');
  const [produtoId, setProdutoId] = useState('');
  const [dataDevolucao, setDataDevolucao] = useState(new Date().toISOString().split('T')[0]);
  const [siloId, setSiloId] = useState('');
  const [localEntregaId, setLocalEntregaId] = useState('');
  const [inscricaoEmitenteId, setInscricaoEmitenteId] = useState('');
  const [inscricaoProdutorId, setInscricaoProdutorId] = useState('');
  const [quantidadeKg, setQuantidadeKg] = useState(0);
  const [valorUnitario, setValorUnitario] = useState(0);
  const [valorTotal, setValorTotal] = useState(0);
  const [taxaArmazenagem, setTaxaArmazenagem] = useState(0);
  const [kgTaxaArmazenagem, setKgTaxaArmazenagem] = useState(0);
  const [observacao, setObservacao] = useState('');

  // Dados de referência
  const { data: granjas } = useGranjas();
  const { data: safras } = useSafras();
  const { data: produtos } = useProdutosSementes();
  const { data: silos } = useSilos();
  const { data: locaisEntrega } = useLocaisEntrega(granjaId);
  const { data: inscricoesSocio } = useInscricoesSocio();
  
  // Inscrições com saldo - agora filtra por produto também
  const { data: inscricoesComSaldo } = useInscricoesComSaldo({ 
    safraId, 
    granjaId,
    produtoId 
  });

  // Saldo do produtor selecionado
  const { data: saldoProdutor } = useSaldoDisponivelProdutor({
    inscricaoProdutorId,
    safraId,
    produtoId,
  });

  const createDevolucao = useCreateDevolucao();
  const updateDevolucao = useUpdateDevolucao();

  const isEditing = !!devolucao;

  // Inicializar valores quando abre o dialog
  useEffect(() => {
    if (devolucao) {
      // Modo edição - carregar dados da devolução
      setGranjaId(devolucao.granja_id || '');
      setSafraId(devolucao.safra_id || '');
      setProdutoId(devolucao.produto_id || '');
      setDataDevolucao(devolucao.data_devolucao || new Date().toISOString().split('T')[0]);
      setSiloId(devolucao.silo_id || '');
      setLocalEntregaId((devolucao as any).local_entrega_id || '');
      setInscricaoEmitenteId(devolucao.inscricao_emitente_id || '');
      setInscricaoProdutorId(devolucao.inscricao_produtor_id || '');
      setQuantidadeKg(devolucao.quantidade_kg || 0);
      setValorUnitario(devolucao.valor_unitario || 0);
      setValorTotal(devolucao.valor_total || 0);
      setTaxaArmazenagem(devolucao.taxa_armazenagem || 0);
      setKgTaxaArmazenagem(devolucao.kg_taxa_armazenagem || 0);
      setObservacao(devolucao.observacao || '');
    } else {
      // Modo novo - usar defaults dos filtros se disponível
      resetForm();
      if (defaultFiltros) {
        if (defaultFiltros.granjaId) setGranjaId(defaultFiltros.granjaId);
        if (defaultFiltros.safraId) setSafraId(defaultFiltros.safraId);
        if (defaultFiltros.produtoId) setProdutoId(defaultFiltros.produtoId);
      }
    }
  }, [devolucao, open, defaultFiltros]);

  // Calcular valor total
  useEffect(() => {
    setValorTotal(quantidadeKg * valorUnitario);
  }, [quantidadeKg, valorUnitario]);

  // Calcular kg de taxa de armazenagem automaticamente
  useEffect(() => {
    const kgTaxa = (quantidadeKg * taxaArmazenagem) / 100;
    setKgTaxaArmazenagem(kgTaxa);
  }, [quantidadeKg, taxaArmazenagem]);

  const resetForm = () => {
    setGranjaId('');
    setSafraId('');
    setProdutoId('');
    setDataDevolucao(new Date().toISOString().split('T')[0]);
    setSiloId('');
    setLocalEntregaId('');
    setInscricaoEmitenteId('');
    setInscricaoProdutorId('');
    setQuantidadeKg(0);
    setValorUnitario(0);
    setValorTotal(0);
    setTaxaArmazenagem(0);
    setKgTaxaArmazenagem(0);
    setObservacao('');
  };

  // Limpar produtor quando mudar granja/safra/produto
  useEffect(() => {
    setInscricaoProdutorId('');
  }, [granjaId, safraId, produtoId]);

  const handleSubmit = async () => {
    if (!granjaId || !safraId || !produtoId) {
      toast.error('Selecione Granja, Safra e Produto');
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
      toast.error(`Quantidade excede o saldo disponível (${formatNumber(saldoAjustado, 3)} kg)`);
      return;
    }

    const dados = {
      granja_id: granjaId,
      safra_id: safraId,
      produto_id: produtoId,
      inscricao_emitente_id: inscricaoEmitenteId,
      inscricao_produtor_id: inscricaoProdutorId,
      silo_id: siloId || null,
      local_entrega_id: localEntregaId || null,
      data_devolucao: dataDevolucao,
      quantidade_kg: quantidadeKg,
      valor_unitario: valorUnitario,
      valor_total: valorTotal,
      taxa_armazenagem: taxaArmazenagem,
      kg_taxa_armazenagem: kgTaxaArmazenagem,
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

  const produtoSelecionado = produtos?.find(p => p.id === produtoId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Devolução' : 'Nova Devolução de Depósito'}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Seleção de Granja, Safra e Produto */}
          <div className="grid grid-cols-3 gap-4">
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data da Devolução *</Label>
              <Input
                type="date"
                value={dataDevolucao}
                onChange={e => setDataDevolucao(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Local de Entrega</Label>
              <Select value={localEntregaId} onValueChange={setLocalEntregaId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {locaisEntrega?.map(l => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.nome} {l.is_sede ? '(Sede)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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

          <div className="space-y-2">
            <Label>Emitente (Sócio) *</Label>
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
            <Label>Produtor (Destinatário) *</Label>
            <Select 
              value={inscricaoProdutorId} 
              onValueChange={setInscricaoProdutorId}
              disabled={!granjaId || !safraId || !produtoId}
            >
              <SelectTrigger>
                <SelectValue placeholder={
                  !granjaId || !safraId || !produtoId 
                    ? "Selecione granja, safra e produto primeiro..." 
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
              <p className="text-sm text-muted-foreground">
                Saldo disponível para devolução: <span className="font-medium">{formatNumber(saldoProdutor.saldo, 3)} kg</span>
                <span className="text-xs ml-2">
                  (Colheitas: {formatNumber(saldoProdutor.colheitas, 3)} + 
                  Recebidas: {formatNumber(saldoProdutor.transferenciasRecebidas, 3)} - 
                  Enviadas: {formatNumber(saldoProdutor.transferenciasEnviadas, 3)} - 
                  Devoluções: {formatNumber(saldoProdutor.devolucoes, 3)})
                </span>
              </p>
            )}
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Quantidade (kg) *</Label>
              <Input
                type="number"
                value={quantidadeKg || ''}
                onChange={e => setQuantidadeKg(Number(e.target.value))}
                min={0}
                step="0.001"
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Taxa de Armazenagem (%)</Label>
              <Input
                type="number"
                value={taxaArmazenagem || ''}
                onChange={e => setTaxaArmazenagem(Number(e.target.value))}
                min={0}
                step="0.01"
                placeholder="Ex: 5.00"
              />
            </div>

            <div className="space-y-2">
              <Label>Qtde. Armazenagem (kg)</Label>
              <Input
                type="number"
                value={formatNumber(kgTaxaArmazenagem, 3)}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                Calculado: {formatNumber(quantidadeKg, 3)} kg × {formatNumber(taxaArmazenagem, 2)}%
              </p>
            </div>
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
