

## Diagnóstico: Status "Pendente" após importação

O problema é que o **status de importação é armazenado apenas na memória (React state)**. Quando a página é recarregada ou o usuário navega para outro lugar e volta, todos os status voltam para "Pendente" porque o estado `statuses` começa vazio `{}`.

Além disso, há um bug secundário: quando a importação tem erros parciais (alguns lotes falham), o callback `onImportComplete` **não é chamado**, então o status não atualiza nem mesmo na sessão atual.

### Correções propostas

#### 1. Verificar registros existentes no banco ao carregar a página
Ao montar a página `ImportarDados.tsx`, fazer uma consulta `SELECT count(*)` em cada tabela configurada para detectar automaticamente quais já possuem dados importados e marcar o status correto.

#### 2. Corrigir callback de importação parcial
No `ImportacaoDialog.tsx`, chamar `onImportComplete` mesmo quando há erros parciais (desde que `imported > 0`).

### Arquivos a modificar
- `src/pages/ImportarDados.tsx` — Adicionar `useEffect` que consulta contagem de registros em cada tabela ao carregar
- `src/components/importacao/ImportacaoDialog.tsx` — Chamar `onImportComplete` também em importação parcial

