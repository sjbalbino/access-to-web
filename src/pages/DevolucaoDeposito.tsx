import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, Eye, Edit } from 'lucide-react';
import { useDevolucoes, useCreateDevolucao, useDeleteDevolucao } from '@/hooks/useDevolucoes';
import { useGranjas } from '@/hooks/useGranjas';
import { useSafras } from '@/hooks/useSafras';
import { useProdutosSementes } from '@/hooks/useProdutosSementes';
import { useSilos } from '@/hooks/useSilos';
import { useInscricoesSocio } from '@/hooks/useInscricoesSocio';
import { useInscricoesComSaldo } from '@/hooks/useSaldosDeposito';
import { useSaldoDisponivelProdutor } from '@/hooks/useSaldoDisponivelProdutor';
import { formatNumber } from '@/lib/formatters';
import { QuantityInput } from '@/components/ui/quantity-input';
import { CurrencyInput } from '@/components/ui/currency-input';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';

export default function DevolucaoDeposito() {
  const [granjaId, setGranjaId] = useState<string>('');
  const [safraId, setSafraId] = useState<string>('');
  const [produtoId, setProdutoId] = useState<string>('');
  
  // Form state
  const [showForm, setShowForm] = useState(false);
  const [inscricaoEmitenteId, setInscricaoEmitenteId] = useState('');
  const [inscricaoProdutorId, setInscricaoProdutorId] = useState('');
  const [siloId, setSiloId] = useState('');
  const [dataDevolucao, setDataDevolucao] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [quantidadeKg, setQuantidadeKg] = useState(0);
  const [valorUnitario, setValorUnitario] = useState(1);
  const [taxaArmazenagem, setTaxaArmazenagem] = useState(0);
  const [observacao, setObservacao] = useState('');

  const { data: granjas } = useGranjas();
  const { data: safras } = useSafras();
  const { data: produtos } = useProdutosSementes();
  const { data: silos } = useSilos();
  const { data: inscricoesSocio } = useInscricoesSocio();
  const { data: inscricoesComSaldo } = useInscricoesComSaldo({ safraId, granjaId });
  
  const { data: devolucoes, isLoading } = useDevolucoes({ granjaId, safraId, produtoId });
  const createDevolucao = useCreateDevolucao();
  const deleteDevolucao = useDeleteDevolucao();

  const { data: saldoProdutor } = useSaldoDisponivelProdutor({
    inscricaoProdutorId,
    safraId,
    produtoId,
  });

  const valorTotal = quantidadeKg * valorUnitario;

  const handleSubmit = async () => {
    if (!granjaId || !safraId || !produtoId || !inscricaoEmitenteId || !inscricaoProdutorId || quantidadeKg <= 0) {
      toast({ title: 'Erro', description: 'Preencha todos os campos obrigatórios.', variant: 'destructive' });
      return;
    }

    if (saldoProdutor && quantidadeKg > saldoProdutor.saldo) {
      toast({ title: 'Erro', description: 'Quantidade maior que o saldo disponível do produtor.', variant: 'destructive' });
      return;
    }

    await createDevolucao.mutateAsync({
      granja_id: granjaId,
      safra_id: safraId,
      produto_id: produtoId,
      inscricao_emitente_id: inscricaoEmitenteId,
      inscricao_produtor_id: inscricaoProdutorId,
      silo_id: siloId || null,
      data_devolucao: dataDevolucao,
      quantidade_kg: quantidadeKg,
      valor_unitario: valorUnitario,
      valor_total: valorTotal,
      taxa_armazenagem: taxaArmazenagem,
      kg_taxa_armazenagem: 0,
      inscricao_recebe_taxa_id: null,
      nota_fiscal_id: null,
      status: 'pendente',
      observacao: observacao || null,
    });

    setShowForm(false);
    resetForm();
  };

  const resetForm = () => {
    setInscricaoEmitenteId('');
    setInscricaoProdutorId('');
    setSiloId('');
    setQuantidadeKg(0);
    setValorUnitario(1);
    setTaxaArmazenagem(0);
    setObservacao('');
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <PageHeader
          title="Devolução de Depósito"
          description="CFOP 5949 - Devolução de mercadoria depositada (baixa saldo produtor)"
        />

        {/* Filtros */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label>Granja</Label>
                <Select value={granjaId} onValueChange={setGranjaId}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {granjas?.map(g => (
                      <SelectItem key={g.id} value={g.id}>{g.razao_social}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Safra</Label>
                <Select value={safraId} onValueChange={setSafraId}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {safras?.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Produto</Label>
                <Select value={produtoId} onValueChange={setProdutoId}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {produtos?.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button onClick={() => setShowForm(true)} disabled={!granjaId || !safraId || !produtoId}>
                  <Plus className="h-4 w-4 mr-2" /> Nova Devolução
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Formulário */}
        {showForm && (
          <Card>
            <CardHeader>
              <CardTitle>Nova Devolução de Depósito</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Data</Label>
                  <Input type="date" value={dataDevolucao} onChange={e => setDataDevolucao(e.target.value)} />
                </div>
                <div>
                  <Label>Silo</Label>
                  <Select value={siloId} onValueChange={setSiloId}>
                    <SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger>
                    <SelectContent>
                      {silos?.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Emitente (Sócio)</Label>
                  <Select value={inscricaoEmitenteId} onValueChange={setInscricaoEmitenteId}>
                    <SelectTrigger><SelectValue placeholder="Selecione o sócio emitente" /></SelectTrigger>
                    <SelectContent>
                      {inscricoesSocio?.map(i => (
                        <SelectItem key={i.id} value={i.id}>
                          {i.produtores?.nome} - IE: {i.inscricao_estadual}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Produtor (Destinatário)</Label>
                  <Select value={inscricaoProdutorId} onValueChange={setInscricaoProdutorId}>
                    <SelectTrigger><SelectValue placeholder="Selecione o produtor" /></SelectTrigger>
                    <SelectContent>
                      {inscricoesComSaldo?.map(i => (
                        <SelectItem key={i.id} value={i.id}>
                          {i.produtor_nome} - IE: {i.inscricao_estadual}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {saldoProdutor && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Saldo disponível: {formatNumber(saldoProdutor.saldo, 3)} kg
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label>Quantidade (kg)</Label>
                  <QuantityInput value={quantidadeKg} onChange={setQuantidadeKg} />
                </div>
                <div>
                  <Label>Valor Unitário</Label>
                  <CurrencyInput value={valorUnitario} onChange={setValorUnitario} />
                </div>
                <div>
                  <Label>Valor Total</Label>
                  <CurrencyInput value={valorTotal} onChange={() => {}} disabled />
                </div>
                <div>
                  <Label>Taxa Armazenagem</Label>
                  <CurrencyInput value={taxaArmazenagem} onChange={setTaxaArmazenagem} />
                </div>
              </div>

              <div>
                <Label>Observações</Label>
                <Textarea value={observacao} onChange={e => setObservacao(e.target.value)} />
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => { setShowForm(false); resetForm(); }}>Cancelar</Button>
                <Button onClick={handleSubmit} disabled={createDevolucao.isPending}>
                  {createDevolucao.isPending ? 'Salvando...' : 'Salvar Devolução'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Lista */}
        <Card>
          <CardHeader>
            <CardTitle>Devoluções Registradas</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cód</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Produtor</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead className="text-right">Qtde (kg)</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={8} className="text-center">Carregando...</TableCell></TableRow>
                ) : !devolucoes?.length ? (
                  <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">Nenhuma devolução encontrada</TableCell></TableRow>
                ) : devolucoes.map(d => (
                  <TableRow key={d.id}>
                    <TableCell>{d.codigo}</TableCell>
                    <TableCell>{format(new Date(d.data_devolucao), 'dd/MM/yyyy')}</TableCell>
                    <TableCell>{d.inscricao_produtor?.produtores?.nome}</TableCell>
                    <TableCell>{d.produto?.nome}</TableCell>
                    <TableCell className="text-right">{formatNumber(d.quantidade_kg, 3)}</TableCell>
                    <TableCell className="text-right">R$ {formatNumber(d.valor_total, 2)}</TableCell>
                    <TableCell>
                      <Badge variant={d.status === 'nfe_emitida' ? 'default' : 'secondary'}>
                        {d.status === 'nfe_emitida' ? 'NFe Emitida' : 'Pendente'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => deleteDevolucao.mutate(d.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
