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

### 2. Reparar os dados já importados pela tela de reatribuição manual

Nenhum registro será apagado nem reimportado (já existem lançamentos novos no sistema). A correção é feita registro a registro por uma nova tela:

- Novo diálogo **"Reatribuir Inscrição"**, aberto a partir das páginas de Transferências e de Devolução de Depósito.
- Passo 1: escolher a inscrição de origem do problema (ex. CLEOMAR TECKIO — IE 111.111.111-1). A tela mostra quantos registros estão vinculados a ela.
- Passo 2: lista dos registros (código, data, produto, quantidade em KG, safra, local de saída/entrada, e se é origem ou destino), com paginação de 20 itens e ordenação por data.
- Passo 3: para cada linha, um combobox pesquisável (nome / IE / CPF) para indicar a inscrição correta. Também há ação "aplicar a inscrição selecionada às linhas marcadas" para corrigir em lote os casos do mesmo produtor.
- Botão **Salvar reatribuições** grava só as linhas alteradas, dentro de confirmação de segurança, e invalida os caches de saldo (`saldos_deposito`, `saldo_produtor`, `saldo_disponivel_produtor`, `inscricoes_com_saldo`, `saldo_socio`) para os extratos refletirem na hora.
- Registros com NF-e autorizada permanecem bloqueados (política de imutabilidade fiscal) e aparecem marcados como não editáveis.

## Detalhes técnicos

- `src/lib/importacaoConfig.ts`: acrescentar coluna de desempate por nome nas referências de inscrição de `transferencias` e `devolucoes`; no resolvedor de referências, marcar IEs duplicadas como ambíguas (mapa `IE -> [ids]`) e só resolver por chave composta `IE + nome`.
- `src/components/importacao/ImportacaoDialog.tsx`: exibir os erros de ambiguidade na etapa de validação, com número de linha.
- Novo componente `src/components/importacao/ReatribuirInscricaoDialog.tsx` (reutilizável), usado em `src/pages/Transferencias.tsx` e `src/pages/DevolucaoDeposito.tsx`, atualizando `inscricao_origem_id` / `inscricao_destino_id` (transferências) e `inscricao_produtor_id` (devoluções).
- Inscrições listadas via `useInscricoesCompletas`; updates em lote pelo cliente Supabase, com relatório final de sucesso/erros por linha.
- Nenhuma alteração de esquema é necessária.
