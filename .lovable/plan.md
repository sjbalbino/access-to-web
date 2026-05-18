## Objetivo

Vincular Clientes/Fornecedores diretamente à **Empresa Contratante (tenant)** em vez de uma Granja específica. Assim, todos os clientes/fornecedores cadastrados ficam disponíveis para todas as granjas daquela empresa.

## Mudanças no banco de dados (migration)

1. Adicionar coluna `tenant_id uuid` em `clientes_fornecedores`.
2. Popular `tenant_id` para os 138 registros existentes copiando o `tenant_id` da granja atualmente vinculada.
3. Tornar `tenant_id` NOT NULL.
4. Tornar `granja_id` opcional e parar de usá-lo para isolamento (manteremos a coluna por compatibilidade, mas vazia para novos registros).
5. Substituir as 4 políticas RLS para isolar por `tenant_id = get_user_tenant_id()` em vez de `granja_belongs_to_tenant(granja_id)`.
6. Criar trigger `BEFORE INSERT` que preenche `tenant_id` automaticamente a partir do `tenant_id` do usuário logado, para evitar erro de RLS em inserts manuais.

## Mudanças no app

- `src/pages/ClientesFornecedores.tsx`: remover o Select de Granja do formulário (campo deixa de existir na UI). Cliente passa a ser cadastrado apenas para a empresa.
- `src/hooks/useClientesFornecedores.ts`: nenhuma mudança estrutural; o tenant é preenchido pelo trigger.
- `src/lib/importacaoConfig.ts`:
  - Remover a referência `granja_id ← granja_codigo` da configuração `clientes`.
  - Remover a coluna `granja_codigo` do modelo Excel baixado.
  - Manter o `tenant_id` sendo injetado automaticamente pelo `ImportacaoDialog` (já faz isso para outras tabelas via empresa selecionada).
- `src/components/importacao/ImportacaoDialog.tsx`: garantir que `clientes_fornecedores` receba `tenant_id` do tenant selecionado na importação (sem depender mais de `granja_id`).

## Impacto

- Listas e formulários de Clientes/Fornecedores deixam de pedir/exibir Granja.
- Todos os clientes existentes continuam visíveis (preservados pelo passo de popular `tenant_id`).
- Importações futuras não exigem mais a coluna `granja_codigo`.
- Outros módulos que referenciam clientes (contratos, NFe, lançamentos) continuam funcionando sem mudança, pois usam `cliente_id`.