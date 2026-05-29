## Objetivo
Preencher automaticamente as alíquotas padrão (ICMS, PIS, COFINS, IBS, CBS, IS) e os CST padrão conforme o Regime Tributário (CRT) selecionado em `EmitentesNfe.tsx`.

## Tabela de defaults por regime

| Campo | Simples Nacional (CRT 1 e 2) | Regime Normal (CRT 3) |
|---|---|---|
| ICMS | 0 | 0 (UF-dependente; usuário ajusta) |
| PIS | 0 (recolhido no DAS) | 1,65 |
| COFINS | 0 (recolhido no DAS) | 7,60 |
| IBS | 0,1 (transição 2026) | 0,1 |
| CBS | 0,9 (transição 2026) | 0,9 |
| IS | 0 | 0 |
| CST ICMS | 102 (CSOSN) | 00 |
| CST PIS | 49 | 01 |
| CST COFINS | 49 | 01 |
| CST IPI | 99 | 99 |
| CST IBS | 000 | 000 |
| CST CBS | 000 | 000 |
| CST IS | 000 | 000 |

Observação 2026: alíquotas de transição IBS=0,1% e CBS=0,9% conforme cronograma da Reforma Tributária. Usuário pode editar livremente.

## Mudanças em `src/pages/EmitentesNfe.tsx`

1. Criar helper local `getDefaultsByCrt(crt: number)` retornando o objeto com os 6 valores de alíquota + 7 CSTs conforme tabela acima.
2. No `onValueChange` do `<Select>` de CRT (Regime Tributário): além de setar `crt`, aplicar os defaults via `setFormData(prev => ({ ...prev, crt, ...getDefaultsByCrt(crt) }))` — somente quando o usuário troca o regime no formulário (não sobrescreve no carregamento de emitente existente).
3. Atualizar o estado inicial do form e o reset para usar `getDefaultsByCrt(3)` (Regime Normal por padrão), em vez dos valores hardcoded espalhados.
4. Não alterar carregamento do emitente existente — continua respeitando os valores salvos.

## Fora de escopo
- Sem migração de banco.
- Sem alteração no cálculo de impostos da NFe.
- Sem mudanças em `NotaFiscalForm.tsx` ou edge functions.
