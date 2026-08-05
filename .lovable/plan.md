# Mostrar o detalhamento dos erros de validação de Schema (SEFAZ / Focus NFe)

## Problema confirmado

Quando a Focus NFe recusa a NF-e por schema inválido, ela devolve **duas coisas**: a mensagem genérica ("Erro na validação do Schema XML, verifique o detalhamento dos erros") e uma **lista detalhada de erros** (campo + descrição) no corpo da resposta.

Hoje o sistema guarda apenas a mensagem genérica: a `focus-nfe-emitir` grava somente `mensagem_sefaz` em `motivo_status`, e a lista detalhada é convertida com `erros.join("; ")` — que, por serem objetos, resultaria em `[object Object]` e nunca chega a ser usada porque `mensagem_sefaz` tem prioridade. A tabela `notas_fiscais` não possui nenhuma coluna para armazenar o retorno completo (só `motivo_status` texto). Por isso o detalhamento se perde e o usuário fica sem saber qual campo corrigir.

## O que será construído

1. **Persistir o retorno completo da API**
   - Nova coluna `erros_api` (JSONB) em `notas_fiscais`, guardando a lista de erros detalhados e o código do retorno.
   - `focus-nfe-emitir` e `focus-nfe-consultar` passam a normalizar os erros (`campo`, `mensagem`) e gravar em `erros_api`, além de compor um `motivo_status` mais útil (mensagem genérica + primeiros erros).

2. **Painel "Detalhamento dos erros" na tela da NF-e**
   - No alerta "Retorno SEFAZ" (tela da nota) passa a existir uma seção expansível listando cada erro em linhas legíveis: **Campo** → **Descrição** → **Onde corrigir no sistema**.
   - Botão "Copiar detalhes" para o usuário enviar ao suporte/contador.

3. **Tradutor de campos técnicos**
   - Ampliar `src/lib/sefazRejeicoes.ts` com um mapa de campos de schema (ex.: `xBairro`, `IE`, `UFPlaca`, `cMun`, `CST`, `cClassTrib`, `NCM`, `CFOP`, `vProd`) para a orientação de onde corrigir na interface (aba/tela e campo), reaproveitando as regras já existentes.

4. **Mesma exibição nos fluxos de emissão**
   - Ação "Consultar rejeição" na lista de Notas Fiscais e os diálogos de progresso de emissão (Remessa, Compra, Devolução, Nota de Depósito) passam a exibir a mesma lista detalhada em vez de apenas o texto genérico.
   - Em mobile, o detalhamento aparece dentro do mesmo diálogo (sem rolagem horizontal).

## Detalhes técnicos

- Migração: `alter table public.notas_fiscais add column erros_api jsonb;` (sem alteração de RLS/grants — tabela já configurada).
- Normalizador compartilhado nas Edge Functions: aceita `erros` como array de strings ou de objetos (`{campo, mensagem}` / `{codigo, mensagem}`) e também `mensagem` isolada.
- Novo componente `src/components/notas-fiscais/DetalhesErrosSefaz.tsx` (lista + copiar), consumido pela tela da nota, pela lista e pelos diálogos de emissão.
- `src/hooks/useFocusNfe.ts`: repassar `details.erros` no resultado para os diálogos usarem, mantendo os toasts atuais.
- Nenhuma regra fiscal de cálculo é alterada.

## Observação sobre a NF-e nº 12

O detalhamento original dessa emissão não foi salvo (não havia onde guardar), então ele não pode ser recuperado retroativamente pela tela. Após a alteração, uma nova tentativa de emissão (ou a ação "Consultar") já exibirá a lista completa de erros.
