## Objetivo

Remover definitivamente os campos **CPF**, **CNPJ** e **Inscrição Estadual** do cadastro de Granja — formulário, listagem e colunas do banco — já que os dados fiscais corretos vivem na **Inscrição do Produtor** (e são usados na emissão de NFe).

## Locais afetados (mapeados)

1. **`src/pages/Granjas.tsx`** — formulário e listagem
   - Remover inputs CPF, CNPJ, Inscrição Estadual do dialog
   - Remover do `defaultValues` / reset (linhas 132-134)
   - Remover coluna "CPF/CNPJ" da tabela (linha 246)
   - Remover lookup automático de CNPJ da Granja (se houver)

2. **`src/hooks/useGranjas.ts`** — tipagem
   - Remover `cpf`, `cnpj`, `inscricao_estadual` da interface `Granja`

3. **`src/pages/EmitentesNfe.tsx`** — listagem de emitentes
   - Linhas 308-309: as colunas "CNPJ" e "IE" hoje mostram dados da Granja. Trocar para mostrar **CNPJ/IE da Inscrição do Produtor vinculada ao emitente** (via `inscricoes_produtor.emitente_id`). Se nenhuma vinculada, exibir "-"
   - Linha 385: dropdown de seleção de Granja — remover o sufixo `- ${granja.cnpj}` (mostrar apenas razão social / nome fantasia)

4. **`src/components/contas/BaixasDialog.tsx`** (linhas 130-136) — recibo PDF
   - Hoje usa `granja.cnpj` como emitente do recibo. Trocar a fonte para a **Inscrição emitente principal** da granja (já existe `useInscricaoEmitentePrincipal`), usando `inscricao.cpf_cnpj` e razão social do produtor. Fallback: razão social da granja sem CNPJ se não houver inscrição principal.

5. **`src/hooks/useInscricaoEmitentePrincipal.ts`** e outros hooks que façam `select` em `granjas(... cnpj, inscricao_estadual ...)` — remover esses campos do select para não quebrar tipos após a migration.
   - Verificar também `useEmitentesNfe.ts` (select em `granjas(... cnpj, inscricao_estadual)`).

## Banco de dados (migration)

```sql
ALTER TABLE public.granjas
  DROP COLUMN IF EXISTS cpf,
  DROP COLUMN IF EXISTS cnpj,
  DROP COLUMN IF EXISTS inscricao_estadual;
```

> Sem perda de dado fiscal relevante: os mesmos campos existem em `inscricoes_produtor.cpf_cnpj` e `inscricoes_produtor.inscricao_estadual`, que são os efetivamente usados em NFe.

## Pontos de atenção

- **Recibo de baixa de contas a receber** passará a exibir o CNPJ/CPF da Inscrição emitente principal — o que é mais correto fiscalmente. Se a granja não tiver uma inscrição marcada como principal, o recibo sai sem CNPJ no cabeçalho do emitente (mostra só razão social da granja).
- **Importações antigas** que populavam esses campos: nenhum impacto futuro, mas dados históricos serão descartados pela migration. Se quiser preservar como backup, podemos exportar antes (me avise).
- **`supabase/types.ts`** será regenerado automaticamente após a migration.

## Ordem de execução

1. Aplicar migration (drop das 3 colunas)
2. Atualizar `useGranjas.ts` (interface)
3. Atualizar `Granjas.tsx` (form + listagem)
4. Atualizar `EmitentesNfe.tsx` (colunas e dropdown)
5. Atualizar `BaixasDialog.tsx` (fonte do emitente do recibo)
6. Remover `cnpj, inscricao_estadual` dos selects em `useEmitentesNfe.ts` e `useInscricaoEmitentePrincipal.ts`
