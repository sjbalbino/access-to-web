-- Primeiro remover as políticas RLS que dependem de inscricao_produtor_id
DROP POLICY IF EXISTS "Usuários veem emitentes do seu tenant" ON emitentes_nfe;
DROP POLICY IF EXISTS "Operadores e admins podem inserir emitentes" ON emitentes_nfe;
DROP POLICY IF EXISTS "Operadores e admins podem atualizar emitentes" ON emitentes_nfe;
DROP POLICY IF EXISTS "Operadores e admins podem excluir emitentes" ON emitentes_nfe;

-- Remover a constraint que exige granja ou inscrição do emitentes_nfe
ALTER TABLE emitentes_nfe DROP CONSTRAINT IF EXISTS emitentes_nfe_granja_ou_inscricao;

-- Remover o índice e a coluna inscricao_produtor_id
DROP INDEX IF EXISTS idx_emitentes_nfe_inscricao_produtor;
ALTER TABLE emitentes_nfe DROP COLUMN IF EXISTS inscricao_produtor_id;

-- Adicionar campos na tabela inscricoes_produtor
ALTER TABLE inscricoes_produtor 
  ADD COLUMN IF NOT EXISTS emitente_id UUID REFERENCES emitentes_nfe(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS conta_bancaria TEXT;

-- Criar índice para o novo campo
CREATE INDEX IF NOT EXISTS idx_inscricoes_produtor_emitente_id ON inscricoes_produtor(emitente_id);

-- Recriar as políticas RLS do emitentes_nfe simplificadas (apenas granja_id)
CREATE POLICY "Usuários veem emitentes do seu tenant" 
ON emitentes_nfe FOR SELECT 
USING (granja_belongs_to_tenant(granja_id));

CREATE POLICY "Operadores e admins podem inserir emitentes" 
ON emitentes_nfe FOR INSERT 
WITH CHECK (can_edit(auth.uid()) AND granja_belongs_to_tenant(granja_id));

CREATE POLICY "Operadores e admins podem atualizar emitentes" 
ON emitentes_nfe FOR UPDATE 
USING (can_edit(auth.uid()) AND granja_belongs_to_tenant(granja_id));

CREATE POLICY "Operadores e admins podem excluir emitentes" 
ON emitentes_nfe FOR DELETE 
USING (can_edit(auth.uid()) AND granja_belongs_to_tenant(granja_id));