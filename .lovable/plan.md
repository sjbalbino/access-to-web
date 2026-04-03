

## Plano: Proteger remessas "Carregado/NFe" e exibir valor nota legado

### Problemas

1. **Remessas com status "carregado_nfe" permitem edição**: O dialog de edição abre e permite salvar alterações mesmo quando o status é "carregado_nfe" (sem nota fiscal vinculada no novo sistema, apenas legado).

2. **Valor Nota não aparece na lista**: O campo `valor_nota` está com valor 0 no banco para registros legados. A planilha do sistema legado provavelmente não tinha coluna `valor_nota` separada — o valor da nota é o mesmo que `valor_remessa`. A coluna na UI mostra R$ 0,00.

### Alterações

#### 1. `src/components/remessas/EditarRemessaDialog.tsx` — Modo somente leitura
- Detectar se a remessa tem status `carregado_nfe` (com ou sem `nota_fiscal_id`)
- Quando `carregado_nfe`: desabilitar todos os campos (adicionar `disabled` nos inputs/selects)
- Ocultar botão "Salvar" e exibir banner informativo "Remessa com NFe emitida — não é possível editar"
- Manter o dialog funcional apenas para visualização

#### 2. `src/pages/RemessasVendaForm.tsx` — Exibir valor nota com fallback
- Na coluna "Valor Nota", usar fallback: `valor_nota > 0 ? valor_nota : valor_remessa`
- Isso garante que registros legados (onde `valor_nota` = 0 mas `valor_remessa` tem valor) exibam o valor correto
- Aplicar mesma lógica no cálculo do footer de totais

#### 3. Migração SQL — Normalizar `valor_nota` legado
- Atualizar registros onde `valor_nota = 0` e `valor_remessa > 0` para copiar `valor_remessa` para `valor_nota`
- Isso corrige os dados na fonte, evitando workarounds na UI

### Arquivos alterados
- `src/components/remessas/EditarRemessaDialog.tsx` (modo read-only para carregado_nfe)
- `src/pages/RemessasVendaForm.tsx` (fallback valor_nota na lista)
- 1 migração SQL (normalizar valor_nota)

