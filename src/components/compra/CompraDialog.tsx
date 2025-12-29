import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSilos } from '@/hooks/useSilos';
import { useInscricoesSocio } from '@/hooks/useInscricoesSocio';
import { useInscricoesComSaldo } from '@/hooks/useSaldosDeposito';
import { useProdutosSementes } from '@/hooks/useProdutosSementes';
import { useGranjas } from '@/hooks/useGranjas';
import { useSafras } from '@/hooks/useSafras';
import { useCreateCompraCereal, useUpdateCompraCereal, type CompraCereal } from '@/hooks/useComprasCereais';
import { toast } from 'sonner';
import { CurrencyInput } from '@/components/ui/currency-input';

interface CompraDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  compra?: CompraCereal | null;
}

export function CompraDialog({ open, onOpenChange, compra }: CompraDialogProps) {
  // Internal selection states
  const [granjaId, setGranjaId] = useState('');
  const [safraId, setSafraId] = useState('');
  const [produtoId, setProdutoId] = useState('');
  
  const [dataCompra, setDataCompra] = useState(new Date().toISOString().split('T')[0]);
  const [siloId, setSiloId] = useState('');
  const [inscricaoCompradorId, setInscricaoCompradorId] = useState('');
  const [inscricaoVendedorId, setInscricaoVendedorId] = useState('');
  const [quantidadeKg, setQuantidadeKg] = useState(0);
  const [valorUnitarioKg, setValorUnitarioKg] = useState(0);
  const [valorTotal, setValorTotal] = useState(0);
  const [observacao, setObservacao] = useState('');

  const { data: granjas } = useGranjas();
  const { data: safras } = useSafras();
  const { data: produtos } = useProdutosSementes();
  const { data: silos } = useSilos();
  const { data: inscricoesSocio } = useInscricoesSocio();
  const { data: inscricoesComSaldo } = useInscricoesComSaldo({ 
    safraId, 
    granjaId 
  });

  const createCompra = useCreateCompraCereal();
  const updateCompra = useUpdateCompraCereal();

  const isEditing = !!compra;

  useEffect(() => {
    if (compra) {
      setGranjaId(compra.granja_id || '');
      setSafraId(compra.safra_id || '');
      setProdutoId(compra.produto_id || '');
      setDataCompra(compra.data_compra || new Date().toISOString().split('T')[0]);
      setSiloId(compra.silo_id || '');
      setInscricaoCompradorId(compra.inscricao_comprador_id || '');
      setInscricaoVendedorId(compra.inscricao_vendedor_id || '');
      setQuantidadeKg(compra.quantidade_kg || 0);
      setValorUnitarioKg(compra.valor_unitario_kg || 0);
      setValorTotal(compra.valor_total || 0);
      setObservacao(compra.observacao || '');
    } else {
      resetForm();
    }
  }, [compra, open]);

  useEffect(() => {
    setValorTotal(quantidadeKg * valorUnitarioKg);
  }, [quantidadeKg, valorUnitarioKg]);

  // Reset vendedor when granja/safra changes (only in new mode)
  useEffect(() => {
    if (!isEditing) {
      setInscricaoVendedorId('');
    }
  }, [granjaId, safraId, isEditing]);

  const resetForm = () => {
    setGranjaId('');
    setSafraId('');
    setProdutoId('');
    setDataCompra(new Date().toISOString().split('T')[0]);
    setSiloId('');
    setInscricaoCompradorId('');
    setInscricaoVendedorId('');
    setQuantidadeKg(0);
    setValorUnitarioKg(0);
    setValorTotal(0);
    setObservacao('');
  };

  const handleSubmit = async () => {
    if (!granjaId || !safraId || !produtoId) {
      toast.error('Selecione Granja, Safra e Produto');
      return;
    }

    if (!inscricaoCompradorId || !inscricaoVendedorId || quantidadeKg <= 0) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    const dados = {
      granja_id: granjaId,
      safra_id: safraId,
      produto_id: produtoId,
      inscricao_comprador_id: inscricaoCompradorId,
      inscricao_vendedor_id: inscricaoVendedorId,
      silo_id: siloId || null,
      data_compra: dataCompra,
      quantidade_kg: quantidadeKg,
      valor_unitario_kg: valorUnitarioKg,
      valor_total: valorTotal,
      observacao,
    };

    try {
      if (isEditing && compra) {
        await updateCompra.mutateAsync({ id: compra.id, ...dados });
        toast.success('Compra atualizada com sucesso!');
      } else {
        await createCompra.mutateAsync(dados);
        toast.success('Compra registrada com sucesso!');
      }
      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error('Erro ao salvar compra:', error);
    }
  };

  const produtoSelecionado = produtos?.find(p => p.id === produtoId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Compra' : 'Nova Compra de Cereais'}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Granja, Safra, Produto selection */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Granja *</Label>
              <Select value={granjaId} onValueChange={setGranjaId}>
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
              <Select value={safraId} onValueChange={setSafraId}>
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
              <Select value={produtoId} onValueChange={setProdutoId}>
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

          {/* Info do Produto selecionado */}
          {produtoSelecionado && (
            <div className="p-3 bg-muted rounded-lg">
              <span className="text-sm text-muted-foreground">Produto selecionado: </span>
              <span className="font-medium">{produtoSelecionado.nome}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data da Compra</Label>
              <Input
                type="date"
                value={dataCompra}
                onChange={e => setDataCompra(e.target.value)}
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
            <Label>Comprador (Sócio) *</Label>
            <Select value={inscricaoCompradorId} onValueChange={setInscricaoCompradorId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o comprador..." />
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
            <Label>Vendedor (Produtor com saldo) *</Label>
            <Select 
              value={inscricaoVendedorId} 
              onValueChange={setInscricaoVendedorId}
              disabled={!granjaId || !safraId}
            >
              <SelectTrigger>
                <SelectValue placeholder={!granjaId || !safraId ? "Selecione Granja e Safra primeiro" : "Selecione o vendedor..."} />
              </SelectTrigger>
              <SelectContent>
                {inscricoesComSaldo?.map(i => (
                  <SelectItem key={i.id} value={i.id}>
                    {i.produtor_nome} - IE: {i.inscricao_estadual} ({i.total_depositado?.toLocaleString('pt-BR')} kg)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Quantidade (kg) *</Label>
              <Input
                type="number"
                value={quantidadeKg || ''}
                onChange={e => setQuantidadeKg(Number(e.target.value))}
                min={0}
              />
            </div>

            <div className="space-y-2">
              <Label>Valor Unitário (R$/kg)</Label>
              <CurrencyInput
                value={valorUnitarioKg}
                onChange={setValorUnitarioKg}
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
          <Button onClick={handleSubmit} disabled={createCompra.isPending || updateCompra.isPending}>
            {isEditing ? 'Salvar' : 'Registrar Compra'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
