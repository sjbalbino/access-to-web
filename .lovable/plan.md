

## Plano: Corrigir layout mobile da lista de Clientes/Fornecedores

### Problemas identificados
1. **CardHeader com `flex-row`** força título e botão lado a lado, causando o deslocamento do botão "Novo Registro" em telas pequenas
2. **Tabela com muitas colunas** dificulta scroll horizontal — em mobile, melhor mostrar apenas colunas essenciais ou usar layout de cards

### Alterações em `src/pages/ClientesFornecedores.tsx`

1. **CardHeader responsivo**: Trocar `flex flex-row` por `flex flex-col sm:flex-row gap-2` para empilhar título e botão em mobile
2. **Tabela mobile-friendly**: Ocultar colunas menos essenciais em mobile com `hidden md:table-cell` (Cidade/UF, Contato, Status), mantendo Nome, Tipo, CPF/CNPJ e Ações visíveis
3. **Botão compacto em mobile**: Usar apenas ícone `+` em telas pequenas, texto completo em maiores
4. **`min-w-0` no container** para garantir que o overflow-x-auto funcione corretamente dentro do Card

### Resultado
- Header não quebra em mobile, botão fica abaixo do título
- Tabela cabe na tela com as colunas essenciais, sem necessidade de scroll horizontal forçado
- Colunas secundárias aparecem apenas em telas maiores

