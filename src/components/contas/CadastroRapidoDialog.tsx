import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { usePlanoContasGerencial } from '@/hooks/usePlanoContasGerencial';
import { useDreContas } from '@/hooks/useDreContas';
import { useGruposProdutos } from '@/hooks/useGruposProdutos';

/** Entidades que podem ser cadastradas/editadas pelo atalho no formulário de contas. */
export type CadastroRapidoTipo = 'fornecedor' | 'cliente' | 'produto' | 'sub_centro' | 'dre';

interface FieldDef {
  key: string;
  label: string;
  required?: boolean;
  type?: 'text' | 'number' | 'select';
  options?: { value: string; label: string }[];
}

const CONFIG: Record<CadastroRapidoTipo, { table: string; titulo: string; queryKeys: string[] }> = {
  fornecedor: { table: 'clientes_fornecedores', titulo: 'Fornecedor', queryKeys: ['clientes_fornecedores'] },
  cliente: { table: 'clientes_fornecedores', titulo: 'Cliente', queryKeys: ['clientes_fornecedores'] },
  produto: { table: 'produtos', titulo: 'Produto', queryKeys: ['produtos'] },
  sub_centro: { table: 'sub_centros_custo', titulo: 'Sub-centro de custo', queryKeys: ['sub_centros_custo'] },
  dre: { table: 'dre_contas', titulo: 'Conta DRE', queryKeys: ['dre_contas'] },
};

export interface CadastroRapidoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tipo: CadastroRapidoTipo;
  /** id do registro a editar; ausente = novo cadastro */
  registroId?: string;
  /** chamado com o id salvo para selecionar no formulário */
  onSaved?: (id: string) => void;
}

export function CadastroRapidoDialog({ open, onOpenChange, tipo, registroId, onSaved }: CadastroRapidoDialogProps) {
  const qc = useQueryClient();
  const cfg = CONFIG[tipo];
  const { data: centros } = usePlanoContasGerencial();
  const { data: dres } = useDreContas();
  const { data: grupos } = useGruposProdutos();
  const [form, setForm] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const fields: FieldDef[] = (() => {
    switch (tipo) {
      case 'fornecedor':
      case 'cliente':
        return [
          { key: 'nome', label: 'Razão Social / Nome', required: true },
          { key: 'nome_fantasia', label: 'Nome Fantasia' },
          { key: 'cpf_cnpj', label: 'CPF/CNPJ' },
          { key: 'telefone', label: 'Telefone' },
          { key: 'email', label: 'E-mail' },
          { key: 'cidade', label: 'Cidade' },
          { key: 'uf', label: 'UF' },
        ];
      case 'produto':
        return [
          { key: 'nome', label: 'Nome', required: true },
          { key: 'grupo_id', label: 'Grupo', type: 'select', options: (grupos || []).map((g: any) => ({ value: g.id, label: g.nome })) },
          { key: 'preco_custo', label: 'Preço de custo', type: 'number' },
        ];
      case 'sub_centro':
        return [
          { key: 'centro_custo_id', label: 'Centro de custo', required: true, type: 'select', options: (centros || []).map((c: any) => ({ value: c.id, label: `${c.codigo} - ${c.descricao}` })) },
          { key: 'codigo', label: 'Código' },
          { key: 'descricao', label: 'Descrição', required: true },
          { key: 'codigo_dre', label: 'Conta DRE', type: 'select', options: (dres || []).map((d) => ({ value: d.codigo, label: `${d.codigo} - ${d.descricao}` })) },
        ];
      case 'dre':
        return [
          { key: 'codigo', label: 'Código', required: true },
          { key: 'descricao', label: 'Descrição', required: true },
          { key: 'parent_id', label: 'Conta pai', type: 'select', options: (dres || []).filter(d => d.id !== registroId).map((d) => ({ value: d.id, label: `${d.codigo} - ${d.descricao}` })) },
          { key: 'tipo_saldo', label: 'Tipo de saldo', type: 'select', options: [{ value: 'debito', label: 'Débito' }, { value: 'credito', label: 'Crédito' }] },
        ];
    }
  })();

  // Carrega o registro ao editar; ao criar, aplica valores padrão
  useEffect(() => {
    if (!open) return;
    if (!registroId) {
      setForm(tipo === 'dre' ? { tipo_saldo: 'debito' } : {});
      return;
    }
    setLoading(true);
    supabase.from(cfg.table as any).select('*').eq('id', registroId).single()
      .then(({ data, error }) => {
        if (error) toast.error('Erro ao carregar: ' + error.message);
        else setForm(data as any);
        setLoading(false);
      });
  }, [open, registroId, tipo, cfg.table]);

  const handleSave = async () => {
    const faltando = fields.filter(f => f.required && !String(form[f.key] ?? '').trim());
    if (faltando.length) { toast.error(`Preencha: ${faltando.map(f => f.label).join(', ')}`); return; }

    // Envia apenas os campos exibidos (evita colunas inexistentes)
    const payload: Record<string, any> = {};
    fields.forEach(f => {
      const v = form[f.key];
      payload[f.key] = v === '' || v === undefined ? null : f.type === 'number' ? Number(v) : v;
    });
    if (!registroId) {
      if (tipo === 'fornecedor') payload.tipo = 'fornecedor';
      if (tipo === 'cliente') payload.tipo = 'cliente';
      if (tipo === 'dre') {
        const pai = dres?.find(d => d.id === payload.parent_id);
        payload.nivel = pai ? pai.nivel + 1 : 1;
      }
      payload.ativo = true;
    } else if (tipo === 'dre') {
      const pai = dres?.find(d => d.id === payload.parent_id);
      payload.nivel = pai ? pai.nivel + 1 : 1;
    }

    setSaving(true);
    const q = registroId
      ? supabase.from(cfg.table as any).update(payload).eq('id', registroId).select('id').single()
      : supabase.from(cfg.table as any).insert(payload).select('id').single();
    const { data, error } = await q;
    setSaving(false);
    if (error) { toast.error('Erro ao salvar: ' + error.message); return; }
    cfg.queryKeys.forEach(k => qc.invalidateQueries({ queryKey: [k] }));
    toast.success(`${cfg.titulo} ${registroId ? 'atualizado' : 'cadastrado'}!`);
    onSaved?.((data as any).id);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{registroId ? 'Editar' : 'Novo'} {cfg.titulo}</DialogTitle>
        </DialogHeader>
        {loading ? <p className="text-sm text-muted-foreground">Carregando...</p> : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {fields.map(f => (
              <div key={f.key} className={f.key === 'nome' || f.key === 'descricao' ? 'sm:col-span-2' : ''}>
                <Label>{f.label}{f.required ? ' *' : ''}</Label>
                {f.type === 'select' ? (
                  <Select isSearchable value={form[f.key] || undefined} onValueChange={(v) => setForm(p => ({ ...p, [f.key]: v }))}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {f.options?.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    type={f.type === 'number' ? 'number' : 'text'}
                    step={f.type === 'number' ? '0.01' : undefined}
                    value={form[f.key] ?? ''}
                    onChange={(e) => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                  />
                )}
              </div>
            ))}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving || loading}>{saving ? 'Salvando...' : 'Salvar'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
