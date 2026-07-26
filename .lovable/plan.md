## Objetivo

As remessas de venda (Vendas da Produção) hoje não são deduzidas no **Extrato do Produtor** nem nos hooks de saldo. Passar a computá-las usando a mesma abordagem do **Extrato de Movimentação**: contratos de venda da inscrição (`contratos_venda.inscricao_produtor_id`) → remessas (`remessas_venda`) com `status <> 'cancelada'`.

## Situação verificada

- `gerarExtratoProdutorPdf` (`src/lib/relatoriosPdf.ts`): não há seção VENDAS; saldo = Colheitas + Transf. Recebidas + Compras − Transf. Enviadas − Devoluções.
- `gerarExtrato` (`RelatorioDialog.tsx`): não busca remessas.
- `gerarResumoProdutor` / `gerarResumoProdutorPdf`: **já** deduzem vendas (coluna Vendas e saldo) — sem alteração.
- `useSaldoSocio`: `vendasProducao` fixo em `0` (TODO no código).
- `useSaldoProdutor`: saldo = Colheitas + Recebidas − Enviadas (sem vendas).
- `useSaldoDisponivelProdutor`: saldo = Colheitas + Recebidas − Enviadas − Devoluções (sem vendas).
- `useSaldosDeposito`: sem vendas — **permanece como está** (decisão do usuário).

## Mudanças

### 1. Extrato do Produtor — dados (`src/components/relatorios/RelatorioDialog.tsx`)

Em `gerarExtrato`, após as demais buscas:
- Buscar `contratos_venda` (`id`, `comprador:clientes_fornecedores(nome)`) por `inscricao_produtor_id = inscricaoId` e `safra_id = safraId`.
- Se houver contratos, buscar `remessas_venda` (`data_remessa, kg_remessa, romaneio, contrato_venda_id, variedade:produtos(nome), nota_fiscal:notas_fiscais(numero)`) com `.in("contrato_venda_id", ids)` e `.neq("status","cancelada")`.
- Local de entrega da venda: mesma regra do Extrato de Movimentação — local `is_sede` da granja do produtor, com fallback para a sede do tenant (reaproveitar o helper já usado por `gerarExtratoMovimentacao`).
- Mapear para `vendas: ExtratoVenda[]` no `ExtratoData`.

### 2. Extrato do Produtor — PDF (`src/lib/relatoriosPdf.ts`)

- Nova interface `ExtratoVenda { data_remessa, comprador, variedade, quantidade_kg, nfe, local_entrega }` e campo opcional `vendas?: ExtratoVenda[]` em `ExtratoData`.
- Nova seção **VENDAS** via `renderSection`, agrupada por Local (mesmo padrão das demais), colunas: Local | Data | Comprador | Variedade | NF-e | Qtd (kg) | Sacas, com subtotais por local e total.
- RESUMO: acrescentar linha `(-) Vendas` e alterar o saldo para
  `Colheitas + Transf. Recebidas + Compras − Transf. Enviadas − Devoluções − Vendas`.
- Manter o padrão de sacas por total (`Math.round(totalKg / 60)`), evitando resíduo de 1 saco.

### 3. Hooks de saldo

- `useSaldoSocio`: substituir `totalVendasProducao = 0` pela soma real (contratos da inscrição + remessas não canceladas, filtradas por safra; produto via `resolveSaldoProdutoIds` quando a remessa tiver `produto_id`/`variedade_id`). Saldo já subtrai `vendasProducao`.
- `useSaldoDisponivelProdutor`: buscar vendas da mesma forma e subtrair do saldo; expor `vendasProducao` no resultado.
- `useSaldoProdutor`: mesma dedução, expondo o total de vendas.
- `useSaldosDeposito`: **sem alteração** (saldo de emissão de Nota de Depósito).

## Detalhes técnicos

- Filtro por produto nas remessas: aplicar apenas quando a remessa possuir coluna de produto; caso contrário, considerar todas as remessas do contrato (o contrato já tem `produto_id`, que será usado como fonte primária).
- Todos os kg arredondados para inteiro (`Math.round`), conforme padrão BR do projeto.
- Nenhuma alteração de schema ou de dados no banco.

## Fora de escopo

- Resumo do Produtor e Saldo Disponível (relatório) — já contemplam vendas.
- Saldo de emissão de Nota de Depósito (`useSaldosDeposito`).
