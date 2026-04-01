

## Plano: Corrigir importacao e adicionar campo data_recebimento no formulario

### Problemas identificados

1. **`tipo_venda` nos contratos**: Todos os 190 registros tem valor "1" em vez de "industria". Precisa normalizar no banco e no transform de importacao.
2. **`local_entrega_codigo_ibge`**: Coluna nao existe na tabela `contratos_venda`. Precisa criar e adicionar ao config de importacao.
3. **`data_recebimento`**: Ja existe no banco e no config de importacao, mas NAO aparece no formulario `VendaProducaoForm.tsx`.
4. **`tipo` em clientes_fornecedores**: 132 registros com "C", 1 com "F", 1 com "A" em vez de "cliente"/"fornecedor"/"ambos". Precisa normalizar e ajustar transform.

### Alteracoes

#### 1. Migracao SQL
```sql
-- Adicionar coluna codigo IBGE
ALTER TABLE contratos_venda ADD COLUMN local_entrega_codigo_ibge varchar;

-- Normalizar tipo_venda: '1' -> 'industria', '2' -> 'semente'
UPDATE contratos_venda SET tipo_venda = 'industria' WHERE tipo_venda = '1';
UPDATE contratos_venda SET tipo_venda = 'semente' WHERE tipo_venda = '2';

-- Normalizar tipo em clientes_fornecedores
UPDATE clientes_fornecedores SET tipo = 'cliente' WHERE tipo IN ('C', 'c');
UPDATE clientes_fornecedores SET tipo = 'fornecedor' WHERE tipo IN ('F', 'f');
UPDATE clientes_fornecedores SET tipo = 'ambos' WHERE tipo IN ('A', 'a');
UPDATE clientes_fornecedores SET tipo = 'ambos' WHERE tipo IS NULL OR tipo = '';
```

#### 2. `src/lib/importacaoConfig.ts`
- Adicionar `local_entrega_codigo_ibge` com `toStr` na config de contratos_venda
- Alterar transform de `tipo_venda` para normalizar: mapear '1'->'industria', '2'->'semente', default manter valor
- Alterar transform de `tipo` em clientes para normalizar: 'C'->'cliente', 'F'->'fornecedor', 'A'->'ambos', default 'ambos'

#### 3. `src/pages/VendaProducaoForm.tsx`
- Adicionar `data_recebimento: string` no FormData
- Adicionar `local_entrega_codigo_ibge: string` no FormData
- Adicionar default values para ambos
- Carregar valores do contrato existente no reset
- Incluir no payload de submit
- Adicionar campo de data (input date) para "Data Prevista Recebimento" na UI
- Adicionar campo texto para "Codigo IBGE" do local de entrega

#### 4. `src/hooks/useContratosVenda.ts`
- Adicionar `local_entrega_codigo_ibge` na interface `ContratoVenda`

### Arquivos alterados
- 1 migracao SQL (nova coluna + normalizacao de dados)
- `src/lib/importacaoConfig.ts`
- `src/pages/VendaProducaoForm.tsx`
- `src/hooks/useContratosVenda.ts`

