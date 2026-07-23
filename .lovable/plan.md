## Objetivo
Garantir que o diálogo **NF-es Recebidas (DFe)** identifique corretamente as NF-es que já têm entrada gerada no sistema, exibindo o badge "Entrada gerada Nº X" e bloqueando o botão "Dar entrada".

## Causa raiz
O `useQuery` `mde-entradas-existentes` em `src/components/entradas-nfe/MdeDialog.tsx` está servindo cache desatualizado. A verificação foi feita, mas o resultado não é revalidado quando o diálogo reabre nem quando entradas são criadas por outros fluxos (contra-nota, devolução, importação de XML fora do MdE).

Confirmado no banco: as chaves das notas 160720002 e 160720003 existem em `entradas_nfe` sem formatação (44 dígitos), portanto o `.in("chave_acesso", chavesDaLista)` deveria bater — o problema é apenas o cache/refetch.

## Mudanças em `src/components/entradas-nfe/MdeDialog.tsx`

### 1. Forçar revalidação da query
Adicionar `staleTime: 0` e `refetchOnMount: "always"` ao `useQuery` `mde-entradas-existentes` para que toda abertura do diálogo (ou nova sincronização DFe) verifique o estado atual das entradas no banco.

### 2. Ajustar largura do badge de status
O rótulo "Aguardando XML" (17 caracteres) está estourando a coluna Status na largura atual. Vou:
- Reduzir o rótulo `aguardando` para **"Aguardando"** (o tooltip completo já explica que é o `nfeProc`).
- Adicionar `whitespace-nowrap` explícito ao Badge para evitar quebra.

### 3. Log de diagnóstico temporário (removido depois de validar)
Console.debug com `chavesDaLista.length` e `Object.keys(entradasExistentes || {}).length` no render para confirmar em produção que a query está devolvendo os matches esperados. Caso o preview confirme o funcionamento com as mudanças 1 e 2, o log sai.

## Arquivos
- `src/components/entradas-nfe/MdeDialog.tsx` — única edição.

## Notas técnicas
- Não altero a `queryKey` (continua baseada nas chaves) para preservar o comportamento por-lista.
- Nenhuma mudança em backend/RLS — a política de SELECT por tenant já cobre o cenário.
- Após aprovado, valido no preview reabrindo o diálogo do MdE e confirmando que as notas 160720002/160720003 aparecem com badge violeta "Entrada gerada Nº ..." e botão bloqueado.
