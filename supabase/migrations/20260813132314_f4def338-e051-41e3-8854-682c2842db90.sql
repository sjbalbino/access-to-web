DELETE FROM public.controle_marcacoes WHERE documento_tipo = 'remessa_venda';

ALTER TABLE public.controle_marcacoes DROP CONSTRAINT IF EXISTS controle_marcacoes_documento_tipo_check;

ALTER TABLE public.controle_marcacoes
  ADD CONSTRAINT controle_marcacoes_documento_tipo_check
  CHECK (documento_tipo IN ('transferencia_deposito','compra_cereal','contrato_venda','nota_deposito','devolucao_deposito'));