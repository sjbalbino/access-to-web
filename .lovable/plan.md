## Objetivo
Fazer a importação de Contratos de Venda aceitar as 4 linhas restantes ou, se houver valor realmente inválido, mostrar exatamente qual campo e valor causou o `numeric field overflow`.

## O que vou ajustar
1. Mapear o erro do insert para o campo correto.
   - Hoje a tela mostra apenas `Linha X: numeric field overflow`.
   - Vou interceptar o erro por linha e enriquecer a mensagem com os principais campos numéricos enviados naquela linha, priorizando `preco_kg`, `quantidade_kg`, `quantidade_sacos`, `valor_total`, `percentual_comissao` e `valor_comissao`.

2. Proteger a transformação do campo `preco_kg` na importação de contratos.
   - O banco aceita `preco_kg` como `numeric(15,10)`, o que limita a 5 dígitos antes da vírgula.
   - Vou validar esse campo antes do insert para detectar valores fora do limite e rejeitar somente as linhas inválidas com mensagem clara, em vez de deixar o banco retornar erro genérico.

3. Revisar a conversão numérica da planilha para evitar interpretação errada de separadores.
   - Vou conferir se valores como `1.234,56`, `1,234.56` ou células formatadas pelo Excel não estão sendo convertidos para um número muito maior do que o esperado.
   - Se necessário, ajustarei a normalização apenas para essa importação, sem ampliar escopo para outras rotinas.

4. Melhorar o feedback final da importação.
   - Em vez de apenas listar `numeric field overflow`, a tela passará a exibir algo no formato: `Linha 10: preco_kg=123456,789 excede o limite aceito para o campo`.
   - Assim fica claro se o problema é valor exagerado, separador decimal ou dado incorreto na planilha.

## Arquivos envolvidos
- `src/components/importacao/ImportacaoDialog.tsx`
- `src/lib/importacaoConfig.ts`

## Resultado esperado
- As linhas válidas continuam importando normalmente.
- As 4 linhas com problema passam a apontar o campo exato que estourou.
- Se o problema for só interpretação do número, essas linhas também passam a importar.

## Detalhes técnicos
- Validar `preco_kg` com regra compatível com `numeric(15,10)`.
- Enriquecer o erro retornado no fallback de insert por linha.
- Manter o comportamento atual de pular apenas linhas inválidas, sem bloquear a planilha inteira.