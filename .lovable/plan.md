

## Plano: Corrigir cálculo de saldo quando NFe é cancelada

### Problema
Quando uma NFe é cancelada na SEFAZ, o sistema apenas atualiza o status em `notas_fiscais` para "cancelada", mas **não propaga** essa informação para as tabelas que afetam o cálculo de saldo. Três cenários estão com falha:

1. **Notas de Depósito (CFOP 1905)**: Registro em `notas_deposito_emitidas` permanece ativo mesmo com a NFe cancelada, reduzindo indevidamente o saldo à emitir.
2. **Devoluções de Depósito**: O status da devolução não é atualizado para "cancelada" quando a NFe vinculada é cancelada, porém o filtro `.neq('status', 'cancelada')` já existe nos hooks. O problema é que o status nunca muda.
3. **Compras de Cereais**: Mesma situação -- `compras_cereais.status` não é atualizado, e o `useSaldoSocio` não filtra por status.

### Solução

**1. Edge Function `focus-nfe-cancelar`** -- Adicionar lógica de propagação após cancelamento bem-sucedido:

Após atualizar `notas_fiscais.status = 'cancelada'`, o edge function deve:
- Buscar `devolucoes_deposito` onde `nota_fiscal_id = notaFiscalId` e atualizar `status = 'cancelada'`
- Buscar `notas_deposito_emitidas` onde `nota_fiscal_id = notaFiscalId` e **deletar** o registro (ou marcar como inativo)
- Buscar `compras_cereais` onde `nota_fiscal_id = notaFiscalId` e atualizar `status = 'cancelada'`

**2. Hook `useSaldoSocio`** -- Adicionar filtro de status nas compras:

```typescript
// Compras: excluir canceladas
.neq('status', 'cancelada')
```

**3. Hook `useSaldosDeposito`** -- Filtrar notas de depósito com NFe cancelada:

Fazer join com `notas_fiscais` para excluir registros cuja NFe tenha `status = 'cancelada'`, ou confiar na deleção feita pelo edge function.

### Detalhes técnicos

A abordagem mais robusta é deletar/propagar no edge function (solução na fonte), complementada por filtros defensivos nos hooks.

**Arquivo: `supabase/functions/focus-nfe-cancelar/index.ts`**
- Após `supabase.from("notas_fiscais").update(...)`, adicionar:
  - `DELETE FROM notas_deposito_emitidas WHERE nota_fiscal_id = notaFiscalId`
  - `UPDATE devolucoes_deposito SET status = 'cancelada' WHERE nota_fiscal_id = notaFiscalId`
  - `UPDATE compras_cereais SET status = 'cancelada' WHERE nota_fiscal_id = notaFiscalId`

**Arquivo: `src/hooks/useSaldoSocio.ts`**
- Adicionar `.neq('status', 'cancelada')` na query de `compras_cereais`

**Arquivo: `src/hooks/useSaldosDeposito.ts`**
- Adicionar join/filtro para excluir `notas_deposito_emitidas` cujo `nota_fiscal_id` tenha nota com status cancelada (filtro defensivo)

### Arquivos alterados
- `supabase/functions/focus-nfe-cancelar/index.ts` (propagação de cancelamento)
- `src/hooks/useSaldoSocio.ts` (filtro compras canceladas)
- `src/hooks/useSaldosDeposito.ts` (filtro defensivo notas depósito)

