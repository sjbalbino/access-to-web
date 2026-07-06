## Ajustes solicitados

### 1. Cancelamento de NFe originada de Remessa
No edge function `supabase/functions/focus-nfe-cancelar/index.ts`, após cancelar a nota, além dos updates já existentes (notas_deposito_emitidas, devolucoes_deposito, compras_cereais), adicionar:

- `UPDATE remessas_venda SET status = 'cancelada', nota_fiscal_id = NULL WHERE nota_fiscal_id = :notaFiscalId`

Isso libera o saldo do contrato (o hook `useTotaisContrato` já ignora status `cancelada`) e desvincula a NFe cancelada da remessa.

### 2. CFOP para contratos de Exportação
Em `src/components/remessas/EmitirNfeAutomaticoDialog.tsx` (linhas 116-127), incluir verificação de `contrato.exportacao`:

- Se `contrato.exportacao === true`:
  - `cfopCodigo = ufDestino === ufEmitente ? "5501" : "6501"`
  - `naturezaOperacao = "REMESSA DE PRODUÇÃO DO ESTABELECIMENTO, COM FIM ESPECÍFICO DE EXPORTAÇÃO"` (padrão SEFAZ para 5501/6501)
- Prioridade: Exportação > Remessa para Depósito > Venda normal.

Também garantir que os CFOPs 5501 e 6501 existam ativos na tabela `cfops` (verificar via query; se ausentes, criar migration de seed).

### Arquivos alterados
- `supabase/functions/focus-nfe-cancelar/index.ts`
- `src/components/remessas/EmitirNfeAutomaticoDialog.tsx`
- (Possível migration de seed de CFOPs 5501/6501 se não existirem)