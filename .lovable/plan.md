

## Plano: Adicionar campos "Propriedade" e "Peso Tara" na tabela Placas

### Alterações

#### 1. Migração SQL
- Adicionar coluna `propriedade` (varchar, default `'propria'`) — valores: `propria`, `terceiros`
- Adicionar coluna `peso_tara` (numeric, default 0) — peso da tara em Kg

#### 2. `src/hooks/usePlacas.ts`
- Adicionar `propriedade` e `peso_tara` na interface `Placa` e `PlacaInsert`

#### 3. `src/pages/Placas.tsx`
- Adicionar Select "Propriedade" no formulário (Própria / Terceiros)
- Adicionar Input "Peso Tara (Kg)" no formulário
- Exibir ambos na tabela de listagem
- Incluir nos estados `formData`, `resetForm` e `handleEdit`

### Arquivos impactados
- Migração SQL (nova)
- `src/hooks/usePlacas.ts`
- `src/pages/Placas.tsx`

