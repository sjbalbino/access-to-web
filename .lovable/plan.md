## Objetivo

Adicionar o tipo de pessoa **"Estrangeiro"** (conforme NT SEFAZ 2025.002) nos cadastros de **Clientes/Fornecedores** e **Locais de Entrega**, alinhando-os ao que já existe em **Produtores**.

Observação: o banco já aceita o valor (campo `tipo_pessoa` é `varchar` livre, sem CHECK constraint), então **não há migration necessária**.

## Mudanças

### 1. `src/pages/ClientesFornecedores.tsx`
- Adicionar `<SelectItem value="estrangeiro">Estrangeiro</SelectItem>` no Select "Tipo Pessoa".
- Tratar `estrangeiro` no rótulo e formatação do documento:
  - Label dinâmico: `CPF` | `CNPJ` | `ID Estrangeiro`
  - Quando `estrangeiro`: input livre (sem máscara, sem `formatCpf/formatCnpj`, sem validação de módulo 11, sem `maxLength` fixo).
  - `handleCnpjBlur` só executa se `tipo_pessoa === 'juridica'` (já é o caso).
  - Validação `validateCpf`/`validateCnpj` só roda para `fisica`/`juridica` (pular para `estrangeiro`).

### 2. `src/pages/LocaisEntrega.tsx`
- Mesmas alterações do item 1 no Select e na lógica do documento.
- Ajustar a condição `if (formData.tipo_pessoa === "juridica" && formData.cpf_cnpj)` permanece — apenas adicionar opção e tratar label/máscara para `estrangeiro`.

### 3. `src/lib/importacaoConfig.ts`
- Atualizar comentário/observação do modelo de importação de `clientes_fornecedores` e `locais_entrega` para listar os 3 valores aceitos: `fisica`, `juridica`, `estrangeiro`.

## Fora de escopo
- Nenhuma alteração no schema do banco.
- Nenhuma alteração em `Produtores` (já suporta).
- Nenhuma alteração em emissão de NF-e (`EmitirNfeAutomaticoDialog` já mapeia conforme NT 2025).
