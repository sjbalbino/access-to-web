## Escopo

Vários ajustes em Granjas, Safras e Entradas NF-e para melhorar automações de preenchimento, marcar registro "principal" e corrigir um bug de rateio no Contas a Pagar quando a nota tem mais de um item.

---

## 1. Granja principal (marcador + autofill)

**Banco**: coluna `is_principal` já existe em `granjas` com índice único parcial por tenant. Nenhuma migração necessária.

- `src/pages/Granjas.tsx`: adicionar checkbox "Granja principal" no formulário e badge/indicador na lista.
- `src/hooks/useGranjas.ts`: garantir que `is_principal` é persistido no insert/update; expor `useGranjaPrincipal()` que retorna a granja com `is_principal = true` do tenant.
- Buscar por nome fantasia: revisar os selects/comboboxes que listam granjas (ex.: `AppLayout` seletor, filtros em relatórios, `EntradaNfeFormDialog`, etc.) para exibir `razao_social (nome_fantasia)` e permitir busca por ambos os campos.
- Autopreencher: nos formulários que hoje pedem granja (Entradas NF-e, Contas a Pagar, Notas Fiscais, Compras, Contratos etc.), quando `granja_id` estiver vazio no create, aplicar a granja principal por padrão.

## 2. Safra principal (novo marcador + autofill)

**Migração**:
- `ALTER TABLE public.safras ADD COLUMN is_principal boolean NOT NULL DEFAULT false;`
- Índice único parcial `UNIQUE (tenant_id) WHERE is_principal = true`.
- Trigger `handle_principal_safra` (espelho de `handle_principal_granja`) que zera a marca das outras safras do mesmo tenant.

**Frontend**:
- `src/pages/Safras.tsx`: checkbox no formulário + badge na lista.
- `src/hooks/useSafras.ts`: persistir `is_principal`; expor `useSafraPrincipal()`.
- Autopreencher `safra_id` nos formulários que a exigem (Entradas NF-e, Colheitas, Contas, Contratos, Relatórios) quando vazio.

## 3. Entradas NF-e — automações no header

Em `src/components/entradas-nfe/EntradaNfeFormDialog.tsx` (modo create):

- **CFOP padrão**: pré-selecionar `1101` no campo CFOP do header (se existir) e como default em itens novos.
- **Datas**: `data_emissao` e `data_entrada` começam com a data de hoje. Ao alterar `data_emissao`, replicar automaticamente em `data_entrada` (somente enquanto `data_entrada` não tiver sido editada manualmente — comparar com o valor anterior).
- **Natureza da operação**: quando o CFOP mudar, buscar via `useCfops()` o CFOP correspondente e preencher `natureza_operacao` com sua `descricao` (respeitando o limite de 60 caracteres). Não sobrescrever se o usuário já editou manualmente.
- **IE do produtor**: aplicar a inscrição principal via `useInscricaoEmitentePrincipal(granja_id)` quando `inscricao_produtor_id` estiver vazio.

## 4. Entradas NF-e — automações nos itens

No mesmo arquivo, na função de mudança de `produto_id` de um item:

- **Unidade**: preencher `unidade_medida` com `produtos.unidade_medida` do produto selecionado.
- **Quantidade padrão**: se `quantidade` estiver zerada, definir `1`.
- **Valor unitário**: se `valor_unitario` estiver zerado, usar `produtos.preco_custo` (ou equivalente disponível) quando > 0.
- Recalcular `valor_total` = `quantidade * valor_unitario` (já existe).

## 5. Bug — Contas a Pagar não atualiza ao ter >1 item

**Diagnóstico**: `gerarContasPagarAutomatico` só é chamada em `useCreateEntradaNfe`. Em `useUpdateEntradaNfe`, apenas o header é atualizado, mas as parcelas de `contas_pagar` (`valor_original`, splits por sub_centro_custo) permanecem com os valores da versão anterior da nota — por isso, quando o usuário adiciona/edita itens, o total não bate.

**Correção** em `src/hooks/useEntradasNfe.ts` → `useUpdateEntradaNfe`:
- Após atualizar header e itens, verificar se existem parcelas em `contas_pagar` para essa entrada.
- Se todas as parcelas estão **sem baixa** (`valor_pago = 0`), deletar e regerar via `gerarContasPagarAutomatico` com os novos itens/valor_total (mantendo `data_vencimento` de duplicatas se existirem).
- Se houver ao menos uma parcela com baixa, **não regerar**: apenas mostrar um `toast.warning` avisando que os itens mudaram mas o CP tem baixas e precisa ser ajustado manualmente. (Preserva integridade financeira.)
- Invalidar `contas_pagar` no `onSuccess`.

## 6. Aba separada "Contas a Pagar" na Entrada NF-e

O componente `ContasPagarEntradaSection` hoje é renderizado inline no detalhe. Reorganizar o detalhe da entrada com um `Tabs` (shadcn) contendo:

- Aba **Dados/Itens** (conteúdo atual).
- Aba **Contas a Pagar** (renderiza `ContasPagarEntradaSection`).

Localizar o container que hoje renderiza `<ContasPagarEntradaSection entrada={...} />` (provavelmente em `src/pages/EntradasNfe.tsx` ou no dialog de detalhes) e envolver com `Tabs` / `TabsList` / `TabsContent`.

---

## Detalhes técnicos

- Índice único parcial por tenant garante 1 principal por tenant tanto para granja quanto para safra (padrão já usado).
- Autofills sempre condicionais a "campo vazio" para não atropelar edição do usuário.
- `natureza_operacao` truncado com `.slice(0, 60)` (limite já conhecido da coluna).
- Regeração de CP no update mantém `rateio_modo` / `socio_produtor_id` derivados da inscrição, igual ao create.

## Arquivos afetados

- Migração: `safras.is_principal` + trigger.
- `src/pages/Granjas.tsx`, `src/pages/Safras.tsx`
- `src/hooks/useGranjas.ts`, `src/hooks/useSafras.ts` (+ hooks `usePrincipal`)
- `src/components/entradas-nfe/EntradaNfeFormDialog.tsx`
- `src/hooks/useEntradasNfe.ts` (regerar CP no update)
- `src/pages/EntradasNfe.tsx` (Tabs no detalhe)
- Selects de granja em toda a app que precisam buscar por nome fantasia (levantamento na implementação).
