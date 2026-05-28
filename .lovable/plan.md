## Objetivo

Permitir que a consulta MD-e funcione tanto para inscrições com **CNPJ** (pessoa jurídica) quanto com **CPF** (pessoa física), usando o documento correto para cada caso.

## Contexto

Hoje a edge function `focus-nfe-mde` envia sempre o parâmetro `cnpj=` para a Focus NFe, mesmo quando a inscrição selecionada é de pessoa física. A Focus NFe expõe parâmetros distintos no endpoint `/v2/nfes_recebidas`:
- `cnpj=<14 dígitos>` para pessoa jurídica
- `cpf=<11 dígitos>` para pessoa física

## Mudanças

### 1. Edge function — `supabase/functions/focus-nfe-mde/index.ts`
- Em `getInscricaoContext`, retornar também o **tipo do documento** detectado pelo tamanho dos dígitos:
  - 11 dígitos → `cpf`
  - 14 dígitos → `cnpj`
  - Outro tamanho → erro "CPF/CNPJ inválido na inscrição".
- Na ação `consultar`, montar a URL com o parâmetro correto:
  - PJ: `/v2/nfes_recebidas?cnpj=<doc>&versao=<v>`
  - PF: `/v2/nfes_recebidas?cpf=<doc>&versao=<v>`
- Demais ações (`manifestar`, `download_xml`, `download_danfe`) usam a chave da NF-e e não mudam.

### 2. UI — `src/components/entradas-nfe/MdeDialog.tsx`
- Manter o seletor de Inscrição (com CPF ou CNPJ formatado no rótulo, já implementado).
- Ajustar o filtro `inscricoesEmissoras` para aceitar documentos com 11 (CPF) **ou** 14 dígitos (CNPJ) — atualmente já aceita ≥ 11, mas vamos travar exatamente em 11 ou 14 para evitar lixo.

## Observação importante (limitação real da Focus NFe/SEFAZ)
O serviço de Manifesto do Destinatário da SEFAZ é projetado primariamente para destinatários **pessoa jurídica**. Para CPF, o retorno depende da disponibilização pelo emitente/SEFAZ e pode vir vazio mesmo com a consulta correta. A mudança garante que a chamada é feita com o parâmetro certo; resultados em PF podem ser limitados pela própria SEFAZ.

## Fora de escopo
- Sem alterações no banco de dados.
- Sem alterações em outros módulos (emissão de NF-e de venda, etc.).
