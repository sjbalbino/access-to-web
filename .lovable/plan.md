## Objetivo

Trazer o número do **RECIBO** do sistema legado para o novo, gravar na **baixa** (não na conta), e ao registrar uma baixa nova gerar automaticamente o próximo número sequencial e abrir o PDF do recibo.

## Onde mora o recibo

- Coluna nova: `contas_receber_baixas.numero_recibo TEXT`.
- Para baixas importadas: preserva o número vindo do Access.
- Para baixas novas no sistema: gera o próximo número sequencial automaticamente.

## 1. Migration

```sql
ALTER TABLE contas_receber_baixas
  ADD COLUMN numero_recibo TEXT;

CREATE UNIQUE INDEX uq_crb_numero_recibo_tenant
  ON contas_receber_baixas (tenant_id, numero_recibo)
  WHERE numero_recibo IS NOT NULL;

-- Função que devolve o próximo nº por tenant
CREATE FUNCTION proximo_numero_recibo(_tenant uuid) RETURNS text ...
-- Lê max(numero_recibo::int) das baixas do tenant + 1, com fallback 1.
```

Sequencial **por tenant** (escolha implícita: mantém únicos sem complicar com granja).

## 2. Importação

### 2.a Tabela já existente `contas_receber` — sem mudança de schema

A planilha de **Contas a Receber** continua igual. O recibo NÃO vai nessa planilha.

### 2.b Nova planilha `baixas_contas_receber` (já era necessária para receber pagamentos quitados no legado)

Adicionar nova entry no `importacaoConfig.ts`:

| Coluna             | Destino                                        | Obrigatório |
|--------------------|------------------------------------------------|-------------|
| cr_codigo_legado   | resolve → `conta_id` (via `contas_receber.codigo_legado`) | sim |
| data_pagamento     | `data_pagamento`                               | sim         |
| valor_pago         | `valor_pago`                                   | sim         |
| juros / multa / desconto | idem                                     | não         |
| forma_pagamento    | `forma_pagamento`                              | não         |
| documento          | `documento`                                    | não         |
| numero_recibo      | `numero_recibo` (string do Access)             | não         |
| observacoes        | `observacoes`                                  | não         |

Resolução custom no `ImportacaoDialog` (mesmo padrão da contra-nota): busca `contas_receber` por `codigo_legado` → injeta `conta_id`.

> Se o usuário preferir que o nº do recibo já venha embutido na planilha de Contas a Receber (uma coluna `numero_recibo` que cria automaticamente uma baixa-pagamento quando `status='pago'`), me avise — é trivial de adicionar, mas hoje a planilha de CR não cria baixas.

## 3. UI da baixa (BaixasDialog)

- Adicionar campo **Nº recibo** (somente leitura, preenchido automaticamente).
- Ao abrir o formulário de nova baixa, chamar `proximo_numero_recibo(tenant_id)` para mostrar o próximo número antes do save.
- Ao salvar: o número é gravado em `contas_receber_baixas.numero_recibo`.
- Após salvar com sucesso: gerar o PDF do recibo (jsPDF) e abrir em nova aba automaticamente.
- Na lista de baixas: nova coluna **Recibo** mostrando o número, com ícone de impressora para reimprimir o PDF.

## 4. PDF do recibo (`src/lib/reciboPdf.ts`)

Layout A4 retrato simples:
- Cabeçalho: razão social da granja + CNPJ + endereço.
- Título: **RECIBO Nº {numero}**.
- "Recebemos de **{cliente}**, CPF/CNPJ **{...}**, a importância de **R$ {valor_total}** ({valor por extenso}), referente a **{documento/parcela}** do contrato **{numero_contrato}**, conforme detalhamento abaixo."
- Tabela: data, valor, juros, multa, desconto, total, forma de pagamento.
- Rodapé: cidade/data, linha de assinatura.
- Padrões PT-BR: datas dd/MM/yyyy, valores R$ alinhados à direita, números por extenso via util local.

## 5. Cleanup / RLS

- A nova coluna herda as policies existentes da tabela.
- `numero_recibo` opcional para não quebrar baixas antigas/manual já lançadas.

## Arquivos a editar/criar

- **Migration**: nova coluna + função `proximo_numero_recibo`.
- `src/lib/importacaoConfig.ts` — nova entry `baixas_contas_receber`.
- `src/components/importacao/ImportacaoDialog.tsx` — branch de resolução `cr_codigo_legado → conta_id`.
- `src/pages/ImportarDados.tsx` — incluir `contas_receber_baixas` no `CLEANUP_STEPS` antes de `contas_receber`.
- `src/hooks/useContasReceber.ts` — expor `numero_recibo` em `BaixaContaReceber` e na criação.
- `src/components/contas/BaixasDialog.tsx` — campo Nº recibo, busca do próximo, coluna na lista, botão imprimir.
- `src/lib/reciboPdf.ts` — **novo** gerador de PDF.

## Pontos a confirmar

1. **Numeração sequencial**: começa do **1** (ignora o que veio do Access) ou começa em **max(numero_recibo importado) + 1** para evitar conflito com números legados? Sugiro a segunda opção — mais segura.
2. **Recibo só pra quitação total ou pra qualquer baixa parcial?** Por padrão vou gerar pra toda baixa (inclusive parciais), já que cada pagamento é um recibo.
