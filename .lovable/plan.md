# Plano

## Objetivo
Fazer a importação de Contratos de Venda voltar a encontrar os códigos da planilha e deixar os avisos mais precisos quando algum código realmente não existir.

## O que vou ajustar
1. Corrigir o resolvedor de referências para usar a mesma chave de cache tanto na gravação quanto na leitura quando a busca é filtrada pela empresa contratante.
   - Hoje os lookups de tabelas por empresa são carregados com uma chave contendo `tenantId`, mas depois lidos sem esse mesmo sufixo.
   - Isso faz `safra_codigo`, `granja_codigo`, `comprador_codigo` e `produto_codigo` aparecerem como “não encontrado” mesmo quando existem.

2. Manter a busca por empresa contratante nos lookups de tabelas isoladas.
   - Continuarei filtrando `granjas`, `safras`, `produtos` e `clientes_fornecedores` pela empresa selecionada.
   - Isso evita colisão de códigos entre empresas diferentes.

3. Melhorar as mensagens de erro da importação de contratos.
   - Se faltar `granja_codigo`, a mensagem continuará indicando isso claramente.
   - Se o código existir na coluna mas não for encontrado, o aviso ficará específico por tabela/campo, em vez de parecer um bloqueio genérico.

4. Validar o fluxo no preview da importação.
   - Conferir que o preview deixa de rejeitar 100% da planilha quando os códigos existem.
   - Conferir que os avisos restantes apontam somente registros realmente inconsistentes.

## Arquivos envolvidos
- `src/lib/importacaoConfig.ts`
- `src/components/importacao/ImportacaoDialog.tsx`

## Resultado esperado
- A planilha de Contratos de Venda volta a resolver corretamente os códigos por empresa.
- O contador de registros válidos deixa de ficar zerado quando os dados existem no sistema.
- Os avisos passam a mostrar problemas reais de cadastro ou preenchimento da planilha.

## Detalhes técnicos
- Ajustar a composição de `cacheKey` dentro de `resolveReferences()` para que a leitura use exatamente a mesma chave usada na montagem do cache.
- Preservar o escopo por `tenantId` nas tabelas listadas em `TENANT_SCOPED_LOOKUP_TABLES`.
- Revisar a validação final de `contratos_venda` para não mascarar falhas de lookup já identificadas no preview.