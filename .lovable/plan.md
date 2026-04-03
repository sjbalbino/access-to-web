

## Plano: Corrigir lookup de transportadoras na importacao de remessas

### Problema
A configuracao de importacao de remessas busca `transportadora_id` usando `lookupColumn: 'codigo'`, mas a tabela `transportadoras` nao possui coluna `codigo`. O lookup deve ser feito pelo campo `nome`.

### Alteracao

**Arquivo:** `src/lib/importacaoConfig.ts`

Na configuracao de `remessas_venda`, alterar a referencia de transportadora:
- `sourceColumn`: de `transportadora_codigo` para `transportadora_nome`
- `lookupColumn`: de `'codigo'` para `'nome'`

Tambem atualizar a lista de colunas do modelo Excel para refletir `transportadora_nome` em vez de `transportadora_codigo`.

### Arquivos alterados
- `src/lib/importacaoConfig.ts` (2 linhas)

