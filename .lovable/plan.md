

## Plano: Importar Inscrições Estaduais de Clientes/Fornecedores

### Problema
No Access, as inscrições estaduais dos clientes/fornecedores ficavam em uma tabela separada, vinculada pelo código do cliente. Precisamos criar uma importação que leia essa planilha e atualize o campo `inscricao_estadual` na tabela `clientes_fornecedores` existente.

### Solução
Adicionar uma nova entrada de importação no wizard chamada "IE Clientes/Fornecedores" que:
1. Lê a planilha com colunas como `codigo_cliente` (ou similar) e `inscricao_estadual`
2. Para cada linha, busca o cliente/fornecedor pelo `codigo` na tabela `clientes_fornecedores`
3. Faz um UPDATE no campo `inscricao_estadual` do registro encontrado

### Alterações

**1. `src/lib/importacaoConfig.ts`**
- Adicionar nova `TableConfig` com key `clientes_ie`, label "IE Clientes/Fornecedores"
- `tableName`: `clientes_fornecedores` (mesma tabela, mas será update, não insert)
- Adicionar flag `updateMode: true` na interface `TableConfig` para indicar que esta importação faz update ao invés de insert
- Colunas: `codigo` (para lookup) e `inscricao_estadual` (valor a gravar)
- `order`: 4.5 (logo após clientes), `dependsOn: ['clientes']`

**2. `src/components/importacao/ImportacaoDialog.tsx`**
- Detectar quando `config.updateMode === true`
- No fluxo de importação, ao invés de inserir, fazer um loop:
  - Para cada linha, buscar `clientes_fornecedores` pelo `codigo`
  - Se encontrado, fazer `.update({ inscricao_estadual })` no registro
- Exibir preview mostrando código do cliente e a IE que será gravada
- Contabilizar quantos foram atualizados vs não encontrados

**3. `src/pages/ImportarDados.tsx`**
- Nenhuma alteração necessária (já renderiza todas as configs automaticamente)

### Fluxo do usuário
1. Importa "Clientes/Fornecedores" normalmente (sem IE)
2. Importa "IE Clientes/Fornecedores" — seleciona a planilha separada de IEs
3. Sistema localiza cada cliente pelo código e atualiza a `inscricao_estadual`
4. Preview mostra quantos foram encontrados/atualizados

### Arquivos a modificar
- `src/lib/importacaoConfig.ts` — nova config + flag `updateMode`
- `src/components/importacao/ImportacaoDialog.tsx` — lógica de update por lookup

