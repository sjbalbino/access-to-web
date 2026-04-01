

## Plano: Adicionar campos faltantes na importação de Contratos de Venda

### Campos na tabela `contratos_venda` que estao ausentes no modelo de importação

| Campo DB | Tipo | Presente? |
|---|---|---|
| `nota_venda` | varchar | Falta |
| `percentual_comissao` | numeric | Falta |
| `valor_comissao` | numeric | Falta |
| `data_pagamento_comissao` | date | Falta |
| `data_recebimento` | date | Falta |
| `remessa_deposito` | boolean | Falta |
| `retorno_deposito` | boolean | Falta |
| `local_entrega_nome` | varchar | Falta |
| `local_entrega_cnpj_cpf` | varchar | Falta |
| `local_entrega_ie` | varchar | Falta |
| `local_entrega_logradouro` | varchar | Falta |
| `local_entrega_numero` | varchar | Falta |
| `local_entrega_complemento` | varchar | Falta |
| `local_entrega_bairro` | varchar | Falta |
| `local_entrega_cidade` | varchar | Falta |
| `local_entrega_uf` | varchar | Falta |
| `local_entrega_cep` | varchar | Falta |

Campos ja mapeados: `numero`, `data_contrato`, `quantidade_kg`, `quantidade_sacos`, `preco_kg`, `valor_total`, `modalidade_frete`, `venda_entrega_futura`, `a_fixar`, `fechada`, `exportacao`, `observacoes`, `tipo_venda`, `corretor`, `numero_contrato_comprador`.

### Alteracao

**Arquivo:** `src/lib/importacaoConfig.ts` (secao `contratos_venda`, ~linha 575)

Adicionar as seguintes linhas ao array `columns`:

```typescript
{ accessName: 'nota_venda', dbName: 'nota_venda', transform: toStr },
{ accessName: 'percentual_comissao', dbName: 'percentual_comissao', transform: toNumber },
{ accessName: 'valor_comissao', dbName: 'valor_comissao', transform: toNumber },
{ accessName: 'data_pagamento_comissao', dbName: 'data_pagamento_comissao', transform: toDate },
{ accessName: 'data_recebimento', dbName: 'data_recebimento', transform: toDate },
{ accessName: 'remessa_deposito', dbName: 'remessa_deposito', transform: toBool },
{ accessName: 'retorno_deposito', dbName: 'retorno_deposito', transform: toBool },
{ accessName: 'local_entrega_nome', dbName: 'local_entrega_nome', transform: toStr },
{ accessName: 'local_entrega_cnpj_cpf', dbName: 'local_entrega_cnpj_cpf', transform: toStr },
{ accessName: 'local_entrega_ie', dbName: 'local_entrega_ie', transform: toStr },
{ accessName: 'local_entrega_logradouro', dbName: 'local_entrega_logradouro', transform: toStr },
{ accessName: 'local_entrega_numero', dbName: 'local_entrega_numero', transform: toStr },
{ accessName: 'local_entrega_complemento', dbName: 'local_entrega_complemento', transform: toStr },
{ accessName: 'local_entrega_bairro', dbName: 'local_entrega_bairro', transform: toStr },
{ accessName: 'local_entrega_cidade', dbName: 'local_entrega_cidade', transform: toStr },
{ accessName: 'local_entrega_uf', dbName: 'local_entrega_uf', transform: toStr },
{ accessName: 'local_entrega_cep', dbName: 'local_entrega_cep', transform: toStr },
```

### Impacto
- 1 arquivo alterado: `src/lib/importacaoConfig.ts` (~17 linhas adicionadas)
- O modelo de download passara a incluir todos esses cabecalhos
- A importacao passara a gravar esses campos quando presentes na planilha

