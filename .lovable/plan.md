# Plano: Contas a Pagar e Contas a Receber

Criar dois módulos completos (CR + CP) com suporte a múltiplas baixas (pagamentos parciais) e geração automática a partir de Vendas da Produção (CR) e Entradas de NFe (CP).

## 1. Banco de Dados

### Tabela `contas_receber`
Campos principais: `granja_id`, `tenant_id`, `cliente_id` (→ clientes_fornecedores), `venda_producao_id` (origem, nullable), `nota_fiscal_id` (nullable), `documento`, `parcela` (ex: "1/3"), `data_emissao`, `data_vencimento`, `valor_original`, `valor_pago` (calculado por trigger), `valor_aberto` (calculado), `juros`, `multa`, `desconto`, `status` ('aberto' | 'parcial' | 'pago' | 'cancelado'), `dre_conta_id`, `sub_centro_custo_id`, `safra_id`, `observacoes`, `codigo_legado`.

### Tabela `contas_pagar`
Mesma estrutura, trocando `cliente_id` por `fornecedor_id` e referências de origem por `entrada_nfe_id` e `compra_cereais_id` (ambos nullable).

### Tabela `contas_receber_baixas` e `contas_pagar_baixas`
Para múltiplos pagamentos por título:
- `conta_id` (FK), `data_pagamento`, `valor_pago`, `juros`, `multa`, `desconto`, `forma_pagamento` ('dinheiro' | 'pix' | 'boleto' | 'transferencia' | 'cheque' | 'cartao' | 'outro'), `conta_bancaria` (texto livre), `documento` (nº do comprovante), `observacoes`, `lancamento_financeiro_id` (link opcional para `lancamentos_financeiros`).

### Triggers
- `trg_atualiza_saldo_conta`: ao inserir/editar/excluir baixa, recalcula `valor_pago` (soma das baixas) e `status` da conta pai (`pago` se `valor_pago >= valor_original`, `parcial` se >0, senão `aberto`).
- `trg_baixa_cria_lancamento` (opcional, configurável): cria registro em `lancamentos_financeiros` ao gravar baixa, vinculando via `lancamento_financeiro_id`.

### RLS
Idênticas a `lancamentos_financeiros` (filtro por tenant via granja).

## 2. Integração com Vendas da Produção (CR)

- Em `VendaProducaoForm`, na aba/seção financeira já existente para duplicatas da NFe, adicionar a opção **"Gerar Contas a Receber"** com os campos: nº de parcelas, primeiro vencimento, intervalo em dias.
- Ao salvar/autorizar a venda, criar automaticamente N registros em `contas_receber` vinculados via `venda_producao_id` (e `nota_fiscal_id` quando emitida).
- Botão "Gerar/Regerar CR" disponível enquanto não há baixas registradas.
- Se a NFe for cancelada → marcar contas vinculadas como `cancelado` (apenas se sem baixas).

## 3. Integração com Entradas de NFe (CP)

- Em `EntradaNfeFormDialog`, nova seção **"Contas a Pagar"** com a mesma lógica: nº de parcelas, 1º vencimento, intervalo.
- Quando o XML importado já trouxer duplicatas, pré-preencher os vencimentos/valores delas.
- Ao **finalizar** a entrada (botão existente), gerar registros em `contas_pagar` vinculados via `entrada_nfe_id`.
- Estender também `CompraCereais` (compra de cereais já é entrada de produto) com a mesma opção.

## 4. Telas (List + Dialog)

### `/contas-receber` e `/contas-pagar`
Seguindo o padrão "List First":
- **Filtros**: granja, status, cliente/fornecedor, data emissão, data vencimento, safra, busca por documento.
- **Cards de totais**: Total aberto, Vencido, A vencer (7 dias), Pago no período.
- **Tabela**: Data Venc. | Cliente/Fornec. | Documento/Parc. | Origem (link p/ venda/entrada) | Valor Orig. | Valor Pago | Saldo | Status (badge colorido) | Ações.
- Linha vencida em vermelho; a vencer em 7 dias em âmbar.
- Paginação 20/pág via `usePaginacao`.
- Ordenação por vencimento ascendente padrão.

### Dialog de cadastro/edição
Campos do título + cliente/fornec. + DRE/sub-centro. Bloqueado se a conta tem origem (venda/entrada) — apenas vencimento, observações e baixas editáveis.

### Dialog "Baixar conta"
- Lista de baixas existentes (com excluir individual).
- Formulário para nova baixa: data, valor, juros, multa, desconto, forma de pagamento, conta bancária, documento, obs.
- Sugere valor restante por padrão.
- Mostra resumo: Valor original | Total pago | Saldo restante.
- Checkbox "Lançar no fluxo financeiro" (cria entrada em `lancamentos_financeiros`).

## 5. Importação Access (próximo passo, fora deste plano)

Tabelas ficam prontas para receber importação CR/CP do Access. Isso será planejado depois.

## 6. Permissões

- Visualizar: todos os roles com acesso à granja.
- Criar/editar/baixar: `operador`, `gerente`, `admin` (via `canEdit`).
- Excluir baixa: `gerente` ou `admin`.

## 7. Navegação

Adicionar em `AppSidebar` dentro do grupo Financeiro:
- Contas a Receber
- Contas a Pagar
- Lançamentos Financeiros (já existe)
- DRE (já existe)

## Detalhes técnicos

- Hooks: `useContasReceber`, `useContasPagar`, `useBaixasContaReceber`, `useBaixasContaPagar` (CRUD + mutations).
- `src/hooks/useGerarDuplicatasVenda.ts` e `useGerarDuplicatasEntrada.ts`: lógica de geração de parcelas.
- Rotas em `App.tsx`: `/contas-receber`, `/contas-pagar`.
- Formatação BR para datas e valores; status calculado pelo trigger, nunca no frontend.
- Sem CHECK constraints temporais — usar trigger de validação.
- Nada de mexer em `lancamentos_financeiros` existente além do FK opcional.

## Fora de escopo

- Geração de boletos/PIX.
- Conciliação bancária.
- Importação Access de CR/CP (próxima etapa).
- Relatórios PDF (podem ser adicionados após a base funcionar).
