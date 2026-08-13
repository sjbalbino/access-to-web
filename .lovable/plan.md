# Retirar Remessas de Venda do Controle Paralelo

As remessas passam a ser tratadas como consequência do contrato: marcar um contrato de venda já exclui automaticamente as remessas ligadas a ele.

## O que muda

1. A aba "Remessas de Venda" deixa de existir na tela de marcações do conjunto. Ficam 5 abas: Transferências, Compras de Cereais, Contratos de Venda, Notas de Depósito e Devoluções.
2. Nos relatórios do módulo, o bloco de Remessas deixa de ser um tipo marcável próprio: a listagem de remessas continua disponível, mas o filtro passa a excluir toda remessa cujo contrato esteja marcado no conjunto.
3. Marcações de remessa já gravadas em conjuntos existentes são removidas (não afetam nenhum lançamento do sistema).

## Detalhes técnicos

- `src/hooks/useControleParalelo.ts`: remover `remessa_venda` de `DocumentoTipo` e de `TIPOS_DOCUMENTO` (deixa de ser marcável). Manter `buscarRemessas` como fonte de leitura, expondo `contrato_id` em cada documento normalizado, e aplicar exclusão por `contrato_id ∈ contratos marcados` em vez de por id da remessa.
- `src/components/controle-paralelo/RelatorioControleDialog.tsx`: retirar Remessas da lista de tipos marcáveis e tratá-la como bloco derivado dos contratos (aparece no consolidado e como relatório próprio, filtrado pelos contratos marcados).
- `src/lib/relatoriosControleParalelo.ts`: sem mudança estrutural — recebe os blocos já filtrados; apenas o rótulo do bloco de remessas indica "derivado dos contratos marcados".
- Migração de limpeza: `DELETE FROM controle_marcacoes WHERE documento_tipo = 'remessa_venda'` e ajuste do CHECK de `documento_tipo` para os 5 tipos restantes.
