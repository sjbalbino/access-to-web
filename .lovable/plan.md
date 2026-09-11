# Assistente Virtual de Ajuda do Sisagro

Um ajudante dentro do sistema que responde dúvidas por conversa e também mostra na tela onde clicar, com tours guiados nas rotinas principais.

## O que o usuário verá

1. **Botão de ajuda flutuante** no canto inferior direito de todas as telas internas (após o login), disponível também no celular.
2. **Painel de conversa** ao clicar: uma única conversa por sessão, com botão "Nova conversa". Ao fechar o sistema, a conversa não é guardada.
3. **Sugestões rápidas** na abertura, conforme a tela atual (ex.: em Notas de Depósito → "Como emitir uma nota de depósito?", "Por que o produtor não aparece na lista?").
4. **Respostas explicativas passo a passo**, em português, sobre telas, campos, fluxos e regras do sistema.
5. **Consulta aos dados da empresa** quando a pergunta pedir: saldos de produtores, notas fiscais emitidas, colheitas do dia, contratos e remessas — sempre limitado à empresa e ao produtor/granja que o usuário já tem permissão de ver.
6. **Tour guiado**: quando fizer sentido, o assistente oferece "Quero que me mostre na tela". Ao aceitar, o painel fecha e balões destacam, um a um, os pontos da tela (menu, botão, campos), com Avançar/Voltar/Encerrar. Também haverá um item "Fazer o tour desta tela" no painel de ajuda.
7. **Tours prontos** para: Entrada de Colheita, Notas de Depósito, Transferências de Depósito, Compra de Cereais, Venda da Produção/Remessas, Entradas de NF-e (DFe) e Relatórios.

## Segurança e limites

- O assistente é somente leitura: não cria, altera nem exclui nenhum registro; se o usuário pedir, ele explica o caminho para fazer manualmente.
- As consultas de dados respeitam as regras de acesso já existentes por empresa e por perfil de usuário.
- Quando não souber, o assistente diz que não sabe e sugere onde procurar, em vez de inventar.

## Detalhes técnicos

**Backend (Lovable Cloud)**
- Nova Edge Function `assistente-ajuda` com streaming, usando o Lovable AI Gateway (`openai/gpt-6-astra` na Responses API, reasoning ativo, `store: false`, sem persistência).
- Autenticação obrigatória: valida o JWT do usuário, resolve o `tenant_id` ativo e usa um cliente Supabase com o token do próprio usuário, para que a RLS continue valendo.
- Prompt de sistema com a base de conhecimento do Sisagro (módulos, fluxos, regras de saldo, emissão de NF-e, importações, relatórios), mantida em `supabase/functions/assistente-ajuda/knowledge.ts`.
- Ferramentas de leitura expostas ao modelo (schemas estritos, todas escopadas por tenant):
  `consultar_saldo_produtor`, `listar_notas_fiscais`, `resumo_colheita`, `consultar_contratos_remessas`, `consultar_estoque_local`.
- Tratamento explícito dos status do gateway: 429/5xx com nova tentativa limitada; 400/401/402/403 exibidos como mensagem clara ao usuário.

**Frontend**
- Instalar os componentes AI Elements (`conversation`, `message`, `prompt-input`, `shimmer`, `tool`) e compor o painel com eles.
- `src/components/assistente/AssistenteWidget.tsx` (botão + Sheet/Drawer), `AssistenteChat.tsx` (`useChat` com `DefaultChatTransport` apontando para a função), montado dentro do `AppLayout`.
- Renderização por `message.parts`, indicador de digitação, markdown nas respostas, foco automático no campo de texto, ações de tool colapsadas.
- Tours: biblioteca leve de onboarding (`driver.js`), com definições em `src/lib/tours/`. Atributos `data-tour="..."` adicionados apenas como marcadores nos elementos-alvo das telas listadas, sem alterar comportamento.
- Identidade própria do assistente: ícone/marca gerada para o Sisagro (sem ícone genérico de IA), textos e cores usando os tokens semânticos do tema.

**Fora de escopo nesta etapa**
- Histórico salvo, múltiplas conversas, voz e ações que gravem dados.
