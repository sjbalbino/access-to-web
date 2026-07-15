## Diagnóstico
- Banco está íntegro. Consultei o tenant Grings:
  - `colheitas.local_entrega_terceiro_id IS NULL` → **0**
  - `transferencias_deposito.local_saida_id IS NULL` → **0**
  - `transferencias_deposito.local_entrada_id IS NULL` → **0**
  - `devolucoes_deposito.local_entrega_id IS NULL` → **0**
- Nada a atualizar no banco. Nenhuma migration.

## Causa do rótulo "Sede" no PDF
Em `src/components/relatorios/RelatorioDialog.tsx`, função `gerarResumoLocal`, os agrupadores de transferências e devoluções estão hard-coded como `"Sede"` (linhas ~527-544). A função ignora as colunas `local_saida_id`, `local_entrada_id` e `local_entrega_id`.

## Correção (somente frontend, 1 arquivo)
`src/components/relatorios/RelatorioDialog.tsx` — função `gerarResumoLocal`:

1. Ampliar os `select` para trazer o nome do local:
   ```ts
   supabase.from("transferencias_deposito")
     .select("inscricao_origem_id, inscricao_destino_id, quantidade_kg, local_saida_id, local_entrada_id, saida:locais_entrega!transferencias_deposito_local_saida_id_fkey(nome), entrada:locais_entrega!transferencias_deposito_local_entrada_id_fkey(nome)")
     .eq("safra_id", safraId)

   supabase.from("devolucoes_deposito")
     .select("inscricao_produtor_id, inscricao_recebe_taxa_id, quantidade_kg, kg_taxa_armazenagem, local_entrega_id, local:locais_entrega!devolucoes_deposito_local_entrega_id_fkey(nome)")
     .eq("safra_id", safraId).neq("status","cancelada")
   ```
   (Ajustar o nome exato da FK conforme já usado em `useDevolucoes.ts`; para transferências, verificar `Database` types.)

2. Substituir os `getRow("Sede", …)` por rótulo real:
   - Saída de transferência → `t.saida?.nome ?? tenantSedeNome`
   - Entrada de transferência → `t.entrada?.nome ?? tenantSedeNome`
   - Devoluções (linhas do produtor e do recebedor de taxa) → `d.local?.nome ?? tenantSedeNome`

3. Colheitas: manter `c.locais_entrega?.nome`, trocando apenas o fallback `"Sede"` por `tenantSedeNome`.

4. Definir `tenantSedeNome` no topo do componente via `useLocalSede()` (hook já existe em `src/hooks/useLocaisEntrega.ts`):
   ```ts
   const { data: localSede } = useLocalSede();
   const tenantSedeNome = localSede?.nome ?? "Sede";
   ```

## Escopo
- 1 arquivo alterado: `src/components/relatorios/RelatorioDialog.tsx`.
- Sem mudanças em banco, hooks ou outros relatórios.
- Resultado: cada linha do resumo aparece no local real cadastrado no lançamento; casos sem local caem para o nome da sede do tenant (ex.: "Márcio Grings"), nunca mais o literal "Sede".