## Problema

Notas 89 e 90 mostram horário **21:00** apesar de emitidas às ~14:00/17:00 (BRT).

**Causa raiz confirmada via banco:**
- `data_emissao` da nota 89 (mais recente): `2026-07-21 00:00:00+00` (timestamptz meia-noite UTC)
- `created_at`: `2026-07-21 17:15:46+00` (horário real de criação)

O `data_emissao` está armazenado como **timestamptz à meia-noite UTC**, portanto ao converter para America/Sao_Paulo resulta em `2026-07-20 21:00`. O fallback atual em `formatDataEmissao` (src/pages/NotasFiscais.tsx) só dispara quando o horário formatado é `"00:00"`, o que nunca acontece — pois `00:00 UTC = 21:00 SP`.

## Correção

Ajustar `formatDataEmissao` em `src/pages/NotasFiscais.tsx` para detectar quando `data_emissao` representa apenas uma data (meia-noite UTC ou string `YYYY-MM-DD` pura) e, nesse caso:
- Usar `data_emissao` para a **data** (dd/MM/yyyy)
- Usar `created_at` para o **horário** (HH:mm em SP)

Detecção: regex sobre a string bruta — `/^\d{4}-\d{2}-\d{2}$/` ou `/T00:00:00(\.000)?(Z|\+00:?00)$/`.

## Escopo

Somente `src/pages/NotasFiscais.tsx`. Nenhuma alteração de banco ou lógica de emissão — o `data_emissao` continuará gravado como timestamptz à meia-noite UTC (comportamento atual do backend não é alterado).