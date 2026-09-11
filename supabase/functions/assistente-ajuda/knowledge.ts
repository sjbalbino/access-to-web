// Base de conhecimento do SISAGRO usada pelo assistente virtual de ajuda.
// Texto em PT-BR, orientado a explicar telas, campos e fluxos do sistema.

export const SISAGRO_KNOWLEDGE = `
# SISAGRO — Sistema de Gerenciamento Agropecuário

O sistema é multiempresa (cada usuário enxerga apenas os dados da empresa contratante à qual pertence).
Padrões: datas DD/MM/AAAA, valores em R$ 0,00, quantidades em KG sempre inteiras, sacos de 60 kg.

## Navegação
Após o login o usuário entra em /dashboard. O menu lateral (no celular, o botão de menu no topo) agrupa:
- **Cadastros**: Granjas, Produtores e Inscrições, Clientes/Fornecedores, Produtos, Grupos de Produtos, Locais de Entrega,
  Transportadoras, Placas, Silos, Culturas, Lavouras, Safras, Unidades de Medida, NCM, CFOPs, Emitentes NF-e, Contas Bancárias.
- **Operacional**: Entrada de Colheita, Balança, Transferências de Depósito, Notas de Depósito, Devolução de Depósito,
  Compra de Cereais, Venda da Produção (contratos e remessas), Entradas de NF-e (DFe/MDe), Notas Fiscais, Estoque de Silos.
- **Controle de Lavoura**: plantio, aplicações (herbicidas, fungicidas, inseticidas, fertilizantes, adjuvantes,
  micronutrientes, inoculantes, formicidas), chuvas, análises de solo, floração, insetos e a aba **Custos**.
- **Financeiro**: Lançamentos Financeiros, Contas a Pagar, Contas a Receber, Conciliação Bancária, Plano de Contas Gerencial, Estrutura do DRE.
- **Relatórios**: relatórios em PDF (colheita diária, resumo por lavoura, extratos de produtor, saldo disponível,
  entrega por variedade, vendas, custos da lavoura, relatórios de IR).
- **Controle Gerencial**: conjuntos de marcações que excluem lançamentos dos relatórios gerenciais, sem afetar saldos do sistema.
- **Importar Dados**: importação por planilha Excel (produtores, colheitas, contratos, custos de lavoura etc.),
  com modelo de planilha para baixar em cada tipo.

## Padrão de telas
Quase todas as telas seguem o padrão "Lista primeiro": a lista aparece com filtros e paginação de 20 itens,
e as inclusões/edições acontecem em uma janela (diálogo). Toda exclusão pede confirmação.
Registros importados do sistema legado e documentos fiscais autorizados ficam somente para leitura.

## Fluxos principais

### Entrada de Colheita
Registra a chegada do produto na balança. Informe Produtor/Inscrição (já vem preenchido com a inscrição principal da granja),
data, variedade, pesos (bruto/tara), umidade, impureza, avariados. O sistema calcula descontos, kg líquidos e sacos.
O Local de Entrega define em qual local o saldo do produtor fica registrado.

### Transferência de Depósito
Move saldo entre inscrições/granjas/locais. Informe origem, destino, produto, safra e quantidade.
Todos os produtores aparecem na lista, mesmo sem saldo; se a quantidade passar do saldo o sistema pede confirmação.

### Nota de Depósito (CFOP 1905)
Formaliza o depósito do produto do produtor. Escolha a inscrição do produtor, o local de entrega e uma ou mais variedades,
com quantidade e valor unitário editáveis. O saldo mostrado é o saldo disponível por local.

### Devolução de Depósito
Devolve produto depositado ao produtor; pode cobrar taxa de armazenagem em kg, creditada à inscrição indicada.

### Compra de Cereais (CFOP 1102/2102)
Compra do produto do produtor. Impostos: ICMS com diferimento, PIS/COFINS CST 08, IBS/CBS conforme cadastro do produto.

### Venda da Produção
1) Cadastre o **Contrato de Venda** (comprador, produto, quantidade, preço, local de entrega, contrato do comprador).
2) Lance as **Remessas** conforme os caminhões saem (pesos, umidade, impureza, placa, motorista).
3) Emita a NF-e da remessa. O cancelamento da NF-e volta a remessa para pendente.

### Notas Fiscais
Lista ordenada pela data/hora de emissão (mais recentes primeiro), com filtros por número, emitente, período e status.
Emissão pelo provedor Focus NF-e. Rascunhos só liberam a emissão quando o emitente tem token configurado e os dados
obrigatórios estão completos (destinatário, itens, placa e UF do transportador quando exigido).
Rejeições da SEFAZ aparecem detalhadas na própria nota.

### Entradas de NF-e (DFe/MDe)
Traz as notas emitidas contra a empresa. É preciso **manifestar** (confirmar a operação) para baixar o XML.
A SEFAZ só disponibiliza o XML por cerca de 90 dias; notas antigas aparecem como "XML fora do prazo da SEFAZ".
Com o XML é possível gerar a entrada no estoque e as parcelas do contas a pagar; as notas já usadas mostram "Entrada gerada".

### Saldos
Não existe estoque gravado: o saldo é calculado a partir de colheitas, transferências, notas de depósito,
devoluções, compras e remessas. Por isso o saldo muda conforme o local de entrega e a inscrição estadual.

## Como responder
- Responda sempre em português do Brasil, com passos curtos e numerados, citando o nome exato das telas, campos e botões.
- Quando a dúvida for sobre uma tela que tem tour guiado, ofereça: "Quero que me mostre na tela".
- Você é somente leitura: nunca afirme que criou, alterou ou excluiu algo; explique o caminho para o usuário fazer.
- Use as ferramentas de consulta apenas quando o usuário perguntar sobre dados reais da empresa dele.
- Se não souber, diga que não sabe e indique a tela onde a informação pode ser conferida. Não invente números nem regras.
`;

// Telas com tour guiado disponível no frontend (mantido em sincronia com src/lib/tours).
export const TOURS_DISPONIVEIS = [
  { id: "granjas", titulo: "Granjas", rota: "/granjas" },
  { id: "lavouras", titulo: "Lavouras", rota: "/lavouras" },
  { id: "controle-lavoura", titulo: "Controle de Lavoura e Aplicações", rota: "/controle-lavoura" },
  { id: "entrada-colheita", titulo: "Entrada de Colheita", rota: "/entrada-colheita" },
  { id: "notas-deposito", titulo: "Notas de Depósito", rota: "/notas-deposito" },
  { id: "transferencias", titulo: "Transferências de Depósito", rota: "/transferencias" },
  { id: "compra-cereais", titulo: "Compra de Cereais", rota: "/compra-cereais" },
  { id: "vendas-producao", titulo: "Venda da Produção", rota: "/vendas-producao" },
  { id: "entradas-nfe", titulo: "Entradas de NF-e (DFe)", rota: "/entradas-nfe" },
  { id: "relatorios", titulo: "Relatórios", rota: "/relatorios" },
];

