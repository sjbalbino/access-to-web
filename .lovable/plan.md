Adicionar filtro por Emitente na tela de Notas Fiscais (`/notas-fiscais`).

## O que muda
- Ao lado dos filtros existentes (busca por texto e status), incluir um novo `ComboboxFilter` "Emitente" com opção "Todos".
- As opções virão de `useEmitentesNfe` (já usado na tela), exibindo o nome da inscrição do emitente e o CPF/CNPJ formatado como legenda, no mesmo padrão da coluna da tabela.
- Novo estado `emitenteFilter` (default `"todos"`). O `filteredNotas` passa a considerar `nota.emitente_id === emitenteFilter` quando diferente de "todos".
- Layout responsivo mantido: filtros continuam empilhando no mobile e alinhados no desktop.

## Fora de escopo
- Nenhuma mudança em backend, RLS ou consultas.
- Nenhum ajuste em outras telas (Notas Depósito, Entradas NF-e, etc.).

## Arquivo previsto
- `src/pages/NotasFiscais.tsx`