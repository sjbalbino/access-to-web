-- 1. Remover FK antiga de variedade_id que referencia variedades
ALTER TABLE colheitas DROP CONSTRAINT IF EXISTS colheitas_variedade_id_fkey;

-- 2. Adicionar nova FK que referencia produtos (sementes)
ALTER TABLE colheitas 
ADD CONSTRAINT colheitas_variedade_id_fkey 
FOREIGN KEY (variedade_id) REFERENCES produtos(id) ON DELETE SET NULL;

-- 3. Remover coluna plantio_id (não é mais necessária)
ALTER TABLE colheitas DROP COLUMN IF EXISTS plantio_id;

-- 4. Eliminar tabela variedades (está vazia e não é necessária)
DROP TABLE IF EXISTS variedades;