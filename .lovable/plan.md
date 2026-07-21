## Problema confirmado

Consulta ao banco mostra dois cenários no campo `data_emissao` (tipo `timestamptz`):

1. **NF-e emitidas recentemente** (ex.: nº 89, 90, 93) — guardam o timestamp real em UTC. Ex.: `2026-07-21 17:57:59+00` = 14:57 em São Paulo (UTC-3). O que aparece como "21:00" no navegador acontece porque o `format(new Date(...))` está sendo aplicado sobre valores do outro cenário abaixo, e o browser converte para o fuso local (podendo variar quando a máquina não está em -03).
2. **NF-e antigas / importadas / salvas só com data** (ex.: nº 87, 88) — guardam `2026-07-21 00:00:00+00`, ou seja, meia-noite UTC. Em São Paulo isso vira **20/07/2026 21:00** — exatamente o "21:00" que o usuário está vendo.

## Correção proposta (somente frontend/exibição)

Em `src/pages/NotasFiscais.tsx`, na célula de Data Emissão:

- Renderizar sempre no fuso **America/Sao_Paulo**, usando `formatInTimeZone` do `date-fns-tz` (padrão já usado no projeto) em vez de `new Date(...)` + `format` (que depende do fuso do navegador).
- Quando a parte de horário do `data_emissao` for `00:00:00` em São Paulo (registro salvo apenas com data), usar o `created_at` como fonte do horário — assim as notas antigas mostram um horário coerente (o de gravação) em vez de "21:00" fantasma.
- Manter o formato `dd/MM/yyyy HH:mm`.

Nenhuma alteração no banco, no hook `useNotasFiscais` nem nos fluxos de emissão — a gravação atual já persiste o timestamp correto para NF-e novas.

### Detalhes técnicos

- Import: `import { formatInTimeZone } from "date-fns-tz"`.
- Helper local:
  ```text
  ts = data_emissao || created_at
  sp = formatInTimeZone(ts, "America/Sao_Paulo", "HH:mm")
  if data_emissao existe e sp == "00:00" e created_at existe:
      usar created_at para o horário, mantendo a data de data_emissao
  saída: "dd/MM/yyyy HH:mm"
  ```
- Mesma lógica de ordenação do hook permanece (`data_emissao DESC, created_at DESC`).

## Fora de escopo (confirmar se quiser incluir depois)

- Corrigir retroativamente `data_emissao` das notas com `00:00:00+00` para o `created_at`, ou tratar a mesma regra também nas telas de Remessas / Compras / Depósito.
