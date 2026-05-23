## Objetivo

Adicionar importação das **Contra-Notas** do sistema legado (Access), que no legado estão amarradas ao `código (id)` da tabela **Contas a Receber**. No novo sistema o vínculo é em `entradas_nfe.contrato_venda_id` + `eh_contra_nota = true`, então a importação precisa fazer a ponte:

```text
planilha contra_notas.cr_codigo_legado
        └─> contas_receber.codigo_legado
                └─> contas_receber.contrato_venda_id
                        └─> entradas_nfe.contrato_venda_id (+ eh_contra_nota=true)
```

O trigger `trg_sync_contra_nota` já existente cuidará automaticamente de preencher `contratos_venda.valor_contra_nota` e recalcular `valor_receita_ir` das parcelas.

## Pré-requisito

A importação de **Contas a Receber** precisa ter sido feita antes, **com o `codigo_legado` preenchido e com `contrato_venda_id` vinculado** (a CR já carrega o número do contrato via importação das vendas). Isso já está no fluxo atual.

## O que será criado

### 1. Nova entrada em `src/lib/importacaoConfig.ts`

Nova configuração `contra_notas_recebidas` (order 21, depende de `contas_receber` e `clientes`).

**Colunas da planilha** (modelo Excel a baixar):

| Coluna           | Destino                              | Obrigatório |
|------------------|--------------------------------------|-------------|
| cr_codigo_legado | resolve → `contrato_venda_id`        | sim         |
| numero_nfe       | `entradas_nfe.numero_nfe`            | sim         |
| serie            | `entradas_nfe.serie`                 | não         |
| chave_acesso     | `entradas_nfe.chave_acesso` (44 díg.)| não         |
| data_emissao     | `entradas_nfe.data_emissao`          | sim         |
| valor_total      | `entradas_nfe.valor_total`           | sim         |
| cliente_nome     | resolve → `fornecedor_id` (em `clientes_fornecedores`) | sim |
| observacoes      | `entradas_nfe.observacoes`           | não         |

Valores fixos aplicados pelo importador:
- `eh_contra_nota = true`
- `granja_id` = herdado da CR resolvida
- `tenant_id` = do tenant selecionado
- `status = 'manual'` (ou equivalente — confirmar com schema de `entradas_nfe`)

### 2. Resolver legado → contrato (lógica custom no importador)

O `ImportacaoDialog` hoje resolve `references` 1-para-1 contra tabelas. Para esta planilha precisaremos de uma **resolução em duas etapas**:

1. Buscar `contas_receber` por `codigo_legado` (no tenant) → obter `contrato_venda_id`.
2. Se a CR não tiver `contrato_venda_id`, descartar a linha com erro claro ("CR sem contrato de venda vinculado").

Para evitar criar várias contra-notas iguais quando o legado replica a referência em cada parcela, **deduplicar por `contrato_venda_id`** dentro do lote da planilha (a primeira ocorrência vence; demais ignoradas com aviso).

### 3. Pequena extensão em `importacaoConfig.ts` / `ImportacaoDialog.tsx`

Adicionar suporte a um campo opcional `customResolve` na config (ou um `key` especial `'contra_notas_recebidas'` tratado pelo dialog) que executa o passo extra de buscar a CR por `codigo_legado` e injetar `contrato_venda_id` antes do insert. Manter o caminho genérico intocado para as demais tabelas.

### 4. Atualizar passos de limpeza

Em `src/pages/ImportarDados.tsx`, o `CLEANUP_STEPS` precisa garantir que `entradas_nfe` (e itens/refs) sejam removidas **antes** de `contratos_venda` quando o usuário limpar a base — verificar e ajustar se necessário (hoje `entradas_nfe` não aparece na lista).

## Pontos a confirmar antes de implementar

1. **Cardinalidade**: a planilha do legado tem **1 linha por contra-nota** (preferível) ou **1 linha por parcela de CR** (precisaremos deduplicar)?
2. **`fornecedor_id`**: o cliente comprador já é o mesmo cadastrado em `clientes_fornecedores`? Posso resolver por `nome` com fallback em `cpf_cnpj`?
3. **Itens da NFe**: deve ser importado só o cabeçalho da contra-nota (suficiente para o `valor_total` que alimenta `valor_receita_ir`) ou também os itens linha-a-linha?

## Arquivos a editar

- `src/lib/importacaoConfig.ts` — nova entry `contra_notas_recebidas`.
- `src/components/importacao/ImportacaoDialog.tsx` — gancho de resolução customizada (CR → contrato).
- `src/pages/ImportarDados.tsx` — incluir `entradas_nfe` em `CLEANUP_STEPS` se faltar.

Sem migração SQL: toda a infraestrutura (`eh_contra_nota`, `contrato_venda_id`, triggers de sync e receita IR) já existe.
