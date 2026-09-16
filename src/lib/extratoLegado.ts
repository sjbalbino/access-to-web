/**
 * Leitura de extratos de produtor do sistema legado (PDF) e conversão em movimentos estruturados.
 *
 * Fluxo: o texto é extraído no próprio navegador (pdf.js) e enviado para a Edge Function
 * `interpretar-extrato-legado`, que devolve os movimentos em JSON. Se a leitura assistida
 * falhar, usamos o parser por expressão regular do layout atual do relatório legado.
 */
import { supabase } from '@/integrations/supabase/client';

export type TipoMovimentoLegado =
  | 'deposito'
  | 'devolucao'
  | 'transferencia_entrada'
  | 'transferencia_saida'
  | 'compra'
  | 'venda'
  | 'outro';

export interface MovimentoLegado {
  data: string;
  tipo: TipoMovimentoLegado;
  produto: string | null;
  safra: string | null;
  quilos: number;
  documento: string | null;
  contraparte: string | null;
  local: string | null;
}

export interface ResumoSafraLegado {
  safra: string;
  produto: string | null;
  saldo_kg: number;
}

export interface ExtratoLegado {
  produtor: string | null;
  inscricao_estadual: string | null;
  movimentos: MovimentoLegado[];
  resumo_safras: ResumoSafraLegado[];
  /** Como o extrato foi interpretado: leitura assistida ou leitura simples do layout. */
  origem: 'ia' | 'regex';
}

export type EtapaLeituraExtrato = 'lendo_pdfs' | 'interpretando_lancamentos';

interface ProgressoLeituraExtrato {
  etapa: EtapaLeituraExtrato;
  arquivoAtual?: number;
  totalArquivos?: number;
  paginaAtual?: number;
  totalPaginas?: number;
}

type AoProgresso = (progresso: ProgressoLeituraExtrato) => void;

let pdfWorker: Worker | null = null;

function obterPdfWorker(): Worker {
  if (!pdfWorker) {
    pdfWorker = new Worker(new URL('../workers/pdfWorker.ts', import.meta.url), {
      type: 'module',
      name: 'sisagro-pdf-reader',
    });
  }
  return pdfWorker;
}

function comLimiteDeTempo<T>(promessa: Promise<T>, milissegundos: number, mensagem: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const temporizador = window.setTimeout(() => reject(new Error(mensagem)), milissegundos);
    promessa.then(
      (resultado) => {
        window.clearTimeout(temporizador);
        resolve(resultado);
      },
      (erro: unknown) => {
        window.clearTimeout(temporizador);
        reject(erro);
      },
    );
  });
}

/** Extrai o texto de um PDF no navegador, página por página. */
export async function extrairTextoPdf(
  arquivo: File,
  aoProgresso?: (paginaAtual: number, totalPaginas: number) => void,
): Promise<string> {
  await import('@/lib/pdfjsPolyfills');
  const pdfjs = await import('pdfjs-dist');

  // O wrapper instala as compatibilidades também dentro do Worker, que possui escopo próprio.
  pdfjs.GlobalWorkerOptions.workerPort = obterPdfWorker();

  const buffer = await arquivo.arrayBuffer();
  const tarefa = pdfjs.getDocument({ data: new Uint8Array(buffer) });
  const doc = await comLimiteDeTempo(
    tarefa.promise,
    30_000,
    `A leitura de ${arquivo.name} demorou mais de 30 segundos. Tente novamente.`,
  );

  try {
    const paginas: string[] = [];
    for (let i = 1; i <= doc.numPages; i++) {
      aoProgresso?.(i, doc.numPages);
      const page = await comLimiteDeTempo(
        doc.getPage(i),
        15_000,
        `A página ${i} de ${arquivo.name} demorou demais para ser lida.`,
      );
      const content = await comLimiteDeTempo(
        page.getTextContent(),
        15_000,
        `Não foi possível extrair o texto da página ${i} de ${arquivo.name}.`,
      );
      const linhas = new Map<number, string[]>();
      for (const item of content.items as Array<{ str?: string; transform?: number[] }>) {
        if (!item.str || !item.transform) continue;
        const y = Math.round(item.transform[5]);
        const atual = linhas.get(y) || [];
        atual.push(item.str);
        linhas.set(y, atual);
      }
      const ordenadas = [...linhas.entries()]
        .sort((a, b) => b[0] - a[0])
        .map(([, partes]) => partes.join(' ').replace(/\s+/g, ' ').trim())
        .filter(Boolean);
      paginas.push(ordenadas.join('\n'));

      // Permite que a tela atualize o progresso entre páginas extensas.
      await new Promise<void>((resolve) => window.setTimeout(resolve, 0));
    }
    return paginas.join('\n');
  } finally {
    await doc.cleanup();
    await tarefa.destroy();
  }
}

const parseNumeroBr = (valor: string) => {
  const limpo = valor.replace(/\./g, '').replace(',', '.');
  const numero = Number(limpo);
  return Number.isFinite(numero) ? numero : 0;
};

const normalizar = (v: string) =>
  v.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();

function detectarTipo(linha: string): TipoMovimentoLegado | null {
  const t = normalizar(linha);
  if (/TRANSF\.?\s*ENTR/.test(t) || /TRA\.?\s*ENTRADA/.test(t)) return 'transferencia_entrada';
  if (/TRANSF\.?\s*SAI/.test(t) || /TRA\.?\s*SAIDA/.test(t)) return 'transferencia_saida';
  if (/DEV\.?\s*DEPOSIT/.test(t) || /DEVOLUCAO/.test(t)) return 'devolucao';
  if (/DEPOSIT/.test(t) || /COLHEITA/.test(t) || /ENTRADA\s+ARMAZ/.test(t)) return 'deposito';
  if (/COMPRA/.test(t)) return 'compra';
  if (/VENDA/.test(t)) return 'venda';
  return null;
}

