## Objetivo
Ordenar todos os selects/comboboxes de Inscrição Estadual (IE) do sistema por **nome do produtor** (A→Z, pt-BR), em vez de pelo número da IE.

## Escopo

### 1. Hook central `useInscricoesCompletas` (`src/hooks/useInscricoesCompletas.ts`)
Trocar o `.order('inscricao_estadual')` do Supabase por ordenação client-side, já que o nome do produtor vem de tabela relacionada (`produtores.nome`). Ordenar pelo nome do produtor usando `localeCompare('pt-BR')`, com fallback para `nome`/`nome_fantasia`/`inscricao_estadual` quando o produtor não estiver definido.

### 2. Hook `useAllInscricoes` (`src/hooks/useAllInscricoes.ts`)
Verificar e aplicar a mesma ordenação por nome do produtor no retorno do hook, para que todos os selects que o consomem já recebam a lista ordenada corretamente (evita duplicar lógica em cada tela).

### 3. Hooks derivados (verificar e ajustar se necessário)
- `useInscricoesProdutor`
- `useInscricoesSocio`
- `useInscricoesTipoProdutor`
- `useInscricaoEmitentePrincipal`

Aplicar o mesmo critério de ordenação onde a lista é usada em selects.

### 4. Componentes com ordenação local
Onde há `.sort()` local em cima de inscrições (ex.: `TransferenciaDialog.tsx` já usa nome do produtor — manter), padronizar todos para o mesmo critério e remover ordenações redundantes por IE. Fazer varredura em:
- `src/components/**` e `src/pages/**` procurando por `inscricao_estadual` em contextos de `.sort` ou `SelectItem`.

## Critério de ordenação (padrão único)
```
nome_produtor = produtores?.nome || nome || nome_fantasia || inscricao_estadual || ""
sort: nome_produtor.localeCompare(outro, 'pt-BR', { sensitivity: 'base' })
```

## Fora de escopo
- Layout dos selects, rótulos exibidos (continua usando `labelInscricao` / padrão já definido em memória).
- Regras de filtro (ativa/inativa, por tipo, etc.).
- Nenhuma alteração de banco / RLS / migrations.

## Validação
- Abrir Transferências, Devoluções, Notas de Depósito, Vendas, Compras — confirmar que os selects de IE aparecem em ordem alfabética por nome do produtor.
