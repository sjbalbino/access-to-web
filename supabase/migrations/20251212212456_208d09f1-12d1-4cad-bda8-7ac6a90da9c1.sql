-- Tabela mestre: controle_lavouras
CREATE TABLE public.controle_lavouras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo VARCHAR,
  lavoura_id UUID NOT NULL REFERENCES public.lavouras(id) ON DELETE CASCADE,
  safra_id UUID NOT NULL REFERENCES public.safras(id) ON DELETE CASCADE,
  area_total NUMERIC DEFAULT 0,
  ha_plantado NUMERIC DEFAULT 0,
  cobertura_solo NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(lavoura_id, safra_id)
);

-- Enable RLS
ALTER TABLE public.controle_lavouras ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Permitir leitura pública de controle_lavouras" ON public.controle_lavouras FOR SELECT USING (true);
CREATE POLICY "Operadores e admins podem inserir controle_lavouras" ON public.controle_lavouras FOR INSERT WITH CHECK (can_edit(auth.uid()));
CREATE POLICY "Operadores e admins podem atualizar controle_lavouras" ON public.controle_lavouras FOR UPDATE USING (can_edit(auth.uid()));
CREATE POLICY "Operadores e admins podem excluir controle_lavouras" ON public.controle_lavouras FOR DELETE USING (can_edit(auth.uid()));

-- Trigger para updated_at
CREATE TRIGGER update_controle_lavouras_updated_at BEFORE UPDATE ON public.controle_lavouras FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tabela: insetos
CREATE TABLE public.insetos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  controle_lavoura_id UUID NOT NULL REFERENCES public.controle_lavouras(id) ON DELETE CASCADE,
  data_registro DATE,
  tipo_inseto VARCHAR,
  nivel_infestacao VARCHAR,
  area_afetada NUMERIC DEFAULT 0,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.insetos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir leitura pública de insetos" ON public.insetos FOR SELECT USING (true);
CREATE POLICY "Operadores e admins podem inserir insetos" ON public.insetos FOR INSERT WITH CHECK (can_edit(auth.uid()));
CREATE POLICY "Operadores e admins podem atualizar insetos" ON public.insetos FOR UPDATE USING (can_edit(auth.uid()));
CREATE POLICY "Operadores e admins podem excluir insetos" ON public.insetos FOR DELETE USING (can_edit(auth.uid()));
CREATE TRIGGER update_insetos_updated_at BEFORE UPDATE ON public.insetos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tabela: chuvas
CREATE TABLE public.chuvas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  controle_lavoura_id UUID NOT NULL REFERENCES public.controle_lavouras(id) ON DELETE CASCADE,
  data_chuva DATE,
  quantidade_mm NUMERIC DEFAULT 0,
  duracao_horas NUMERIC DEFAULT 0,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.chuvas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir leitura pública de chuvas" ON public.chuvas FOR SELECT USING (true);
CREATE POLICY "Operadores e admins podem inserir chuvas" ON public.chuvas FOR INSERT WITH CHECK (can_edit(auth.uid()));
CREATE POLICY "Operadores e admins podem atualizar chuvas" ON public.chuvas FOR UPDATE USING (can_edit(auth.uid()));
CREATE POLICY "Operadores e admins podem excluir chuvas" ON public.chuvas FOR DELETE USING (can_edit(auth.uid()));
CREATE TRIGGER update_chuvas_updated_at BEFORE UPDATE ON public.chuvas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tabela: plantas_invasoras
CREATE TABLE public.plantas_invasoras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  controle_lavoura_id UUID NOT NULL REFERENCES public.controle_lavouras(id) ON DELETE CASCADE,
  data_registro DATE,
  tipo_planta VARCHAR,
  nivel_infestacao VARCHAR,
  area_afetada NUMERIC DEFAULT 0,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.plantas_invasoras ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir leitura pública de plantas_invasoras" ON public.plantas_invasoras FOR SELECT USING (true);
