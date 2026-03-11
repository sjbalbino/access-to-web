

## Plano: Ajustar importação de Sub-Centros e remover campos D/C e Incide IRF

### 1. Importação: Referência "Grupo" por nome (não por código)

Atualmente (linha 126 de `importacaoConfig.ts`):
```
lookupColumn: 'codigo'  →  busca pelo código do grupo
```

A planilha do Access tem o **nome** do grupo na coluna "Grupo", não o código. A referência precisa buscar por `descricao` em vez de `codigo`.

**Alteração em `importacaoConfig.ts` linha 126:**
- Mudar `lookupColumn: 'codigo'` para `lookupColumn: 'descricao'`

### 2. Remover colunas "D/C" e "Incide IRF" da importação

**Alteração em `importacaoConfig.ts` linhas 120-121:**
- Remover as linhas das colunas `D/C` (dbName: `tipo`) e `Incide IRF` (dbName: `incide_irf`)

### 3. Remover "IRF" da tabela de sub-centros no frontend

**Alteração em `PlanoContasGerencial.tsx`:**
- Remover coluna "IRF" do `TableHeader` (linha 179)
- Remover célula IRF do `TableBody` (linha 189)
- Remover Switch "Incide IRF" do formulário de sub-centro (linha 265)
- Remover `incide_irf` do estado `subFormData` e `resetSubForm`

### 4. Remover `incide_irf` e `tipo` do hook de sub-centros

**Alteração em `useSubCentrosCusto.ts`:**
- Remover `incide_irf` do tipo `SubCentroCustoInput`

### Arquivos a modificar
- `src/lib/importacaoConfig.ts`
- `src/pages/PlanoContasGerencial.tsx`
- `src/hooks/useSubCentrosCusto.ts`

