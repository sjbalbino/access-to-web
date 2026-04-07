

## Plano: Campos obrigatórios, formatação de IE e listagem expandida

### Contexto
O formulário de Inscrição Estadual não valida campos obrigatórios para emissão de NF-e, não formata a IE (padrão XXX.XXX.XXX-X), e a tabela de listagem não mostra todos os campos relevantes por estar estreita.

### Alterações em `src/components/produtores/InscricoesTab.tsx`

**1. Campos obrigatórios para NF-e com validação no Salvar**

Marcar como obrigatórios (com asterisco vermelho no Label) e validar antes de salvar:
- Nome / Razão Social
- Inscrição Estadual
- CPF/CNPJ
- Tipo de Contrato
- Granja
- CEP
- Logradouro
- Número
- Bairro
- UF
- Cidade

Na função `handleSave`, adicionar validação que exibe toast de erro listando os campos faltantes antes de permitir o salvamento.

**2. Formatação da Inscrição Estadual**

Criar função `formatInscricaoEstadual` em `src/lib/formatters.ts` que formata o valor digitado no padrão `XXX.XXX.XXX-X` (remove não-dígitos, aplica máscara progressiva). Usar essa formatação:
- No campo Input do formulário (exibição formatada, armazena só dígitos)
- Na coluna da tabela de listagem

**3. Expandir listagem horizontalmente**

- Aumentar o Dialog de Produtores para `max-w-6xl` (ou o container da aba de inscrições) para acomodar todas as colunas
- Adicionar colunas extras na tabela: Telefone, E-mail, Conta Bancária
- Usar `whitespace-nowrap` nas células para evitar quebra de linha
- A tabela já tem `overflow-x-auto`, garantindo scroll horizontal se necessário

### Arquivos modificados
- `src/lib/formatters.ts` — adicionar `formatInscricaoEstadual`
- `src/components/produtores/InscricoesTab.tsx` — validação obrigatória, formatação IE, colunas extras
- `src/pages/Produtores.tsx` — verificar/ajustar largura do Dialog principal se necessário

