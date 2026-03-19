-- Change FK from plano_contas_gerencial to sub_centros_custo
ALTER TABLE public.grupos_produtos
  DROP CONSTRAINT grupos_produtos_conta_gerencial_id_fkey;

ALTER TABLE public.grupos_produtos
  ADD CONSTRAINT grupos_produtos_conta_gerencial_id_fkey
  FOREIGN KEY (conta_gerencial_id) REFERENCES public.sub_centros_custo(id);