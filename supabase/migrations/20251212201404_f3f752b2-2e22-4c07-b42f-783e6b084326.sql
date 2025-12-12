-- Tabela de Plantios
CREATE TABLE public.plantios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  safra_id UUID REFERENCES public.safras(id) ON DELETE SET NULL,
  lavoura_id UUID REFERENCES public.lavouras(id) ON DELETE CASCADE NOT NULL,
  cultura_id UUID REFERENCES public.culturas(id) ON DELETE SET NULL,
  variedade_id UUID REFERENCES public.variedades(id) ON DELETE SET NULL,
  data_plantio DATE,
  area_plantada NUMERIC DEFAULT 0,
  quantidade_semente NUMERIC DEFAULT 0,
  populacao_ha NUMERIC DEFAULT 0,
  espacamento_linha NUMERIC DEFAULT 0,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de Aplicações (genérica para Adubação, Herbicidas, Fungicidas, Inseticidas, Dessecação)
CREATE TABLE public.aplicacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo VARCHAR NOT NULL, -- 'adubacao', 'herbicida', 'fungicida', 'inseticida', 'dessecacao'
  safra_id UUID REFERENCES public.safras(id) ON DELETE SET NULL,
  lavoura_id UUID REFERENCES public.lavouras(id) ON DELETE CASCADE NOT NULL,
  plantio_id UUID REFERENCES public.plantios(id) ON DELETE SET NULL,
  produto_id UUID REFERENCES public.produtos(id) ON DELETE SET NULL,
  data_aplicacao DATE,
  area_aplicada NUMERIC DEFAULT 0,
  dose_ha NUMERIC DEFAULT 0,
  quantidade_total NUMERIC DEFAULT 0,
  unidade_medida_id UUID REFERENCES public.unidades_medida(id) ON DELETE SET NULL,
  aplicador VARCHAR,
  equipamento VARCHAR,
  condicao_climatica VARCHAR,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de Colheitas
CREATE TABLE public.colheitas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  safra_id UUID REFERENCES public.safras(id) ON DELETE SET NULL,
  lavoura_id UUID REFERENCES public.lavouras(id) ON DELETE CASCADE NOT NULL,
  plantio_id UUID REFERENCES public.plantios(id) ON DELETE SET NULL,
  data_colheita DATE,
  area_colhida NUMERIC DEFAULT 0,
  producao_kg NUMERIC DEFAULT 0,
  umidade NUMERIC DEFAULT 0,
  impureza NUMERIC DEFAULT 0,
  producao_liquida_kg NUMERIC DEFAULT 0,
  produtividade_sacas_ha NUMERIC DEFAULT 0,
  silo_id UUID REFERENCES public.silos(id) ON DELETE SET NULL,
  placa_id UUID REFERENCES public.placas(id) ON DELETE SET NULL,
  motorista VARCHAR,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.plantios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aplicacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.colheitas ENABLE ROW LEVEL SECURITY;

-- Políticas para plantios
CREATE POLICY "Permitir leitura pública de plantios" ON public.plantios FOR SELECT USING (true);
CREATE POLICY "Operadores e admins podem inserir plantios" ON public.plantios FOR INSERT WITH CHECK (can_edit(auth.uid()));
CREATE POLICY "Operadores e admins podem atualizar plantios" ON public.plantios FOR UPDATE USING (can_edit(auth.uid()));
CREATE POLICY "Operadores e admins podem excluir plantios" ON public.plantios FOR DELETE USING (can_edit(auth.uid()));

-- Políticas para aplicacoes
CREATE POLICY "Permitir leitura pública de aplicacoes" ON public.aplicacoes FOR SELECT USING (true);
CREATE POLICY "Operadores e admins podem inserir aplicacoes" ON public.aplicacoes FOR INSERT WITH CHECK (can_edit(auth.uid()));
CREATE POLICY "Operadores e admins podem atualizar aplicacoes" ON public.aplicacoes FOR UPDATE USING (can_edit(auth.uid()));
CREATE POLICY "Operadores e admins podem excluir aplicacoes" ON public.aplicacoes FOR DELETE USING (can_edit(auth.uid()));

-- Políticas para colheitas
CREATE POLICY "Permitir leitura pública de colheitas" ON public.colheitas FOR SELECT USING (true);
CREATE POLICY "Operadores e admins podem inserir colheitas" ON public.colheitas FOR INSERT WITH CHECK (can_edit(auth.uid()));
CREATE POLICY "Operadores e admins podem atualizar colheitas" ON public.colheitas FOR UPDATE USING (can_edit(auth.uid()));
CREATE POLICY "Operadores e admins podem excluir colheitas" ON public.colheitas FOR DELETE USING (can_edit(auth.uid()));

-- Triggers para updated_at
CREATE TRIGGER update_plantios_updated_at BEFORE UPDATE ON public.plantios FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_aplicacoes_updated_at BEFORE UPDATE ON public.aplicacoes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_colheitas_updated_at BEFORE UPDATE ON public.colheitas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();