-- Adicionar coluna inscricao_remetente_id para identificar o produtor/inscrição como destinatário em notas de entrada
ALTER TABLE notas_fiscais
ADD COLUMN inscricao_remetente_id uuid REFERENCES inscricoes_produtor(id);