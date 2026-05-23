## Contexto

No sistema legado em Access, quando o sócio vende sua produção, ele emite uma **NFe de venda** (saída). O comprador (cooperativa/cerealista/indústria), por sua vez, emite uma **contra-nota** (nota fiscal de entrada / nota de produtor rural) que representa o **valor efetivamente reconhecido como receita** — geralmente próximo, mas não idêntico ao valor da NFe do sócio (ajustes de classificação, umidade, impurezas, frete, etc.).

Para fins de **Imposto de Renda do Produtor Rural / Livro Caixa**, a **receita correta é a da contra-nota do comprador**, não a da NFe que o sócio emitiu.

Hoje no sistema:
- O Contas a Receber é gerado a partir do `contrato_venda` usando `valor_total` do contrato (= valor da NFe do sócio).
- Os relatórios IR somam `lancamento_rateio_socios.valor` derivado desse `valor_original`.
- Não existe vínculo entre a **NFe de entrada emitida pelo comprador** (já cadastrável em `entradas_nfe`) e o **contrato de venda / contas a receber** do sócio.

## Objetivo

Permitir registrar a contra-nota do comprador, vinculá-la ao contrato de venda do sócio, e fazer com que **a receita do sócio para fins de IR/Livro Caixa seja baseada no valor da contra-nota** (quando existir), mantendo o valor original do contrato/NFe para o controle comercial.

## Banco de dados

### 1. Vínculo da contra-nota
Em `entradas_nfe`, adicionar:
- `contrato_venda_id UUID` (FK opcional para `contratos_venda`) — marca a entrada como contra-nota daquela venda.
- `eh_contra_nota BOOLEAN DEFAULT false` — flag visual/lógica.

Alternativa equivalente em `contratos_venda`:
- `contra_nota_entrada_id UUID` (FK para `entradas_nfe`) e `valor_contra_nota NUMERIC`.

Usaremos **as duas pontas** (FK em `entradas_nfe` + cache `valor_contra_nota` em `contratos_venda`) para facilitar query e relatórios. Trigger atualiza `valor_contra_nota` quando a entrada é vinculada/atualizada/desvinculada.

### 2. Coluna em `contas_receber`
- `valor_receita_ir NUMERIC` — valor a ser considerado nos relatórios IR (preenchido automaticamente: contra-nota proporcional à parcela; fallback = `valor_original`).

### 3. Trigger / função
`atualizar_valor_receita_ir(contrato_id)`:
- Se contrato tem contra-nota vinculada com valor X → distribui X proporcionalmente entre as parcelas de `contas_receber` daquele contrato.
- Senão → `valor_receita_ir = valor_original`.
- Dispara em insert/update de `entradas_nfe.contrato_venda_id` ou `valor_total`, e em insert/delete de parcelas.

### 4. Ajuste no rateio
`gerar_rateio_socios` para `cr` passa a usar `valor_receita_ir` (com fallback para `valor_original`) ao gravar `lancamento_rateio_socios.valor`.

## UI

### a) `ContasReceberContratoSection` (dentro do Contrato de Venda)
Acima da tabela de parcelas, novo bloco "Contra-Nota do Comprador":
- Se vazio: botão **"Vincular Contra-Nota"** → dialog com 2 abas:
  - **Buscar entrada existente** (lista `entradas_nfe` do tenant, filtra por fornecedor = comprador do contrato).
  - **Importar XML da contra-nota** (reusa `parseNfeXml`, cria nova `entrada_nfe` já vinculada ao contrato).
- Se vinculada: card com número, série, data, valor, e botões **Ver entrada** / **Desvincular**.

Na tabela de parcelas, nova coluna **"Receita IR"** ao lado de "Valor", mostrando `valor_receita_ir` (destacada em âmbar quando diferente do valor original).

### b) `ContraNotaDialog` (existente)
Não mexer — é outro fluxo (devolução). Renomear é opção futura; nesta entrega usamos um dialog próprio (`VincularContraNotaDialog`).

### c) Página de Entradas NFe
- Novo filtro/badge "Contra-nota de venda" quando `eh_contra_nota = true`.
- Coluna "Contrato vinculado" exibindo número do contrato.

### d) Importação NFe da entrada (XML do comprador)
Quando o XML importado tiver como destinatário um sócio/inscrição cadastrada **e** referenciar a chave de uma NFe de venda já emitida pelo sistema, sugere automaticamente o vínculo (pop-up confirmatório).

## Relatórios IR

`relatoriosIR.ts`:
- **Demonstrativo Gerencial por Sócio**: a receita por sócio passa a usar `lancamento_rateio_socios.valor` (já alimentado pelo `valor_receita_ir`). Mostra nota de rodapé: "Receita de venda de produção baseada na contra-nota do comprador quando disponível".
- **Livro Caixa do Produtor Rural**: igual — receita = valor da contra-nota; data do evento = data de emissão da contra-nota (não da NFe de saída do sócio). Histórico passa a referenciar nº da contra-nota.

## Importação CR/CP

Em `importacaoConfig.ts`, adicionar colunas opcionais para CR:
- `contra_nota_numero` / `contra_nota_chave` → resolve para `entradas_nfe.id` (se existir) e grava o vínculo + `valor_receita_ir`.

## Migração de dados

Para contratos já existentes: `valor_receita_ir = valor_original` (sem mudança até o usuário vincular a contra-nota manualmente).

## Arquivos a criar/editar

**Criar:**
- Migration SQL (colunas + função + triggers + ajuste em `gerar_rateio_socios`)
- `src/components/contas/VincularContraNotaDialog.tsx`
- `src/hooks/useContraNotaVenda.ts`

**Editar:**
- `src/components/contas/ContasReceberContratoSection.tsx` (bloco contra-nota + coluna Receita IR)
- `src/pages/ContasReceber.tsx` (coluna opcional Receita IR)
- `src/pages/EntradasNfe.tsx` (badge + filtro + coluna contrato)
- `src/components/entradas-nfe/EntradaNfeFormDialog.tsx` (campo "Contrato de venda vinculado")
- `src/components/entradas-nfe/ImportarXmlDialog.tsx` (detecção automática via chave referenciada)
- `src/lib/relatoriosIR.ts` (legenda + uso de valor_receita_ir)
- `src/lib/importacaoConfig.ts` (colunas contra-nota em CR)
- `src/hooks/useContasReceber.ts` (incluir valor_receita_ir)
- `src/hooks/useEntradasNfe.ts` (incluir contrato_venda_id, eh_contra_nota)

## Observações

- A contra-nota é uma `entrada_nfe` "especial": continua participando do estoque/Contas a Pagar normalmente **só se o usuário marcar** — geralmente não, porque o sócio não está pagando nada. Por padrão, ao marcar `eh_contra_nota = true`, **não** gera CP automático (já era manual de qualquer forma).
- A regra "receita = contra-nota" só vale para CR de venda da produção (com `contrato_venda_id`). CR avulso continua usando `valor_original`.
- Multi-tenant respeitado em todas as queries.