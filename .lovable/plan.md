

## Plano: Mapear campos não reconhecidos e corrigir avisos na importação de Colheitas

### Diagnóstico

**Campos não reconhecidos na planilha (badges brancos):**

| Coluna Excel | Corresponde a | Status no DB |
|---|---|---|
| `COL_HORARIO` | Hora de entrada | **Não existe** — criar |
| `COL_HORASAIDA` | Hora de saída | **Não existe** — criar |
| `COL_PERCQEBRA` | Percentual de quebra | **Não existe** — criar |
| `COL_BALANCEIRO` | Balanceiro (operador) | **Não existe** — criar |
| `COL_ROMANEIO` | Número romaneio | **Não existe** — criar |
| `COL_vlrUnitario` | Valor unitário por kg | **Não existe** — criar |
| `COL_CODPLACA` | Código legado da placa | Redundante com `placa` — ignorar |
| `COL_TIPOMOVTO` | Tipo de movimento | Redundante com `tipo_colheita` — ignorar |
| `col_localentrega` | Local de entrega | Já existe `local_entrega_terceiro_id` — mapear como referência |
| `tipo_colheita` | Tipo colheita | Já mapeado na config (funciona, badge é cosmético) |
| `produto_codigo` | Código produto/variedade | Já mapeado como referência (funciona) |
| `silo_codigo` | Código silo | Já mapeado como referência (funciona) |

**Avisos "safras.codigo = '7' não encontrado":**
O código da safra na planilha é numérico (ex: "7"), mas a resolução de referência faz busca exata por string. Se no banco o código foi salvo como "07" ou "007", não encontra. A solução é normalizar removendo zeros à esquerda tanto do valor buscado quanto dos valores do cache (padrão já usado em outras tabelas).

### Alterações

#### 1. Migração SQL — adicionar 6 colunas em `colheitas`
```sql
ALTER TABLE public.colheitas
  ADD COLUMN IF NOT EXISTS hora_entrada varchar,
  ADD COLUMN IF NOT EXISTS hora_saida varchar,
  ADD COLUMN IF NOT EXISTS percentual_quebra numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS balanceiro varchar,
  ADD COLUMN IF NOT EXISTS romaneio integer,
  ADD COLUMN IF NOT EXISTS valor_unitario numeric DEFAULT 0;
```

#### 2. `src/lib/importacaoConfig.ts` — config colheitas
Adicionar mapeamentos de colunas:
- `COL_HORARIO` → `hora_entrada`
- `COL_HORASAIDA` → `hora_saida`
- `COL_PERCQEBRA` → `percentual_quebra`
- `COL_BALANCEIRO` → `balanceiro`
- `COL_ROMANEIO` → `romaneio`
- `COL_vlrUnitario` → `valor_unitario`

Adicionar referência:
- `col_localentrega` → `local_entrega_terceiro_id` via lookup em `locais_entrega` por `codigo`

#### 3. `src/lib/importacaoConfig.ts` — normalização de lookup
Na função `resolveReferences`, ao construir o cache e ao buscar, normalizar valores numéricos removendo zeros à esquerda (ex: "07" → "7"). Isso corrige o problema dos avisos de safra não encontrada e é consistente com o padrão já usado no sistema.

### Arquivos impactados
- Migração SQL (nova)
- `src/lib/importacaoConfig.ts`

