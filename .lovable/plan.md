# Notas Fiscais: acesso às ações no smartphone

## O que acontece hoje

Na tela de Notas Fiscais a listagem é uma tabela com largura mínima fixa de 620px dentro de um contêiner com rolagem horizontal. Num smartphone (viewport de ~393px) isso significa:

- A coluna **Ações**, que é a última da tabela, fica fora da área visível — só aparece se o usuário arrastar a tabela para o lado, o que não é evidente.
- Os botões de ação são ícones de 28px lado a lado (visualizar, duplicar, DANFE, download, consultar rejeição, reenviar, "mais ações"), o que é apertado para toque.
- Colunas de CPF/CNPJ e Valor Total já estão ocultas no mobile, então a linha perde contexto sem ganhar acesso às ações.

## Proposta

Manter a tabela atual no desktop e adicionar uma apresentação em **cards** no mobile (abaixo de `sm`), na mesma página:

1. **Cards por nota (mobile)** — cada nota vira um card com:
   - Nº / Série e badge de status no topo
   - Destinatário (nome + CPF/CNPJ), data de emissão e valor total
   - Motivo/autor do cancelamento quando aplicável
2. **Ações completas no card** — um único botão "Ações" abre um menu (dropdown) com **todas** as opções válidas para o status da nota: Visualizar/Editar, Duplicar, Visualizar DANFE, Download DANFE, Download XML, Enviar por Email, Carta de Correção (e PDF/XML da CC-e), Cancelar, Consultar rejeição, Corrigir e reenviar, Excluir. Nada fica dependente de rolagem horizontal.
3. **Agrupamento por emitente preservado** — no mobile o cabeçalho do grupo (nome, IE, quantidade de notas e total) vira uma faixa clicável que expande/recolhe o grupo, igual ao comportamento atual.
4. **Filtros e paginação** continuam os mesmos; apenas a área de listagem muda de forma.
5. A tabela desktop permanece intacta, sem mudança de comportamento acima de `sm`.

## Detalhes técnicos

- Arquivo principal: `src/pages/NotasFiscais.tsx`.
- Extrair a lógica de ações (quais botões/itens valem para cada status, junto dos handlers `handleDownload`, `handleDuplicar`, `handleVisualizarDanfe`, `handleConsultarRejeicao`, abertura de diálogos) para um componente reutilizável `src/components/notas-fiscais/NotaFiscalAcoesMenu.tsx`, usado tanto pelo dropdown do mobile quanto pelo menu "Mais ações" do desktop — evita duplicar regras de status.
- Novo componente `src/components/notas-fiscais/NotasFiscaisMobileList.tsx` renderizando os cards e as faixas de grupo, recebendo as notas paginadas, `collapsedGroups`/`toggleGroup` e os callbacks de ação.
- Alternância por CSS: `<div className="hidden sm:block">` para a tabela e `<div className="sm:hidden">` para os cards (sem `useEffect`, sem duplicação de dados).
- Tokens semânticos e `cn()` conforme o padrão do projeto; botões de ação com área de toque adequada (`h-9`).
- Verificação: revisar em viewport de 393px que todas as ações de uma nota autorizada, cancelada e rejeitada ficam acessíveis sem rolagem horizontal.
