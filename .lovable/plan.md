

## Plano: Atribuir Conta Gerencial aos Grupos de Produtos durante importação

### Problema
A planilha do Access para Grupos de Produtos não contém a referência da Conta Gerencial. O usuário precisa informar manualmente a conta gerencial de cada grupo durante o processo de importação.

### Solução
Adicionar uma etapa intermediária no fluxo de importação, específica para `grupos_produtos`, que exibe cada grupo importado com um seletor (combobox) do Plano de Contas Gerencial, permitindo vincular a conta antes de gravar no banco.

### Alterações

**1. `src/components/importacao/ImportacaoDialog.tsx`**
- Após o parsing e antes da importação, quando `config.key === 'grupos_produtos'`, exibir uma tabela editável com cada grupo e um `Select` para escolher a conta gerencial
- Buscar a lista de contas gerenciais (`plano_contas_gerencial`) via Supabase
- Armazenar as seleções em um state `contaGerencialMap: Record<number, string>` (índice → id da conta)
- Na hora de importar, injetar `conta_gerencial_id` em cada registro antes do insert

**2. `src/lib/importacaoConfig.ts`**
- Remover a referência `conta_gerencial` do array `references` de `grupos_produtos` (já que será preenchida manualmente na UI)
- Adicionar `conta_gerencial_id` ao set de `validDbColumns` implicitamente (ou manter como coluna válida)

### Fluxo do usuário
1. Seleciona o arquivo Excel → parsing normal
2. Aparece a pré-visualização com uma coluna extra "Conta Gerencial" com um Select em cada linha
3. O usuário seleciona a conta de cada grupo (ou deixa vazio)
4. Clica "Importar" → grava com o `conta_gerencial_id` selecionado

### Arquivos a modificar
- `src/lib/importacaoConfig.ts` — remover reference de conta_gerencial
- `src/components/importacao/ImportacaoDialog.tsx` — adicionar etapa de seleção de conta gerencial

