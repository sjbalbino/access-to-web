## Achados
- Os 4 erros encontrados são reais e vêm do campo **`preco_kg`** na importação de **Contratos de Venda**.
- No banco, **`contratos_venda.preco_kg`** está definido como **numeric(15,10)**.
- Esse formato aceita **no máximo 5 dígitos antes da vírgula**.
- As 4 linhas rejeitadas têm valores acima desse limite:
  - Linha 10: `130000`
  - Linha 11: `145951.39`
  - Linha 14: `144310`
  - Linha 34: `498651.01`

## Plano
1. **Corrigir a identificação das linhas**
   - Garantir que o número exibido no erro corresponda exatamente à linha original da planilha, mesmo quando houver outras linhas ignoradas antes.

2. **Melhorar a validação antes do insert**
   - Manter a checagem de limite do `preco_kg` antes de enviar ao banco.
   - Exibir mensagem mais direta informando o limite aceito e o valor recebido.

3. **Avaliar a regra de negócio do campo `preco_kg`**
   - Se esses valores estão errados na planilha, manter a rejeição e orientar a correção dos dados.
   - Se esses valores são válidos para o seu processo, ajustar a estrutura do banco para aceitar números maiores.

4. **Aplicar a correção escolhida**
   - **Opção A:** manter o banco como está e apenas melhorar a validação/mensagem.
   - **Opção B:** ampliar a precisão do campo `preco_kg` no banco para permitir esses valores e parar de rejeitar essas 4 linhas.

## Detalhes técnicos
- Situação atual do banco:
  - `preco_kg`: `numeric(15,10)`
  - `quantidade_kg`, `quantidade_sacos`, `valor_total`, `percentual_comissao`, `valor_comissao`: `numeric` sem limite fixo de precisão exposto nessa consulta
- Conclusão: o bloqueio atual não está no importador em si, mas no **limite estrutural do campo `preco_kg`**.

## Recomendação
- Se o valor correto de `preco_kg` deveria ser algo como **130,000** ou **145,95139**, o problema está no conteúdo da planilha.
- Se o valor correto realmente é **130000** ou **498651,01**, então o certo é **ampliar o campo no banco**.

Se você aprovar, no próximo passo eu implemento a correção na direção que fizer sentido para o seu caso.