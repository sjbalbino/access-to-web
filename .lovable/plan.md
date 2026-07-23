## Objetivo
Exibir um aviso visível no diálogo **NF-es Recebidas (DFe)** quando a Inscrição Estadual (IE) selecionada não tiver nenhuma NF-e no cache local, orientando o usuário a clicar em **Sincronizar SEFAZ**.

## Contexto
Atualmente, ao trocar de IE, o sistema carrega o cache local (`carregarCache`). Se a IE nunca foi sincronizada, a lista fica vazia e a mensagem genérica "Selecione uma inscrição e clique em Sincronizar DFe" não deixa claro que existe uma ação específica para aquela IE.

## Mudanças

### `src/components/entradas-nfe/MdeDialog.tsx`
1. Importar os componentes de alerta e ícone:
   - `Alert`, `AlertTitle`, `AlertDescription` de `@/components/ui/alert`
   - `Info` do `lucide-react`
2. Inserir, logo acima da tabela de NF-es, um bloco condicional que aparece quando:
   - Uma `inscricaoId` está selecionada
   - Não está em carregamento (`!isLoading`)
   - A lista `nfesRecebidas` está vazia
   - A sincronização não está bloqueada pelo cronômetro de 1h (`!syncBloqueado`)
3. Texto do aviso:
   - Título: "Nenhuma NF-e no cache desta IE"
   - Descrição: "Clique em **Sincronizar SEFAZ** para buscar as notas fiscais recebidas para esta inscrição na SEFAZ."
4. Estilo: usar `variant="default"` com classes de destaque em azul (`border-blue-200 bg-blue-50 text-blue-900`) para manter consistência com a paleta do diálogo.

## Arquivos
- `src/components/entradas-nfe/MdeDialog.tsx`

## Validação
- Abrir o diálogo e selecionar uma IE **sem cache** → aviso azul aparece orientando a sincronizar.
- Selecionar uma IE **com cache** → lista carrega normalmente e o aviso não aparece.
- Clicar em **Sincronizar SEFAZ** → após a consulta, o aviso desaparece e a lista é preenchida.
- Enquanto a sincronização estiver bloqueada pelo cronômetro, o aviso não sugere clicar no botão bloqueado.