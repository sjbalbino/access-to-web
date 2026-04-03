

## Plano: Corrigir proteção de remessas "Carregado/NFe"

### Problema raiz

O `<fieldset disabled>` não funciona com componentes Select do Radix UI (usado pelo shadcn/ui). Os selects e inputs customizados ignoram o atributo `disabled` herdado do fieldset, permitindo que o usuário altere dados mesmo em modo "somente leitura". Além disso, ao salvar, o status é recalculado por `determinarStatus()` que retorna "carregado" (ignorando o status original "carregado_nfe").

### Alterações

#### `src/components/remessas/EditarRemessaDialog.tsx`

1. **Remover `fieldset disabled`** e passar `disabled={isReadOnly}` individualmente para cada Input, Select e Textarea
2. **Preservar status original no salvamento**: em `handleSalvar`, manter o status existente da remessa quando `status === "carregado_nfe"` em vez de recalcular via `determinarStatus()`
3. **Adicionar `readOnly` nos inputs numéricos** para impedir digitação quando `isReadOnly`

Isso garante que:
- Todos os campos ficam efetivamente desabilitados visualmente e funcionalmente
- O botão "Salvar" continua oculto (já implementado)
- O guard `if (isReadOnly) return` continua como proteção extra
- Se por algum motivo salvar for acionado, o status original é preservado

### Arquivos alterados
- `src/components/remessas/EditarRemessaDialog.tsx`

