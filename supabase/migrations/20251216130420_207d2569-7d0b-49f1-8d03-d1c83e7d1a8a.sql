-- Adicionar campos para vincular colheita a uma inscrição e local de entrega terceiros
ALTER TABLE colheitas 
ADD COLUMN inscricao_produtor_id uuid REFERENCES inscricoes_produtor(id) ON DELETE SET NULL;

ALTER TABLE colheitas 
ADD COLUMN local_entrega_terceiro_id uuid REFERENCES clientes_fornecedores(id) ON DELETE SET NULL;

-- Comentários para documentação
COMMENT ON COLUMN colheitas.inscricao_produtor_id IS 'Inscrição estadual do sócio/produtor vinculada a esta colheita';
COMMENT ON COLUMN colheitas.local_entrega_terceiro_id IS 'Local de entrega em terceiros quando não armazena em silo próprio';