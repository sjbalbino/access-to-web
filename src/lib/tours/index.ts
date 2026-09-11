import { driver, type DriveStep } from "driver.js";
import "driver.js/dist/driver.css";

export interface TourPasso {
  selector?: string;
  titulo: string;
  texto: string;
}

export interface TourDefinicao {
  id: string;
  titulo: string;
  rota: string;
  passos: TourPasso[];
}

/**
 * Tours guiados disponíveis. Mantido em sincronia com
 * supabase/functions/assistente-ajuda/knowledge.ts (TOURS_DISPONIVEIS).
 */
export const TOURS: TourDefinicao[] = [
  {
    id: "granjas",
    titulo: "Granjas",
    rota: "/granjas",
    passos: [
      {
        titulo: "Granjas",
        texto:
          "A granja é a fazenda/estabelecimento da empresa. Tudo no sistema (lavouras, colheitas, notas e relatórios) fica ligado a uma granja.",
      },
      {
        selector: '[data-tour="acao-principal"]',
        titulo: "Nova granja",
        texto:
          "Informe razão social, CNPJ/CPF (endereço e município vêm automáticos pelo CNPJ/CEP) e marque uma como Principal — ela já vem escolhida nas outras telas.",
      },
      {
        titulo: "Status e vínculos",
        texto:
          "Granjas inativas deixam de aparecer nas listas. Cada granja também define a inscrição de produtor usada como emitente padrão nas notas.",
      },
      {
        selector: '[data-tour="menu"]',
        titulo: "Próximo passo",
        texto: "Com a granja criada, cadastre as Lavouras e depois abra o Controle de Lavoura.",
      },
    ],
  },
  {
    id: "lavouras",
    titulo: "Lavouras",
    rota: "/lavouras",
    passos: [
      {
        titulo: "Lavouras",
        texto: "Cada lavoura é uma área de plantio da granja, com o total de hectares usado nos cálculos por hectare.",
      },
      {
        selector: '[data-tour="acao-principal"]',
        titulo: "Nova lavoura",
        texto:
          "Informe nome, granja e o total de hectares. A área não aproveitável é descontada e o sistema calcula a área de plantio.",
      },
      {
        titulo: "Terceiros e localização",
        texto:
          "Marque 'Recebe terceiros' quando a área recebe produção de outros produtores. Latitude e longitude são opcionais.",
      },
    ],
  },
  {
    id: "controle-lavoura",
    titulo: "Controle de Lavoura e Aplicações",
    rota: "/controle-lavoura",
    passos: [
      {
        titulo: "Controle de Lavoura",
        texto:
          "Cada linha é a lavoura em uma safra. É dentro dela que ficam plantio, aplicações, colheita e os custos.",
      },
      {
        selector: '[data-tour="acao-principal"]',
        titulo: "Novo controle",
        texto: "Escolha a safra e a lavoura, informe a área total e salve para abrir as abas de lançamento.",
      },
      {
        selector: '[data-tour="abas"]',
        titulo: "As abas",
        texto:
          "Plantio (data, variedade, hectares plantados) · Adubação, Herbicidas, Fungicidas, Inseticidas, Adjuvantes, Micronutrientes, Inoculantes e Calcários (cada aplicação com data, área, dose por hectare, quantidade e valor) · Colheita (produção da área).",
      },
      {
        selector: '[data-tour="abas"]',
        titulo: "Acompanhamento e custos",
        texto:
          "Insetos, Plantas Invasoras, Floração, Chuvas, Análise de Solo e Pivôs registram o acompanhamento da área. A aba Custos soma tudo e mostra o custo por hectare e por saca.",
      },
      {
        titulo: "Produtos das aplicações",
        texto:
          "A lista de produtos de cada aba vem dos Grupos de Produtos (Fungicidas, Herbicidas etc.). Se um produto não aparecer, confira se está ativo e no grupo certo em Cadastros › Produtos.",
      },
    ],
  },

  {
    id: "entrada-colheita",
    titulo: "Entrada de Colheita",
    rota: "/entrada-colheita",
    passos: [
      {
        titulo: "Entrada de Colheita",
        texto:
          "Aqui você registra a chegada de cada carga na balança. O produtor e a inscrição já vêm preenchidos com a inscrição principal da granja.",
      },
      {
        selector: '[data-tour="acao-principal"]',
        titulo: "Confirmar a entrada",
        texto:
          "Depois de informar variedade, pesos, umidade e impureza, use este botão. O sistema calcula os descontos, os kg líquidos e os sacos.",
      },
      {
        selector: '[data-tour="menu"]',
        titulo: "Depois da colheita",
        texto:
          "Pelo menu você segue para Notas de Depósito, Transferências ou Venda da Produção usando o saldo gerado nesta tela.",
      },
    ],
  },
  {
    id: "notas-deposito",
    titulo: "Notas de Depósito",
    rota: "/notas-deposito",
    passos: [
      {
        titulo: "Notas de Depósito",
        texto:
          "Esta lista mostra as notas de depósito (CFOP 1905) já emitidas, com o produtor, o local de entrega e a quantidade.",
      },
      {
        selector: '[data-tour="acao-principal"]',
        titulo: "Nova nota de depósito",
        texto:
          "Escolha a inscrição do produtor e o local de entrega. O saldo mostrado é o disponível naquele local. Você pode lançar mais de uma variedade, com quantidade e valor unitário editáveis.",
      },
    ],
  },
  {
    id: "transferencias",
    titulo: "Transferências de Depósito",
    rota: "/transferencias",
    passos: [
      {
        titulo: "Transferências de Depósito",
        texto:
          "A lista vem ordenada da transferência mais recente para a mais antiga e pode ser filtrada por período.",
      },
      {
        selector: '[data-tour="acao-principal"]',
        titulo: "Nova transferência",
        texto:
          "Informe origem e destino (inscrição, granja e local), produto, safra e quantidade. Todos os produtores aparecem, mesmo sem saldo; se passar do saldo o sistema pede confirmação.",
      },
    ],
  },
  {
    id: "compra-cereais",
    titulo: "Compra de Cereais",
    rota: "/compra-cereais",
    passos: [
      {
        titulo: "Compra de Cereais",
        texto: "Registra a compra do produto do produtor (CFOP 1102/2102) e permite emitir a NF-e da operação.",
      },
      {
        selector: '[data-tour="acao-principal"]',
        titulo: "Nova compra",
        texto:
          "Escolha vendedor e comprador, produto, quantidade e valor. Use 'Calcular Impostos' para trazer ICMS diferido, PIS/COFINS e IBS/CBS do cadastro do produto.",
      },
    ],
  },
  {
    id: "vendas-producao",
    titulo: "Venda da Produção",
    rota: "/vendas-producao",
    passos: [
      {
        titulo: "Venda da Produção",
        texto: "Cada linha é um contrato de venda; dentro dele ficam as remessas dos caminhões.",
      },
      {
        selector: '[data-tour="acao-principal"]',
        titulo: "1) Novo contrato",
        texto:
          "Informe comprador, produto, quantidade, preço, local de entrega e o número do contrato do comprador.",
      },
      {
        titulo: "2) Remessas e NF-e",
        texto:
          "No contrato, abra as Remessas e lance cada carga (pesos, umidade, impureza, placa e motorista). Em seguida emita a NF-e da remessa.",
      },
    ],
  },
  {
    id: "entradas-nfe",
    titulo: "Entradas de NF-e (DFe)",
    rota: "/entradas-nfe",
    passos: [
      {
        titulo: "Entradas de NF-e",
        texto: "Aqui entram as notas emitidas contra a empresa e as entradas geradas a partir delas.",
      },
      {
        selector: '[data-tour="acao-principal"]',
        titulo: "Buscar no SEFAZ e manifestar",
        texto:
          "Busque as notas no SEFAZ e faça a manifestação para liberar o XML. Notas com mais de 90 dias aparecem como 'XML fora do prazo da SEFAZ'.",
      },
      {
        titulo: "Gerar a entrada",
        texto:
          "Com o XML, gere a entrada no estoque e as parcelas do contas a pagar. As notas já usadas mostram o aviso 'Entrada gerada'.",
      },
    ],
  },
  {
    id: "relatorios",
    titulo: "Relatórios",
    rota: "/relatorios",
    passos: [
      {
        titulo: "Relatórios",
        texto:
          "Cada card é um relatório em PDF. Ao abrir, escolha safra, período, local de entrega e, em alguns, a orientação e o tamanho da página.",
      },
      {
        selector: '[data-tour="acao-principal"]',
        titulo: "Gerar",
        texto: "Use o botão do card para abrir os filtros e gerar o PDF.",
      },
    ],
  },
];

export const getTour = (id: string) => TOURS.find((t) => t.id === id);

export const getTourDaRota = (rota: string) =>
  TOURS.find((t) => rota === t.rota || rota.startsWith(`${t.rota}/`));

/** Inicia o tour, ignorando passos cujo elemento não existe na tela atual. */
export function iniciarTour(id: string) {
  const tour = getTour(id);
  if (!tour) return false;

  const steps: DriveStep[] = tour.passos
    .filter((passo) => !passo.selector || !!document.querySelector(passo.selector))
    .map((passo) => ({
      element: passo.selector,
      popover: {
        title: passo.titulo,
        description: passo.texto,
      },
    }));

  if (steps.length === 0) return false;

  driver({
    showProgress: true,
    allowClose: true,
    overlayOpacity: 0.6,
    nextBtnText: "Avançar",
    prevBtnText: "Voltar",
    doneBtnText: "Encerrar",
    progressText: "{{current}} de {{total}}",
    steps,
  }).drive();

  return true;
}
