import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useContasBancarias } from '@/hooks/useContasBancarias';
import { useExtratosBancarios, useImportarExtrato, useConciliarTransacao } from '@/hooks/useConciliacaoBancaria';
import { Upload, FileText, CheckCircle2, AlertCircle, Search } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function ConciliacaoBancaria() {
  const [contaId, setContaId] = useState<string>('');
  const { data: contas } = useContasBancarias({ ativo: true });
  const { data: extratos, isLoading } = useExtratosBancarios(contaId);
  const importarExtrato = useImportarExtrato();
  
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!contaId) {
      toast.error('Selecione uma conta bancária primeiro');
      return;
    }

    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const content = e.target?.result as string;
      try {
        // Simple OFX Parsing logic (basic implementation)
        const transacoes: any[] = [];
        const lines = content.split('\n');
        let currentTrans: any = null;

        lines.forEach(line => {
          line = line.trim();
          if (line.includes('<STMTTRN>')) currentTrans = { conta_bancaria_id: contaId };
          if (line.includes('</STMTTRN>')) {
            if (currentTrans) transacoes.push(currentTrans);
            currentTrans = null;
          }

          if (currentTrans) {
            if (line.includes('<TRNTYPE>')) currentTrans.tipo = line.includes('CREDIT') ? 'entrada' : 'saida';
            if (line.includes('<DTPOSTED>')) {
              const dateStr = line.match(/<DTPOSTED>(\d{8})/)?.[1];
              if (dateStr) {
                currentTrans.data_transacao = `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;
              }
            }
            if (line.includes('<TRNAMT>')) {
              const val = parseFloat(line.match(/<TRNAMT>([^<]+)/)?.[1] || '0');
              currentTrans.valor = Math.abs(val);
              if (!currentTrans.tipo) currentTrans.tipo = val >= 0 ? 'entrada' : 'saida';
            }
            if (line.includes('<MEMO>')) currentTrans.descricao = line.match(/<MEMO>([^<]+)/)?.[1] || '';
            if (line.includes('<FITID>')) currentTrans.fitid = line.match(/<FITID>([^<]+)/)?.[1] || '';
            if (line.includes('<CHECKNUM>')) currentTrans.documento = line.match(/<CHECKNUM>([^<]+)/)?.[1] || '';
          }
        });

        if (transacoes.length > 0) {
          await importarExtrato.mutateAsync(transacoes);
        } else {
          toast.error('Nenhuma transação encontrada no arquivo OFX');
        }
      } catch (err) {
        console.error(err);
        toast.error('Erro ao processar arquivo OFX');
      }
    };
    reader.readAsText(file);
  };

  const fmtCurrency = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const fmtDate = (d: string) => format(new Date(d + 'T12:00:00'), 'dd/MM/yyyy');

  return (
    <AppLayout>
      <div className="space-y-6">
        <PageHeader 
          title="Conciliação Bancária" 
          description="Importe extratos OFX e concilie seus lançamentos" 
          icon={<Upload className="h-6 w-6" />} 
        />

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle className="text-sm">Configuração</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Conta Bancária</Label>
                <Select value={contaId} onValueChange={setContaId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a conta" />
                  </SelectTrigger>
                  <SelectContent>
                    {contas?.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 pt-2">
                <Label>Importar Extrato (OFX)</Label>
                <div className="border-2 border-dashed rounded-lg p-4 text-center hover:bg-muted/50 transition-colors cursor-pointer relative">
                  <input 
                    type="file" 
                    accept=".ofx" 
                    onChange={handleFileUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    disabled={!contaId}
                  />
                  <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-xs text-muted-foreground">Clique para selecionar ou arraste o arquivo .ofx</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="md:col-span-3">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Transações do Extrato
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!contaId ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Search className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p>Selecione uma conta bancária para visualizar as transações</p>
                </div>
              ) : isLoading ? (
                <div className="text-center py-12">Carregando transações...</div>
              ) : extratos && extratos.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {extratos.map((t) => (
                        <TableRow key={t.id}>
                          <TableCell>{fmtDate(t.data_transacao)}</TableCell>
                          <TableCell className="max-w-[250px] truncate" title={t.descricao}>
                            {t.descricao}
                          </TableCell>
                          <TableCell className={cn("font-medium", t.tipo === 'entrada' ? 'text-success' : 'text-destructive')}>
                            {t.tipo === 'entrada' ? '+' : '-'} {fmtCurrency(t.valor)}
                          </TableCell>
                          <TableCell>
                            {t.conciliado ? (
                              <span className="flex items-center gap-1 text-success text-xs font-medium">
                                <CheckCircle2 className="h-3 w-3" /> Conciliado
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-warning text-xs font-medium">
                                <AlertCircle className="h-3 w-3" /> Pendente
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {!t.conciliado && (
                              <Button variant="outline" size="sm">
                                Conciliar
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <p>Nenhuma transação encontrada para esta conta.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
