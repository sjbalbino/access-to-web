import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle2, XCircle, Loader2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useFocusNfe } from '@/hooks/useFocusNfe';
import { toast } from 'sonner';
import { formatNumber } from '@/lib/formatters';
import type { NotaDepositoEmitida } from '@/hooks/useNotasDepositoEmitidas';
import type { NotaFiscalData, NotaFiscalItemData } from '@/lib/focusNfeMapper';

type EmissionStep = 'idle' | 'loading_data' | 'creating_nfe' | 'creating_item' | 'sending' | 'polling' | 'success' | 'error';

interface EmissionStatus {
  step: EmissionStep;
  message: string;
  progress: number;
  details?: string;
  notaFiscalId?: string;
}

interface EmitirNfeDepositoDialogProps {
  nota: NotaDepositoEmitida | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export function EmitirNfeDepositoDialog({ nota, onClose, onSuccess }: EmitirNfeDepositoDialogProps) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<EmissionStatus>({
    step: 'idle',
    message: '',
    progress: 0,
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const focusNfe = useFocusNfe();

  const cleanDigits = (value: string | null | undefined, maxLen?: number): string | null => {
    if (!value) return null;
    const digits = value.replace(/\D/g, '');
    const trimmed = maxLen ? digits.slice(0, maxLen) : digits;
    return trimmed.length ? trimmed : null;
  };

  const handleEmitir = async () => {
    if (!nota) return;

    setIsProcessing(true);
    setStatus({ step: 'loading_data', message: 'Carregando dados...', progress: 10 });

    try {
      // 1. Buscar inscrição do produtor (depositante/destinatário)
      const { data: inscricaoProdutor, error: inscricaoProdutorError } = await supabase
        .from('inscricoes_produtor')
        .select(`
          *,
          produtores(nome)
        `)
        .eq('id', nota.inscricao_produtor_id)
        .single();

      if (inscricaoProdutorError || !inscricaoProdutor) {
        throw new Error('Inscrição do produtor não encontrada');
      }

      // 2. Buscar inscrição emitente principal da granja
      const { data: inscricaoEmitente, error: inscricaoEmitenteError } = await supabase
        .from('inscricoes_produtor')
        .select(`
          *,
          produtores(nome),
          granjas:granja_id(id, razao_social, nome_fantasia)
        `)
        .eq('granja_id', nota.granja_id)
        .eq('is_emitente_principal', true)
        .maybeSingle();

      if (inscricaoEmitenteError || !inscricaoEmitente) {
        throw new Error('Inscrição do emitente principal não encontrada para esta granja');
      }

      // 3. Buscar emitente pela granja
      const { data: emitente, error: emitenteError } = await supabase
        .from('emitentes_nfe')
        .select('*')
        .eq('granja_id', nota.granja_id)
        .maybeSingle();

      if (emitenteError || !emitente) {
        throw new Error('Emitente NFe não configurado para esta granja');
      }

      // 4. Buscar CFOP 1905
      const { data: cfop, error: cfopError } = await supabase
        .from('cfops')
        .select('*')
        .eq('codigo', '1905')
        .maybeSingle();

      if (cfopError || !cfop) {
        throw new Error('CFOP 1905 não cadastrado');
      }

      // 5. Buscar produto e safra
      const { data: produto } = await supabase
        .from('produtos')
        .select('*')
        .eq('id', nota.produto_id)
        .single();

      const { data: safra } = await supabase
        .from('safras')
        .select('*')
        .eq('id', nota.safra_id)
        .single();

      setStatus({ step: 'creating_nfe', message: 'Criando nota fiscal...', progress: 30 });

      // 6. Preparar dados da NF-e
      const proximoNumero = (emitente.numero_atual_nfe || 0) + 1;
      const qtdKg = nota.quantidade_kg;

      // Info complementar
      const infoComplementar = (() => {
        const partes: string[] = [];
        if (safra?.nome) {
          partes.push(`Safra: ${safra.nome}`);
        }
        const nomeEmitente = inscricaoEmitente.produtores?.nome || '';
        const cidadeEmitente = inscricaoEmitente.cidade || '';
        const cpfEmitente = inscricaoEmitente.cpf_cnpj || '';
        if (nomeEmitente) {
          partes.push(`PRODUTO JÁ TESTADO POR ${nomeEmitente} - ${cidadeEmitente} - CPF: ${cpfEmitente}`);
        }
        return partes.join(' | ') || null;
      })();

      const notaFiscalData = {
        granja_id: nota.granja_id,
        emitente_id: emitente.id,
        cfop_id: cfop.id,
        natureza_operacao: cfop.natureza_operacao || 'ENTRADA DE MERCADORIA RECEBIDA PARA DEPOSITO',
        numero: proximoNumero,
        serie: emitente.serie_nfe || 1,
        data_emissao: new Date().toISOString(),
        data_saida_entrada: new Date().toISOString(),
        operacao: 0,
        finalidade: 1,
        ind_consumidor_final: 0,
        ind_presenca: 9,
        modalidade_frete: 9,
        forma_pagamento: 0,
        inscricao_produtor_id: nota.inscricao_produtor_id,
        info_complementar: infoComplementar,
        dest_tipo: cleanDigits(inscricaoProdutor.cpf_cnpj)?.length === 14 ? 'juridica' : 'fisica',
        dest_cpf_cnpj: cleanDigits(inscricaoProdutor.cpf_cnpj),
        dest_nome: inscricaoProdutor.produtores?.nome || inscricaoProdutor.granja,
        dest_ie: cleanDigits(inscricaoProdutor.inscricao_estadual),
        dest_logradouro: inscricaoProdutor.logradouro,
        dest_numero: inscricaoProdutor.numero,
        dest_complemento: inscricaoProdutor.complemento,
        dest_bairro: inscricaoProdutor.bairro,
        dest_cidade: inscricaoProdutor.cidade,
        dest_uf: inscricaoProdutor.uf,
        dest_cep: cleanDigits(inscricaoProdutor.cep, 8),
        dest_telefone: cleanDigits(inscricaoProdutor.telefone),
        dest_email: inscricaoProdutor.email,
        total_produtos: qtdKg * 1,
        total_nota: qtdKg * 1,
        status: 'processando_autorizacao',
      };

      // Criar nota fiscal
      const { data: notaFiscal, error: notaError } = await supabase
        .from('notas_fiscais')
        .insert(notaFiscalData)
        .select()
        .single();

      if (notaError) throw new Error(`Erro ao criar NF-e: ${notaError.message}`);

      setStatus({ step: 'creating_item', message: 'Criando item da nota...', progress: 45, notaFiscalId: notaFiscal.id });

      // 7. Criar item da nota
      const itemData = {
        nota_fiscal_id: notaFiscal.id,
        numero_item: 1,
        produto_id: nota.produto_id,
        codigo: produto?.codigo || '',
        descricao: produto?.nome || 'Produto',
        ncm: produto?.ncm || '',
        cfop: cfop.codigo,
        unidade: 'KG',
        quantidade: qtdKg,
        valor_unitario: 1,
        valor_total: qtdKg,
        valor_desconto: 0,
        origem: 0,
        cst_icms: cfop.cst_icms_padrao || '41',
        modalidade_bc_icms: 3,
        base_icms: 0,
        aliq_icms: 0,
        valor_icms: 0,
        cst_pis: cfop.cst_pis_padrao || '08',
        base_pis: 0,
        aliq_pis: 0,
        valor_pis: 0,
        cst_cofins: cfop.cst_cofins_padrao || '08',
        base_cofins: 0,
        aliq_cofins: 0,
        valor_cofins: 0,
      };

      const { error: itemError } = await supabase
        .from('notas_fiscais_itens')
        .insert(itemData);

      if (itemError) throw new Error(`Erro ao criar item: ${itemError.message}`);

      // 8. Incrementar número da NF-e
      await supabase
        .from('emitentes_nfe')
        .update({ numero_atual_nfe: proximoNumero })
        .eq('id', emitente.id);

      setStatus({ step: 'sending', message: 'Enviando para SEFAZ...', progress: 60, notaFiscalId: notaFiscal.id });

      // 9. Preparar dados para emissão
      const notaDataForEmission: NotaFiscalData = {
        id: notaFiscal.id,
        data_emissao: notaFiscalData.data_emissao,
        natureza_operacao: notaFiscalData.natureza_operacao,
        operacao: notaFiscalData.operacao,
        finalidade: notaFiscalData.finalidade,
        ind_consumidor_final: notaFiscalData.ind_consumidor_final,
        ind_presenca: notaFiscalData.ind_presenca,
        modalidade_frete: notaFiscalData.modalidade_frete,
        forma_pagamento: notaFiscalData.forma_pagamento,
        info_complementar: notaFiscalData.info_complementar,
        info_fisco: null,
        dest_cpf_cnpj: notaFiscalData.dest_cpf_cnpj,
        dest_nome: notaFiscalData.dest_nome,
        dest_ie: notaFiscalData.dest_ie,
        dest_logradouro: notaFiscalData.dest_logradouro,
        dest_numero: notaFiscalData.dest_numero,
        dest_bairro: notaFiscalData.dest_bairro,
        dest_cidade: notaFiscalData.dest_cidade,
        dest_uf: notaFiscalData.dest_uf,
        dest_cep: notaFiscalData.dest_cep,
        dest_tipo: notaFiscalData.dest_tipo === 'juridica' ? '1' : '0',
        dest_email: notaFiscalData.dest_email,
        dest_telefone: notaFiscalData.dest_telefone,
        inscricaoProdutor: {
          cpf_cnpj: inscricaoEmitente.cpf_cnpj,
          inscricao_estadual: inscricaoEmitente.inscricao_estadual,
          logradouro: inscricaoEmitente.logradouro,
          numero: inscricaoEmitente.numero,
          complemento: inscricaoEmitente.complemento,
          bairro: inscricaoEmitente.bairro,
          cidade: inscricaoEmitente.cidade,
          uf: inscricaoEmitente.uf,
          cep: inscricaoEmitente.cep,
          produtorNome: inscricaoEmitente.produtores?.nome || null,
          granjaNome: (inscricaoEmitente as any).granjas?.razao_social || (inscricaoEmitente as any).granjas?.nome_fantasia || null,
        },
        emitente: { crt: emitente.crt },
      };

      const itensDataForEmission: NotaFiscalItemData[] = [{
        numero_item: itemData.numero_item,
        codigo: itemData.codigo,
        descricao: itemData.descricao,
        ncm: itemData.ncm,
        cfop: itemData.cfop,
        unidade: itemData.unidade,
        quantidade: itemData.quantidade,
        valor_unitario: itemData.valor_unitario,
        valor_total: itemData.valor_total,
        valor_desconto: itemData.valor_desconto,
        origem: itemData.origem,
        cst_icms: itemData.cst_icms,
        modalidade_bc_icms: itemData.modalidade_bc_icms,
        base_icms: itemData.base_icms,
        aliq_icms: itemData.aliq_icms,
        valor_icms: itemData.valor_icms,
        cst_pis: itemData.cst_pis,
        base_pis: itemData.base_pis,
        aliq_pis: itemData.aliq_pis,
        valor_pis: itemData.valor_pis,
        cst_cofins: itemData.cst_cofins,
        base_cofins: itemData.base_cofins,
        aliq_cofins: itemData.aliq_cofins,
        valor_cofins: itemData.valor_cofins,
        cst_ipi: null,
        base_ipi: null,
        aliq_ipi: null,
        valor_ipi: null,
        valor_frete: null,
        valor_seguro: null,
        valor_outros: null,
        cst_ibs: null,
        base_ibs: null,
        aliq_ibs: null,
        valor_ibs: null,
        cclass_trib_ibs: null,
        cst_cbs: null,
        base_cbs: null,
        aliq_cbs: null,
        valor_cbs: null,
        cclass_trib_cbs: null,
        cst_is: null,
        base_is: null,
        aliq_is: null,
        valor_is: null,
      }];

      // 10. Emitir a NFe
      const emitResult = await focusNfe.emitirNfe(notaFiscal.id, notaDataForEmission, itensDataForEmission);

      if (!emitResult.success) {
        setStatus({
          step: 'error',
          message: 'Erro ao emitir NFe',
          progress: 100,
          details: emitResult.error || 'Erro desconhecido',
          notaFiscalId: notaFiscal.id,
        });
        return;
      }

      setStatus({ step: 'polling', message: 'Aguardando autorização da SEFAZ...', progress: 75, notaFiscalId: notaFiscal.id });

      // 11. Polling para aguardar autorização
      const ref = emitResult.ref;
      if (ref) {
        const pollResult = await focusNfe.pollStatus(ref, notaFiscal.id, 30, 3000);
        const finalStatus = (pollResult.data as Record<string, unknown>)?.status as string;

        if (finalStatus === 'autorizado' || finalStatus === 'autorizada') {
          // Vincular nota fiscal ao registro
          await supabase
            .from('notas_deposito_emitidas')
            .update({ nota_fiscal_id: notaFiscal.id })
            .eq('id', nota.id);

          setStatus({
            step: 'success',
            message: 'NFe autorizada com sucesso!',
            progress: 100,
            details: `Nota ${proximoNumero} autorizada pela SEFAZ`,
            notaFiscalId: notaFiscal.id,
          });

          queryClient.invalidateQueries({ queryKey: ['notas_deposito_emitidas'] });
          queryClient.invalidateQueries({ queryKey: ['notas_fiscais'] });
          queryClient.invalidateQueries({ queryKey: ['saldos_deposito'] });

          toast.success('NFe autorizada com sucesso!');
          onSuccess?.();
        } else {
          const motivo = (pollResult.data as Record<string, unknown>)?.mensagem_sefaz as string ||
                        (pollResult.data as Record<string, unknown>)?.motivo_status as string ||
                        'Status desconhecido';
          setStatus({
            step: 'error',
            message: 'NFe rejeitada pela SEFAZ',
            progress: 100,
            details: motivo,
            notaFiscalId: notaFiscal.id,
          });
        }
      } else {
        throw new Error('Ref não retornado pela API');
      }

    } catch (error: any) {
      console.error('Erro emissão NFe depósito:', error);
      setStatus({
        step: 'error',
        message: 'Erro na emissão',
        progress: 0,
        details: error.message,
      });
      toast.error('Erro na emissão', { description: error.message });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    if (status.step === 'idle' || status.step === 'success' || status.step === 'error') {
      setStatus({ step: 'idle', message: '', progress: 0 });
      onClose();
    }
  };

  const getStepStatus = (step: EmissionStep): 'pending' | 'active' | 'completed' | 'error' => {
    const steps: EmissionStep[] = ['loading_data', 'creating_nfe', 'creating_item', 'sending', 'polling'];
    const currentIndex = steps.indexOf(status.step);
    const stepIndex = steps.indexOf(step);

    if (status.step === 'error') {
      if (stepIndex <= currentIndex) return 'error';
      return 'pending';
    }
    if (status.step === 'success') return 'completed';
    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return 'active';
    return 'pending';
  };

  const stepLabels: Record<EmissionStep, string> = {
    idle: '',
    loading_data: 'Carregando dados',
    creating_nfe: 'Criando nota fiscal',
    creating_item: 'Criando item',
    sending: 'Enviando para SEFAZ',
    polling: 'Aguardando autorização',
    success: 'Concluído',
    error: 'Erro',
  };

  return (
    <Dialog open={!!nota} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Emitir NFe - Nota de Depósito</DialogTitle>
          <DialogDescription>
            CFOP 1905 - Entrada de mercadoria recebida para depósito
          </DialogDescription>
        </DialogHeader>

        {status.step === 'idle' ? (
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Produtor:</span>
                <p className="font-medium">{nota?.inscricao_produtor?.produtores?.nome}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Produto:</span>
                <p className="font-medium">{nota?.produto?.nome}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Quantidade:</span>
                <p className="font-medium">{formatNumber(nota?.quantidade_kg || 0, 3)} kg</p>
              </div>
              <div>
                <span className="text-muted-foreground">Safra:</span>
                <p className="font-medium">{nota?.safra?.nome}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6 py-4">
            <Progress value={status.progress} className="h-2" />
            
            <div className="space-y-3">
              {(['loading_data', 'creating_nfe', 'creating_item', 'sending', 'polling'] as EmissionStep[]).map((step) => {
                const stepStatus = getStepStatus(step);

                return (
                  <div key={step} className={cn(
                    'flex items-center gap-3 p-2 rounded',
                    stepStatus === 'active' && 'bg-primary/10',
                    stepStatus === 'completed' && 'text-muted-foreground',
                    stepStatus === 'error' && 'bg-destructive/10'
                  )}>
                    {stepStatus === 'completed' && <Check className="h-4 w-4 text-green-500" />}
                    {stepStatus === 'active' && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                    {stepStatus === 'error' && <XCircle className="h-4 w-4 text-destructive" />}
                    {stepStatus === 'pending' && <div className="h-4 w-4 rounded-full border-2 border-muted" />}
                    <span className={cn(stepStatus === 'active' && 'font-medium')}>{stepLabels[step]}</span>
                  </div>
                );
              })}
            </div>

            {status.step === 'success' && (
              <Alert className="bg-green-500/10 border-green-500/20">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <AlertTitle>Sucesso!</AlertTitle>
                <AlertDescription>{status.details}</AlertDescription>
              </Alert>
            )}

            {status.step === 'error' && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertTitle>Erro</AlertTitle>
                <AlertDescription>{status.details}</AlertDescription>
              </Alert>
            )}
          </div>
        )}

        <DialogFooter>
          {status.step === 'idle' && (
            <>
              <Button variant="outline" onClick={handleClose}>Cancelar</Button>
              <Button onClick={handleEmitir}>Emitir NFe</Button>
            </>
          )}
          {(status.step === 'success' || status.step === 'error') && (
            <Button onClick={handleClose}>Fechar</Button>
          )}
          {isProcessing && (
            <Button disabled>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Processando...
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
