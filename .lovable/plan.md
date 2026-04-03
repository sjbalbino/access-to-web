
## Plano: Bloquear salvamento em remessas NFe e validar contrato

### Problemas

1. **Remessa "Carregado/NFe" ainda permite salvar**: O `fieldset disabled` impede interacao visual, mas o botao "Salvar" ainda aparece e pode ser clicado (o `fieldset` nao desabilita botoes no `DialogFooter` que esta fora do fieldset). Alem disso, `handleSalvar` nao verifica `isReadOnly`.

2. **Contratos novos aceitam quantidade e preco zerados**: O `onSubmit` em `VendaProducaoForm.tsx` nao valida se `quantidade_kg` e `preco_kg` sao maiores que zero.

### Alteracoes

#### 1. `src/components/remessas/EditarRemessaDialog.tsx`
- Adicionar guard no inicio de `handleSalvar`: `if (isReadOnly) return;`
- Isso garante protecao mesmo que o botao seja acessivel de alguma forma

#### 2. `src/pages/VendaProducaoForm.tsx`
- No `onSubmit` (linha 330), adicionar validacoes antes do payload:
  - Se `!isEditing` (novo contrato): exigir `quantidade_kg > 0` e `preco_kg > 0`
  - Exibir `toast.error` especifico para cada campo zerado

### Arquivos alterados
- `src/components/remessas/EditarRemessaDialog.tsx` (1 linha — guard em handleSalvar)
- `src/pages/VendaProducaoForm.tsx` (validacoes de quantidade e preco)
