

## Plano: Adicionar campo "Tipo" nas Transferências de Depósito

### O que será feito

Adicionar o campo "Tipo" (Indústria / Semente) na tabela `transferencias_deposito`, no formulário de transferência e na configuração de importação.

### Etapas

#### 1. Migração de banco de dados
Adicionar coluna `tipo` (varchar) à tabela `transferencias_deposito`:
```sql
ALTER TABLE public.transferencias_deposito
ADD COLUMN tipo character varying DEFAULT NULL;
```

#### 2. `src/components/transferencias/TransferenciaDialog.tsx`
- Adicionar estado `tipo` com Select para escolher "Indústria" ou "Semente"
- Incluir `tipo` no payload de criação/edição
- Preencher campo ao editar transferência existente

#### 3. `src/hooks/useTransferenciasDeposito.ts`
- Adicionar `tipo` à interface `TransferenciaDeposito`

#### 4. `src/pages/Transferencias.tsx`
- Exibir coluna "Tipo" na tabela de listagem

#### 5. `src/lib/importacaoConfig.ts`
- Restaurar o campo `tipo` na configuração de importação (foi removido antes porque a coluna não existia no banco)

### Arquivos alterados
- Migração SQL (nova coluna)
- `src/hooks/useTransferenciasDeposito.ts`
- `src/components/transferencias/TransferenciaDialog.tsx`
- `src/pages/Transferencias.tsx`
- `src/lib/importacaoConfig.ts`

