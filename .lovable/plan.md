## Objetivo
Criar novo relatório **"Resumo da Colheita por Lavoura"** (Relatório da colheita das Lavouras) baseado no sistema legado, exibindo uma linha por **Lavoura** com os totais consolidados de todas as colheitas da safra.

## Filtros (dialog)
- **Safra** (obrigatório) — igual aos demais relatórios de produção.
- **Tipo Produtor** — radio: Particular / Arrendamento / Terceiros / Todos (usa `tipo_contrato` da inscrição do produtor, mesmo padrão do relatório Colheita Diária já implementado).

## Estrutura do PDF (paisagem)
Cabeçalho:
- Título: `Relatório da colheita das Lavouras`
- Linha esquerda: `SAFRA: <nome>` · Centro: `CULTURA: <nome da cultura da safra>` · Direita: `Tipo Produtor: <opção>`

Agrupamento hierárquico (ordem):
1. **CULTURA** (uma seção por cultura, no caso de safras com múltiplas culturas normalmente será só uma)
2. **LOCAL ENTREGA:** `<Nome do local>` — subgrupo
3. Linhas de **LAVOURA** — uma linha por lavoura com totais agregados
4. **Subtotal do local** (nome do local em negrito)
5. Após todos os locais, subtotal por **Tipo Produtor** (ex.: `Particular ===>`)
6. Subtotal **LOCAL ENTREGA —>** (soma todos os locais)
7. **TOTAL GERAL —>**

## Colunas (16)
`LAVOURA | Qtd | Kgs.Bruto | %Imp. | Kgs.Imp. | %Umid. | %Desc. | Kgs.Umid. | %Avar. | Kgs.Avar. | %Outr. | Kgs.Outr. | Kgs.Desc. | Kgs.Liquido | SACOS | HA | MÉDIA`

- **Qtd** aparece apenas nos subtotais (nº de cargas/colheitas). Nas linhas de lavoura fica em branco.
- **%Imp./%Umid./%Desc./%Avar./%Outr.** nas linhas de lavoura = **média ponderada por Kgs.Bruto** das colheitas daquela lavoura. Nos subtotais, também ponderada pelo bruto do grupo.
- **HA** = HA da lavoura (uma única vez por lavoura). Nos subtotais = soma dos HAs distintos das lavouras do grupo (mesma regra da Colheita Diária).
- **MÉDIA** = `SACOS / HA` (sacos por hectare — mesmo padrão da Colheita Diária).

## Implementação

### 1. `src/lib/relatoriosPdf.ts`
Nova função `gerarResumoColheitaLavouraPdf(params)`:
- Tipos `RelResumoColheitaRow` (uma colheita) e agregador por lavoura.
- Layout paisagem A4, jsPDF + autoTable, seguindo o mesmo estilo da Colheita Diária (fontes, cores, alinhamentos: texto à esquerda, números à direita).
- Agrupamento em memória: `cultura → local_entrega → controle_lavoura`.
- Cálculo de médias ponderadas e deduplicação de HA por `controle_lavoura_id`.
- `entregarRelatorio(doc, filename)` para integração com o preview.

### 2. `src/components/relatorios/RelatorioDialog.tsx`
- Adicionar `tipo === "resumo_colheita_lavoura"`:
  - Renderizar filtros: Safra + Tipo Produtor (radio, reaproveitando o do Colheita Diária).
  - Função `gerarResumoColheitaLavoura()`: consultar `colheitas` filtrando por `safra_id` e (via join) `tipo_contrato` da inscrição do produtor. Trazer campos necessários (bruto, %/kgs de impureza, umidade, avaria, outros, líquido, sacos, controle_lavoura_id, ha, nome da lavoura, local de entrega, cultura, tipo_contrato).
  - Montar `sheets` (Excel) equivalentes à estrutura do PDF (linhas por lavoura + subtotais).
  - Chamar `gerarResumoColheitaLavouraPdf`.

### 3. `src/pages/Relatorios.tsx`
- Adicionar novo tipo `"resumo_colheita_lavoura"` em `TipoRelatorio`.
- Novo card na seção **Produção / Estoque**:
  - Título: `Resumo da Colheita por Lavoura`
  - Descrição: `Totais consolidados por lavoura na safra`
  - Detalhe: `Agrupado por cultura e local de entrega, com médias ponderadas de impureza/umidade/avaria e média em sacos/HA.`
  - Ícone: `Wheat` (verde), primário: true.

## Detalhes técnicos
- **Filtro Tipo Produtor**: reaproveitar helper já existente no fluxo Colheita Diária. Se `Todos`, sem filtro.
- **Média ponderada por bruto**: `Σ(percentual_linha × bruto_linha) / Σ(bruto_linha)`. Se soma dos brutos = 0, retorna 0.
- **Ordenação**: culturas alfabéticas → locais alfabéticos → lavouras alfabéticas.
- **Formatação**: números pt-BR, sem casas decimais em kgs/sacos/HA (HA com 2 casas conforme legado: `1,00`), percentuais com 2 casas.
- Nenhuma mudança de schema/RLS.

## Arquivos alterados
- `src/lib/relatoriosPdf.ts` (nova função exportada)
- `src/components/relatorios/RelatorioDialog.tsx` (novo case)
- `src/pages/Relatorios.tsx` (novo card + tipo)
