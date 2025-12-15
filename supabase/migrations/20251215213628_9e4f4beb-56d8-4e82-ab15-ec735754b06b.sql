-- Remover FK antiga que referencia variedades
ALTER TABLE plantios DROP CONSTRAINT IF EXISTS plantios_variedade_id_fkey;

-- Adicionar nova FK que referencia produtos
ALTER TABLE plantios 
ADD CONSTRAINT plantios_variedade_id_fkey 
FOREIGN KEY (variedade_id) REFERENCES produtos(id) ON DELETE SET NULL;