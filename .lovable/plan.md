## Objetivo
Refinar o diálogo **NF-es Recebidas (DFe)** em `src/components/entradas-nfe/MdeDialog.tsx` para:
1. Quando a entrada da NF-e já foi gerada → status **"Entrada Gerada"** e **todos** os botões de ação (XML, Dar entrada, Manifestar, DANFE) ficam bloqueados.
2. Quando a NF-e já foi manifestada → botão **Manifestar** fica desabilitado, o texto passa a **"Já manifestado"** e aparece um **badge ao lado** indicando o tipo (Ciência / Confirmada / Desconhecida / Não realizada).
3. Botão **Sincronizar DFe** respeita intervalo mínimo de **1 hora** (NT SEFAZ). Se acionado antes, fica bloqueado exibindo o tempo restante em contagem regressiva (mm:ss).

## Mudanças em `src/components/entradas-nfe/MdeDialog.tsx`

### 1. Bloqueio total quando entrada já gerada
- Nas variáveis da linha (`jaTemEntrada`), aplicar `disabled` a **todos** os botões da célula de ações: XML, Dar entrada, Manifestar e o item DANFE do dropdown.
- Tooltip padrão: `"Entrada já gerada Nº X — ações bloqueadas"`.
- O badge de status "Entrada gerada Nº X" (violeta) já existe e continua sendo exibido.

### 2. Botão Manifestar pós-manifestação
- Quando `nfe.manifestacao_destinatario` estiver preenchido **e** a entrada ainda não existir:
  - Trigger do `DropdownMenu` fica `disabled`.
  - Texto do botão muda para **"Já manifestado"** (ícone `CheckCircle2`).
  - Ao lado do botão, renderizar um `Badge` com o rótulo da manifestação (usando `manifestacaoLabels` e `manifestacaoVariants` já existentes no arquivo).
- Se ainda não houver manifestação, comportamento atual permanece.

### 3. Throttle de 1 hora no Sincronizar DFe
- Armazenar timestamp da última sincronização **por inscrição** em `localStorage` sob a chave `mde:last-sync:<inscricaoId>`, atualizado ao final de cada `consultarDestinatarias` bem-sucedida (inclusive no `useEffect` que dispara ao abrir/trocar inscrição).
- Estado local `secondsUntilNextSync` calculado a cada 1s via `setInterval` enquanto o diálogo estiver aberto e houver inscrição selecionada.
- Regra: `MIN_INTERVAL_MS = 60 * 60 * 1000`. Se `now - lastSync < MIN_INTERVAL_MS`, botão fica `disabled` e exibe **"Aguarde mm:ss"** ao lado do rótulo. Tooltip explica a regra da NT SEFAZ.
- A busca **por chave específica** (`consultarPorChave`) **não** é afetada pelo throttle — apenas o botão de sincronização geral.
- O `useEffect` que auto-sincroniza ao abrir o diálogo passa a respeitar o intervalo (não refaz a chamada se ainda estiver dentro da janela de 1 hora); apenas carrega o cache local via merge normal do `useMde`.

## Arquivos
- `src/components/entradas-nfe/MdeDialog.tsx` — única edição.

## Notas técnicas
- Nenhuma alteração em backend, RLS ou edge functions.
- Sem novas dependências; `setInterval` é limpo no unmount / fechamento do diálogo.
- O throttle é client-side (localStorage) — é uma proteção de UX contra chamadas excessivas, não uma trava de segurança. Se o usuário limpar o storage, sincroniza novamente.
- Validação final no preview: (a) linha com entrada gerada tem todos os botões cinzas; (b) linha manifestada mostra "Já manifestado" + badge do tipo; (c) após clicar em Sincronizar DFe, o botão exibe contagem regressiva até zerar em 1h.