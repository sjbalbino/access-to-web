# Cancelar Remessa (sem NFe emitida)

Hoje a lista de remessas (`src/pages/RemessasVendaForm.tsx`) só permite **Excluir** remessas sem NFe — o que apaga o registro e perde o histórico/número de romaneio. Vamos adicionar uma ação **Cancelar**, que mantém a remessa no banco com `status = 'cancelada'` (já existe esse status e o Badge correspondente, e o cálculo de totais do contrato já ignora canceladas via `.neq("status", "cancelada")`).

## Regras

- Botão **Cancelar** (ícone Ban, cor destructive) aparece ao lado de Excluir, somente quando:
  - `r.nota_fiscal_id` é nulo
  - `r.status !== "carregado_nfe"`
  - `r.status !== "cancelada"` (não recancelar)
- Ao clicar: abre `AlertDialog` de confirmação com Textarea opcional para "Motivo do cancelamento".
- Confirmar → `useUpdateRemessaVenda` com `{ status: "cancelada", observacoes: <obs atual + motivo opcional> }`.
- Remessa cancelada continua visível na lista com Badge "Cancelada" (já implementado) e perde os botões de Editar/Pesar/Emitir/Excluir — passa a ter apenas o botão **Visualizar** (olho) em modo read-only.
- Totais do contrato e próximo código de romaneio não mudam (já filtram canceladas / usam MAX).

## Alterações

**`src/pages/RemessasVendaForm.tsx`**
- Novo state `remessaCancelar: RemessaVenda | null` e `motivoCancelamento: string`.
- Botão Ban entre Excluir e os demais; mostrar Visualizar (Eye) também para `status === "cancelada"`.
- `AlertDialog` de confirmação com Textarea de motivo.
- Handler chama `updateRemessa.mutateAsync({ id, status: "cancelada", observacoes: ... })`.

Nenhuma migração de banco nem mudança em edge functions é necessária — o status `cancelada` já é suportado em todo o fluxo.
