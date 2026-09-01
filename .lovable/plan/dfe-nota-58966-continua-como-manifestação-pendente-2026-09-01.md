# DFe: nota 58966 continua como "Manifestação pendente"

## O que foi verificado

No cache de DFe existe uma única linha para essa nota:

- Chave: `43260404661058000137550010000589661286693801`
- Número/série: 58966 / 1 — emissão 30/04/2026 — situação "autorizada"
- `nome` (emitente): vazio
- `manifestacao_destinatario`: **nulo**
- Última atualização do registro: 03/07/2026

Ou seja: a manifestação enviada à SEFAZ não voltou para o registro local, e o badge da lista é calculado exclusivamente a partir de `manifestacao_destinatario`. Sem esse campo preenchido, a linha continua exibindo "Manifestação pendente" e os botões de XML/Importar ficam bloqueados.

## Causa

Depois de manifestar com sucesso, a tela recarrega a lista pedindo à SEFAZ **todas** as notas destinadas (serviço de distribuição DFe). Essa nota entrou na lista por **busca por chave** e é de abril — já saiu da janela do DFe, então não vem nessa listagem e nada no cache é atualizado. A própria chamada de manifestação também não grava nada localmente.

Resumo: a manifestação provavelmente foi aceita na SEFAZ, mas o sistema nunca registra isso para essa nota.

## Sobre o limite de 90 dias da SEFAZ

O limite de disponibilidade do DFe/XML é real e afeta esta nota (emitida em 30/04/2026, hoje já com mais de 120 dias), porém ele explica apenas a **indisponibilidade do XML completo e a ausência da nota na listagem do DFe** — não o rótulo "Manifestação pendente". Esse rótulo vem exclusivamente do campo de manifestação gravado no registro local, que está nulo porque nada é gravado após manifestar. São dois efeitos diferentes e ambos precisam ser tratados:

- Manifestação: o prazo para manifestar é bem maior que 90 dias, então a manifestação pode ter sido aceita; falta persistir o resultado.
- XML: fora da janela de distribuição, a SEFAZ não entrega mais o `nfeProc`, e a tela deve dizer isso em vez de sugerir que falta manifestar.


## Correção proposta

1. **Gravar a manifestação no momento em que ela é aceita**: ao receber sucesso da manifestação, atualizar o registro da nota no cache de DFe com o tipo manifestado (ciência, confirmação, desconhecimento, operação não realizada) e refletir na lista da tela imediatamente.
2. **Reconsultar a nota específica pela chave** logo após manifestar (em vez de depender só da listagem geral), aproveitando o retorno da consulta por chave — que traz situação, nome do emitente e manifestação — para atualizar o cache com o dado oficial. Se a consulta por chave falhar ou não trouxer manifestação, permanece o valor gravado no passo 1.
3. **Manter a atualização da listagem geral** para as notas dentro da janela do DFe, sem sobrescrever com nulo o que já está gravado no cache.
4. **Novo status "XML fora do prazo da SEFAZ"**: quando a nota já está manifestada (ou a manifestação foi registrada) e a emissão passou de ~90 dias, exibir esse status e a orientação de obter o XML com o emitente, em vez de "Manifestação pendente"/"XML pendente na SEFAZ".
5. **Reconciliar a nota 58966**: após o ajuste, usar "Buscar por chave" nessa nota para trazer o nome do emitente e confirmar a manifestação registrada na SEFAZ. Se a SEFAZ responder que não há manifestação, basta manifestar novamente — agora o status será persistido. Para gerar a entrada dessa nota, o XML terá de vir do emitente (importação por arquivo), pois a janela de distribuição já expirou.

## Detalhes técnicos

- `src/hooks/useMde.ts`
  - `manifestar`: em caso de sucesso, fazer `update` em `dfe_nfes_cache` (`inscricao_id` + `chave`) gravando `manifestacao_destinatario = tipo`, atualizar `nfesRecebidas` no estado e, em seguida, disparar a consulta por chave para sincronizar com o retorno oficial.
  - `upsertCache`: não sobrescrever `manifestacao_destinatario` e `nome` com `null` quando o retorno da API vier sem esses campos (preservar o valor já existente).
  - `mapRaw`: já cobre `manifestacao_destinatario` / `ultima_manifestacao`; incluir também a variação `manifesto`/`tipo_manifestacao` caso presente no retorno da consulta por chave.
- `src/components/entradas-nfe/MdeDialog.tsx`
  - Em `handleManifestar`, substituir o `consultarDestinatarias` incondicional por: atualização otimista já vinda do hook + consulta por chave da nota manifestada, mantendo a sincronização geral como ação separada do botão "Sincronizar".
- Sem alteração de schema e sem alteração na Edge Function `focus-nfe-mde` (os endpoints de manifestação e consulta por chave já existem).
