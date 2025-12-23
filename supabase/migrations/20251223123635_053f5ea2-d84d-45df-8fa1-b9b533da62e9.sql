-- Criar tabela locais_entrega
CREATE TABLE public.locais_entrega (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  granja_id UUID REFERENCES public.granjas(id),
  codigo VARCHAR,
  nome VARCHAR NOT NULL,
  nome_fantasia VARCHAR,
  tipo_pessoa VARCHAR DEFAULT 'juridica',
  cpf_cnpj VARCHAR,
  inscricao_estadual VARCHAR,
  logradouro VARCHAR,
  numero VARCHAR,
  complemento VARCHAR,
  bairro VARCHAR,
  cidade VARCHAR,
  uf VARCHAR(2),
  cep VARCHAR,
  telefone VARCHAR,
  email VARCHAR,
  observacoes TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.locais_entrega ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Usuários veem locais_entrega do seu tenant" 
ON public.locais_entrega 
FOR SELECT 
USING (granja_belongs_to_tenant(granja_id));

CREATE POLICY "Operadores e admins podem inserir locais_entrega" 
ON public.locais_entrega 
FOR INSERT 
WITH CHECK (can_edit(auth.uid()) AND granja_belongs_to_tenant(granja_id));

CREATE POLICY "Operadores e admins podem atualizar locais_entrega" 
ON public.locais_entrega 
FOR UPDATE 
USING (can_edit(auth.uid()) AND granja_belongs_to_tenant(granja_id));

CREATE POLICY "Operadores e admins podem excluir locais_entrega" 
ON public.locais_entrega 
FOR DELETE 
USING (can_edit(auth.uid()) AND granja_belongs_to_tenant(granja_id));

-- Trigger para updated_at
CREATE TRIGGER update_locais_entrega_updated_at
BEFORE UPDATE ON public.locais_entrega
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Adicionar colunas na tabela transferencias_deposito
ALTER TABLE public.transferencias_deposito 
ADD COLUMN IF NOT EXISTS local_saida_id UUID REFERENCES public.locais_entrega(id),
ADD COLUMN IF NOT EXISTS local_entrada_id UUID REFERENCES public.locais_entrega(id);

-- Atualizar FK de colheitas.local_entrega_terceiro_id para locais_entrega
ALTER TABLE public.colheitas 
DROP CONSTRAINT IF EXISTS colheitas_local_entrega_terceiro_id_fkey;

ALTER TABLE public.colheitas 
ADD CONSTRAINT colheitas_local_entrega_terceiro_id_fkey 
FOREIGN KEY (local_entrega_terceiro_id) REFERENCES public.locais_entrega(id);