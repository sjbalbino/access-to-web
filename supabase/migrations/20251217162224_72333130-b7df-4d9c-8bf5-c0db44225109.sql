-- Create NCM table
CREATE TABLE public.ncm (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo VARCHAR(10) NOT NULL UNIQUE,
  descricao VARCHAR(500) NOT NULL,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ncm ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Permitir leitura pública de ncm" 
ON public.ncm FOR SELECT USING (true);

CREATE POLICY "Operadores e admins podem inserir ncm" 
ON public.ncm FOR INSERT WITH CHECK (can_edit(auth.uid()));

CREATE POLICY "Operadores e admins podem atualizar ncm" 
ON public.ncm FOR UPDATE USING (can_edit(auth.uid()));

CREATE POLICY "Operadores e admins podem excluir ncm" 
ON public.ncm FOR DELETE USING (can_edit(auth.uid()));

-- Create trigger for updated_at
CREATE TRIGGER update_ncm_updated_at
BEFORE UPDATE ON public.ncm
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert common agricultural NCM codes
INSERT INTO public.ncm (codigo, descricao) VALUES
('10011100', 'Trigo duro para semeadura'),
('10011900', 'Outros trigos duros'),
('10019100', 'Outros trigos e misturas, para semeadura'),
('10019900', 'Outros trigos e misturas'),
('10059010', 'Milho em grão, para semeadura'),
('10059090', 'Outros milhos em grão'),
('12010010', 'Soja, mesmo triturada, para semeadura'),
('12010090', 'Outras sojas, mesmo trituradas'),
('12011000', 'Soja para semeadura'),
('12019000', 'Outras sojas'),
('10061010', 'Arroz com casca (arroz paddy) para semeadura'),
('10061092', 'Arroz com casca parboilizado'),
('10062010', 'Arroz descascado (arroz cargo) parboilizado'),
('31010000', 'Adubos ou fertilizantes de origem animal ou vegetal'),
('31021000', 'Ureia'),
('31022100', 'Sulfato de amônio'),
('31031100', 'Superfosfatos com teor de pentóxido de fósforo superior a 35%'),
('31042010', 'Cloreto de potássio com teor de K2O <= 60%'),
('31042090', 'Outros cloretos de potássio'),
('31052000', 'Adubos ou fertilizantes com nitrogênio, fósforo e potássio'),
('38089110', 'Inseticidas à base de piretróides'),
('38089190', 'Outros inseticidas'),
('38089210', 'Fungicidas à base de compostos de cobre'),
('38089290', 'Outros fungicidas'),
('38089310', 'Herbicidas à base de glifosato'),
('38089390', 'Outros herbicidas'),
('38089410', 'Desinfetantes'),
('38089910', 'Rodenticidas'),
('38089990', 'Outros produtos fitossanitários');