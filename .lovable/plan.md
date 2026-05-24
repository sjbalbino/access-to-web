## Diagnóstico

A importação de **Contas a Pagar** é lenta por 3 motivos somados:

### 1. Trigger `trg_rateio_cp` dispara por linha
Cada `INSERT` em `contas_pagar` executa `gerar_rateio_socios('cp', NEW.id)`, que:
- Consulta `produtores` da granja,
- Calcula percentuais,
- Faz `INSERT` em `lancamento_rateio_socios` (1 linha por sócio).

Para milhares de títulos isso multiplica o trabalho do banco. O trigger só "curto-circuita" quando `rateio_modo = 'manual'` (retorna sem buscar produtores nem inserir rateio).

### 2. Batch pequeno + fallback linha-a-linha
- `batchSize = 100` (muitos round-trips).
- Quando um batch falha por qualquer motivo, o código refaz **linha-a-linha** o batch inteiro (até 100 chamadas extras), mesmo quando o erro era de uma linha só. Isso explica picos de lentidão drástica em qualquer batch com erro.

### 3. `upsert` com `ignoreDuplicates` carrega payload de retorno
Mesmo ignorando duplicatas, o PostgREST por padrão devolve as linhas afetadas. Em milhares de registros isso somando a latência de rede pesa.

## Plano (somente `ImportacaoDialog.tsx`, sem migration)

Mudanças localizadas no bloco de insert de `contas_pagar` / `contas_receber` (linhas ~657-684):

1. **Forçar `rateio_modo = 'manual'` nas linhas importadas**
   - Antes do `upsert`, para `contas_pagar` e `contas_receber`, fazer `row.rateio_modo = row.rateio_modo ?? 'manual'`.
   - Efeito: o trigger `trg_rateio_cp` entra no caminho rápido (não consulta `produtores`, não insere rateio).
   - Não impacta lançamentos manuais nem rateio futuro: o usuário pode editar a conta depois e mudar o modo, o que dispara o rateio normalmente.

2. **Aumentar `batchSize` para 500** apenas nestas duas tabelas.

3. **Remover o fallback linha-a-linha cego**
   - Se o batch falhar, registrar o erro do batch (com a primeira linha como referência) e seguir para o próximo. O fallback atual só faz sentido quando o erro é de uma linha — na prática estamos pagando 100x a latência por nada quando o erro é genérico (ex.: constraint, RLS, timeout).
   - Manter o `enrichNumericError` no log do batch.

4. **Pedir retorno mínimo no upsert**
   - Trocar `.upsert(batch, { onConflict, ignoreDuplicates: true })` por uma chamada equivalente com `.select('id', { head: false, count: 'exact' })` removida — usar a forma `.upsert(batch, { onConflict, ignoreDuplicates: true, count: 'exact' })` e não encadear `.select()`. Em supabase-js v2 isso já não retorna linhas, então o impacto é só garantir que nenhum `.select()` foi anexado (confirmar no código atual).

5. **Atualizar `.lovable/plan.md`** documentando que importação de CP/CR cria registros com `rateio_modo = 'manual'` por padrão.

## Fora de escopo

- Não mexer em triggers, funções ou schema do banco.
- Não alterar import de outras tabelas.
- Não tocar em criação manual de contas a pagar/receber (segue gerando rateio automaticamente conforme configuração da granja).

## Resultado esperado

Importação de alguns milhares de títulos cai de minutos para segundos, porque:
- Trigger de rateio vira no-op durante o import.
- Menos round-trips (500/batch vs 100).
- Sem retries de 100 linhas a cada batch problemático.
