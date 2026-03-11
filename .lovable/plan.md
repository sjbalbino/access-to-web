
## Relatorios Gerenciais e Extratos dos Produtores

### Objetivo
Criar uma nova pagina de Relatorios com tres relatorios principais em PDF:
1. **Extrato do Produtor** - Movimentacao completa de um produtor (colheitas, transferencias, devolucoes, notas de deposito)
2. **Relatorio de Colheitas** - Listagem de colheitas com filtros e totalizadores
3. **Relatorio de Vendas** - Resumo dos contratos de venda com remessas

---

### Estrutura

#### 1. Nova pagina: `src/pages/Relatorios.tsx`
Pagina central de relatorios com cards para cada tipo de relatorio. Cada card abre um dialog com filtros especificos e botao para gerar o PDF.

**Layout:**
```text
+--------------------------------------------------+
| PageHeader: Relatorios Gerenciais                |
+--------------------------------------------------+
| +----------------+ +----------------+ +---------+ |
| | Extrato do     | | Relatorio de   | | Relat.  | |
| | Produtor       | | Colheitas      | | Vendas  | |
| | [Gerar]        | | [Gerar]        | | [Gerar] | |
| +----------------+ +----------------+ +---------+ |
+--------------------------------------------------+
```

#### 2. Novo arquivo: `src/lib/relatoriosPdf.ts`
Funcoes de geracao de PDF seguindo o padrao ja existente em `contratoVendaPdf.ts` (jsPDF + autoTable).

**2.1 - Extrato do Produtor**
Filtros: Safra, Produtor/Inscricao, Produto, Periodo (data inicial/final)

Conteudo do PDF:
- Cabecalho com dados do produtor (nome, CPF/CNPJ, inscricao estadual)
- Secao COLHEITAS: tabela com data, lavoura, peso bruto, tara, liquido, umidade, impureza, descontos, producao liquida
- Secao TRANSFERENCIAS RECEBIDAS: data, origem, quantidade kg
- Secao TRANSFERENCIAS ENVIADAS: data, destino, quantidade kg
- Secao DEVOLUCOES: data, quantidade, taxa armazenagem, kg taxa
- Secao NOTAS DE DEPOSITO: data, nota fiscal, quantidade
- RESUMO FINAL: Total Colheitas + Transf.Recebidas - Transf.Enviadas - Devolucoes - kg_Taxa = Saldo

**2.2 - Relatorio de Colheitas**
Filtros: Safra, Produto, Silo, Periodo, Tipo (propria/terceiro)

Conteudo do PDF:
- Tabela com: Data, Produtor, Lavoura, Placa, Peso Bruto, Tara, Liquido, Umidade%, Impureza%, Desc.Total, Prod.Liquida, Sacas
- Totalizadores no rodape: Total Peso Bruto, Total Prod.Liquida, Total Sacas
- Subtotais por produtor (opcional)

**2.3 - Relatorio de Vendas**
Filtros: Safra, Comprador, Periodo

Conteudo do PDF:
- Tabela de contratos: Numero, Data, Comprador, Produto, Qtde Contratada, Preco/kg, Valor Total, Carregado, Saldo
- Totalizadores: Total Contratado, Total Carregado, Total Saldo, Valor Total
- Detalhamento de remessas por contrato (opcional, com sub-tabela)

#### 3. Novo componente: `src/components/relatorios/RelatorioDialog.tsx`
Dialog reutilizavel com filtros dinamicos para cada tipo de relatorio. Contem selects para Safra, Produtor, Produto, datas, e botao "Gerar PDF".

#### 4. Atualizacoes
- **`src/App.tsx`**: Adicionar rota `/relatorios`
- **`src/components/layout/AppSidebar.tsx`**: Adicionar item "Relatorios" no grupo "Comercial" com icone `BarChart3`

---

### Secao Tecnica

**Queries para o Extrato do Produtor:**
- Colheitas: `SELECT * FROM colheitas WHERE inscricao_produtor_id = ? AND safra_id = ? [AND variedade_id = ?] [AND data_colheita BETWEEN ? AND ?]` com joins em lavouras, silos, placas, produtos
- Transferencias recebidas: `SELECT * FROM transferencias_deposito WHERE inscricao_destino_id = ? AND safra_id = ?`
- Transferencias enviadas: `SELECT * FROM transferencias_deposito WHERE inscricao_origem_id = ? AND safra_id = ?`
- Devolucoes: `SELECT * FROM devolucoes_deposito WHERE inscricao_produtor_id = ? AND safra_id = ?`
- Notas deposito: `SELECT * FROM notas_deposito_emitidas WHERE inscricao_produtor_id = ? AND safra_id = ?`

**Queries para Relatorio de Colheitas:**
- `SELECT * FROM colheitas` com joins em inscricoes_produtor, produtores, lavouras, silos, placas, produtos, filtrando por safra/produto/silo/periodo

**Queries para Relatorio de Vendas:**
- Usa `useContratosVenda` existente com filtros, e `remessas_venda` para detalhamento

**Geracao PDF:** Usa `jsPDF` + `jspdf-autotable` (ja instalados). Download direto via blob URL (mesmo padrao de `contratoVendaPdf.ts`).

**Formatacao:** Todas as colunas numericas/moeda alinhadas a direita, datas centralizadas, texto a esquerda. Formatacao brasileira (separador milhar ponto, decimal virgula).

### Arquivos a criar/modificar
- Criar: `src/pages/Relatorios.tsx`
- Criar: `src/lib/relatoriosPdf.ts`
- Criar: `src/components/relatorios/RelatorioDialog.tsx`
- Modificar: `src/App.tsx` (nova rota)
- Modificar: `src/components/layout/AppSidebar.tsx` (novo item menu)
