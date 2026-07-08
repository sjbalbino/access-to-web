GRANT SELECT ON public.ncm TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ncm TO authenticated;
GRANT ALL ON public.ncm TO service_role;

INSERT INTO public.ncm (codigo, descricao, ativo) VALUES
('10011100', 'Trigo duro para semeadura', true),
('10011900', 'Outros trigos duros', true),
('10019100', 'Outros trigos e misturas, para semeadura', true),
('10019900', 'Outros trigos e misturas', true),
('10059010', 'Milho em grão, para semeadura', true),
('10059090', 'Outros milhos em grão', true),
('12010010', 'Soja, mesmo triturada, para semeadura', true),
('12010090', 'Outras sojas, mesmo trituradas', true),
('12011000', 'Soja para semeadura', true),
('12019000', 'Outras sojas', true),
('10061010', 'Arroz com casca (arroz paddy) para semeadura', true),
('10061092', 'Arroz com casca parboilizado', true),
('10062010', 'Arroz descascado (arroz cargo) parboilizado', true),
('31010000', 'Adubos ou fertilizantes de origem animal ou vegetal', true),
('31021000', 'Ureia', true),
('31022100', 'Sulfato de amônio', true),
('31031100', 'Superfosfatos com teor de pentóxido de fósforo superior a 35%', true),
('31042010', 'Cloreto de potássio com teor de K2O <= 60%', true),
('31042090', 'Outros cloretos de potássio', true),
('31052000', 'Adubos ou fertilizantes com nitrogênio, fósforo e potássio', true),
('38089110', 'Inseticidas à base de piretróides', true),
('38089190', 'Outros inseticidas', true),
('38089210', 'Fungicidas à base de compostos de cobre', true),
('38089290', 'Outros fungicidas', true),
('38089310', 'Herbicidas à base de glifosato', true),
('38089390', 'Outros herbicidas', true),
('38089410', 'Desinfetantes', true),
('38089910', 'Rodenticidas', true),
('38089990', 'Outros produtos fitossanitários', true)
ON CONFLICT (codigo) DO UPDATE SET
  descricao = EXCLUDED.descricao,
  ativo = true,
  updated_at = now();