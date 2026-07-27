## Objetivo

Na emissão da Nota de Depósito (CFOP 1905), no bloco "Dados da Contra-Nota":

1. Permitir informar quantidade **maior** que o saldo depositado (hoje é bloqueado).
2. Permitir incluir **mais de uma variedade** na mesma nota (hoje só uma).

## 1) Quantidade acima do saldo

Situação atual (`src/components/deposito/NotaDepositoFormDialog.tsx`):
- O `handleGerarNfe` interrompe a emissão com toast "Quantidade inválida" quando `qtdKg > saldo_a_emitir_kg`.
- O campo `Input` tem `max={saldoProduto?.saldo_a_emitir_kg}`, limitando também pela UI.
- O `Select` de variedade só lista produtos com `saldo_a_emitir_kg > 0`.

Mudanças:
- Remover o bloqueio de emissão; manter apenas **aviso visual** (texto em âmbar: "Quantidade acima do saldo disponível (X kg)") ao lado do campo.
- Remover o atributo `max` do input.
- Listar no select **todas** as variedades com saldo do produtor, inclusive as com saldo zero (indicando o saldo entre parênteses), para não impedir emissões legítimas.
- Antes de transmitir, se algum item exceder o saldo, exibir um diálogo de confirmação ("Existem itens acima do saldo. Deseja emitir mesmo assim?") — evita emissão acidental sem impedir a operação.

## 2) Múltiplas variedades por nota

Situação atual: estado único `produtoId` + `quantidadeKg`; grava 1 registro em `notas_fiscais_itens`, 1 item no payload de transmissão e 1 registro em `notas_deposito_emitidas`.

Mudanças no mesmo arquivo:
- Substituir o estado único por uma lista de itens: `{ produto_id, quantidade_kg }[]`.
- UI: linha de inclusão (Variedade + Quantidade + botão "Adicionar") acima de uma tabela dos itens adicionados, com coluna Variedade, Saldo, Quantidade (editável), Valor (R$ 1,00/kg) e botão de remover. Rodapé com total de kg e valor total da nota.
- Impedir a mesma variedade duplicada na lista (soma na existente ou bloqueia com aviso).
- Persistência:
  - `notas_fiscais`: `total_produtos` / `total_nota` = soma das quantidades.
  - `notas_fiscais_itens`: um registro por item, com `numero_item` sequencial (1..n) e a mesma resolução de CST/cClassTrib/alíquotas IBS-CBS já existente, aplicada por produto.
  - `notas_deposito_emitidas`: um registro por item, todos referenciando o mesmo `nota_fiscal_id` (inseridos somente após autorização, como hoje).
  - Payload de emissão (`itensParaEmissao`): array com todos os itens.
- Modo edição/visualização (`editNotaId`): carregar todos os registros de `notas_deposito_emitidas` da mesma `nota_fiscal_id` para preencher a tabela de itens.

## Detalhes técnicos

- Arquivo principal: `src/components/deposito/NotaDepositoFormDialog.tsx` (único arquivo alterado; sem migração de banco — o esquema atual já suporta N itens por nota fiscal e N registros de depósito por `nota_fiscal_id`).
- A resolução de CST/alíquotas IBS/CBS (produto → emitente → CFOP → padrão) é extraída para uma função auxiliar `resolverTributos(produto)` chamada por item.
- As informações complementares (safra, "PRODUTO JÁ TESTADO POR...", notas referenciadas) permanecem no nível da nota.
- Relatórios e listagens que consultam `notas_deposito_emitidas` continuam funcionando, pois passam a ver várias linhas por nota — o cálculo de saldo por produto já é por `produto_id`.
