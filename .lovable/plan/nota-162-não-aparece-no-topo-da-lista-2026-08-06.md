# Nota 162 não aparece no topo da lista

## Diagnóstico (confirmado no banco)

A lista é ordenada por `data_emissao` (desc) e depois `created_at` (desc) em `useNotasFiscais.ts`. Os valores reais das últimas notas:

```text
163/930  data_emissao 06/08 21:47   created_at 06/08 21:45
162/930  data_emissao 06/08 00:00   created_at 06/08 21:29
161/930  data_emissao 06/08 21:17   created_at 06/08 21:16
160/930  data_emissao 06/08 21:16   created_at 06/08 21:14
```

A nota 162 gravou `data_emissao` apenas com a data (00:00:00), sem o horário — ela foi criada/emitida por um caminho que salva a data "zerada". Como a ordenação usa esse campo, ela cai abaixo das notas 161 e 160, que têm horário real, mesmo tendo sido emitida depois.

## O que será feito

1. **Ordenar pelo instante efetivo de emissão**: ordenar as notas por um "momento de referência" = `data_emissao` quando ela tem horário; quando vier zerada (00:00), usar `created_at`. Assim notas com data sem horário não são jogadas para o fim do dia anterior/começo do dia.
2. **Gravar o horário real na autorização**: ao autorizar/emitir uma nota, normalizar `data_emissao` para o timestamp completo (fuso America/Sao_Paulo), evitando novas notas com 00:00.
3. **Corrigir a nota 162** gravando o horário efetivo (a partir de `created_at`/autorização), para que ela apareça imediatamente no topo.

## Detalhes técnicos

- `src/hooks/useNotasFiscais.ts`: manter a busca no banco, mas aplicar a ordenação final no cliente com a chave composta descrita (data_emissao com horário, senão created_at), preservando o agrupamento por emitente em `NotasFiscais.tsx`.
- Ajuste do gravador de `data_emissao` nos fluxos de emissão que hoje salvam somente a data.
- Nenhuma alteração de schema; notas autorizadas mantêm o conteúdo fiscal (apenas o horário de emissão da 162 é acertado para refletir a autorização real).
