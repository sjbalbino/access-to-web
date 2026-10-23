CREATE TABLE public.import_colheita_placa (codigo integer PRIMARY KEY, placa text NOT NULL);
GRANT ALL ON public.import_colheita_placa TO service_role;
ALTER TABLE public.import_colheita_placa ENABLE ROW LEVEL SECURITY;