

## Criar importações de dependências dos Produtos

### Problema
Produtos (`order: 4`) depende de `unidades_medida`, `grupos_produtos` e `clientes_fornecedores`, mas:
- **`unidades_medida`** — não tem config de importação
- **`grupos_produtos`** — não tem config de importação  
- **`clientes_fornecedores`** — tem config mas com `order: 11` (depois de produtos)

### Correção em `src/lib/importacaoConfig.ts`

1. **Adicionar config `unidades_medida`** (order: 2)
   - Campos: `codigo`, `descricao`, `sigla`, `ativa`
   - Sem dependências

2. **Adicionar config `grupos_produtos`** (order: 2)
   - Campos: `nome`, `descricao`, `ativo`
   - Sem dependências

3. **Reordenar** `clientes_fornecedores` de `order: 11` para `order: 3` (antes de produtos)

4. **Ajustar** `produtos` para `order: 5` e demais tabelas subsequentes incrementando seus orders para manter a sequência lógica

### Resultado final (ordem)
1. Granjas
2. Unidades de Medida, Grupos de Produtos, Culturas
3. Clientes/Fornecedores
4. Safras
5. Produtos
6+ Silos, Lavouras, Produtores, etc.

