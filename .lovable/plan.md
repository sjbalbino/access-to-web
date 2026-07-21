## Diagnóstico

Ao emitir NF-e de compra (CFOP 1102), o CST do ICMS está sendo gravado como **00** em vez de **51 (diferimento)**.

**Causa raiz** — a resolução de CST em `EmitirNfeCompraDialog.tsx` (linha 318) usa a prioridade:

```
produto.cst_icms → cfop.cst_icms_padrao → emitente.cst_icms_padrao → "00"
```

Confirmei no banco:

- CFOP **1102** (Compra para comercialização): `cst_icms_padrao = "00"`
- CFOPs 1101, 2102, 5102: também com `"00"` gravado
- Vários emitentes têm `cst_icms_padrao = "51"` configurado (produtor rural com diferimento)

Como o CFOP tem valor preenchido, ele **sempre vence** o emitente. Resultado: o CST do emitente ("51") nunca é aplicado.

O mesmo padrão de prioridade está replicado em:

- `src/components/compra/EmitirNfeCompraDialog.tsx:318`
- `src/components/devolucao/EmitirNfeDevolucaoDialog.tsx:273`
- `src/components/remessas/EmitirNfeAutomaticoDialog.tsx:341`

(Nota de Depósito usa lógica separada com CFOP 1905 fixo em "41", que é correto para depósito e não precisa mudar.)

## Correção proposta

Inverter a prioridade entre CFOP e emitente para ICMS, PIS e COFINS nos três diálogos acima:

```
produto → emitente → CFOP → fallback
```

**Justificativa:** o CST tradicional (ICMS/PIS/COFINS) depende do **regime tributário do emitente** (diferimento do produtor rural, Simples Nacional, etc.), não do CFOP genérico. O CFOP fica apenas como fallback quando o emitente não tem CST cadastrado. Esse mesmo padrão já foi aplicado nos campos da Reforma Tributária (IBS/CBS/IS) na correção anterior — a mudança aqui alinha ICMS/PIS/COFINS ao mesmo comportamento.

Produto continua vencendo tudo (para casos específicos como itens isentos), e o fallback final permanece igual.

### Arquivos alterados

1. **`src/components/compra/EmitirNfeCompraDialog.tsx`** — trocar ordem `cfop || emitente` por `emitente || cfop` em `cst_icms`, `cst_pis` e `cst_cofins` (linha ~318).
2. **`src/components/devolucao/EmitirNfeDevolucaoDialog.tsx`** — mesma troca (linha ~273).
3. **`src/components/remessas/EmitirNfeAutomaticoDialog.tsx`** — mesma troca (linha ~341).

## Fora do escopo

- Não vou alterar os `cst_icms_padrao` gravados nos CFOPs (mantidos como fallback).
- Nota de Depósito (CFOP 1905) não muda — "41" é o correto para depósito.
- Não vou re-emitir/corrigir notas já autorizadas — a mudança vale para novas emissões. Se quiser corrigir notas específicas, me diga quais.
