## Problema

A nota **160720003** tem **6 registros** em `entradas_nfe` para a mesma `chave_acesso` (4 criados hoje). Cada clique em **"Dar entrada"** no diálogo MDe importa o XML novamente e cria uma nova linha em `entradas_nfe`, sem verificar duplicidade.

### Causa raiz

`handleImportar` em `src/components/entradas-nfe/MdeDialog.tsx` (linha 202):
- Baixa o XML, cria fornecedor, monta o header e chama `createEntradaMutation.mutateAsync(...)` — sem consultar se já existe `entradas_nfe` com a mesma `chave_acesso`.
- `useCreateEntradaNfe` em `src/hooks/useEntradasNfe.ts` (linha 269) também insere direto, sem checar `chave_acesso`.
- Consequência: cada clique gera nova entrada pendente + duplica **contas a pagar** (via `gerarContasPagarAutomatico`).

O status "pendente" persistente que vimos antes agravou: como a listagem passou a derivar "finalizado" via contra-nota, o usuário reclicou "Dar entrada" achando que não tinha entrado, criando mais duplicatas.

## Plano de correção

### 1. Guarda anti-duplicidade em `handleImportar` (MdeDialog)
Antes de baixar XML / criar fornecedor / inserir:
- `SELECT id, status FROM entradas_nfe WHERE chave_acesso = nfe.chave LIMIT 1`.
- Se existir:
  - Toast informativo: "Esta NF-e já foi importada (status: X)".
  - Não recriar. Opcionalmente abrir o registro existente para edição.
- Só prosseguir com a importação se não houver registro.

### 2. Guarda defensiva em `useCreateEntradaNfe`
Segunda camada em `src/hooks/useEntradasNfe.ts`:
- Se `header.chave_acesso` estiver presente, `SELECT id FROM entradas_nfe WHERE chave_acesso = ? LIMIT 1` antes do `insert`.
- Se existir, `throw new Error("NF-e já cadastrada (chave duplicada).")` — evita duplicatas por qualquer origem (MdE, XML manual, importação).

### 3. Limpeza no banco da nota 160720003
- Manter o registro **mais antigo finalizado** (`72c84bfe...` de 2026-07-20 — foi o que gerou o estoque e contas a pagar originais).
- Deletar as 4 duplicatas criadas hoje (3 pendentes de 2026-07-23 + 1 finalizada de 2026-07-22), junto com seus `entradas_nfe_itens` e `contas_pagar` sem baixa vinculadas via `entrada_nfe_id`.
- Manter contas a pagar com baixa (se houver) e apenas desvincular `entrada_nfe_id`.

### 4. Varredura das demais chaves duplicadas
Rodar diagnóstico `SELECT chave_acesso, COUNT(*) FROM entradas_nfe GROUP BY chave_acesso HAVING COUNT(*) > 1` e aplicar a mesma limpeza (manter o mais antigo com baixa/finalizado, remover pendentes duplicadas sem baixas).

## Arquivos afetados

- `src/components/entradas-nfe/MdeDialog.tsx` — guarda em `handleImportar`.
- `src/hooks/useEntradasNfe.ts` — guarda em `useCreateEntradaNfe`.
- Banco de dados — migração de limpeza das duplicatas.

## Fora de escopo

- Refatorar o fluxo de vínculo/rescisão entre entrada manual e XML importado (pode ser tratado depois).
- Adicionar constraint UNIQUE em `entradas_nfe.chave_acesso` — deixamos para uma segunda etapa após a limpeza, para não quebrar migrations com dados legados.