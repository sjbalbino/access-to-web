# Plano para corrigir a importação de colheitas

## Objetivo
Permitir a importação da planilha de colheitas sem rejeitar 100% das linhas quando a empresa contratante já foi selecionada na tela.

## O que vou ajustar
1. **Remover a exigência indevida de `granja_id` para `colheitas`**
   - Hoje a tela trata `colheitas` como tabela que precisa obrigatoriamente de `granja_id`.
   - A tabela `colheitas` não possui essa coluna, então todas as linhas são rejeitadas com a mensagem de `granja_id ausente`.
   - Vou retirar `colheitas` da regra `REQUIRES_GRANJA` em `ImportacaoDialog.tsx`.

2. **Manter o isolamento por empresa sem bloquear a importação**
   - O isolamento continuará sendo feito pelo `tenant_id` já aplicado nas tabelas multi-tenant.
   - Não vou alterar a lógica de segurança existente além desse bloqueio incorreto.

3. **Validar que o vínculo com Controle de Lavoura continua funcionando**
   - A importação de `colheitas` já resolve `controle_lavoura_id` a partir do código vindo na planilha.
   - Vou preservar essa lógica e conferir que ela continua sendo o filtro correto para relacionamento com safra/lavoura.

## Resultado esperado
- A importação deixa de falhar com `Nenhuma linha válida para importar. 934 rejeitada(s)`.
- As linhas passam a ser inseridas normalmente, desde que os demais relacionamentos da planilha estejam válidos.
- Se houver erros reais de referência, eles aparecerão individualmente em vez de bloquear tudo por `granja_id`.

## Detalhes técnicos
- Arquivo principal: `src/components/importacao/ImportacaoDialog.tsx`
- Ajuste pontual:
  - de: `const REQUIRES_GRANJA = new Set(['contratos_venda','colheitas']);`
  - para: `const REQUIRES_GRANJA = new Set(['contratos_venda']);`
- Não será necessária mudança no banco nem em autenticação.
- A configuração opcional de `col_localentrega` em `importacaoConfig.ts` permanece como está.
