# Corrigir importação de produtores com IE genérica (111.111.111-1)

## O que foi confirmado no banco

- Existem **60 inscrições** diferentes com a mesma IE `111.111.111-1` (produtores sem IE real, cada um com seu próprio cadastro e nome).
- As **colheitas** ficaram corretas, porque a importação de colheitas desempata pelo nome do produtor (coluna auxiliar `inscricao_nome`).
- **Transferências (64 registros)** e **Devoluções (45 registros)** caíram todas em uma única inscrição — `cleomar teckio` — porque nessas importações a busca da inscrição usa apenas a IE/código, sem desempate por nome.
- Os registros importados não guardam o nome original do produtor (observações vazias), então o vínculo correto só pode ser reconstruído a partir das planilhas de origem ou manualmente.

Causa raiz: o cache de busca da importação indexa `IE -> id`; com IEs repetidas, todas as linhas apontam para o mesmo id (o último indexado).

## Correção em duas frentes

### 1. Corrigir o importador (evitar que volte a acontecer)

- Adicionar desempate por nome em Transferências e Devoluções, igual ao que já existe em Colheitas: aceitar colunas de nome do produtor (ex. `inscricao_origem_nome`, `inscricao_destino_nome`, `inscricao_nome`) e casar pela chave composta `IE + nome`.
- Quando a IE da planilha for ambígua (mais de uma inscrição com a mesma IE) e não houver nome para desempatar, **não escolher nenhuma**: gerar erro de validação na linha ("IE 111.111.111-1 ambígua — informe o nome do produtor"), em vez de vincular ao produtor errado silenciosamente.
- Mesma proteção aplicada às demais importações que buscam inscrição (compras, notas de depósito) para não repetir o problema.

### 2. Reparar os dados já importados

- Nova tela/diálogo **"Reatribuir Inscrição"** em Transferências e Devoluções: lista os registros vinculados a uma inscrição escolhida (ex. cleomar teckio), mostrando data, quantidade, produto, local, e permite selecionar em lote o produtor/inscrição correto para cada registro.
- Alternativa mais rápida e segura, se as planilhas originais de Transferências e Devoluções estiverem disponíveis com o nome do produtor: apagar os 64 + 45 registros importados dessas duas tabelas e reimportar já com o importador corrigido, restaurando o vínculo correto em massa.

## Detalhes técnicos

- `src/lib/importacaoConfig.ts`: acrescentar `compositeSourceColumn` nas referências de inscrição de `transferencias` e `devolucoes`; no resolvedor de referências, marcar chaves de IE duplicadas como ambíguas (mapa `IE -> [ids]`) e só resolver por chave composta.
- `src/components/importacao/ImportacaoDialog.tsx`: exibir os novos erros de ambiguidade na etapa de validação, com número de linha.
- Novo componente de reatribuição reutilizável (`src/components/importacao/ReatribuirInscricaoDialog.tsx`) usado nas páginas Transferências e Devolução de Depósito, atualizando `inscricao_origem_id` / `inscricao_destino_id` / `inscricao_produtor_id`.
- Nenhuma alteração de esquema é necessária.

## Antes de implementar

Preciso saber se você tem as planilhas originais de Transferências e Devoluções com o nome do produtor em cada linha (caminho de reimportação em massa) ou se a correção deve ser feita pela tela de reatribuição manual.
