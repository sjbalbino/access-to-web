## Problema

Após cancelar uma NF-e, a lista em `/notas-fiscais` continua exibindo o status anterior ("autorizada"). A função `cancelarNfe` em `src/hooks/useFocusNfe.ts` atualiza o status no banco via edge function, mas não invalida o cache do React Query, então a UI só reflete após reload manual.

## Correção

Em `src/hooks/useFocusNfe.ts`, dentro de `cancelarNfe` (após `data.success`):

- Usar `useQueryClient` e chamar `queryClient.invalidateQueries({ queryKey: ["notas-fiscais"] })`.
- Invalidar também queries relacionadas que dependem da NFe cancelada: `notas-deposito-emitidas`, `devolucoes-deposito`, `compras-cereais`, `saldos-deposito`, `saldo-disponivel-produtor` (a edge function já propaga essas mudanças no banco).

Aplicar o mesmo padrão em `emitirCartaCorrecao` e em `emitirNfe` se ainda não invalidarem (verificar e ajustar somente se necessário, mantendo escopo da correção).

## Validação

Cancelar uma NF-e e confirmar que a linha na tabela passa imediatamente para "cancelada" sem reload.