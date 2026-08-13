# Módulo Controle Paralelo (Marcações)

Novo módulo independente para marcar lançamentos e gerar relatórios próprios que **desconsideram** os lançamentos marcados. Nada nos módulos, saldos, extratos e relatórios existentes é alterado.

## Como vai funcionar

1. Menu novo: **Controle Paralelo** (grupo próprio no menu lateral e no menu mobile), rota `/controle-paralelo`.
2. **Conjuntos nomeados**: o usuário cria conjuntos (ex.: "Controle Safra 2026 – Sócio A"), com nome, descrição e situação ativo/inativo.
3. **Marcação de lançamentos**: dentro de um conjunto, abas por tipo de documento, cada uma listando os lançamentos do tenant com filtros (safra, produtor/inscrição, local de entrega, período) e caixa de seleção para marcar/desmarcar:
   - Transferências de depósito
   - Compras de cereais
   - Vendas: contratos de venda e remessas de venda
   - Notas de depósito emitidas e devoluções de depósito
   Marcar/desmarcar apenas grava/apaga o vínculo no módulo novo — o documento original não é tocado.
4. **Relatórios próprios do módulo** (PDF, padrão visual e formatação BR já usados no sistema), sempre excluindo os itens marcados do conjunto selecionado:
   - Transferências (sem marcados)
   - Compras de cereais (sem marcados)
   - Vendas – contratos e remessas (sem marcados)
   - Depósitos e devoluções (sem marcados)
   - Consolidado de movimentação do conjunto (todos os tipos, com subtotais por tipo e por produtor/local)
   - Conferência: relação **somente dos marcados** (para auditoria do que foi excluído)
   Cada relatório terá filtros de conjunto, safra, produtor/inscrição, local de entrega, período, além de orientação/tamanho de página.
5. Exclusões (conjunto ou marcação) sempre pedem confirmação via o provider de confirmação padrão.

## Detalhes técnicos

Banco (migração nova, tudo isolado, com RLS por tenant e GRANTs):

- `controle_conjuntos`: `tenant_id`, `nome`, `descricao`, `ativo`, timestamps + trigger de `updated_at`. Único por (`tenant_id`, `nome`).
- `controle_marcacoes`: `tenant_id`, `conjunto_id` (FK cascade), `documento_tipo` (TEXT com CHECK: `transferencia_deposito`, `compra_cereal`, `contrato_venda`, `remessa_venda`, `nota_deposito`, `devolucao_deposito`), `documento_id` (uuid, sem FK para permitir os 6 tipos), `observacao`, timestamps. Único por (`conjunto_id`, `documento_tipo`, `documento_id`); índices em (`tenant_id`, `conjunto_id`) e (`documento_tipo`, `documento_id`).
- Políticas: leitura/escrita restritas ao tenant do usuário (`get_user_tenant_id()`), padrão idêntico às demais tabelas do projeto.

Frontend:

- `src/hooks/useControleConjuntos.ts` e `src/hooks/useControleMarcacoes.ts` (TanStack Query, mutations com toast).
- `src/pages/ControleParalelo.tsx` (lista de conjuntos, padrão "List First" + dialogs) e `src/pages/ControleParaleloConjunto.tsx` (abas de marcação, paginação de 20 via `usePaginacao`).
- `src/components/controle-paralelo/` : `ConjuntoFormDialog.tsx`, abas `MarcarTransferencias.tsx`, `MarcarCompras.tsx`, `MarcarVendas.tsx`, `MarcarDepositos.tsx`, e `RelatorioControleDialog.tsx`.
- `src/lib/relatoriosControleParalelo.ts`: geradores jsPDF novos (nenhuma alteração em `relatoriosPdf.ts`, `relatoriosEstoque.ts`, `relatoriosGestao.ts`).
- Rotas em `App.tsx` (`/controle-paralelo`, `/controle-paralelo/:id`), entradas em `AppSidebar.tsx`, `MobileNav.tsx` e `routeMap.ts`.
- As consultas de listagem/relatório reutilizam as tabelas de origem em modo somente leitura e aplicam `NOT IN (ids marcados)` apenas dentro deste módulo.

## Fora do escopo

- Nenhuma mudança em saldos, extratos, `useSaldosDeposito`, relatórios existentes ou emissão de NF-e.
