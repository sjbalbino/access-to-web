## Plano de correção

O erro continua porque o backend já tem índice único parcial em `(granja_id, codigo) WHERE codigo IS NOT NULL`, mas o reimport está usando `onConflict: 'granja_id,codigo'`. Para esse tipo de índice parcial, o upsert direto não consegue encontrar uma constraint/exclusion constraint compatível e retorna exatamente: `there is no unique or exclusion constraint matching the ON CONFLICT specification`.

## O que vou ajustar

1. Remover `inscricoes_produtor` da lista de tabelas que usam upsert automático por `onConflict`.
2. Implementar um fluxo específico para `Inscrições Produtor` quando “Atualizar existentes + inserir novos” estiver ligado:
   - separar registros com `granja_id + codigo` preenchidos;
   - buscar no banco as inscrições existentes por `granja_id` e `codigo`;
   - atualizar os existentes por `id`;
   - inserir os novos registros sem apagar nada já importado.
3. Manter o índice único parcial existente para prevenir duplicidades novas, sem exigir que todos os registros antigos tenham código.
4. Preservar compatibilidade com `INSCCODIGO` e aliases já configurados.
5. Validar no código que o importador não usa mais `onConflict: 'granja_id,codigo'` para `inscricoes_produtor`.

## Resultado esperado

Ao reimportar as Inscrições Produtor com `INSCCODIGO` e a opção “Atualizar existentes + inserir novos”, o sistema deve atualizar os cadastros existentes e inserir apenas os novos, sem apagar os lançamentos posteriores e sem cair no erro de `ON CONFLICT`.

## Observação técnica

Não será feita alteração destrutiva nos dados. A correção será no fluxo do importador para contornar a limitação do upsert com índice único parcial.