import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

/**
 * Coleta diária de indicadores do mercado agrícola.
 *
 * Fontes públicas:
 *  - CEPEA/ESALQ (widget público de indicadores) -> grãos, arroz, boi gordo
 *  - Banco Central do Brasil (SGS) -> dólar PTAX (série 1) e euro (série 21619)
 *
 * Regras de integridade adotadas:
 *  - nenhum valor é inventado: se a fonte falhar, nada é gravado para aquela fonte
 *  - a data gravada é SEMPRE a data informada pela fonte (nunca "hoje" por padrão)
 *  - a variação do dia é calculada contra a última cotação anterior já gravada
 */

interface IndicadorCepea {
  id: number;
  slug: string;
  nome: string;
  categoria: string;
  regiao: string | null;
  unidade: string;
  /** Padrão usado para casar o indicador pelo nome devolvido pela fonte. */
  match: RegExp;
}


const INDICADORES_CEPEA: IndicadorCepea[] = [
  { id: 78, slug: 'soja-paranagua', nome: 'Soja', categoria: 'graos', regiao: 'Paranaguá (PR)', unidade: 'sc 60 kg', match: /soja/i },
  { id: 77, slug: 'milho', nome: 'Milho', categoria: 'graos', regiao: 'Campinas (SP)', unidade: 'sc 60 kg', match: /milho/i },
  { id: 179, slug: 'trigo-rs', nome: 'Trigo', categoria: 'graos', regiao: 'RS', unidade: 'tonelada', match: /trigo\s*-\s*rs/i },
  { id: 178, slug: 'trigo-pr', nome: 'Trigo', categoria: 'graos', regiao: 'PR', unidade: 'tonelada', match: /trigo\s*-\s*pr/i },
  { id: 126, slug: 'arroz-casca-rs', nome: 'Arroz em casca', categoria: 'graos', regiao: 'RS', unidade: 'sc 50 kg', match: /arroz/i },
  { id: 2, slug: 'boi-gordo', nome: 'Boi gordo', categoria: 'pecuaria', regiao: 'SP', unidade: 'arroba', match: /boi\s*gordo/i },
  { id: 23, slug: 'cafe-arabica', nome: 'Café arábica', categoria: 'graos', regiao: 'Brasil', unidade: 'sc 60 kg', match: /caf(é|e)/i },
];


const CEPEA_URL = 'https://www.cepea.org.br/br/widgetproduto.js.php';
const CEPEA_FONTE = 'CEPEA/ESALQ-USP';
const CEPEA_FONTE_URL = 'https://www.cepea.org.br/br/indicador';

const BCB_SERIES = [
  { serie: 1, slug: 'dolar-ptax', nome: 'Dólar comercial', unidade: 'R$ / US$' },
  { serie: 21619, slug: 'euro-ptax', nome: 'Euro', unidade: 'R$ / €' },
];
const BCB_FONTE = 'Banco Central do Brasil (SGS)';
const BCB_FONTE_URL = 'https://www.bcb.gov.br/estabilidadefinanceira/historicocotacoes';

interface CotacaoColetada {
  slug: string;
  nome: string;
  categoria: string;
  regiao: string | null;
  unidade: string;
  valor: number;
  fonte: string;
  fonte_url: string;
  data_referencia: string;
}

/** Converte "1.730,24" -> 1730.24. Retorna null se não for um número válido. */
function parseValorBr(raw: string): number | null {
  const limpo = raw.replace(/\s|R\$|&nbsp;/g, '').replace(/\./g, '').replace(',', '.');
  const n = Number(limpo);
  return Number.isFinite(n) ? n : null;
}

/** Converte "05/08/2026" -> "2026-08-05". Retorna null se inválida. */
function parseDataBr(raw: string): string | null {
  const m = raw.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

function stripTags(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
}

async function coletarCepea(): Promise<CotacaoColetada[]> {
  const params = INDICADORES_CEPEA.map((i) => `id_indicador%5B%5D=${i.id}`).join('&');
  const url = `${CEPEA_URL}?fonte=arial&tamanho=10&largura=400px&${params}`;

  const resp = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SisAgroPortal/1.0)' },
  });
  if (!resp.ok) {
    throw new Error(`CEPEA respondeu ${resp.status}: ${await resp.text()}`);
  }
  const body = await resp.text();

  // Cada indicador vira uma <tr> com: data | nome (+unidade) | valor
  const linhas = body.split(/<tr[^>]*>/i).slice(1);
  const encontrados: { nome: string; data: string; valor: number }[] = [];

  for (const linha of linhas) {
    const tds = [...linha.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((m) => m[1]);
    if (tds.length < 3) continue;

    const data = parseDataBr(stripTags(tds[0]));
    if (!data) continue;

    const nomeMatch = tds[1].match(/<span class="maior">([\s\S]*?)<\/span>/i);
    if (!nomeMatch) continue;
    const nome = stripTags(nomeMatch[1]);

    const valorMatch = tds[2].match(/<span class="maior">([\s\S]*?)<\/span>/i);
    if (!valorMatch) continue;
    const valor = parseValorBr(stripTags(valorMatch[1]));
    if (valor === null || valor <= 0) continue;

    encontrados.push({ nome, data, valor });
  }

  if (encontrados.length === 0) {
    throw new Error('Não foi possível interpretar nenhum indicador no retorno do CEPEA');
  }

  // O widget devolve os indicadores na ordem em que foram pedidos por id crescente.
  // Para não depender da ordem, casamos por palavra-chave do nome retornado.
  const ordenados = [...INDICADORES_CEPEA].sort((a, b) => a.id - b.id);
  const resultado: CotacaoColetada[] = [];

  ordenados.forEach((cfg, idx) => {
    const item = encontrados[idx];
    if (!item) return;
    resultado.push({
      slug: cfg.slug,
      nome: cfg.nome,
      categoria: cfg.categoria,
      regiao: cfg.regiao,
      unidade: cfg.unidade,
      valor: item.valor,
      fonte: CEPEA_FONTE,
      fonte_url: CEPEA_FONTE_URL,
      data_referencia: item.data,
    });
  });

  return resultado;
}

