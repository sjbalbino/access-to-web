# Transferências de hoje: o que o banco mostra e como resolver

## O que foi verificado (fatos)

- Nenhuma transferência de depósito foi gravada hoje (05/08/2026). Consulta direta no banco: 0 registros criados nos últimos 3 dias.
- Registro mais recente de transferência: criado em **31/07/2026 11:10** (data_transferencia 31/07/2026). Total histórico: 1.095.
- A empresa AGROPECUÁRIA GRINGS teve atividade normal hoje: 13 NF-e gravadas entre 14:11 e 16:24 (horário de Brasília), além de 1 nota de depósito, 1 devolução, 1 compra e 1 remessa.
- Os três usuários da GRINGS têm permissão de escrita (2 operadores + 1 admin), então não é falta de permissão de papel.

Conclusão: **não é a lista que está escondendo registros — os lançamentos não chegaram ao banco.** Nada foi gravado e depois filtrado.

## Diagnóstico provável (ainda não confirmado)

A lista e a gravação de transferências dependem das granjas de origem/destino, que hoje são deduzidas da inscrição escolhida:

- Se a inscrição selecionada não tiver granja vinculada (ou for de outra empresa), a gravação é recusada pela política de segurança e o registro não existe.
- O combo de origem/destino lista todas as inscrições disponíveis, sem garantir que pertençam à empresa do usuário.
- Além disso, um registro gravado com as duas granjas em branco ficaria invisível na lista mesmo se salvasse.

Também existe um problema real, porém apenas cosmético: o contador de código das transferências está em 9, enquanto o maior código já usado é 1266 — novas transferências nascerão com códigos repetidos (#10, #11...).

## Plano

1. **Capturar o erro real**: registrar no console e exibir mensagem clara e específica quando a gravação da transferência falhar (código do erro + motivo), em vez de apenas a mensagem genérica. Assim o próximo lançamento do usuário revela a causa exata.
2. **Validar antes de salvar**: bloquear o envio quando a inscrição de origem ou destino não tiver granja vinculada, com aviso explicando que o cadastro da inscrição precisa de granja.
3. **Restringir as listas**: no diálogo de transferência, listar apenas inscrições das granjas da empresa do usuário, evitando escolha que a política de segurança recusa.
4. **Confirmação visível de sucesso**: após salvar, além do toast, aplicar os filtros para a data do lançamento (ou limpar filtros) de forma que a transferência recém-criada apareça imediatamente na lista.
5. **Corrigir o contador de código** das transferências para continuar de 1266, evitando códigos duplicados.
6. **Reconferir com o usuário da GRINGS**: pedir que refaça um lançamento; com o item 1 no ar, a mensagem exata do erro fica visível e a correção definitiva é aplicada.

## Detalhes técnicos

- `src/components/transferencias/TransferenciaDialog.tsx`: derivação de `granja_origem_id`/`granja_destino_id` a partir de `inscricao.granja_id`; adicionar validação e filtro por tenant nas listas de inscrição.
- `src/hooks/useTransferenciasDeposito.ts`: enriquecer `onError` com `code`/`details`/`hint` do erro e log no console.
- Políticas de `transferencias_deposito` exigem `granja_belongs_to_tenant(granja_origem_id) OR granja_belongs_to_tenant(granja_destino_id)` tanto no INSERT quanto no SELECT — os itens 2 e 3 alinham a UI a essa regra.
- Migração simples de `setval` na sequência `transferencias_deposito_codigo_seq`.
