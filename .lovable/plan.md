## Plano: Nota Referenciada na Devolução de Depósito

### Problema
A NF-e de devolução de depósito (CFOP 5906/6906) exige, conforme NT da SEFAZ, a chave da NFe/NFP referenciada (nota de depósito emitida pelo produtor). Atualmente não existe campo para informar essa chave.

### Solução

**1. Migração SQL** — Adicionar campo `nfe_referenciada` na tabela `devolucoes_deposito`:
```sql
ALTER TABLE devolucoes_deposito ADD COLUMN nfe_referenciada VARCHAR;
```

**2. Formulário de Devolução (`DevolucaoDialog.tsx`)** — Adicionar campo "Chave NFe Referenciada" (44 dígitos) no formulário de criação/edição.

**3. Emissão de NFe (`EmitirNfeDevolucaoDialog.tsx`)** — Incluir a chave referenciada no payload enviado à SEFAZ, usando o campo `nfe_referenciada` da nota fiscal e passando no mapeamento Focus NFe.

### Arquivos alterados
- Nova migração SQL (adicionar coluna)
- `src/components/devolucao/DevolucaoDialog.tsx` (campo input)
- `src/components/devolucao/EmitirNfeDevolucaoDialog.tsx` (incluir referência na emissão)
- `src/hooks/useDevolucoes.ts` (incluir campo na interface)
