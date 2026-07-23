## Objetivo
Quando o botão **Sincronizar DFe** estiver bloqueado pelo intervalo de 1h, o diálogo deve continuar mostrando as NF-es já encontradas em consultas anteriores. Hoje a lista fica vazia porque nenhuma chamada à SEFAZ é feita e o cache local nunca é carregado.

## Causa
O `useEffect` de abertura em `MdeDialog.tsx` só popula `nfesRecebidas` quando chama `consultarDestinatarias`. Dentro da janela de 1h nada é chamado e a lista fica em branco. O `useMde` já mantém o cache em `dfe_nfes_cache` via `loadCache`, mas essa função é interna ao hook.

## Mudanças

### 1. `src/hooks/useMde.ts`
- Expor uma nova ação `carregarCache(inscricaoId)` que executa o `loadCache` já existente e faz `setNfesRecebidas(...)` ordenado por `data_emissao` desc.

### 2. `src/components/entradas-nfe/MdeDialog.tsx`
- Consumir `carregarCache` do `useMde`.
- No `useEffect` de abertura/troca de inscrição:
  - Sempre chamar `carregarCache(inscricaoId)` primeiro para popular a lista imediatamente.
  - Em seguida, se estiver fora da janela de 1h, chamar `consultarDestinatarias` normalmente (que já faz merge com o cache).
- Nenhuma alteração no throttle nem nos botões da linha.

## Arquivos
- `src/hooks/useMde.ts`
- `src/components/entradas-nfe/MdeDialog.tsx`

## Validação
- Reabrir o diálogo dentro da janela de 1h → lista das NF-es previamente sincronizadas continua visível, com botão exibindo `Aguarde mm:ss`.
- Trocar a inscrição → cache dessa inscrição aparece imediatamente.