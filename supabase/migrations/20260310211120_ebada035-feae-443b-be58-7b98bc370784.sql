
-- Add columns to plano_contas_gerencial (Tabela Plano Grupo)
ALTER TABLE public.plano_contas_gerencial ADD COLUMN IF NOT EXISTS ordem integer DEFAULT 0;
ALTER TABLE public.plano_contas_gerencial ADD COLUMN IF NOT EXISTS imprimir boolean DEFAULT true;

-- Add columns to sub_centros_custo (Tabela Plano Contas)
ALTER TABLE public.sub_centros_custo ADD COLUMN IF NOT EXISTS tipo varchar DEFAULT 'despesa';
ALTER TABLE public.sub_centros_custo ADD COLUMN IF NOT EXISTS incide_irf boolean DEFAULT false;
