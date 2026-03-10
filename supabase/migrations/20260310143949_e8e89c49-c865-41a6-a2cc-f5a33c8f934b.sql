
-- 1. Add 'tipo' column to plano_contas_gerencial (centro de custo)
ALTER TABLE public.plano_contas_gerencial ADD COLUMN tipo varchar DEFAULT 'despesa';

-- 2. Create sub_centros_custo table
CREATE TABLE public.sub_centros_custo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  centro_custo_id uuid NOT NULL REFERENCES public.plano_contas_gerencial(id) ON DELETE CASCADE,
  codigo varchar NOT NULL,
  descricao varchar NOT NULL,
  codigo_dre varchar,
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.sub_centros_custo ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir leitura pública sub_centros" ON public.sub_centros_custo FOR SELECT USING (true);
CREATE POLICY "Operadores podem inserir sub_centros" ON public.sub_centros_custo FOR INSERT WITH CHECK (can_edit(auth.uid()));
CREATE POLICY "Operadores podem atualizar sub_centros" ON public.sub_centros_custo FOR UPDATE USING (can_edit(auth.uid()));
CREATE POLICY "Operadores podem excluir sub_centros" ON public.sub_centros_custo FOR DELETE USING (can_edit(auth.uid()));

CREATE TRIGGER update_sub_centros_custo_updated_at BEFORE UPDATE ON public.sub_centros_custo FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 3. Create dre_contas table (hierarchical DRE structure)
CREATE TABLE public.dre_contas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo varchar NOT NULL,
  descricao varchar NOT NULL,
  nivel integer NOT NULL DEFAULT 1,
  parent_id uuid REFERENCES public.dre_contas(id) ON DELETE SET NULL,
  tipo_saldo varchar DEFAULT 'debito',
  ordem integer DEFAULT 0,
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.dre_contas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir leitura pública dre_contas" ON public.dre_contas FOR SELECT USING (true);
CREATE POLICY "Operadores podem inserir dre_contas" ON public.dre_contas FOR INSERT WITH CHECK (can_edit(auth.uid()));
CREATE POLICY "Operadores podem atualizar dre_contas" ON public.dre_contas FOR UPDATE USING (can_edit(auth.uid()));
CREATE POLICY "Operadores podem excluir dre_contas" ON public.dre_contas FOR DELETE USING (can_edit(auth.uid()));

CREATE TRIGGER update_dre_contas_updated_at BEFORE UPDATE ON public.dre_contas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 4. Create lancamentos_financeiros table
CREATE TABLE public.lancamentos_financeiros (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  granja_id uuid NOT NULL REFERENCES public.granjas(id) ON DELETE CASCADE,
  data_lancamento date NOT NULL DEFAULT CURRENT_DATE,
  sub_centro_custo_id uuid REFERENCES public.sub_centros_custo(id) ON DELETE SET NULL,
  dre_conta_id uuid REFERENCES public.dre_contas(id) ON DELETE SET NULL,
  descricao varchar NOT NULL,
  valor numeric NOT NULL DEFAULT 0,
  tipo varchar NOT NULL DEFAULT 'despesa',
  fornecedor_id uuid REFERENCES public.clientes_fornecedores(id) ON DELETE SET NULL,
  documento varchar,
  observacoes text,
  safra_id uuid REFERENCES public.safras(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.lancamentos_financeiros ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários veem lancamentos do seu tenant" ON public.lancamentos_financeiros FOR SELECT USING (granja_belongs_to_tenant(granja_id));
CREATE POLICY "Operadores podem inserir lancamentos" ON public.lancamentos_financeiros FOR INSERT WITH CHECK (can_edit(auth.uid()) AND granja_belongs_to_tenant(granja_id));
CREATE POLICY "Operadores podem atualizar lancamentos" ON public.lancamentos_financeiros FOR UPDATE USING (can_edit(auth.uid()) AND granja_belongs_to_tenant(granja_id));
CREATE POLICY "Operadores podem excluir lancamentos" ON public.lancamentos_financeiros FOR DELETE USING (can_edit(auth.uid()) AND granja_belongs_to_tenant(granja_id));

CREATE TRIGGER update_lancamentos_financeiros_updated_at BEFORE UPDATE ON public.lancamentos_financeiros FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