CREATE POLICY "Operadores e admins podem inserir plantas_invasoras" ON public.plantas_invasoras FOR INSERT WITH CHECK (can_edit(auth.uid()));
CREATE POLICY "Operadores e admins podem atualizar plantas_invasoras" ON public.plantas_invasoras FOR UPDATE USING (can_edit(auth.uid()));
CREATE POLICY "Operadores e admins podem excluir plantas_invasoras" ON public.plantas_invasoras FOR DELETE USING (can_edit(auth.uid()));
CREATE TRIGGER update_plantas_invasoras_updated_at BEFORE UPDATE ON public.plantas_invasoras FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tabela: floracoes
CREATE TABLE public.floracoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  controle_lavoura_id UUID NOT NULL REFERENCES public.controle_lavouras(id) ON DELETE CASCADE,
  data_inicio DATE,
  data_fim DATE,
  percentual_floracao NUMERIC DEFAULT 0,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.floracoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir leitura pública de floracoes" ON public.floracoes FOR SELECT USING (true);
CREATE POLICY "Operadores e admins podem inserir floracoes" ON public.floracoes FOR INSERT WITH CHECK (can_edit(auth.uid()));
CREATE POLICY "Operadores e admins podem atualizar floracoes" ON public.floracoes FOR UPDATE USING (can_edit(auth.uid()));
CREATE POLICY "Operadores e admins podem excluir floracoes" ON public.floracoes FOR DELETE USING (can_edit(auth.uid()));
CREATE TRIGGER update_floracoes_updated_at BEFORE UPDATE ON public.floracoes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tabela: analises_solo
CREATE TABLE public.analises_solo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  controle_lavoura_id UUID NOT NULL REFERENCES public.controle_lavouras(id) ON DELETE CASCADE,
  data_coleta DATE,
  laboratorio VARCHAR,
  ph NUMERIC,
  materia_organica NUMERIC,
  fosforo NUMERIC,
  potassio NUMERIC,
  calcio NUMERIC,
  magnesio NUMERIC,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.analises_solo ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir leitura pública de analises_solo" ON public.analises_solo FOR SELECT USING (true);
CREATE POLICY "Operadores e admins podem inserir analises_solo" ON public.analises_solo FOR INSERT WITH CHECK (can_edit(auth.uid()));
CREATE POLICY "Operadores e admins podem atualizar analises_solo" ON public.analises_solo FOR UPDATE USING (can_edit(auth.uid()));
CREATE POLICY "Operadores e admins podem excluir analises_solo" ON public.analises_solo FOR DELETE USING (can_edit(auth.uid()));
CREATE TRIGGER update_analises_solo_updated_at BEFORE UPDATE ON public.analises_solo FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tabela: pivos
CREATE TABLE public.pivos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  controle_lavoura_id UUID NOT NULL REFERENCES public.controle_lavouras(id) ON DELETE CASCADE,
  data_irrigacao DATE,
  lamina_mm NUMERIC DEFAULT 0,
  duracao_horas NUMERIC DEFAULT 0,
  energia_kwh NUMERIC DEFAULT 0,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.pivos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir leitura pública de pivos" ON public.pivos FOR SELECT USING (true);
CREATE POLICY "Operadores e admins podem inserir pivos" ON public.pivos FOR INSERT WITH CHECK (can_edit(auth.uid()));
CREATE POLICY "Operadores e admins podem atualizar pivos" ON public.pivos FOR UPDATE USING (can_edit(auth.uid()));
CREATE POLICY "Operadores e admins podem excluir pivos" ON public.pivos FOR DELETE USING (can_edit(auth.uid()));
CREATE TRIGGER update_pivos_updated_at BEFORE UPDATE ON public.pivos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Adicionar coluna controle_lavoura_id às tabelas existentes
ALTER TABLE public.plantios ADD COLUMN IF NOT EXISTS controle_lavoura_id UUID REFERENCES public.controle_lavouras(id) ON DELETE SET NULL;
ALTER TABLE public.aplicacoes ADD COLUMN IF NOT EXISTS controle_lavoura_id UUID REFERENCES public.controle_lavouras(id) ON DELETE SET NULL;
ALTER TABLE public.colheitas ADD COLUMN IF NOT EXISTS controle_lavoura_id UUID REFERENCES public.controle_lavouras(id) ON DELETE SET NULL;