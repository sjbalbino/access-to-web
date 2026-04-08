
## Módulo: Entrada de Produtos no Estoque via NF-e de Compra

### Visão Geral
Novo módulo para dar entrada de produtos no estoque a partir de Notas Fiscais de compra de fornecedores, com duas formas de entrada: importação de XML e digitação manual.

---

### 1. Nova Tabela: `entradas_nfe`
Armazena o cabeçalho da NF-e de entrada:
- `granja_id`, `fornecedor_id` (clientes_fornecedores)
- `numero_nfe`, `serie`, `chave_acesso`, `data_emissao`, `data_entrada`
- `cfop_id`, `natureza_operacao`
- Totais: `valor_produtos`, `valor_frete`, `valor_seguro`, `valor_desconto`, `valor_outras_despesas`, `valor_ipi`, `valor_icms`, `valor_icms_st`, `valor_pis`, `valor_cofins`, `valor_total`
- `modo_entrada` ('xml' | 'manual')
- `status` ('pendente' | 'conferido' | 'finalizado')
- `observacoes`, `xml_content` (text, para guardar o XML original)

### 2. Nova Tabela: `entradas_nfe_itens`
Itens de cada entrada:
- `entrada_nfe_id`, `produto_id` (nullable até vincular), `produto_xml_codigo`, `produto_xml_descricao`, `produto_xml_ncm`
- `cfop`, `unidade_medida`, `quantidade`, `valor_unitario`, `valor_total`
- `valor_desconto`, `valor_frete_rateio`
- `cst_icms`, `base_icms`, `aliq_icms`, `valor_icms`
- `cst_ipi`, `base_ipi`, `aliq_ipi`, `valor_ipi`
- `cst_pis`, `base_pis`, `aliq_pis`, `valor_pis`
- `cst_cofins`, `base_cofins`, `aliq_cofins`, `valor_cofins`
- `lote`, `data_validade`
- `vinculado` (boolean - se já foi associado a um produto do sistema)
- `quantidade_conferida` (para etapa de conferência)

### 3. Parser de XML da NF-e
Função client-side em `src/lib/nfeXmlParser.ts`:
- Lê o XML da NF-e (padrão SEFAZ layout 4.00)
- Extrai dados do emitente (fornecedor), destinatário, produtos, totais e impostos
- Valida se o CNPJ/CPF do destinatário corresponde à granja selecionada
- Retorna objeto estruturado pronto para preencher o formulário

### 4. Página `EntradasNfe` (listagem)
- Rota `/entradas-nfe`
- Listagem com filtros: período, fornecedor, status
- Colunas: Número NF-e, Série, Fornecedor, Data Emissão, Valor Total, Status, Modo (XML/Manual), Ações
- Botões: "Importar XML" e "Entrada Manual"

### 5. Formulário de Entrada (`EntradaNfeForm`)
**Modo XML:**
- Upload de arquivo(s) XML (individual ou múltiplos)
- Parser extrai todos os dados automaticamente
- Sistema tenta vincular produtos pelo código do fornecedor (`cod_fornecedor` da tabela produtos) ou NCM
- Itens não vinculados ficam destacados para o usuário selecionar/criar produto
- Botão para criar produto novo a partir dos dados do XML

**Modo Manual:**
- Formulário completo: dados do fornecedor, número NF-e, série, chave, CFOP, datas
- Grid de itens com todos os campos fiscais (CST, base, alíquota, valor para ICMS/IPI/PIS/COFINS)
- Seleção de produto do sistema ou cadastro rápido

### 6. Fluxo de Estoque (Configurável)
- **Entrada direta**: Ao confirmar, cria registros em `estoque_produtos` (soma quantidade se já existe lote/granja/produto)
- **Com conferência**: Status 'pendente' → usuário confere quantidades → status 'conferido' → confirma entrada → 'finalizado'
- Checkbox na tela para escolher o modo

### 7. Hooks e Integrações
- `useEntradasNfe.ts` — CRUD da tabela entradas_nfe
- `useEntradasNfeItens.ts` — CRUD dos itens
- Integração com `useEstoqueProdutos` para movimentação
- Integração com `useClientesFornecedores` para vincular fornecedor pelo CNPJ do XML

### 8. Menu lateral
- Adicionar "Entradas NF-e" no menu, agrupado com Produtos/Estoque

### Arquivos a criar
- `src/lib/nfeXmlParser.ts`
- `src/hooks/useEntradasNfe.ts`
- `src/hooks/useEntradasNfeItens.ts`
- `src/pages/EntradasNfe.tsx`
- `src/components/entradas-nfe/EntradaNfeForm.tsx`
- `src/components/entradas-nfe/ImportarXmlDialog.tsx`
- `src/components/entradas-nfe/VincularProdutoDialog.tsx`
- `src/components/entradas-nfe/ItensNfeGrid.tsx`

### Arquivos a modificar
- `src/App.tsx` — nova rota
- `src/components/layout/AppSidebar.tsx` — novo item de menu
- `src/lib/routeMap.ts` — mapeamento de rota
