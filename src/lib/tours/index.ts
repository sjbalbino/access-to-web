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
