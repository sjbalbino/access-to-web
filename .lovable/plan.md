
# Novo relatório: Extrato de Depósitos por Produtor

Novo card em **Relatórios de Produção** que gera o extrato de recebimento (colheitas) idêntico ao legado anexado, com filtros que atendem os dois modos pedidos:

- **Geral** — Produtor + Safra (todas as IEs, agrupado por Local → IE → Dia).
- **Individual** — mesmo formato, com filtro adicional de **IE específica**.

Um único gerador de PDF cobre os dois cenários; o "Individual" é só o mesmo relatório com a IE preenchida.

## Layout do PDF (paisagem, A4)

Cabeçalho fixo: `Extrato de Depósitos — Produtor: {nome} — Safra: {nome}`.

Tabela com as colunas do legado:

```
Data | Roma. | Tipo | Bruto | Tara | Líquido | Imp.% | Imp.Kg | Umi.% | %Um.Desc | Kg Um | Avar | Out. | Kg.Desc. | Líq.Final | Sacos | Acum.Kg | Acum.Sc | PH | Variedade
```

Hierarquia e subtotais:

```text
Local Entrega: {nome}
  Inscrição: {IE} — {Nome/Fantasia}
    {linhas dos romaneios da IE, ordenadas por data}
    Total do Dia -->  contagem + somas do dia + médias ponderadas (Imp.% e Umi.%)
    Total Inscrição --> somas da IE + médias ponderadas
  Total Local Entrega --> somas do local
Total Geral --> somas de tudo
```

Acumulados de Kg e Sacos são cumulativos dentro da IE (como no legado).

## Filtros no `RelatorioDialog`

Para o tipo `extrato_depositos`:
- **Produtor** (obrigatório) — combobox com todos os produtores da granja.
- **Safra** (obrigatório) — `useSafras`.
- **Local de Entrega** (opcional) — filtra apenas um local.
- **Inscrição Estadual** (opcional) — quando preenchida, restringe a uma IE (modo "individual").
- **Orientação** e **Tamanho da página** (já disponíveis no diálogo).

## Fonte dos dados

Query em `colheitas` filtrando por `safra_id` + `inscricao_produtor_id IN (IEs do produtor)` (ou só a IE selecionada), trazendo:
- `inscricoes_produtor` (para agrupar por IE e mostrar nome/IE)
- `locais_entrega` via `local_entrega_terceiro_id` (ou "Sede" quando null → substituir pelo local sede da granja igual aos outros relatórios)
- `produtos` via `variedade_id` (variedade da soja)

Ordenação: Local → IE (por IE decrescente igual ao padrão do sistema) → data ascendente → romaneio ascendente.

## Arquivos a criar/editar

1. `src/lib/relatoriosPdf.ts` — nova função `gerarExtratoDepositosProdutorPdf(params)` com toda a lógica de agrupamento e subtotais (médias ponderadas de Imp.% e Umi.% usando `producao_liquida_kg` como peso).
2. `src/components/relatorios/RelatorioDialog.tsx` — novo caso `extrato_depositos`: query dos dados + campos de filtro (Produtor, Safra, Local opcional, IE opcional).
3. `src/pages/Relatorios.tsx` — novo card **"Extrato de Depósitos"** no grupo Produção/Estoque com o tipo `extrato_depositos`.

Nenhuma migração de banco; nenhum novo hook — reaproveita `useSafras`, `useProdutores`, `useAllInscricoes` e `useLocaisEntrega`.

## Perguntas

1. Confirma que o card único com filtro de IE opcional atende os dois modos (Geral quando IE em branco, Individual quando IE selecionada)? Ou prefere **dois cards separados** na tela de Relatórios?
2. **Tipo** (INDUSTRIA/…) deve vir de `colheitas.tipo_colheita`? Confirmado, mas quero validar antes de codar.
