

## Plano: Auto-preencher Sub-Centro de Custo pelo nome da planilha

### Problema
Informar manualmente o sub-centro de custo para cada grupo de produtos é trabalhoso. A planilha já contém nomes que podem corresponder diretamente aos sub-centros cadastrados.

### Solução
Após o parsing do arquivo e carregamento dos sub-centros, fazer um match automático: para cada grupo importado, buscar o primeiro sub-centro cuja `descricao` (normalizada) seja igual ao `nome` do grupo na planilha. O usuário ainda pode corrigir manualmente se necessário.

### Alteração em `src/components/importacao/ImportacaoDialog.tsx`

Adicionar um `useEffect` que, quando `transformedData` e `subCentros` estiverem carregados (e `needsContaGerencial` for true):

1. Para cada registro `transformedData[idx]`, normalizar `row.nome` (lowercase, sem acentos, trim)
2. Buscar em `subCentros` o primeiro item cuja `descricao` normalizada seja igual
3. Se encontrado, preencher `contaGerencialMap[idx]` automaticamente
4. Manter o combobox para o usuário corrigir os que não bateram ou ajustar

### Resultado
- Grupos com nomes iguais aos sub-centros são preenchidos automaticamente
- Grupos sem correspondência ficam vazios para seleção manual
- Reduz drasticamente o trabalho manual

