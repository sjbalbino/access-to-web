import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { IdentificacaoFields } from './IdentificacaoFields';
import { EnderecoContatoFields } from './EnderecoContatoFields';
import { useClienteFornecedorForm, type ClienteFornecedorFormOptions } from './useClienteFornecedorForm';

export interface ClienteFornecedorDialogProps extends ClienteFornecedorFormOptions {}

export function ClienteFornecedorDialog(props: ClienteFornecedorDialogProps) {
  const state = useClienteFornecedorForm(props);
  const { formData, setFormData } = state;
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-5xl max-h-[92dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{props.registroId ? 'Editar' : 'Novo'} Cliente/Fornecedor</DialogTitle>
        </DialogHeader>
        {state.loading ? <p className="text-muted-foreground">Carregando cadastro...</p> : state.unavailable ? (
          <p role="alert" className="text-destructive">Não foi possível carregar este cadastro. Feche e tente novamente.</p>
        ) : (
          <form onSubmit={state.handleSubmit} className="space-y-4">
            <IdentificacaoFields {...state} />
            <EnderecoContatoFields {...state} />
            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea value={formData.observacoes || ''} onChange={e => setFormData({ ...formData, observacoes: e.target.value })} />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={formData.ativo ?? true} onCheckedChange={ativo => setFormData({ ...formData, ativo })} />
              <Label>Ativo</Label>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => props.onOpenChange(false)}>Cancelar</Button>
              <Button type="submit" disabled={state.saving || state.cepLoading || state.cnpjLoading}>{state.saving ? 'Salvando...' : 'Salvar'}</Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