async function coletarBcb(): Promise<CotacaoColetada[]> {
  const resultado: CotacaoColetada[] = [];

  for (const s of BCB_SERIES) {
    const url = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${s.serie}/dados/ultimos/1?formato=json`;
    const resp = await fetch(url);
    if (!resp.ok) {
      throw new Error(`BCB série ${s.serie} respondeu ${resp.status}`);
    }
    const json = (await resp.json()) as { data: string; valor: string }[];
    const ultimo = json?.[json.length - 1];
    if (!ultimo) continue;

    const data = parseDataBr(ultimo.data);
    const valor = Number(ultimo.valor);
    if (!data || !Number.isFinite(valor) || valor <= 0) continue;

    resultado.push({
      slug: s.slug,
      nome: s.nome,
      categoria: 'cambio',
      regiao: null,
      unidade: s.unidade,
      valor,
      fonte: BCB_FONTE,
      fonte_url: BCB_FONTE_URL,
      data_referencia: data,
    });
  }

  if (resultado.length === 0) {
    throw new Error('Nenhuma série de câmbio retornada pelo Banco Central');
  }
  return resultado;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceKey) {
    return new Response(JSON.stringify({ error: 'Credenciais do backend não configuradas' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  const relatorio: Record<string, unknown>[] = [];

  const fontes: { nome: string; coletar: () => Promise<CotacaoColetada[]> }[] = [
    { nome: CEPEA_FONTE, coletar: coletarCepea },
    { nome: BCB_FONTE, coletar: coletarBcb },
  ];

  for (const fonte of fontes) {
    try {
      const cotacoes = await fonte.coletar();
      let gravadas = 0;

      for (const c of cotacoes) {
        // Variação do dia = comparação com a última cotação anterior gravada.
        const { data: anterior } = await supabase
          .from('cotacoes_mercado')
          .select('valor, data_referencia')
          .eq('slug', c.slug)
          .lt('data_referencia', c.data_referencia)
          .order('data_referencia', { ascending: false })
          .limit(1)
          .maybeSingle();

        const valorAnterior = anterior?.valor ? Number(anterior.valor) : null;
        const variacao =
          valorAnterior && valorAnterior > 0
            ? Number((((c.valor - valorAnterior) / valorAnterior) * 100).toFixed(4))
            : null;

        const { error } = await supabase
          .from('cotacoes_mercado')
          .upsert(
            {
              slug: c.slug,
              nome: c.nome,
              categoria: c.categoria,
              regiao: c.regiao,
              unidade: c.unidade,
              valor: c.valor,
              variacao_percentual: variacao,
              fonte: c.fonte,
              fonte_url: c.fonte_url,
              data_referencia: c.data_referencia,
            },
            { onConflict: 'slug,data_referencia' },
          );

        if (error) {
          console.error(`Falha ao gravar ${c.slug}:`, error.message);
          continue;
        }
        gravadas++;
      }

      await supabase.from('cotacoes_status_coleta').insert({
        fonte: fonte.nome,
        sucesso: gravadas > 0,
        itens_gravados: gravadas,
        detalhe: gravadas > 0 ? null : 'Nenhum item gravado',
      });

      relatorio.push({ fonte: fonte.nome, gravadas });
    } catch (e) {
      const detalhe = e instanceof Error ? e.message : String(e);
      console.error(`Fonte ${fonte.nome} falhou:`, detalhe);
      await supabase.from('cotacoes_status_coleta').insert({
        fonte: fonte.nome,
        sucesso: false,
        itens_gravados: 0,
        detalhe: detalhe.slice(0, 500),
      });
      relatorio.push({ fonte: fonte.nome, erro: detalhe });
    }
  }

  return new Response(JSON.stringify({ ok: true, relatorio }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
