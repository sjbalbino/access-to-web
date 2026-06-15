## Objetivo
Ao incluir/editar uma conta (a pagar ou receber), quando o usuário selecionar o **Produto**, os campos **Sub-centro de custo** e **Conta DRE** devem ser preenchidos automaticamente com base no **Grupo do Produto** (e não mais usando apenas o `conta_gerencial_id` do próprio produto).

## Comportamento atual
Em `src/components/contas/ContaFormDialog.tsx` (linhas 85–96), ao escolher um produto o código lê `produto.conta_gerencial_id` e tenta achar o sub-centro/DRE a partir dele. Muitos produtos não têm esse campo preenchido, então os campos ficam em branco.

## Nova regra
1. Ao selecionar um produto:
   - Buscar o `grupo_id` do produto.
   - Buscar o grupo em `grupos_produtos` e ler:
     - `conta_gerencial_id` → preenche **Sub-centro de custo**.
     - `codigo_dre` → localiza o registro correspondente em `dre_contas` e preenche **Conta DRE**.
   - Se o grupo tiver `codigo_dre` mas não `conta_gerencial_id` (ou vice-versa), preenche apenas o campo disponível.
   - Se o grupo não estiver definido ou não tiver nenhum dos dois, mantém o comportamento atual como fallback (lê do próprio produto).
2. Sempre sobrescreve os valores atuais dos campos para refletir o grupo do produto recém-selecionado (o usuário ainda pode editar manualmente depois).
3. A regra ao alterar manualmente o Sub-centro (linhas 97–103) permanece igual: ao trocar o sub-centro, o DRE é recalculado pelo `codigo_dre` do sub-centro.

## Arquivos afetados
- `src/components/contas/ContaFormDialog.tsx` — ajustar a lógica do `update('produto_id', …)` para usar `grupos_produtos` via hook `useGruposProdutos`.

## Detalhes técnicos
- Importar `useGruposProdutos` e carregar a lista junto com `produtos`.
- No bloco `if (k === 'produto_id' && v)`:
  - `const produto = produtos?.find(p => p.id === v)`
  - `const grupo = grupos?.find(g => g.id === produto?.grupo_id)`
  - Preferência: usar `grupo.conta_gerencial_id` → sub-centro; `grupo.codigo_dre` → DRE.
  - Fallback (somente se grupo não trouxer dados): usar `produto.conta_gerencial_id` como hoje.

Sem alterações de banco, sem migrações.