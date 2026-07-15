## Problema

No `ticket_deposito`, as linhas de **Peso Entrada** e **Peso Saída** estão exibindo apenas o horário — os quilos ficam ocultos.

## Causa

Em `src/lib/ticketDepositoPdf.ts` (linhas ~152-153) a construção usa:

```ts
row2("  Peso Entrada:", row2(fmtNum(pesoBruto), horaEntrada).slice("  Peso Entrada:".length))
```

O `row2` interno posiciona o número à esquerda (col 0) e o horário à direita (col 42). O `.slice(15)` descarta os primeiros 15 caracteres — justamente onde estava o número — restando só espaços + horário. Por isso o kg some.

## Correção

Passar a montar as linhas com 3 colunas alinhadas ao mesmo padrão do cabeçalho ("Pesagem | Kilos | Horário"), sem o truque de `slice`. Formato:

```
Pesagem                     Kilos    Horário
  Peso Entrada:            49.780      15:00
  Peso Saída:              17.380      15:02
  Peso Bruto:              32.400
```

Implementação: helper de 3 colunas com larguras fixas (label esq., kilos alinhado à direita numa coluna intermediária, horário alinhado à direita no fim), aplicado nas 3 linhas de pesagem e no cabeçalho correspondente.

## Escopo

- Arquivo único: `src/lib/ticketDepositoPdf.ts`
- Apenas apresentação do ticket; nenhuma lógica de cálculo alterada.
