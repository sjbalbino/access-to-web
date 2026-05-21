## Adicionar campo `motorista` à tabela de placas

### 1. Banco de dados (migration)
- Adicionar coluna `motorista TEXT NULL` na tabela `placas`.

### 2. Frontend
- **`src/hooks/usePlacas.ts`** — Adicionar `motorista: string | null` ao tipo `Placa`.
- **`src/pages/Placas.tsx`**:
  - Adicionar `motorista: ''` ao estado inicial de `formData` e em `resetForm`.
  - Adicionar campo `motorista` no `handleEdit`.
  - Adicionar input "Motorista" no formulário (junto com Proprietário).
  - Adicionar coluna "Motorista" na tabela de listagem (oculta em telas pequenas, ex: `hidden lg:table-cell`).

### 3. Importação de dados
- **`src/lib/importacaoConfig.ts`** — Adicionar coluna `MOTORISTA` → `motorista` (transform `toStr`) na config de `placas`, para permitir importar do Access.
