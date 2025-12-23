-- Adicionar coluna inscricao_produtor_id à tabela emitentes_nfe
ALTER TABLE emitentes_nfe 
ADD COLUMN inscricao_produtor_id uuid REFERENCES inscricoes_produtor(id) ON DELETE SET NULL;

-- Adicionar constraint para garantir que pelo menos um dos dois seja preenchido
-- (granja_id OU inscricao_produtor_id deve ter valor)
ALTER TABLE emitentes_nfe 
ADD CONSTRAINT emitentes_nfe_granja_ou_inscricao 
CHECK (granja_id IS NOT NULL OR inscricao_produtor_id IS NOT NULL);

-- Criar índice para melhor performance nas consultas
CREATE INDEX idx_emitentes_nfe_inscricao_produtor ON emitentes_nfe(inscricao_produtor_id);

-- Atualizar RLS policies para incluir inscricoes_produtor
DROP POLICY IF EXISTS "Usuários veem emitentes do seu tenant" ON emitentes_nfe;
CREATE POLICY "Usuários veem emitentes do seu tenant" 
ON emitentes_nfe FOR SELECT 
USING (
  granja_belongs_to_tenant(granja_id) OR 
  (inscricao_produtor_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM inscricoes_produtor ip 
    WHERE ip.id = emitentes_nfe.inscricao_produtor_id 
    AND granja_belongs_to_tenant(ip.granja_id)
  ))
);

DROP POLICY IF EXISTS "Operadores e admins podem inserir emitentes" ON emitentes_nfe;
CREATE POLICY "Operadores e admins podem inserir emitentes" 
ON emitentes_nfe FOR INSERT 
WITH CHECK (
  can_edit(auth.uid()) AND (
    granja_belongs_to_tenant(granja_id) OR 
    (inscricao_produtor_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM inscricoes_produtor ip 
      WHERE ip.id = emitentes_nfe.inscricao_produtor_id 
      AND granja_belongs_to_tenant(ip.granja_id)
    ))
  )
);

DROP POLICY IF EXISTS "Operadores e admins podem atualizar emitentes" ON emitentes_nfe;
CREATE POLICY "Operadores e admins podem atualizar emitentes" 
ON emitentes_nfe FOR UPDATE 
USING (
  can_edit(auth.uid()) AND (
    granja_belongs_to_tenant(granja_id) OR 
    (inscricao_produtor_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM inscricoes_produtor ip 
      WHERE ip.id = emitentes_nfe.inscricao_produtor_id 
      AND granja_belongs_to_tenant(ip.granja_id)
    ))
  )
);

DROP POLICY IF EXISTS "Operadores e admins podem excluir emitentes" ON emitentes_nfe;
CREATE POLICY "Operadores e admins podem excluir emitentes" 
ON emitentes_nfe FOR DELETE 
USING (
  can_edit(auth.uid()) AND (
    granja_belongs_to_tenant(granja_id) OR 
    (inscricao_produtor_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM inscricoes_produtor ip 
      WHERE ip.id = emitentes_nfe.inscricao_produtor_id 
      AND granja_belongs_to_tenant(ip.granja_id)
    ))
  )
);