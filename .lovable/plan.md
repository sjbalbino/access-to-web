## Objetivo

Permitir que cada movimentação financeira (Lançamentos, Contas a Pagar, Contas a Receber e suas baixas) seja atribuída a um sócio específico **ou** rateada automaticamente pelo percentual de participação dos sócios na granja. No final, gerar:

1. **Demonstrativo gerencial por sócio** (receitas e despesas do período, agrupadas).
2. **Livro Caixa do Produtor Rural** por sócio (modelo Receita Federal).

## Banco de dados

### 1. Garantir % de participação por sócio na granja
Verificar/garantir coluna `percentual_participacao NUMERIC(5,2)` na tabela que liga sócio↔granja (`inscricoes_socio` ou equivalente). Soma por granja deve fechar em 100% (validação informativa, não bloqueia).

### 2. Nova tabela de rateio (única, polimórfica)
```
lancamento_rateio_socios
  id, origem_tipo ('lancamento'|'cp'|'cr'|'cp_baixa'|'cr_baixa'),
  origem_id (uuid), socio_inscricao_id (uuid),
  percentual NUMERIC(5,2), valor NUMERIC(14,2),
  tenant_id, created_at
```
Índice em (origem_tipo, origem_id). RLS por tenant. Constraint: soma de % por origem = 100.

### 3. Campo de modo nas origens
Em `lancamentos_financeiros`, `contas_pagar`, `contas_receber`, `contas_pagar_baixas`, `contas_receber_baixas`:
- `rateio_modo TEXT` ('socio_unico' | 'rateio_granja' | 'manual'), default `'rateio_granja'`
- `socio_inscricao_id UUID` (usado quando modo = 'socio_unico')

### 4. Trigger de geração automática de rateio
Após insert/update da origem, função `gerar_rateio_socios(origem_tipo, origem_id)` regrava `lancamento_rateio_socios`:
- modo `socio_unico` → 1 linha com 100% / valor total
- modo `rateio_granja` → 1 linha por sócio da granja com o % cadastrado
- modo `manual` → não toca (UI grava)

Baixas herdam o modo do título por padrão (sobrescrevível).

## UI

### Em todos os formulários financeiros
Novo bloco "Atribuição ao Sócio" com 3 opções (radio):
- **Sócio único** → combobox de sócios da granja
- **Rateio por participação da granja** (default) → mostra preview da divisão
- **Rateio manual** → tabela editável (sócio + %), valida soma = 100

### Default inteligente
- **Venda da Produção / CR vinculado a contrato** → modo `socio_unico` pré-selecionado com o produtor emitente da NFe.
- **Entrada NFe / CP vinculado** → default `rateio_granja`.
- **Lançamento avulso** → default `rateio_granja`.

## Relatórios (novo menu "Relatórios IR")

### A. Demonstrativo Gerencial por Sócio (PDF)
Filtros: período, granja, sócio (opcional), safra.
Agrupado por sócio → subgrupo por DRE conta → linhas de receita/despesa. Totais por sócio e geral. Usa `lancamento_rateio_socios.valor`.

### B. Livro Caixa do Produtor Rural (PDF)
Layout RFB: data | histórico | nº doc | entradas | saídas | saldo. Um livro por sócio (ou múltiplos). Considera apenas **baixas efetivas** (regime de caixa), não títulos em aberto.

## Integração com módulos existentes

- `VendaProducaoForm` / `ContasReceberContratoSection`: passar `socio_inscricao_id` do produtor emitente como default `socio_unico`.
- `EntradaNfeFormDialog` / `ContasPagarEntradaSection`: default `rateio_granja`.
- `LancamentosFinanceiros`: adicionar bloco de atribuição no dialog.
- `BaixasDialog`: herdar do título; permitir override.

## Importação CR/CP

Adicionar colunas opcionais em `importacaoConfig.ts`:
- `socio_codigo` / `socio_cpf` → resolve para `socio_inscricao_id` + define modo `socio_unico`
- Se vazio → `rateio_granja`

## Migração de dados existentes

Script roda `gerar_rateio_socios` para todos os registros já existentes em modo `rateio_granja` (default seguro).

## Arquivos a criar/editar

**Criar:**
- Migration SQL (tabela + colunas + função + triggers)
- `src/hooks/useRateioSocios.ts`
- `src/components/contas/AtribuicaoSocioSection.tsx` (componente reutilizável: radio + combobox + tabela manual)
- `src/lib/relatoriosIR.ts` (PDF demonstrativo + livro caixa)
- `src/pages/RelatoriosIR.tsx`

**Editar:**
- `src/pages/LancamentosFinanceiros.tsx` (dialog)
- `src/components/contas/ContaFormDialog.tsx`
- `src/components/contas/BaixasDialog.tsx`
- `src/components/contas/ContasReceberContratoSection.tsx` (default sócio)
- `src/components/contas/ContasPagarEntradaSection.tsx`
- `src/lib/importacaoConfig.ts` (colunas sócio em CR/CP)
- `src/App.tsx`, `src/components/layout/AppSidebar.tsx` (rota Relatórios IR)

## Observações

- Rateio é armazenado materializado (`valor` calculado) para performance e auditoria — recalcula via trigger sempre que origem ou % muda.
- Livro Caixa usa apenas movimentações efetivas (baixas + lançamentos diretos), não títulos em aberto.
- Multi-tenant respeitado em todas as tabelas e relatórios.