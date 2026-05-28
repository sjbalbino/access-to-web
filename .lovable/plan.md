# Corrigir lista de Clientes/Fornecedores truncada em 1000 registros

## Problema

A base tem **1.191 clientes/fornecedores** ativos no tenant, mas o Supabase aplica um limite implícito de 1.000 linhas por query. O hook `useClientesFornecedores` faz `select('*').order('nome')` sem paginação, então os registros após o 1000º (ordem alfabética por `nome`) nunca chegam ao frontend.

Por isso "SEMENTES COSTA BEBER", "SEMENTES COSTA BEBER LTDA." e outros nomes na cauda do alfabeto não aparecem — embora estejam corretamente cadastrados, ativos e no tenant correto (confirmado via query direta).

## Solução

Paginar a busca no hook `src/hooks/useClientesFornecedores.ts` para trazer **todas** as linhas, usando `.range()` em loop até esgotar os resultados.

### Mudança em `useClientesFornecedores()` (apenas no `queryFn`):

```ts
const PAGE = 1000;
const all: ClienteFornecedor[] = [];
let from = 0;
while (true) {
  const { data, error } = await supabase
    .from('clientes_fornecedores')
    .select('*')
    .order('nome')
    .range(from, from + PAGE - 1);
  if (error) throw error;
  if (!data?.length) break;
  all.push(...(data as ClienteFornecedor[]));
  if (data.length < PAGE) break;
  from += PAGE;
}
return all;
```

Nenhuma outra alteração necessária — RLS, filtros da página e paginação client-side continuam funcionando.

## Validação

- Após a mudança, recarregar `/clientes-fornecedores` e buscar "COSTA BEBER" no filtro de nome → devem aparecer os 3 registros.
- A página continua paginando 20 itens por vez no cliente; o total na parte inferior deve refletir 1.191 (ou os filtrados).

## Observação

Outros hooks que listam tabelas potencialmente grandes (produtos, NCMs, contas a pagar/receber, etc.) podem ter o mesmo problema latente, mas **não serão alterados agora** — fora do escopo do pedido. Se quiser, posso fazer uma varredura num próximo passo.
