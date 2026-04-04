

## Plano: Somar kg de taxa de armazenagem no saldo do Sócio Emitente

### Problema
Quando uma devolução de depósito é registrada com taxa de armazenagem, os kgs cobrados (`kg_taxa_armazenagem`) deveriam ser somados ao saldo do sócio emitente (`inscricao_recebe_taxa_id` / `inscricao_emitente_id`), mas o hook `useSaldoSocio` não considera essa entrada.

### Solução

**Arquivo: `src/hooks/useSaldoSocio.ts`**

Adicionar uma nova consulta à tabela `devolucoes_deposito` para somar `kg_taxa_armazenagem` onde `inscricao_recebe_taxa_id` (ou `inscricao_emitente_id`) corresponde ao sócio, filtrando devoluções canceladas. Esse total será somado ao saldo.

- Adicionar campo `kgTaxaArmazenagem` na interface `SaldoSocioResult`
- Buscar `SUM(kg_taxa_armazenagem)` de `devolucoes_deposito` onde `inscricao_emitente_id = inscricaoSocioId` e `status != 'cancelada'`
- Atualizar fórmula: `Saldo = Colheitas + Recebidas + Compras + kgTaxaArmazenagem - Enviadas - Vendas`

### Detalhes técnicos

```typescript
// Nova query em useSaldoSocio
const taxaResult = await supabase
  .from('devolucoes_deposito')
  .select('kg_taxa_armazenagem')
  .eq('inscricao_emitente_id', inscricaoSocioId)
  .eq('safra_id', safraId)
  .eq('produto_id', produtoId)
  .neq('status', 'cancelada');

const totalKgTaxa = taxaResult.data?.reduce(
  (sum, d) => sum + (d.kg_taxa_armazenagem || 0), 0
) || 0;

// Fórmula atualizada
const saldo = totalColheitas + totalRecebidas + totalCompras + totalKgTaxa - totalEnviadas - totalVendasProducao;
```

### Arquivos alterados
- `src/hooks/useSaldoSocio.ts`

