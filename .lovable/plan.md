## Diagnóstico

A planilha agora traz `granja_codigo`, mas a importação ainda rejeita 100% com "granja_id ausente". Isso só acontece quando o resolvedor de referências **não atribui** `granja_id` à linha — ele engole o problema em silêncio porque a referência `granja_id` em `contratos_venda` não é marcada como `required: true` (`src/lib/importacaoConfig.ts` linha 638). Quando o valor de origem está vazio (linha 939-946 de `importacaoConfig.ts`), o resolvedor pula a linha sem registrar erro, e só depois a validação do diálogo (`REQUIRES_GRANJA`) rejeita com a mensagem genérica.

Hipóteses prováveis (uma ou mais):

1. **Cabeçalho ligeiramente diferente** — a coluna foi adicionada como "Granja", "codigo_granja", "cod_granja", "granja", "GRANJA_CODIGO " (com espaço/acento), e o matcher fuzzy (`normalizeColName`) não casa, então `granja_codigo` vem vazio.
2. **Códigos não batem com o tenant selecionado** — o cache de `granjas` é carregado **sem filtrar por `tenant_id`**, então códigos `1`/`2`/`3` colidem entre tenants (no banco existem `codigo=1` para dois tenants diferentes). Hoje vence o último inserido, podendo levar a `granja_id` de outro tenant. Mas se mesmo assim resultasse vazio, voltamos ao cenário 1.
3. **Coluna inexistente no preview da planilha** — o usuário acha que adicionou, mas o cabeçalho ficou em uma linha errada / outra aba.

## Mudanças (apenas frontend de importação)

Arquivo 1: `src/lib/importacaoConfig.ts`

a. Tornar `granja_id` **obrigatório** em `contratos_venda` (linha 638):
```ts
{ dbColumn: 'granja_id', sourceColumn: 'granja_codigo', lookupTable: 'granjas', lookupColumn: 'codigo', lookupLabel: 'razao_social', required: true },
```
Efeito: se a coluna estiver vazia/ausente, o usuário verá "Campo obrigatório `granja_codigo` está vazio" — apontando a verdadeira causa.

b. Adicionar suporte a aliases de coluna de origem na interface `ReferenceResolver`:
```ts
sourceColumnAliases?: string[]; // outros nomes aceitos no cabeçalho da planilha
```
E em `resolveReferences` (linha 927), se `findColumnValue(row, ref.sourceColumn)` não achar valor, tentar cada alias antes de desistir.

c. Na referência de `granja_id` de `contratos_venda`, adicionar:
```ts
sourceColumnAliases: ['granja', 'codigo_granja', 'cod_granja', 'granjacodigo']
```
(equivalente já existe na prática via normalizeColName, mas isso garante variações como "Granja" sozinho.)

d. Em `resolveReferences` (loop de cache, linha 866-876), filtrar por `tenant_id` quando a tabela for tenant-scoped (`granjas`, `produtos`, `clientes_fornecedores`, `safras`, `inscricoes_produtor`, etc.). Passar o `tenantId` selecionado como parâmetro novo da função (`resolveReferences(refs, rows, tenantId?)`). Sem `tenantId`, comportamento atual preservado.

Arquivo 2: `src/components/importacao/ImportacaoDialog.tsx`

a. Passar `tenantId` para `resolveReferences` na chamada existente do preview.

b. Trocar a mensagem da rejeição em `REQUIRES_GRANJA` (linha 461) para algo mais acionável:
```
Linha N: granja_id não resolvido — verifique se a coluna `granja_codigo` existe na planilha e se o código corresponde a uma granja da empresa selecionada (códigos disponíveis: <lista dos códigos de granjas do tenant>).
```

## Fora de escopo

- Sem mudança no banco, RLS, schema, ou em outros tipos de importação além de `contratos_venda`.
- Sem novo seletor de granja na UI do diálogo.

## Validação

1. Reabrir "Importar Contratos de Venda" com a planilha atual:
   - Se a coluna `granja_codigo` estiver realmente preenchida com códigos válidos do tenant → 129 registros válidos.
   - Se o cabeçalho estiver diferente → erro claro apontando "Campo obrigatório `granja_codigo` está vazio".
   - Se os códigos não baterem → erro "`granjas.codigo = X` não encontrado" para as linhas afetadas.
2. Conferir no console que não há mais a mensagem genérica "granja_id ausente — registro rejeitado para evitar vazamento entre empresas" para linhas com `granja_codigo` válido.
