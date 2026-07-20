## Objetivo
Ajustar a tela **Transferências de Depósito** para:
1. Listar as transferências realizadas ordenadas pela **data da transferência, da mais recente para a mais antiga**.
2. Adicionar um **filtro por intervalo de datas** (data inicial e data final).

## Alterações propostas

### 1. Hook `src/hooks/useTransferenciasDeposito.ts`
- Trocar a ordenação do Supabase de `.order('codigo', { ascending: false })` para `.order('data_transferencia', { ascending: false })`.
- Expandir a interface de filtros para aceitar `dataInicial?: string` e `dataFinal?: string`.
- Aplicar `.gte('data_transferencia', filtros.dataInicial)` quando preenchido.
- Aplicar `.lte('data_transferencia', filtros.dataFinal)` quando preenchido.

### 2. Página `src/pages/Transferencias.tsx`
- Adicionar dois estados locais: `filtroDataInicio` e `filtroDataFim`.
- Passar esses valores para o hook `useTransferenciasDeposito`.
- Incluir dois campos `Input type="date"` na área de filtros, mantendo o padrão já usado em `Lançamentos Financeiros`.
- Ajustar o grid de filtros para acomodar as novas datas sem quebrar o layout em telas menores.

## Resultado esperado
A lista passa a exibir as transferências mais recentes primeiro, e o usuário poderá restringir o resultado a um período específico. Nenhuma mudança de banco de dados é necessária.