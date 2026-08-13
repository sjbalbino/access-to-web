# Acesso separado aos Relatórios do Controle Gerencial

## Objetivo
Separar a geração dos relatórios da tela de marcação de lançamentos. Hoje o botão "Relatórios" só existe dentro do conjunto, junto das abas de marcação. Passa a existir uma tela própria de relatórios, acessada pelo menu.

## Mudanças

1. Nova página `Relatórios Gerenciais` (rota `/controle-paralelo/relatorios`)
   - Seleção do Conjunto de Controle (combobox com os conjuntos ativos).
   - Filtros já existentes do relatório (Relatório, Safra, Data inicial/final, Orientação, Tamanho) apresentados diretamente na página, reaproveitando a lógica atual do diálogo.
   - Botão "Gerar" com pré-visualização em PDF, igual ao comportamento atual.
   - Mensagem orientando a escolher um conjunto quando nenhum estiver selecionado.

2. Menu e navegação
   - No grupo "Controle Gerencial" do menu lateral e do menu mobile, adicionar o item "Relatórios Gerenciais" ao lado de "Conjuntos de Controle".
   - Registrar título/ícone da nova rota no mapa de rotas (usado pelas abas).

3. Tela do conjunto (marcações)
   - Remover o botão "Relatórios" do cabeçalho, deixando a tela dedicada exclusivamente à seleção dos lançamentos que ficam de fora.
   - Na lista de conjuntos, manter apenas as ações de Marcações, Editar e Excluir.

## Observações técnicas
- A lógica de geração fica em um componente reutilizável extraído de `RelatorioControleDialog.tsx` (mesmos filtros, mesma regra de desconsiderar marcados e de Remessas herdarem a marcação do Contrato). Os geradores em `src/lib/relatoriosControleParalelo.ts` não mudam.
- Nenhuma alteração de banco de dados, saldos ou de outros módulos.
