## Objetivo
No formulário de Nota Fiscal, seção **Destinatário**, o campo "Importar de Cliente/Fornecedor" hoje é um Select simples. Com 1.000+ clientes fica inviável rolar. Vamos torná-lo pesquisável (digitar nome / CPF / CNPJ).

## Alteração
- **Arquivo:** `src/pages/NotaFiscalForm.tsx` (linhas 1479–1491)
- Substituir o `<Select>` por `<ComboboxFilter>` (`src/components/ui/combobox-filter.tsx`), padrão já adotado no projeto (memória "Searchable Combobox").
- Opções:
  - `value`: `cliente.id`
  - `label`: `nome` (+ `nome_fantasia` quando houver)
  - `sublabel`: `cpf_cnpj`
- Placeholder: "Selecione para importar dados"
- Search placeholder: "Buscar por nome, CPF ou CNPJ..."
- `allLabel`: ocultar/usar "Limpar seleção" (passar string vazia dispara reset; ajustar `handleClienteSelect` para ignorar valor vazio).
- Manter `disabled={isReadOnly}`.

## Escopo
- Apenas esse campo. Os demais selects da tela permanecem inalterados (a menos que solicitado depois).
- Sem mudanças de backend, hooks ou regras de negócio.
