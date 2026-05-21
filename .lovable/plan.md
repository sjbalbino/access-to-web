## Remover colunas `cidade` e `uf` da planilha de importação de Inscrições Estaduais

### Objetivo
Simplificar o template de importação de Inscrições Estaduais de Produtores removendo as colunas `cidade` e `uf`, já que o `codigo_ibge` (obrigatório) preenche automaticamente ambos os campos via lookup na tabela `ibge_municipios`.

### Alteração

**`src/lib/importacaoConfig.ts`** — na config `inscricoes`:
- Remover a coluna `{ accessName: 'cidade', ... }`
- Remover a coluna `{ accessName: 'uf', ... }`
- Manter `codigo_ibge` como entrada única para localidade

### Comportamento resultante

- Template Excel gerado não terá mais as colunas `cidade` nem `uf`.
- No `ImportacaoDialog.tsx`, o bloco de pós-processamento já popula `cidade` e `uf` a partir do `codigo_ibge` antes do insert — nenhuma alteração necessária ali.
- Se `codigo_ibge` estiver vazio ou inválido, a linha é rejeitada (comportamento atual mantido).
- Os campos `cidade` e `uf` continuam existindo na tabela `inscricoes_produtor` (apenas deixam de ser entrada direta da planilha).

### Sem mudanças no banco

Nenhuma migração necessária.
