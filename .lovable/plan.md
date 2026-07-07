O campo `tipo_produtor` já está presente no formulário de produtores (`src/pages/Produtores.tsx`), porém com a label genérica **"Tipo"**. Isso pode causar dificuldade para localizá-lo.

## Alteração proposta

No formulário de cadastro/edição de produtores:
- Alterar a label do campo de **"Tipo"** para **"Tipo de Produtor"**.
- Adicionar um `placeholder` no `SelectTrigger` para indicar a ação esperada (ex.: "Selecione o tipo...").
- Manter as opções atuais: **Produtor** e **Sócio**.

## Arquivo envolvido
- `src/pages/Produtores.tsx` (linhas 417–423)

## Resultado esperado
O campo ficará identificado como **"Tipo de Produtor"** no topo do formulário, facilitando a localização e deixando claro que é por meio dele que o registro é classificado como Produtor ou Sócio.