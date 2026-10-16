# NF-e 57 série 935 (Minas do Leão Armazém) — rejeição 539 Duplicidade

## O que aconteceu
- Às 11:10 de hoje a NF-e 57 série 935 (destinatário Márcio Grings – Pedro Osório) foi **autorizada** pela ACBr API.
- Mesmo assim, o contador do emitente continuou em **56**. O envio pela ACBr não avança o "último número usado" quando a nota é autorizada (a Focus faz isso; a ACBr não foi feita igual).
- Às 16:58 a nota nova para **Razera Agrícola** recebeu de novo o número 57, e a SEFAZ recusou: "Duplicidade de NF-e, com diferença na Chave de Acesso".
- Outro emitente da ACBr está com o mesmo atraso (série 930: contador 2, última autorizada 3) — a próxima nota dele também seria recusada.
- Além disso, quando a ACBr devolve a duplicidade, a nota fica presa no número 57 em vez de liberar o número, porque o sistema procura o código 539 no lugar errado da resposta da ACBr.

## Correção
1. Após autorização pela ACBr, gravar no emitente o número usado (se for maior que o atual), igual ao que já acontece com a Focus — tanto no envio quanto na consulta posterior da nota.
2. Reconhecer a duplicidade (código 539) dentro da resposta da ACBr, liberando o número da nota e avançando o contador, para que o próximo "Emitir" use o número seguinte automaticamente.
3. Ajuste dos dados:
   - Minas do Leão série 935: contador para 57.
   - Emitente da série 930 com atraso: contador para 3.
   - Nota da Razera Agrícola: voltar para rascunho, sem número, para ser emitida de novo e receber o 58.

Nada é alterado na NF-e 57 autorizada (Márcio Grings).

## Detalhes técnicos
- `supabase/functions/acbr-api-emitir/index.ts`: no caminho de sucesso com status `autorizado`, `update emitentes_nfe set numero_atual_nfe = greatest(atual, numero)`; detecção de duplicidade passa a ler `responseData.autorizacao.codigo_status === 539` / `motivo_status` com "Duplicidade", inclusive quando HTTP 200 com `status: "rejeitado"|"erro"`.
- `supabase/functions/acbr-api-consultar/index.ts`: mesmo avanço do contador ao confirmar autorização.
- Correção de dados por migração (UPDATE pontual em `emitentes_nfe` e na nota `185100c0-...`).
- Redeploy das duas funções.
