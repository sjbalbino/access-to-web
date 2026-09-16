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

/** Extrai o texto de um PDF no navegador, página por página. */
export async function extrairTextoPdf(arquivo: File): Promise<string> {
  await import('@/lib/pdfjsPolyfills');
  const pdfjs = await import('pdfjs-dist');
  const workerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

  const buffer = await arquivo.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buffer) }).promise;

  const paginas: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    // Reconstrói as linhas agrupando os itens pela coordenada vertical.
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
  }

  await (doc as unknown as { cleanup: () => Promise<void> }).cleanup();
  return paginas.join('\n');
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
export async function interpretarExtratoLegado(arquivos: File[]): Promise<ExtratoLegado> {
  const textos: string[] = [];
  for (const arquivo of arquivos) {
    textos.push(await extrairTextoPdf(arquivo));
  }
  const texto = textos.join('\n\n----\n\n').trim();

  if (texto.length < 20) {
    throw new Error('Não foi possível ler texto nesses PDFs. Verifique se não são imagens digitalizadas.');
  }

  try {
    const { data, error } = await supabase.functions.invoke('interpretar-extrato-legado', {
      body: { texto },
    });
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
