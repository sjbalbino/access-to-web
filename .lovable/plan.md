## Problema

Na Entrada NF-e nº 5 (chave `...051677761321`), a contra-nota já foi emitida e autorizada (NF-e nº 72, natureza "Contra-nota de entrada - TRANSFERENCIA DE BEM..."), mas:

- Status da entrada continua "Pendente".
- Botão "Emitir Contra-nota" continua habilitado, permitindo emitir nova contra-nota duplicada.

Causa raiz: a listagem de Entradas NF-e não verifica se já existe uma nota fiscal do tipo contra-nota/devolução referenciando a chave de acesso da entrada. Não há vínculo direto (`contra_nota_id`) nem consulta cruzada em `notas_fiscais_referenciadas`.

## Solução

Detectar contra-notas/devoluções já emitidas para cada entrada via `notas_fiscais_referenciadas.chave_nfe = entradas_nfe.chave_acesso` e ajustar a UI.

### 1. Hook `useEntradasNfe`
Após buscar as entradas, executar uma segunda consulta em `notas_fiscais_referenciadas` (join com `notas_fiscais`) filtrando pelas `chave_acesso` das entradas retornadas. Anexar em cada entrada dois campos derivados:
- `contra_nota`: `{ id, numero, status, tipo: 'contra' | 'devolucao' } | null`
- Classificação por natureza: começa com "Contra-nota" → `contra`; começa com "Devolução" → `devolucao`.

### 2. Página `src/pages/EntradasNfe.tsx`
- Botão "Emitir Contra-nota" (linha 402): `disabled` quando `e.contra_nota?.tipo === 'contra'`, título passa a "Contra-nota já emitida (NF-e nº X)".
- Botão "Devolução" (linha 405): mesmo tratamento para `tipo === 'devolucao'`.
- Ao clicar em um botão bloqueado por contra-nota existente: navegar para `/notas-fiscais/{id}` em vez de emitir.
- Adicionar badge discreto "Contra-nota nº X" ou "Devolução nº X" ao lado do status quando houver, com link para a NF-e.

### 3. Não alterado
- Status da entrada (`pendente/conferido/finalizado`) permanece controlado manualmente pelo botão Finalizar (que dá entrada no estoque). Emissão de contra-nota é evento fiscal independente e não deve auto-finalizar a entrada.
- Nenhuma migration é necessária — a detecção usa a chave de acesso existente.

### 4. Validação
Após o ajuste, a Entrada nº 5 deve mostrar o botão Contra-nota desabilitado com tooltip apontando para a NF-e 72, e o botão Devolução permanecer ativo (não há devolução emitida).

## Detalhes técnicos

- Consulta adicional: `supabase.from('notas_fiscais_referenciadas').select('chave_nfe, nota_fiscal:notas_fiscais(id, numero, status, natureza_operacao)').in('chave_nfe', chavesValidas)` — apenas chaves com 44 dígitos.
- Merge feito no client (map por chave). Sem impacto em RLS.
- Se houver múltiplas notas para a mesma chave/tipo, prioriza a mais recente com status `autorizado`.
