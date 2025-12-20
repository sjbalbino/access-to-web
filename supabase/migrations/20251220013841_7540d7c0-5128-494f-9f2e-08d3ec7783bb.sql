-- Adicionar campo CPF para produtores rurais pessoa física
ALTER TABLE public.granjas ADD COLUMN cpf varchar(11) NULL;