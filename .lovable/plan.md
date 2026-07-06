## O que fazer

### 1. Permitir CPF ou CNPJ no cadastro de Transportadora
Em `src/pages/Transportadoras.tsx`, transformar o campo hoje rotulado "CNPJ" em **"CPF/CNPJ"** com detecção automática pelo número de dígitos:

- Label muda para `CPF/CNPJ`.
- Formatação dinâmica: usa `formatCpf` quando ≤ 11 dígitos, `formatCnpj` quando > 11 (via helper `formatCpfCnpj` já existente em `src/lib/formatters.ts`).
- Placeholder: `000.000.000-00 ou 00.000.000/0000-00`, `maxLength=18`.
- `onBlur`: apenas dispara `fetchCnpj` quando o valor limpo tiver 14 dígitos (CPF não tem lookup público).
- Validação em `handleSave`: se 11 dígitos → `validateCpf`; se 14 → `validateCnpj`; qualquer outro tamanho preenchido → erro "CPF/CNPJ inválido".
- Coluna da lista continua exibindo o valor formatado (`formatCpfCnpj`).

Nenhuma mudança de schema é necessária — a coluna `cpf_cnpj` já é livre.

### 2. Atualizar cadastros antigos sem motorista/CPF padrão
Executar um `UPDATE` único para preencher, nas transportadoras que **não têm** motorista padrão nem CPF do motorista padrão, esses campos com o nome/razão social e CPF/CNPJ da própria transportadora. Isso garante que, ao selecionar essas transportadoras numa remessa, o motorista e documento sejam preenchidos automaticamente (mesmo comportamento que hoje só acontece com quem preencheu o padrão).

Regras:
- Só atualiza quando `motorista_padrao IS NULL AND motorista_cpf_padrao IS NULL`.
- `motorista_padrao = nome`.
- `motorista_cpf_padrao = cpf_cnpj` (apenas se `cpf_cnpj` não for nulo).

## Detalhes técnicos
- Reuso de `formatCpfCnpj`, `validateCpf`, `validateCnpj` já disponíveis em `@/lib/formatters`.
- `useCnpjLookup` roda somente para CNPJs de 14 dígitos — evita chamada indevida quando for CPF.
- Update de dados executado via ferramenta de insert (não migração), pois é atualização de dados, não schema.

## Arquivos afetados
- editar `src/pages/Transportadoras.tsx`
- 1 comando UPDATE em `public.transportadoras`
