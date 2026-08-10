# Corrigir o local "SEDE" do produtor LAIR BEHNEN

## O que a verificação no banco mostrou

- Não existe nenhum local de entrega chamado "SEDE" no tenant AGROPECUÁRIA GRINGS. Os locais são: **Márcio Grings** (marcado como sede, ativo), GRANDESPE (inativo), Sommar (inativo), TosAgro (ativo).
- Nenhum lançamento do LAIR BEHNEN está com local nulo ou vazio. As duas inscrições dele (472.101.304-2 e 472.101.308-5) têm:
  - 132 colheitas em Márcio Grings + 1 colheita em GRANDESPE
  - 3 notas de depósito em Márcio Grings
  - 46 devoluções em Márcio Grings + 1 em GRANDESPE
  - 36 transferências dentro de Márcio Grings + 1 par de transferências entre GRANDESPE e Márcio Grings
- Conclusão: o rótulo "SEDE" que aparece na tela **não vem do banco** — é um texto fixo usado como fallback no código dos relatórios/extratos (`"Sede"`), aplicado quando o nome do local do movimento não é resolvido no join. Esse bucket "Sede" mistura movimentos cujo local não foi carregado, e por isso pode ficar negativo (só saídas caem nele, sem as entradas correspondentes).

## O que será feito

### 1. Eliminar o local fantasma "Sede" (causa do saldo negativo)
- Substituir todos os fallbacks fixos `"Sede"` pelo nome real da sede do tenant (Márcio Grings), obtido pelo hook já existente `useLocalSede`.
- Nos relatórios/extratos, quando um movimento não tiver local resolvido, ele passa a somar no bucket da sede real em vez de criar um grupo separado "Sede". Assim entradas e saídas caem no mesmo grupo e o saldo deixa de ficar negativo.
- Garantir que os joins de local sejam feitos em todos os tipos de movimento usados nos extratos (colheitas, notas de depósito, transferências saída/entrada, devoluções, compras, vendas), inclusive para locais **inativos** — hoje um local inativo pode não ser resolvido e cair no fallback.

### 2. Consolidar os lançamentos do LAIR BEHNEN que estão no local inativo GRANDESPE
Migração de dados restrita às duas inscrições do LAIR BEHNEN, movendo o local GRANDESPE para Márcio Grings:
- 1 colheita, 1 devolução e o par de transferências (saída e entrada).
- Os lançamentos de outros produtores em GRANDESPE **não** serão alterados (histórico de local de terceiro preservado).

### 3. Validação
- Recalcular e conferir, por inscrição e por local, o saldo do LAIR BEHNEN: deve aparecer apenas em **Márcio Grings**, sem grupo "SEDE" e sem valor negativo.
- Conferir na tela de Notas de Depósito e no Extrato do Produtor/Saldo Disponível.

## Detalhes técnicos

- Arquivos de exibição: `src/lib/relatoriosPdf.ts` (`localOf(...) || "Sede"`), `src/components/relatorios/RelatorioDialog.tsx` (`tenantSedeNome` já existe; remover os `|| "Sede"` literais restantes), `src/lib/relatoriosEstoque.ts`.
- Hook de saldo: `src/hooks/useSaldosDeposito.ts` — resolver `localNome` faltante também para locais inativos, mantendo a lógica de buckets `(inscrição, local)` intacta.
- Migração de dados via UPDATE nas tabelas `colheitas.local_entrega_terceiro_id`, `devolucoes_deposito.local_entrega_id`, `transferencias_deposito.local_saida_id` / `local_entrada_id`, filtrando pelas inscrições do LAIR BEHNEN e pelo id do local GRANDESPE.
- Nenhuma mudança de schema; nenhum impacto em documentos fiscais já autorizados.
