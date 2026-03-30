

## Plano: Adicionar importação separada de Controle de Lavoura

### Contexto
A tabela `controle_lavouras` possui campos (`area_total`, `ha_plantado`, `cobertura_solo`) que precisam ser importados do Access. A importação de colheitas depende desses registros existirem previamente.

### Alterações

#### 1. `src/lib/importacaoConfig.ts`
- Adicionar nova config de importação **antes** de colheitas (order 11):
  - Key: `controle_lavouras`
  - Label: `Controle de Lavoura`
  - dependsOn: `['safras', 'lavouras']`
  - Campos: `area_total`, `ha_plantado`, `cobertura_solo`
  - References: `safra_id` (via `safra_codigo` → `safras.codigo`), `lavoura_id` (via `lavoura_codigo` → `lavouras.codigo`)
- Atualizar colheitas:
  - Adicionar `'controle_lavouras'` ao `dependsOn`
  - Adicionar reference: `controle_lavoura_id` via lookup composto (safra + lavoura)

#### 2. `src/components/importacao/ImportacaoDialog.tsx`
- Adicionar lógica de resolução composta para colheitas: após resolver `safra_id` e `lavoura_id`, buscar `controle_lavouras` pela combinação e preencher `controle_lavoura_id`
- Se não encontrar o controle_lavoura correspondente, registrar aviso no log

### Arquivos impactados
- `src/lib/importacaoConfig.ts`
- `src/components/importacao/ImportacaoDialog.tsx`

