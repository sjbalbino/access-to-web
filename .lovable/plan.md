
Objetivo: eliminar os avisos falsos na importação de Produtos usando exatamente a planilha do Access que você anexou.

Diagnóstico confirmado com a planilha enviada
1. `unidade_medida = "KG"` não encontra porque hoje a referência está buscando em `unidades_medida.codigo` (1,2,3...), mas a planilha envia sigla (`KG`, `SC`, `TON`, `UN`).
2. `produto_residuo` gera aviso `produtos.codigo = "20" não encontrado` porque a busca acontece antes da inserção (tabela `produtos` ainda está vazia no momento da resolução).
3. `Custo Médio` do Access não casa 100% com `cust_medio` em todos os cenários de normalização de cabeçalho.
4. Parser numérico atual pode interpretar valores do Access incorretamente (`9,300.00`, `-41,824,432.50`, `R$0.00`), o que afeta qualidade dos dados.

Plano de implementação
1. Ajustar mapeamento de referência de unidade em `src/lib/importacaoConfig.ts`
- Na config `produtos`, trocar lookup principal de unidade para `unidades_medida.sigla`.
- Adicionar fallback de lookup (sigla/codigo/descricao) para cobrir variações de planilha sem quebrar importações antigas.

2. Fortalecer normalização de colunas em `src/lib/importacaoConfig.ts`
- Evoluir `normalizeColName` para tratar acento + caixa + espaços + `_` + pontuação como equivalentes.
- Garantir que `Custo Médio`, `cust_medio` e `CUSTO_MEDIO` sejam reconhecidos como o mesmo campo.
- Manter `nome` como obrigatório, mas sem falsos negativos por variação de cabeçalho.

3. Corrigir parsing numérico em `src/lib/importacaoConfig.ts`
- Reescrever `toNumber` para suportar:
  - moeda (`R$0.00`)
  - milhares em formato US e BR
  - negativos grandes
- Evitar importação de valores truncados/incorretos.

4. Tratar `produto_residuo` em 2 etapas em `src/components/importacao/ImportacaoDialog.tsx`
- Etapa pré-insert: resolver somente referências externas (granja, unidade, fornecedor, grupo).
- Etapa pós-insert: montar mapa `codigo -> id` dos produtos e atualizar `produto_residuo_id` por `produto_residuo`.
- Com isso, o vínculo entre produtos da própria planilha funciona sem bloquear linhas.

5. Ajustar regras de aviso para não descartar linha válida
- Referência interna de `produto_residuo` não deve excluir o registro da importação principal.
- Exibir aviso apenas quando, após a etapa pós-insert, o código de resíduo realmente não existir.

Validação (com a planilha anexada)
1. Reprocessar `Consulta_Exporta_Produtos.xlsx`.
2. Confirmar que somem avisos de `unidades_medida ... "KG" não encontrado`.
3. Confirmar que não há aviso indevido de campo `nome` ausente.
4. Confirmar leitura de `Custo Médio` e `preco_custo` sem perda.
5. Confirmar que `produto_residuo` é preenchido para códigos existentes na própria importação.

Arquivos impactados
- `src/lib/importacaoConfig.ts`
- `src/components/importacao/ImportacaoDialog.tsx`

Sem necessidade de migração de banco para esta correção.
