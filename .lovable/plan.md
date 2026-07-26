## Objetivo

Permitir filtrar o relatório **Saldo Disponível - Estoque Geral** por um Local de Entrega específico, ou listar todos os locais (comportamento atual).

## Situação verificada

- O filtro `localEntregaId` (estado + `useLocaisEntrega`) já existe no `RelatorioDialog.tsx`, mas hoje só é exibido para o relatório `colheita_diaria` (linhas 2015-2029).
- Em `gerarSaldoDisponivel` (linha 327), o local de cada inscrição é derivado da primeira colheita da safra (`localPorInscricao`), com fallback para a sede do tenant (`tenantSedeNome`). Não há nenhum filtro por local.
- `gerarSaldoDisponivelPdf` (`src/lib/relatoriosEstoque.ts`) recebe `safraNome`, `tipoEntrega`, `pesoSaco` e `rows`, e imprime a linha de filtros no cabeçalho.

## Mudanças

### 1. UI — `src/components/relatorios/RelatorioDialog.tsx`

Estender a condição do bloco "Local de Entrega" para incluir `tipo === "saldo_disponivel"`, mantendo o `ComboboxFilter` já existente com `allLabel="Todos"` / placeholder "Todos os locais" (valor vazio = listar todos).

### 2. Geração dos dados — `gerarSaldoDisponivel`

- Guardar também o `local_entrega_terceiro_id` predominante por inscrição (junto do nome), tratando `null` como a sede do tenant.
- Quando `localEntregaId` estiver preenchido: manter apenas as inscrições cujo local corresponda ao selecionado; se o local escolhido for o `is_sede`, incluir também as inscrições sem `local_entrega_terceiro_id` (mesma regra já usada na Colheita Diária, linhas 1110-1116).
- O filtro é aplicado sobre as linhas finais (`rowMap`), preservando os cálculos de saldo já existentes.

### 3. Cabeçalho do PDF — `src/lib/relatoriosEstoque.ts`

- Adicionar campo opcional `localEntrega?: string` em `SaldoDisponivelData`.
- Exibir na linha de filtros: `SAFRA: X | Tipo de Entrega: Y | Local: Z` (Z = "Todos" quando sem filtro).

## Detalhes técnicos

- Nenhuma alteração de schema ou de dados no banco.
- A planilha (`pendingSheets`) refletirá automaticamente as linhas filtradas.
- Inscrições sem colheitas na safra continuam caindo na sede do tenant, portanto aparecem quando o local selecionado é a sede.
