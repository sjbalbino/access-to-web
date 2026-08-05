# Busca de Inscrição Estadual na Nota de Depósito volta a filtrar

## Causa confirmada

O `Select` com busca (`src/components/ui/select.tsx`) só consegue ler o texto do item quando os filhos do `SelectItem` são texto puro. Ele monta o conteúdo com `React.Children.toArray(children).filter(child => typeof child === "string" || typeof child === "number")` — ou seja, ignora elementos JSX.

Na Nota de Depósito, cada inscrição é renderizada como `<span>…{label}…· saldo X kg</span>` (JSX aninhado). Resultado: o texto extraído é vazio, nenhum item corresponde ao que foi digitado e a lista aparece em branco a partir da primeira letra.

Isso afeta qualquer select pesquisável cujos itens tenham conteúdo formatado, não só este campo.

## Mudanças

1. Extração de texto recursiva no `SelectItem`: percorrer toda a árvore de filhos (elementos, fragmentos, arrays, strings e números) e concatenar o texto encontrado antes de comparar com o termo digitado. Assim itens com badges, ícones e saldos passam a ser pesquisáveis.
2. Comparação tolerante: normalizar acentos e ignorar caixa nos dois lados (termo e conteúdo), para que "jose" encontre "JOSÉ" e a busca por número de IE funcione com ou sem pontuação.
3. Suporte opcional a `searchText` no `SelectItem` para casos em que o rótulo visível não contém tudo que se quer pesquisar (ex.: buscar pelo CPF/CNPJ do produtor mesmo sem exibi-lo). Na Nota de Depósito, informar nome + IE + CPF/CNPJ nesse campo.

## Detalhes técnicos

- `src/components/ui/select.tsx`: substituir o filtro atual por um helper `extractText(node): string` recursivo (trata `string`, `number`, arrays, `Fragment` e elementos com `props.children`); normalizar via `String.normalize('NFD').replace(/[\u0300-\u036f]/g,'')` e remover pontuação para o casamento numérico; aceitar `searchText?: string` que, quando presente, é usado no lugar/junto do texto extraído.
- `src/components/deposito/NotaDepositoFormDialog.tsx`: passar `searchText` no `SelectItem` da Inscrição Estadual com nome do produtor, IE e CPF/CNPJ (sem alterar o visual atual do item nem as regras de saldo).
- Sem mudanças de banco de dados ou de lógica de negócio.
- Verificação: em Notas de Depósito, escolher Local + Safra, abrir "Inscrição Estadual" e digitar letras do nome e dígitos da IE, confirmando que a lista filtra em vez de ficar vazia; conferir também outro select pesquisável com conteúdo formatado (ex.: origem em Transferências) para garantir que continua funcionando.
