

## Reestruturar Plano de Contas conforme Access

### Análise do Access

**Tabela Plano Contas** (= contas individuais / sub-centros):
- Código, Conta (descrição), D/C (1=Despesa, 2=Receita), Incide IRF (checkbox), **Grupo** (FK → Tabela Plano Grupo), PlanoDRE (código DRE)

**Tabela Plano Grupo** (= agrupamento / centros de custo):
- Código, Grupo (descrição), Plano_recdesp (1=Despesa, 2=Receita), plano_impr (flag impressão), plano_ordem (ordem de exibição)

Mapeamento atual:
- `plano_contas_gerencial` = Tabela Plano Grupo ✓
- `sub_centros_custo` = Tabela Plano Contas ✓

---

### 1. Migração de Banco

**a) Adicionar colunas em `plano_contas_gerencial`** (Tabela Plano Grupo):
- `ordem` integer (plano_ordem)
- `imprimir` boolean (plano_impr)

**b) Adicionar colunas em `sub_centros_custo`** (Tabela Plano Contas):
- `tipo` varchar - D/C (receita/despesa) — cada conta pode ter tipo próprio
- `incide_irf` boolean

---

### 2. Atualizar Hooks

- `usePlanoContasGerencial.ts` — adicionar campos `ordem`, `imprimir` na interface e input
- `useSubCentrosCusto.ts` — adicionar campos `tipo`, `incide_irf` na interface e input

---

### 3. Atualizar UI do Plano de Contas

`PlanoContasGerencial.tsx`:
- Formulário Centro (Grupo): adicionar campo Ordem e switch Imprimir
- Formulário Sub-Centro (Conta): adicionar Select D/C (Receita/Despesa) e switch Incide IRF
- Tabela de sub-centros: exibir colunas D/C e IRF

---

### 4. Atualizar Importação

`importacaoConfig.ts`:
- **plano_contas_gerencial**: renomear mapeamentos Access (`Grupo` → `descricao`, `Plano_recdesp` → `tipo` com transform 1→despesa/2→receita, `plano_impr` → `imprimir`, `plano_ordem` → `ordem`)
- **Adicionar config `sub_centros_custo`**: Código, Conta→descricao, D/C→tipo (transform), Incide IRF→incide_irf, PlanoDRE→codigo_dre, Grupo→centro_custo_id (reference lookup por código no plano_contas_gerencial). `dependsOn: ['plano_contas_gerencial']`

---

### Arquivos a modificar
- Migration SQL (novas colunas)
- `src/hooks/usePlanoContasGerencial.ts`
- `src/hooks/useSubCentrosCusto.ts`
- `src/pages/PlanoContasGerencial.tsx`
- `src/lib/importacaoConfig.ts`

