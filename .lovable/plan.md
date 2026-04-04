

## Plano: Corrigir erros de importação de Devoluções de Depósito

### Problema
Linhas específicas (1668, 1747, 1893, 1958, 2135) falham com `null value in column "inscricao_produtor_id"` porque a Inscrição Estadual na planilha não encontra correspondência na tabela `inscricoes_produtor`. Isso ocorre porque o lookup simples por IE não é suficiente quando há produtores diferentes com a mesma IE — exatamente o mesmo problema que já foi resolvido em Transferências de Depósito com o uso de **composite lookup** (IE + Nome).

### Solução

**Arquivo: `src/lib/importacaoConfig.ts`**

Adicionar `compositeSourceColumn` e `compositeColumns` nas referências de `inscricao_produtor_id` e `inscricao_emitente_id` da configuração `devolucoes_deposito`, seguindo o mesmo padrão usado em `transferencias_deposito`:

```typescript
// Antes
{ dbColumn: 'inscricao_produtor_id', sourceColumn: 'inscricao_produtor_ie', lookupTable: 'inscricoes_produtor', lookupColumn: 'inscricao_estadual' },
{ dbColumn: 'inscricao_emitente_id', sourceColumn: 'inscricao_emitente_ie', lookupTable: 'inscricoes_produtor', lookupColumn: 'inscricao_estadual' },

// Depois
{ dbColumn: 'inscricao_produtor_id', sourceColumn: 'inscricao_produtor_ie', lookupTable: 'inscricoes_produtor', lookupColumn: 'inscricao_estadual', compositeSourceColumn: 'inscricao_produtor_nome', compositeColumns: ['nome'] },
{ dbColumn: 'inscricao_emitente_id', sourceColumn: 'inscricao_emitente_ie', lookupTable: 'inscricoes_produtor', lookupColumn: 'inscricao_estadual', compositeSourceColumn: 'inscricao_emitente_nome', compositeColumns: ['nome'] },
```

O modelo Excel gerado pelo botão "Baixar Modelo" já inclui automaticamente colunas compostas quando configuradas, então a planilha passará a ter as colunas `inscricao_produtor_nome` e `inscricao_emitente_nome` para desambiguação.

### Arquivos alterados
- `src/lib/importacaoConfig.ts`

