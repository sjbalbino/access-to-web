# Nota 141 (série 930) — "erro_cancelamento"

## O que foi verificado

- Nota 141, destinatário EDSON AMADEU DALBEM SOLKA (CPF 747.878.880-72), CFOP 1101 "COMPRA PARA INDUSTRIALIZACAO", 54.000 kg / R$ 113.400,00, emitida hoje 03/08 às 13:53.
- Consulta direta na Focus/SEFAZ (feita agora) retorna: `status: autorizado`, `status_sefaz: 100`, "Autorizado o uso da NF-e", protocolo 243260343799440. **A nota NÃO foi cancelada na SEFAZ** — o cancelamento foi rejeitado.
- Existe a nota 142, mesma inscrição, mesmo destinatário, mesmo valor, emitida 1 minuto depois (16:55) e **autorizada**. A compra de cereais (código 22) está vinculada à 142 com status `nfe_emitida`. Ou seja, a 141 é a duplicata órfã e é ela que precisa ser cancelada.
- Justificativa usada: `"nota duplicada "` — 15 caracteres **contando o espaço final**. A SEFAZ exige no mínimo 15 caracteres úteis (o espaço é descartado), o que muito provavelmente causou a rejeição. A validação atual (front e Edge Function) usa `justificativa.length` sem `trim()`, então o texto passou pela validação do sistema e foi rejeitado pela SEFAZ. Essa causa é a mais provável, mas não está confirmada pelos logs (a Edge Function não tem logs retidos do horário do cancelamento) — a confirmação vem na nova tentativa, que agora registrará a mensagem da SEFAZ.
- Efeito colateral encontrado no código: `focus-nfe-cancelar` grava `status`, `cancelado_em`, `cancelado_por`, `cancelado_motivo` e propaga o cancelamento (apaga notas de depósito, cancela compras/devoluções/remessas) **antes** de checar se a Focus respondeu com sucesso. Por isso a nota ficou com carimbo de cancelamento no banco mesmo continuando autorizada na SEFAZ.

## O que será feito

1. **Corrigir a Edge Function `focus-nfe-cancelar`**
   - Fazer `trim()` na justificativa e validar `>= 15` caracteres após o trim (rejeitar com 400 e mensagem clara antes de chamar a Focus).
   - Só gravar status/campos de auditoria e só propagar o cancelamento para compras, devoluções, remessas e notas de depósito **quando a Focus confirmar o cancelamento** (`response.ok` e status de cancelamento válido).
   - Em caso de falha: não alterar os vínculos, gravar apenas a mensagem de erro da SEFAZ em `motivo_status` e devolver a mensagem ao front, para o operador ver o motivo real.

2. **Corrigir a validação no front**
   - `useFocusNfe.cancelarNfe` e o diálogo de cancelamento em `NotasFiscais.tsx`: validar pelo texto com `trim()` e enviar já normalizado, evitando novamente uma justificativa de 14 caracteres úteis.

3. **Sanear a nota 141 no banco**
   - Limpar os campos de auditoria de cancelamento indevidos (`cancelado_em`, `cancelado_por`, `cancelado_por_nome`, `cancelado_motivo`, `motivo_status`) e deixar o status coerente com a SEFAZ (`autorizado`), já que ela continua válida.

4. **Reenviar o cancelamento da 141**
   - Após a correção, cancelar a 141 com justificativa válida (ex.: "Nota fiscal emitida em duplicidade - substituida pela NFe 142"), e confirmar via consulta que a SEFAZ retornou cancelamento homologado.

## Detalhes técnicos

- Arquivos: `supabase/functions/focus-nfe-cancelar/index.ts`, `src/hooks/useFocusNfe.ts`, `src/pages/NotasFiscais.tsx`.
- Saneamento da nota 141 (`id 77657f75-...`) via migração de dados pontual.
- Nenhuma alteração de schema é necessária.
