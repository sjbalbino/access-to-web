
CREATE TABLE public.plano_contas_gerencial (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo varchar NOT NULL,
  descricao varchar NOT NULL,
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.plano_contas_gerencial ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir leitura pública" ON public.plano_contas_gerencial FOR SELECT USING (true);
CREATE POLICY "Operadores podem inserir" ON public.plano_contas_gerencial FOR INSERT WITH CHECK (can_edit(auth.uid()));
CREATE POLICY "Operadores podem atualizar" ON public.plano_contas_gerencial FOR UPDATE USING (can_edit(auth.uid()));
CREATE POLICY "Operadores podem excluir" ON public.plano_contas_gerencial FOR DELETE USING (can_edit(auth.uid()));

CREATE TRIGGER update_plano_contas_gerencial_updated_at
  BEFORE UPDATE ON public.plano_contas_gerencial
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.grupos_produtos
  ADD COLUMN conta_gerencial_id uuid REFERENCES public.plano_contas_gerencial(id),
  ADD COLUMN maquinas_implementos boolean DEFAULT false,
  ADD COLUMN bens_benfeitorias boolean DEFAULT false,
  ADD COLUMN insumos boolean DEFAULT false,
  ADD COLUMN venda_producao boolean DEFAULT false;
