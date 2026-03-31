

## Plano: Corrigir exibição de datas com fuso horário

### Problema
A data está **correta no banco de dados**. O erro ocorre na **exibição na tela**: `new Date('2026-03-28')` cria um objeto Date em meia-noite UTC, que no fuso horário do Brasil (UTC-3) vira 27/03 às 21h — e `format()` exibe o dia anterior.

### Solução
Substituir `new Date(dateStr)` por `parseISO(dateStr)` do date-fns (já usado no projeto em `CompraCereais.tsx`) ou adicionar `T00:00:00` à string para forçar interpretação local. O `parseISO` é o padrão mais limpo.

### Arquivo: `src/components/controle-lavoura/ColheitasTab.tsx`
- Linha 363: trocar `format(new Date(colheita.data_colheita), 'dd/MM/yy')` por `format(parseISO(colheita.data_colheita), 'dd/MM/yy')`
- Adicionar import de `parseISO` do `date-fns`

### Verificação adicional
Buscar e corrigir o mesmo padrão em todos os arquivos que exibem datas de colheita ou outras datas do banco usando `new Date(string)` sem `T00:00:00`:
- `src/pages/EntradaColheita.tsx` — verificar se há exibição de `data_colheita` com `new Date()`
- Outros componentes que usem `format(new Date(dateString), ...)` para datas sem hora

### Impacto
Correção pontual de display. Nenhuma alteração no banco ou na lógica de importação.

