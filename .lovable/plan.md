## Objetivo
Dois ajustes rápidos de UX na tela de Emitentes NF-e:

### 1. Lista de Emitentes — nome completo da granja
Na tabela de listagem (linha ~353), o nome da granja está truncado (`max-w-[150px] truncate`).
- Remover o `truncate` e aumentar/eliminar a largura máxima para exibir o nome completo.
- Seguir o padrão do sistema: exibir como **"Razão Social (Nome Fantasia)"** quando houver nome fantasia, senão apenas razão social.

### 2. Formulário de edição — mostrar valor do token
O campo "Token de Acesso" (linha ~756) é do tipo `password`, ocultando o valor.
- Adicionar um botão com ícone de olho ao lado do input para alternar entre `type="password"` e `type="text"`.
- Isso permite ao usuário verificar se o token foi colado corretamente sem comprometer a segurança por padrão.

### Arquivos afetados
- `src/pages/EmitentesNfe.tsx` — único arquivo a editar.

### Fora do escopo
- Nenhuma mudança em lógica de backend, hooks ou edge functions.