## Objetivo
Validar se a importação de **Inscrições do Produtor** está correta para a empresa selecionada e corrigir os pontos que hoje podem permitir importação inconsistente.

## Diagnóstico atual
Pelo código atual, a importação de **Inscrições do Produtor** está **parcialmente correta**, mas há riscos importantes:

1. O mapeamento base está presente:
   - tabela `inscricoes_produtor`
   - campos principais (`nome`, `cpf_cnpj`, `inscricao_estadual`, `logradouro`, `cidade`, `uf`, etc.)
   - referências para `produtor_id` e `granja_id`

2. O fluxo já complementa `cidade` e `uf` via `codigo_ibge`.

3. Pontos frágeis identificados:
   - `produtor_id` e `granja_id` não estão marcados como obrigatórios na configuração dessa importação.
   - A validação de integridade por empresa atualmente **não exige `granja_id`** para `inscricoes_produtor`.
   - A tabela `inscricoes_produtor` **não recebe `tenant_id` diretamente**, então o isolamento depende de a `granja` estar correta.
   - Já existe histórico no projeto de **IE duplicada**, o que exige cuidado extra em fluxos que usam apenas `inscricao_estadual` para lookup.

## Plano de implementação

### 1. Endurecer a configuração da importação de Inscrições
Ajustar a configuração de `inscricoes_produtor` para tratar os vínculos essenciais como obrigatórios quando necessário:
- garantir validação consistente de `produtor_id`
- garantir validação consistente de `granja_id`
- preservar o preenchimento automático de `cidade`/`uf` por `codigo_ibge`

### 2. Validar isolamento por empresa via granja
Atualizar o fluxo de validação da importação para que `inscricoes_produtor` seja tratada como tabela que **depende obrigatoriamente de `granja_id`**.
Isso evita que uma inscrição seja importada sem vínculo operacional com a empresa/granja correta.

### 3. Revisar a resolução de referências para evitar vínculos errados
Validar se a busca de:
- `produtor_id` por `produtor_codigo`
- `granja_id` por `granja_codigo`

está respeitando corretamente os dados disponíveis da empresa selecionada e gerando erro claro quando não houver correspondência.

### 4. Verificar comportamento com IE duplicada
Revisar se o fluxo de importação de inscrições ou os fluxos dependentes podem ficar ambíguos quando existirem duas inscrições com a mesma `inscricao_estadual`.
Se necessário, aplicar a mesma estratégia de desambiguação já usada no projeto com chave composta.

### 5. Confirmar status da tela “Importar Dados”
Garantir que a etapa **Inscrições do Produtor** apareça como importada quando houver registros vinculados às granjas da empresa selecionada.

## Detalhes técnicos
Arquivos principais já identificados:
- `src/lib/importacaoConfig.ts`
- `src/components/importacao/ImportacaoDialog.tsx`
- `src/pages/ImportarDados.tsx`

Pontos exatos já encontrados:
- `inscricoes_produtor` está configurada em `src/lib/importacaoConfig.ts`
- o pós-processamento de `codigo_ibge` está em `src/components/importacao/ImportacaoDialog.tsx`
- a checagem de status por empresa está em `src/pages/ImportarDados.tsx`

## Resultado esperado
Após a implementação:
- a importação de **Inscrições do Produtor** só aceitará linhas corretamente vinculadas
- erros de vínculo ficarão explícitos antes do insert
- o isolamento por empresa ficará consistente
- a tela refletirá corretamente quando as inscrições já tiverem sido importadas