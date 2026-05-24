## Problema

Reimportar Contas a Pagar sem marcar "Limpar dados existentes" gerou registros duplicados para o tenant **AGROPECUÁRIA UMBU**, porque `contas_pagar` não tem constraint única em `(tenant_id, codigo_legado)` e o import usa `insert()` puro.

## Solução em 3 partes

### 1. Limpeza dos duplicados existentes (apenas AGROPECUÁRIA UMBU)

Migration que, para o tenant da AGROPECUÁRIA UMBU:
- Identifica grupos `(tenant_id, codigo_legado)` com mais de 1 registro em `contas_pagar` (ignorando `codigo_legado IS NULL`).
- Mantém o registro **mais antigo** (menor `created_at`) de cada grupo.
- Apaga primeiro `contas_pagar_baixas` dos duplicados, depois os duplicados de `contas_pagar`.
- Não toca em outros tenants nem em registros sem `codigo_legado` (lançamentos manuais).

### 2. Índice único parcial em `contas_pagar` e `contas_receber`

```sql
CREATE UNIQUE INDEX contas_pagar_tenant_codigo_legado_uq
  ON public.contas_pagar (tenant_id, codigo_legado)
  WHERE codigo_legado IS NOT NULL;

CREATE UNIQUE INDEX contas_receber_tenant_codigo_legado_uq
  ON public.contas_receber (tenant_id, codigo_legado)
  WHERE codigo_legado IS NOT NULL;
```

Bloqueia duplicados futuros no banco e habilita `upsert(onConflict)`.

### 3. Import idempotente em `ImportacaoDialog.tsx`

Trocar o `insert(batch)` por `upsert(batch, { onConflict: 'tenant_id,codigo_legado', ignoreDuplicates: true })` somente para os datasets `contas_pagar` e `contas_receber`. Demais tabelas continuam com `insert()`.

## Comportamento esperado

- Reimport sem "Limpar dados": registros já existentes são ignorados; só entram os novos.
- Reimport com "Limpar dados": limpeza por tenant + chunking (já implementado) + reinsert protegido pelo índice.
- Lançamentos manuais (sem `codigo_legado`) não são afetados.

## Arquivos

- Nova migration: limpeza dos duplicados de AGROPECUÁRIA UMBU + criação dos 2 índices únicos.
- `src/components/importacao/ImportacaoDialog.tsx`: trocar `insert` por `upsert` nos dois datasets.

## Fora de escopo

- Não alterar `useContasPagar` / criação manual.
- Não mexer em outros tenants nem em outras tabelas de import.