/** Parser do layout do "Extrato de Produtor" do sistema legado. */
export function interpretarExtratoPorLayout(texto: string): ExtratoLegado {
  const linhas = texto.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  let produtor: string | null = null;
  let inscricao: string | null = null;
  let safraAtual: string | null = null;
  let localAtual: string | null = null;
  const movimentos: MovimentoLegado[] = [];
  const resumo: ResumoSafraLegado[] = [];

  for (const linha of linhas) {
    const safraMatch = linha.match(/Safra:?\s*([A-Za-zÀ-ÿ0-9 ./-]+?)(?:\s{2,}|$)/i);
    if (safraMatch && !/\d{2}\/\d{2}\/\d{4}/.test(linha)) {
      safraAtual = safraMatch[1].trim().toUpperCase();
    }

    const localMatch = linha.match(/Local\s+Entrega:?\s*(.+)$/i);
    if (localMatch) localAtual = localMatch[1].trim();

    const ieMatch = linha.match(/Inscricao:?\s*([\d.\-/]{8,})/i);
    if (ieMatch) inscricao = ieMatch[1].trim();

    const nomeMatch = linha.match(/Nome:?\s*(.+)$/i);
    if (nomeMatch && !produtor) produtor = nomeMatch[1].trim();

    const produtorMatch = linha.match(/^Produtor:?\s*(.+)$/i);
    if (produtorMatch) produtor = produtorMatch[1].trim();

    const dataMatch = linha.match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (!dataMatch) continue;

    const tipo = detectarTipo(linha);
    if (!tipo) continue;

    const numeros = linha.match(/-?\d{1,3}(?:\.\d{3})+(?:,\d+)?|-?\d+,\d+|(?<![\d/])-?\d{2,}(?![\d/])/g) || [];
    const candidatos = numeros
      .map(parseNumeroBr)
      .filter((n) => Math.abs(n) > 0);
    if (candidatos.length === 0) continue;

    // A coluna Kilos é o primeiro valor relevante após a data/documento.
    const quilos = Math.abs(candidatos[0]);
    if (!quilos) continue;

    const produtoMatch = linha.match(/([A-ZÀ-Ÿ][A-ZÀ-Ÿ ]{3,}(?:-\s*KGS)?)/g);
    const produto =
      (produtoMatch || [])
        .map((p) => p.trim())
        .find((p) => !/TOTAL|INSCRICAO|LOCAL|PRODUTOR|SALDO/.test(normalizar(p))) || null;

    movimentos.push({
      data: `${dataMatch[3]}-${dataMatch[2]}-${dataMatch[1]}`,
      tipo,
      produto,
      safra: safraAtual,
      quilos,
      documento: null,
      contraparte: null,
      local: localAtual,
    });
  }

  if (safraAtual) resumo.push({ safra: safraAtual, produto: null, saldo_kg: 0 });

  return { produtor, inscricao_estadual: inscricao, movimentos, resumo_safras: resumo, origem: 'regex' };
}

/** Lê os PDFs enviados e devolve o extrato estruturado. */
export async function interpretarExtratoLegado(
  arquivos: File[],
  aoProgresso?: AoProgresso,
): Promise<ExtratoLegado> {
  const textos = await Promise.all(
    arquivos.map((arquivo, indice) =>
      extrairTextoPdf(arquivo, (paginaAtual, totalPaginas) => {
        aoProgresso?.({
          etapa: 'lendo_pdfs',
          arquivoAtual: indice + 1,
          totalArquivos: arquivos.length,
          paginaAtual,
          totalPaginas,
        });
      }),
    ),
  );
  const texto = textos.join('\n\n----\n\n').trim();

  if (texto.length < 20) {
    throw new Error('Não foi possível ler texto nesses PDFs. Verifique se não são imagens digitalizadas.');
  }

  try {
    aoProgresso?.({ etapa: 'interpretando_lancamentos' });
    const { data, error } = await comLimiteDeTempo(
      supabase.functions.invoke('interpretar-extrato-legado', { body: { texto } }),
      45_000,
      'A interpretação demorou mais de 45 segundos. A leitura simples será usada.',
    );
    if (error) throw error;
    const movimentos = Array.isArray(data?.movimentos) ? (data.movimentos as MovimentoLegado[]) : [];
    if (movimentos.length === 0) throw new Error('Nenhum movimento identificado.');

    return {
      produtor: data?.produtor ?? null,
      inscricao_estadual: data?.inscricao_estadual ?? null,
      movimentos: movimentos
        .filter((m) => !!m?.data && Number(m?.quilos) > 0)
        .map((m) => ({ ...m, quilos: Math.abs(Number(m.quilos)) })),
      resumo_safras: Array.isArray(data?.resumo_safras) ? data.resumo_safras : [],
      origem: 'ia',
    };
  } catch (erro) {
    console.warn('[extratoLegado] leitura assistida indisponível, usando layout padrão:', erro);
    const fallback = interpretarExtratoPorLayout(texto);
    if (fallback.movimentos.length === 0) {
      throw erro instanceof Error ? erro : new Error('Não foi possível interpretar o extrato.');
    }
    return fallback;
  }
}
