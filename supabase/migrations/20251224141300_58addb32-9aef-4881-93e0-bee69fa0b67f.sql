-- Adicionar campo is_sede na tabela locais_entrega
ALTER TABLE locais_entrega ADD COLUMN is_sede boolean DEFAULT false;
COMMENT ON COLUMN locais_entrega.is_sede IS 'Indica se este é o local sede/granja receptora padrão';

-- Adicionar campo recebe_terceiros na tabela lavouras
ALTER TABLE lavouras ADD COLUMN recebe_terceiros boolean DEFAULT false;
COMMENT ON COLUMN lavouras.recebe_terceiros IS 'Indica se esta lavoura é dedicada a recebimento de produção de terceiros';