## Objetivo
No diálogo **NF-es Recebidas (DFe)** (`MdeDialog.tsx`), identificar visualmente as NF-es que já tiveram entrada gerada no sistema, bloquear o botão "Dar entrada" nesses casos e ajustar o rótulo do status "Aguardando nfeProc".

## Mudanças

### 1. Detectar entradas já criadas (`MdeDialog.tsx`)
- Após carregar `nfesRecebidas`, executar uma consulta em `entradas_nfe` filtrando por `chave_acesso IN (...)` (via `useQuery`) para as chaves da lista atual.
- Retornar um `Map<chave, { id, numero_nfe, status }>` com as entradas já existentes.

### 2. Novo status "Entrada gerada"
- Adicionar quarta variante ao `statusProcessamento`: `"entrada"`.
- Quando a chave existir no mapa de entradas → status vira `"entrada"` (prioridade máxima, sobrepõe pendente/aguardando/pronto).
- Label: **"Entrada gerada Nº {numero_nfe}"** (ou apenas "Entrada gerada" se sem número).
- Classe visual: verde escuro/roxo distinto (`text-violet-700 border-violet-300 bg-violet-50`) para diferenciar do "Pronto".

### 3. Bloquear botão "Dar entrada"
- Adicionar condição `jaTemEntrada` ao `disabled` do botão.
- Ajustar `title` para: "Entrada já gerada para esta NF-e (Nº X)".
- Trocar ícone/cor para cinza (`bg-slate-400`) quando bloqueado, mantendo tamanho.

### 4. Ajustar rótulo "Aguardando nfeProc"
- Trocar o label do status `aguardando` de `"Aguardando nfeProc"` para `"Aguardando XML"` (mais curto, cabe no badge).
- Manter o tooltip explicativo completo mencionando nfeProc.

## Arquivos
- `src/components/entradas-nfe/MdeDialog.tsx` — única edição.

## Notas técnicas
- Query de verificação usa `.in('chave_acesso', chaves)` limitando aos 44 dígitos limpos.
- Cache invalidado quando `createEntrada` é bem-sucedido (adicionar `queryKey` própria e invalidar em conjunto com `entradas_nfe`).
