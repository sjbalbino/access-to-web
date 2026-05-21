## Suporte a `codigo_ibge` na importação de Inscrições Estaduais

### Objetivo
Permitir que a planilha de **Inscrições Estaduais de Produtores** aceite a coluna `codigo_ibge` (código IBGE do município, 7 dígitos). Ao informar esse código, o sistema preenche automaticamente `cidade` e `uf` consultando a tabela `ibge_municipios`, eliminando erros de digitação no nome da cidade.

### Comportamento

- A planilha passa a aceitar a coluna **`codigo_ibge`** (opcional, mas recomendada).
- Se `codigo_ibge` estiver presente e válido:
  - `cidade` ← `ibge_municipios.nome` (sobrescreve qualquer valor digitado na planilha)
  - `uf` ← `ibge_municipios.uf`
- Se `codigo_ibge` estiver presente mas **não for encontrado**: linha rejeitada com mensagem clara (`Linha N: código IBGE "XXXXX" não encontrado`).
- Se `codigo_ibge` estiver vazio: mantém o comportamento atual (usa `cidade` e `uf` da planilha como texto).

### Alterações de código

1. **`src/lib/importacaoConfig.ts`** — adicionar `codigo_ibge` como coluna auxiliar na config de `inscricoes` (não persistida no DB, apenas para lookup).

2. **`src/components/importacao/ImportacaoDialog.tsx`** — adicionar bloco de pós-processamento específico para `config.key === 'inscricoes'` (no mesmo padrão do composite lookup de `colheitas`):
   - Buscar todos os `ibge_municipios` que aparecem na planilha em uma única query (`.in('codigo_ibge', [...])`).
   - Para cada linha: preencher `cidade` e `uf` a partir do match, ou registrar erro.
   - Remover o campo auxiliar `_codigo_ibge` antes do insert.

3. **Modelo Excel (download de template)** — a coluna `codigo_ibge` é incluída automaticamente no template gerado, pois já é lida de `config.columns`.

### Sem alterações no banco

Não é necessária migração — o campo é apenas usado como entrada para popular `cidade`/`uf` (que já existem na tabela `inscricoes_produtor`). A tabela `ibge_municipios` já está populada e indexada por `codigo_ibge`.

### Documentação

Atualizar o tooltip/descrição da etapa de importação de Inscrições para informar a nova coluna recomendada.