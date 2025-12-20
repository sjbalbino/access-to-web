-- Create transportadoras table
CREATE TABLE public.transportadoras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  granja_id UUID REFERENCES public.granjas(id),
  nome VARCHAR(100) NOT NULL,
  cpf_cnpj VARCHAR(14),
  inscricao_estadual VARCHAR(14),
  logradouro VARCHAR(200),
  numero VARCHAR(10),
  bairro VARCHAR(100),
  cidade VARCHAR(100),
  uf VARCHAR(2),
  cep VARCHAR(8),
  telefone VARCHAR(14),
  email VARCHAR(100),
  placa_padrao VARCHAR(7),
  uf_placa_padrao VARCHAR(2),
  rntc VARCHAR(20),
  ativa BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.transportadoras ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Usuários veem transportadoras do seu tenant" 
  ON public.transportadoras 
  FOR SELECT 
  USING (granja_belongs_to_tenant(granja_id));

CREATE POLICY "Operadores e admins podem inserir transportadoras" 
  ON public.transportadoras 
  FOR INSERT 
  WITH CHECK (can_edit(auth.uid()) AND granja_belongs_to_tenant(granja_id));

CREATE POLICY "Operadores e admins podem atualizar transportadoras" 
  ON public.transportadoras 
  FOR UPDATE 
  USING (can_edit(auth.uid()) AND granja_belongs_to_tenant(granja_id));

CREATE POLICY "Operadores e admins podem excluir transportadoras" 
  ON public.transportadoras 
  FOR DELETE 
  USING (can_edit(auth.uid()) AND granja_belongs_to_tenant(granja_id));

-- Trigger for updated_at
CREATE TRIGGER update_transportadoras_updated_at
  BEFORE UPDATE ON public.transportadoras
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();