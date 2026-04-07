
ALTER TABLE public.compras_cereais
  ADD COLUMN local_entrega_id uuid REFERENCES public.locais_entrega(id),
  ADD COLUMN tipo_produto character varying DEFAULT 'industria';
