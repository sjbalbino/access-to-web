## Problema

A importação de **Safras** está falhando em 100% das linhas com:
```
new row for relation "safras" violates check constraint "safras_status_check"
```

A coluna `safras.status` só aceita `'ativa' | 'encerrada' | 'planejada'`, mas o Excel de origem traz valores diferentes (provavelmente `'F'`/`'A'`, `'Fechada'`/`'Aberta'`, vazio, ou outro código legado do Access). O importador hoje envia o valor cru via `toStr`, sem normalizar.

## Correção

Em `src/lib/importacaoConfig.ts`, na definição de `safras` (linha 218):

1. Substituir o `transform: toStr` da coluna `status` por um **mapper dedicado** que normaliza:
   - `'A'`, `'ATIVA'`, `'ABERTA'`, `'1'`, `true`, vazio/null → `'ativa'`
   - `'F'`, `'FECHADA'`, `'ENCERRADA'`, `'0'`, `false` → `'encerrada'`
   - `'P'`, `'PLANEJADA'` → `'planejada'`
   - qualquer outro → `'ativa'` (fallback seguro)
2. Garantir que o valor final esteja sempre presente (default `'ativa'` quando a coluna não vier no arquivo).

## Verificação

Após o ajuste:
- Rodar nova importação de Safras como GRINGS.
- Confirmar que as 25 linhas entram com `status` válido.
- Validar que o filtro do RLS continua isolando por `tenant_id` (já corrigido em migration anterior).

Sem mudanças de schema, sem mudanças em outras tabelas.