## Objetivo
Corrigir a coluna **HA** e **MÉDIA** do Relatório de Colheita Diária para alinhar com o sistema legado. Hoje o HA da lavoura é repetido em cada carga, inflando os totais e derrubando a média.

## Regras
- **HA único por lavoura (deduplicar)**: cada `controle_lavoura` conta seu HA uma única vez por grupo (dia, local e total geral).
- **MÉDIA = SACOS / HA** (não mais Kgs/HA).
- **Linhas individuais**: manter HA em branco e MÉDIA em branco (evita duplicação visual e confusão).
- **Subtotais**: `Total do Dia`, `Loc.Entrega` e `TOTAL PERÍODO` mostram:
  - HA = soma dos HAs distintos das lavouras presentes naquele grupo
  - MÉDIA = soma de SACOS do grupo / HA distinto do grupo

## Implementação

### `src/lib/relatoriosPdf.ts` — `gerarColheitaDiariaPdf`
1. Adicionar `controle_lavoura_id` ao tipo `RelColheitaDiariaRow` para permitir deduplicação.
2. `makeRow`: deixar as células HA (índice 17) e MÉDIA (índice 18) em branco.
3. `sumRow`: calcular
   ```
   totHaDistinto = soma de r.ha por controle_lavoura_id único no grupo
   totSacos = soma de total_sacos do grupo
   media = totHaDistinto > 0 ? totSacos / totHaDistinto : 0
   ```
   e usar `totHaDistinto` e `media` nas colunas HA e MÉDIA do subtotal.

### `src/components/relatorios/RelatorioDialog.tsx` — `gerarColheitaDiaria`
1. Incluir `controle_lavoura_id` no `select` e no mapeamento de `rows`.
2. Ajustar a exportação Excel/preview (`pendingSheets`) para o mesmo padrão: HA e MÉDIA em branco por linha; se desejado manter no Excel, deixar apenas nas linhas de subtotal (por simplicidade, manterei linhas em branco também no preview para paridade visual com o PDF).

## Detalhes técnicos
- Deduplicação por `controle_lavoura_id`: usar `Set` dentro de `sumRow` para acumular HAs distintos.
- Se `controle_lavoura_id` for `null` em alguma colheita, tratar como grupo próprio (fallback: usa o HA da linha se houver).
- Não altera consulta SQL além de incluir o id do controle de lavoura.

## Arquivos alterados
- `src/lib/relatoriosPdf.ts`
- `src/components/relatorios/RelatorioDialog.tsx`