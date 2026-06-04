ALTER TABLE public.granjas ADD COLUMN is_principal BOOLEAN DEFAULT false;

-- Índice único parcial para garantir que apenas uma granja seja a principal por tenant
CREATE UNIQUE INDEX idx_granjas_principal_per_tenant 
ON public.granjas (tenant_id) 
WHERE (is_principal = true);

-- Comentário para documentação
COMMENT ON COLUMN public.granjas.is_principal IS 'Indica se esta é a granja principal do produtor/tenant para pré-seleção em formulários.';
