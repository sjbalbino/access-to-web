

## Plano: Corrigir importação de Produtores (348 de ~550)

### Diagnóstico

1. **Constraint UNIQUE em `cpf_cnpj`**: A tabela `produtores` tem uma restrição de unicidade no campo `cpf_cnpj`. Produtores com CPF/CNPJ repetido (ex: "000.000.000-00" ou mesmo CPF em registros diferentes) causam erro.

2. **Falha em lote**: Quando UM registro do lote de 100 viola a constraint, o Supabase rejeita O LOTE INTEIRO. Isso explica a perda massiva — não são apenas 2 registros com erro, mas ~200 registros perdidos (2 lotes inteiros de 100).

3. **Coluna `socios_tipo`**: A planilha tem este campo que não está mapeado. Pode ser usado para definir `tipo_produtor`.

### Alterações

#### 1. Remover constraint UNIQUE de `cpf_cnpj` (migração SQL)
- Produtores podem ter CPF/CNPJ duplicado (sócios, registros legados com CPF zerado como "000.000.000-00").
- `DROP INDEX IF EXISTS produtores_cpf_cnpj_key;` ou `ALTER TABLE produtores DROP CONSTRAINT produtores_cpf_cnpj_key;`

#### 2. Importação individual em caso de erro de lote (`ImportacaoDialog.tsx`)
- Quando um lote falha, tentar inserir cada registro individualmente (fallback row-by-row).
- Isso garante que apenas os registros realmente problemáticos sejam descartados, não o lote inteiro.

#### 3. Mapear `socios_tipo` → `tipo_produtor` (`importacaoConfig.ts`)
- Adicionar mapeamento: `{ accessName: 'socios_tipo', dbName: 'tipo_produtor', transform: toStr }`

### Detalhes técnicos

**Fallback row-by-row no `ImportacaoDialog.tsx`:**
```
if (error) {
  // Tentar inserir individualmente
  for (const row of batch) {
    const { error: rowErr } = await supabase.from(...).insert(row);
    if (rowErr) {
      errors.push(`Linha: ${rowErr.message}`);
    } else {
      imported++;
    }
  }
} else {
  imported += batch.length;
}
```

### Arquivos impactados
- Migração SQL (remover constraint unique)
- `src/components/importacao/ImportacaoDialog.tsx` (fallback row-by-row)
- `src/lib/importacaoConfig.ts` (mapeamento `socios_tipo`)

