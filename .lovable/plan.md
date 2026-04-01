
## Plano: Melhorias no formulário de Venda e paginação global

### 1. Mover "Data Prevista Recebimento" para seção de dados da venda
- **Arquivo:** `src/pages/VendaProducaoForm.tsx`
- Reposicionar o campo `data_recebimento` da seção atual para junto dos dados principais da venda (perto de data_contrato, safra, produto)

### 2. Tabela IBGE de Municípios + Select Cidade com código IBGE
- **Migração SQL:** Criar tabela `ibge_municipios` com colunas: `codigo_ibge`, `nome`, `uf`
- **Carga de dados:** Popular via script com todos os municípios brasileiros (API IBGE)
- **Arquivo:** `src/pages/VendaProducaoForm.tsx` — Substituir campo texto "Cidade" do local de entrega por um Combobox pesquisável que lista municípios da tabela IBGE, auto-preenchendo `local_entrega_codigo_ibge` e `local_entrega_cidade` ao selecionar
- **Hook:** Criar `useIbgeMunicipios.ts` para buscar municípios filtrados por UF

### 3. Busca CNPJ no "Local de Entrega"
- **Arquivo:** `src/pages/VendaProducaoForm.tsx`
- Adicionar `onBlur` no campo CNPJ do local de entrega para chamar `useCnpjLookup`
- Auto-preencher: nome, IE, logradouro, número, complemento, bairro, cidade, UF, CEP

### 4. Busca CEP no "Local de Entrega"
- **Arquivo:** `src/pages/VendaProducaoForm.tsx`
- Adicionar `onBlur` no campo CEP do local de entrega para chamar `useCepLookup`
- Auto-preencher: logradouro, bairro, cidade, UF

### 5. Paginação em todas as listas do sistema
Criar um componente/hook reutilizável `usePaginacao` e aplicar em todas as páginas de listagem:

**Páginas que precisam de paginação (não têm ainda):**
- `Cfops.tsx`
- `Placas.tsx`
- `NotasDeposito.tsx`
- `NotasFiscais.tsx`
- `Transportadoras.tsx`
- `Produtores.tsx`
- `Produtos.tsx`
- `GruposProdutos.tsx`
- `Culturas.tsx`
- `Safras.tsx`
- `Silos.tsx`
- `Lavouras.tsx`
- `Granjas.tsx`
- `Ncm.tsx`
- `UnidadesMedida.tsx`
- `LocaisEntrega.tsx`
- `EmitentesNfe.tsx`
- `EntradaColheita.tsx`
- `CompraCereais.tsx`
- `DevolucaoDeposito.tsx`
- `Transferencias.tsx`
- `VendasProducao.tsx`
- `LancamentosFinanceiros.tsx`
- `DreEstrutura.tsx`
- `PlanoContasGerencial.tsx`
- `Tenants.tsx`
- `Usuarios.tsx`
- `RemessasVendaForm.tsx` (lista de remessas)

**Hook reutilizável:** `src/hooks/usePaginacao.ts`
- Recebe array de dados e itens por página (default 20)
- Retorna: dadosPaginados, paginaAtual, totalPaginas, setPaginaAtual, gerarNumerosPaginas

**Componente reutilizável:** `src/components/ui/table-pagination.tsx`
- Componente pronto com Anterior/Próximo, números de página, contagem de registros

### Ordem de execução
1. Hook + componente de paginação reutilizável
2. Migração tabela IBGE + carga de dados
3. Hook useIbgeMunicipios
4. Alterações no VendaProducaoForm (data recebimento, CNPJ, CEP, cidade IBGE)
5. Aplicar paginação em todas as páginas

### Arquivos criados
- `src/hooks/usePaginacao.ts`
- `src/components/ui/table-pagination.tsx`
- `src/hooks/useIbgeMunicipios.ts`
- 1 migração SQL (tabela ibge_municipios)

### Arquivos alterados
- `src/pages/VendaProducaoForm.tsx`
- ~28 páginas de listagem (adicionar paginação)
