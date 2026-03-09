

## Campos faltantes na importação de Produtos

### Campos na tabela `produtos` vs config atual

| Campo DB | Na config? | Adicionar? |
|---|---|---|
| codigo | ✅ | — |
| nome | ✅ | — |
| tipo | ✅ | — |
| descricao | ✅ | — |
| ncm | ✅ | — |
| peso_saco | ✅ | — |
| preco_custo | ✅ | — |
| preco_venda | ✅ | — |
| ativo | ✅ | — |
| granja_id | ✅ (ref) | — |
| **codigo_barras** | ❌ | Sim (string) |
| **grupo** | ❌ | Sim (string) |
| **artigo_nfe** | ❌ | Sim (string) |
| **preco_prazo** | ❌ | Sim (number) |
| **estoque_minimo** | ❌ | Sim (number) |
| **estoque_maximo** | ❌ | Sim (number) |
| **estoque_atual** | ❌ | Sim (number) |
| **tempo_maximo** | ❌ | Sim (number) |
| **qtd_venda** | ❌ | Sim (number) |
| **cod_fornecedor** | ❌ | Sim (string) |
| **cst_pis** | ❌ | Sim (string) |
| **cst_cofins** | ❌ | Sim (string) |
| **cst_icms** | ❌ | Sim (string) |
| **cst_ipi** | ❌ | Sim (string) |
| **natureza_receita** | ❌ | Sim (string) |
| **observacao_tributaria** | ❌ | Sim (string) |
| **cst_ibs** | ❌ | Sim (string) |
| **cst_cbs** | ❌ | Sim (string) |
| **cst_is** | ❌ | Sim (string) |
| **cclass_trib_ibs** | ❌ | Sim (string) |
| **cclass_trib_cbs** | ❌ | Sim (string) |
| **unidade_medida_id** | ❌ | Sim (referência → `unidades_medida`) |
| **fornecedor_id** | ❌ | Sim (referência → `clientes_fornecedores`) |
| **grupo_id** | ❌ | Sim (referência → `grupos_produtos`) |
| **produto_residuo_id** | ❌ | Sim (referência → `produtos` auto-ref) |

### Correção

Atualizar a config de `produtos` em `src/lib/importacaoConfig.ts`:

1. Adicionar todos os campos faltantes listados acima como colunas de importação
2. Adicionar referências para `unidade_medida_id`, `fornecedor_id` e `grupo_id`
3. Adicionar `dependsOn: ['granjas', 'unidades_medida', 'grupos_produtos', 'clientes_fornecedores']`
4. `produto_residuo_id` será resolvido por auto-referência (lookup na própria tabela `produtos` por código)

### Arquivo a modificar
- `src/lib/importacaoConfig.ts` — Expandir bloco de config de produtos (linhas 137-158)

