

## Plano: Unificar cadastro de Produtor/Sócio com Inscrições Estaduais em uma única tela

### Problema
Atualmente o fluxo exige: (1) abrir dialog, preencher dados do produtor, salvar, dialog fecha; (2) localizar o produtor na lista, clicar no ícone de inscrições, abrir outro dialog para cadastrar a Inscrição Estadual. Isso é lento e confuso.

### Solução
Transformar o dialog de cadastro/edição em um formulário com **abas (Tabs)**: "Dados do Produtor" e "Inscrições Estaduais".

- **Novo cadastro**: O formulário abre na aba "Dados do Produtor". Ao salvar, o produtor é criado no banco e o dialog **permanece aberto**, alternando automaticamente para a aba "Inscrições Estaduais" com uma primeira inscrição já pré-preenchida com os dados do cadastro (CPF/CNPJ, endereço, telefone, email, granja).
- **Edição**: O dialog abre com ambas as abas disponíveis. O usuário pode alternar livremente entre dados do produtor e inscrições.
- A aba "Inscrições Estaduais" reutiliza o componente `InscricoesTab` já existente (que já pré-preenche dados do produtor ao criar nova inscrição).

### Detalhes técnicos

**Arquivo: `src/pages/Produtores.tsx`**

1. Adicionar componente `Tabs` (já existe em `src/components/ui/tabs.tsx`) ao `DialogContent` do formulário de produtor.
2. Criar estado `activeTab` para controlar a aba ativa (`"dados"` | `"inscricoes"`).
3. No `handleSubmit` para **novo** produtor:
   - Após `createProdutor.mutateAsync`, armazenar o `id` retornado no `editingItem`.
   - Não fechar o dialog. Mudar `activeTab` para `"inscricoes"`.
   - Chamar automaticamente a criação da 1ª inscrição com dados do produtor (CPF/CNPJ, endereço, granja, etc.) via `createInscricao.mutateAsync`.
4. Para **edição**, o dialog abre com ambas as abas habilitadas.
5. A aba "Inscrições" renderiza `<InscricoesTab produtorId={editingItem.id} />`.
6. Expandir o `DialogContent` para `max-w-5xl` para comportar a tabela de inscrições.
7. Remover o dialog separado de inscrições (`inscricoesDialogOpen`) e o botão de ícone na tabela, mantendo apenas o botão de editar (que agora abre o dialog unificado com acesso às inscrições).

**Arquivo: `src/components/produtores/InscricoesTab.tsx`**
- Sem alterações estruturais. Já possui lógica de pré-preenchimento com dados do produtor.

### Arquivos alterados
- `src/pages/Produtores.tsx`

