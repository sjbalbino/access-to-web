## Objetivo

Reproduzir o relatório legado **Entrega por Variedade**: entregas de colheita agregadas por variedade, com hierarquia Local de Entrega → Tipo de Entrega → Produtor → Variedade, e totalizadores em cada nível.

## Layout (retrato)

Cabeçalho: nome do sistema/tenant à esquerda, título "Entrega por Variedade" centralizado, página e data/hora à direita; abaixo, Safra e filtros aplicados.

Colunas: `Inscrição | Nome | CPF | Tipo | Variedade | Depósitos (kg) | Sacos`.

Quebras e subtotais:
```text
Local Entrega: TosAgro
  Tipo de Entrega: Terceiros
    Produtor: CLAUDIO JACO LUDWIG
      472.101.443-0  CLAUDIO...  458.537.380-20  INDUSTRIA  SOJA PATENTE DECLARADA  318.735  5.312
                                                 INDUSTRIA  SOJA INDUSTRIA - KGS    112.789  1.880
      Total Produtor: CLAUDIO JACO LUDWIG --> 2            431.524  7.192
    Total Tipo Entrega: Terceiros --> 10                 1.230.695  ...
  Total Local Entrega: TosAgro --> 10                    1.230.695  ...
Total Geral -->                                          1.230.695  ...
```
O número após a seta (`--> 2`) é a quantidade de linhas/variedades agregadas no grupo, como no legado.

## Regras de cálculo

- Fonte: tabela `colheitas` da safra selecionada (mesma base do relatório Colheita Diária), com `producao_liquida_kg > 0`.
- Agregação: soma de `producao_liquida_kg` por (Local, Tipo de contrato da inscrição, Inscrição/Produtor, Tipo de colheita, Variedade).
- **Sacos = arredondamento de (Kg líquido / 60)** por linha; subtotais somam os kg e recalculam/soma dos sacos.
- Local nulo (`local_entrega_terceiro_id` null) exibido como a sede do tenant.
- Tipo de Entrega vem de `inscricoes_produtor.tipo` (Parceria / Arrendamento / Terceiros).
- CPF: `produtores.cpf_cnpj` com fallback para `inscricoes_produtor.cpf_cnpj`.
- Formatação BR: kg e sacos inteiros com separador de milhar.

## Filtros do card

Safra (obrigatória), Local de Entrega (Todos ou específico; a Sede inclui registros sem local) e Tipo de contrato (Todos/Parceria/Arrendamento/Terceiros). Também respeita as opções já existentes de orientação e tamanho de página.

## Alterações técnicas

- `src/lib/relatoriosPdf.ts`: novo `gerarEntregaVariedadePdf` com tipos `RelEntregaVariedadeRow` / `Params`, seguindo o padrão dos geradores existentes (autoTable com linhas de grupo e subtotal).
- `src/components/relatorios/RelatorioDialog.tsx`: novo tipo `entrega_variedade` em `TipoRelatorio`, label, função `gerarEntregaVariedade()` (query + agregação + exportação para planilha via `setPendingSheets`), e habilitação dos filtros Safra/Local/Tipo para esse tipo.
- `src/pages/Relatorios.tsx`: novo card "Entrega por Variedade" na seção de Produção, com descrição "Entregas agregadas por variedade e produtor".

Nenhuma mudança de banco de dados é necessária.
