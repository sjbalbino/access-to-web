

## Plano: Atualizar modelo de importação das Notas de Depósito

### Problema
A configuração de importação de Notas de Depósito referencia colunas que não existem na tabela `notas_deposito_emitidas`:
- `codigo` — não existe na tabela
- `observacao` — não existe na tabela  
- `inscricao_emitente_id` — não existe na tabela

A tabela possui apenas: `id`, `nota_fiscal_id`, `granja_id`, `inscricao_produtor_id`, `safra_id`, `produto_id`, `quantidade_kg`, `data_emissao`, `created_at`.

### Alterações

**Arquivo: `src/lib/importacaoConfig.ts`** (bloco `notas_deposito`, linhas 771-783)

1. **Remover** a coluna `codigo` (linha 772)
2. **Remover** a coluna `observacao` (linha 775)
3. **Remover** a referência `inscricao_emitente_id` (linha 779) — coluna não existe na tabela

Configuração corrigida:
```typescript
columns: [
  { accessName: 'data_emissao', dbName: 'data_emissao', transform: toDate },
  { accessName: 'quantidade_kg', dbName: 'quantidade_kg', transform: toNumber },
],
references: [
  { dbColumn: 'inscricao_produtor_id', sourceColumn: 'inscricao_produtor_ie', lookupTable: 'inscricoes_produtor', lookupColumn: 'inscricao_estadual', compositeSourceColumn: 'inscricao_produtor_nome', compositeColumns: ['nome'] },
  { dbColumn: 'safra_id', sourceColumn: 'safra_codigo', lookupTable: 'safras', lookupColumn: 'codigo', lookupLabel: 'nome' },
  { dbColumn: 'produto_id', sourceColumn: 'produto_codigo', lookupTable: 'produtos', lookupColumn: 'codigo', lookupLabel: 'nome' },
  { dbColumn: 'granja_id', sourceColumn: 'granja_codigo', lookupTable: 'granjas', lookupColumn: 'codigo', lookupLabel: 'razao_social' },
],
```

O modelo Excel gerado pelo botão "Baixar Modelo" será atualizado automaticamente, contendo apenas as colunas válidas: `data_emissao`, `quantidade_kg`, `inscricao_produtor_ie`, `inscricao_produtor_nome`, `safra_codigo`, `produto_codigo`, `granja_codigo`.

### Arquivo alterado
- `src/lib/importacaoConfig.ts`

