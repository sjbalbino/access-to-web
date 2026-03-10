

## Adicionar campos ao cadastro de Grupos de Produtos

### 1. Criar tabela `plano_contas_gerencial` (migração)

```sql
CREATE TABLE public.plano_contas_gerencial (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo varchar NOT NULL,
  descricao varchar NOT NULL,
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.plano_contas_gerencial ENABLE ROW LEVEL SECURITY;

-- RLS policies (mesma abordagem das demais tabelas)
CREATE POLICY "Permitir leitura pública" ON public.plano_contas_gerencial FOR SELECT USING (true);
CREATE POLICY "Operadores podem inserir" ON public.plano_contas_gerencial FOR INSERT WITH CHECK (can_edit(auth.uid()));
CREATE POLICY "Operadores podem atualizar" ON public.plano_contas_gerencial FOR UPDATE USING (can_edit(auth.uid()));
CREATE POLICY "Operadores podem excluir" ON public.plano_contas_gerencial FOR DELETE USING (can_edit(auth.uid()));

CREATE TRIGGER update_plano_contas_gerencial_updated_at
  BEFORE UPDATE ON public.plano_contas_gerencial
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 2. Adicionar colunas à tabela `grupos_produtos` (migração)

```sql
ALTER TABLE public.grupos_produtos
  ADD COLUMN conta_gerencial_id uuid REFERENCES public.plano_contas_gerencial(id),
  ADD COLUMN maquinas_implementos boolean DEFAULT false,
  ADD COLUMN bens_benfeitorias boolean DEFAULT false,
  ADD COLUMN insumos boolean DEFAULT false,
  ADD COLUMN venda_producao boolean DEFAULT false;
```

### 3. Criar hook `usePlanoContasGerencial` e CRUD page

- `src/hooks/usePlanoContasGerencial.ts` -- query + mutations
- `src/pages/PlanoContasGerencial.tsx` -- CRUD completo (código, descrição, ativo)
- Adicionar rota em `App.tsx` e item no sidebar/routeMap

### 4. Atualizar formulário e listagem de Grupos

- `src/hooks/useGruposProdutos.ts` -- atualizar interface com novos campos, incluir join com `plano_contas_gerencial`
- `src/pages/GruposProdutos.tsx`:
  - Formulário: adicionar Select de Conta Gerencial + 4 checkboxes
  - Tabela: adicionar coluna Conta Gerencial e indicadores dos checkboxes

### Arquivos a criar
- `src/hooks/usePlanoContasGerencial.ts`
- `src/pages/PlanoContasGerencial.tsx`

### Arquivos a modificar
- `src/hooks/useGruposProdutos.ts`
- `src/pages/GruposProdutos.tsx`
- `src/App.tsx` (rota)
- `src/lib/routeMap.ts` (mapa de rota)
- `src/components/layout/AppSidebar.tsx` (menu)

