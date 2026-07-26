## Objetivo

Hoje a seção Comercial tem apenas o **Relatório de Vendas** (agrupado por Comprador). O print do sistema legado é o **Extrato Venda da Produção**, que é o extrato do **Vendedor (Sócio / Inscrição do Produtor)**, listando os contratos e agrupando por Comprador e Tipo de entrega, com colunas de sacos, tonelada, valor, remessa e saldo.

## O que será criado

Um novo card em Relatórios > Comercial: **Extrato Venda da Produção**.

### Filtros no diálogo
- Safra (obrigatório)
- Vendedor: Inscrição do Produtor (opcional — em branco lista todas as IEs, cada uma em seu bloco)
- Comprador (opcional)
- Período por data do contrato (opcional)
- Orientação e tamanho da página (mesmo padrão dos demais)

### Estrutura do PDF (espelhando o print)
```text
Extrato Venda da Produção                Pág. X de Y
SAFRA: SOJA 2025/2026        CULTURA: SOJA      data/hora
VENDEDOR: MARCIO GRINGS - BOA VISTA DO INCRA

DATA      CONTR.    PRODUTO              SACOS  VALOR  TONELADA   TOTAL      REMESSA    SALDO
25/04/26  10005404  SOJA INDUSTRIA-KGS   10.072  0,00  604.340    1.250.000  604.340    0,000
              TIPO --> INDUSTRIA         10.072        604.340    1.250.000  604.340    0,000
TOTAL COMPRADOR -> BUNGE ALIMENTOS S/A          604.340  1.250.000  604.340    0,000
...
TOTAL VENDEDOR -> ...                          (totais gerais do bloco)
```

Regras de cálculo:
- SACOS = quantidade contratada / 60 (padrão do sistema)
- TONELADA = quantidade contratada em kg
- TOTAL = valor total do contrato
- REMESSA = soma de `kg_remessa` das remessas não canceladas do contrato
- SALDO = quantidade contratada − remessa
- Agrupamento: **Vendedor (inscrição) → Comprador → Tipo (Indústria/Semente)** com subtotais em cada nível e total geral por vendedor

## Detalhes técnicos

- `src/lib/relatoriosPdf.ts`: nova função `gerarExtratoVendaProducaoPdf` (autoTable com linhas de cabeçalho/subtotal estilizadas, seguindo o padrão já usado em `gerarRelatorioVendasPdf`).
- `src/components/relatorios/RelatorioDialog.tsx`:
  - novo tipo `extrato_venda_producao`;
  - função `gerarExtratoVendaProducao` que consulta `contratos_venda` (join `comprador`, `produto`, `inscricao_produtor`, `safra.cultura`) e agrega as remessas por contrato via `remessas_venda`;
  - filtro de Inscrição/Vendedor alimentado pelas inscrições que possuem contratos na safra;
  - exportação para planilha (`pendingSheets`) como nos demais relatórios.
- `src/pages/Relatorios.tsx`: card na seção Comercial.
- Formatação BR (datas dd/MM/yyyy, milhares com separador, valores em R$), números à direita, texto à esquerda, conforme padrão de PDF do projeto.

Nenhuma alteração de banco de dados é necessária.
