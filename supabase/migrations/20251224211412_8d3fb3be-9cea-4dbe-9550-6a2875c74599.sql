-- Adicionar coluna is_emitente_principal na tabela inscricoes_produtor
ALTER TABLE inscricoes_produtor 
ADD COLUMN is_emitente_principal boolean DEFAULT false;

-- Criar índice parcial único para garantir apenas uma inscrição principal por granja
CREATE UNIQUE INDEX idx_inscricao_emitente_principal_unico 
ON inscricoes_produtor (granja_id) 
WHERE is_emitente_principal = true;