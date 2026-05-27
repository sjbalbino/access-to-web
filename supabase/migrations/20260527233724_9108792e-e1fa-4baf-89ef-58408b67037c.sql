ALTER TABLE public.granjas
  DROP COLUMN IF EXISTS cpf,
  DROP COLUMN IF EXISTS cnpj,
  DROP COLUMN IF EXISTS inscricao_estadual;