// Interpreta o texto de um extrato de produtor do sistema legado e devolve os movimentos estruturados.
// Somente leitura: não grava nada no banco. Exige usuário autenticado.
import { streamText, Output } from "npm:ai@7";
import { createOpenAI } from "npm:@ai-sdk/openai@2";
import { z } from "npm:zod@4.1.5";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const jsonError = (status: number, error: string) =>
  new Response(JSON.stringify({ error }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

/** Schema estrito (todos os campos obrigatórios; opcionais são nullable). */
const MovimentoSchema = z.object({
  data: z.string().describe("Data do movimento no formato AAAA-MM-DD."),
  tipo: z
    .enum(["deposito", "devolucao", "transferencia_entrada", "transferencia_saida", "compra", "venda", "outro"])
    .describe(
      "deposito = Depósito/Colheita; devolucao = Dev.Deposito; transferencia_entrada = Transf.Entrada; " +
        "transferencia_saida = Transf.Saida; compra = Compra; venda = Venda.",
    ),
  produto: z.string().nullable().describe("Produto/variedade como aparece no extrato."),
  safra: z.string().nullable().describe("Safra como aparece no extrato, ex. SOJA 2022/2023."),
  quilos: z.number().describe("Quantidade em quilos, sempre positiva."),
  documento: z.string().nullable().describe("Número de documento/ticket, se houver."),
  contraparte: z.string().nullable().describe("Comprador/Vendedor informado na linha, se houver."),
  local: z.string().nullable().describe("Local de entrega informado no extrato."),
});

const ResultadoSchema = z.object({
  produtor: z.string().nullable().describe("Nome do produtor conforme o extrato."),
  inscricao_estadual: z.string().nullable().describe("Inscrição estadual do extrato."),
  movimentos: z.array(MovimentoSchema),
  resumo_safras: z.array(
    z.object({
      safra: z.string(),
      produto: z.string().nullable(),
      saldo_kg: z.number().describe("Saldo final em quilos informado no extrato/resumo."),
    }),
  ),
});

const SYSTEM = `Você extrai dados de extratos de depósito de produtores do sistema legado de uma cerealista brasileira.
Receberá o texto bruto (extraído de PDF) de um extrato detalhado e/ou de um resumo por safra.
Regras:
- Datas no texto estão em DD/MM/AAAA; devolva sempre AAAA-MM-DD.
- Números usam ponto como separador de milhar (9.000 = nove mil quilos).
- "quilos" sempre positivo; o sentido do movimento é dado pelo campo "tipo".
- Ignore linhas de totais, cabeçalhos, rodapés e a coluna Saldo acumulado.
- Em "resumo_safras" registre o saldo final de cada safra (0 quando o extrato fecha zerado).
- Não invente movimentos: só o que está no texto.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return jsonError(401, "Não autorizado");

    const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await db.auth.getUser();
    if (!userData?.user) return jsonError(401, "Sessão inválida. Faça login novamente.");

    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableApiKey) return jsonError(500, "Leitura automática indisponível (chave de IA ausente).");

    const body = await req.json().catch(() => null);
    const parsed = z
      .object({ texto: z.string().min(20).max(120_000) })
      .safeParse(body);
    if (!parsed.success) {
      return jsonError(400, "Envie o texto do extrato (mínimo de 20 caracteres).");
    }

    const lovable = createOpenAI({
      baseURL: "https://ai.gateway.lovable.dev/v1",
      apiKey: lovableApiKey,
      headers: {
        "Lovable-API-Key": lovableApiKey,
        "X-Lovable-AIG-SDK": "vercel-ai-sdk",
      },
    });

    const result = streamText({
      model: lovable.responses("openai/gpt-6-astra"),
      system: SYSTEM,
      prompt: parsed.data.texto,
      output: Output.object({ schema: ResultadoSchema }),
      providerOptions: {
        openai: {
          forceReasoning: true,
          reasoningEffort: "low",
          reasoningSummary: "auto",
          store: false,
          include: ["reasoning.encrypted_content"],
        },
      },
      abortSignal: req.signal,
    });

    const output = await result.output;

    return new Response(JSON.stringify(output), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      return new Response(null, { status: 499, headers: corsHeaders });
    }
    const msg = e instanceof Error ? e.message : String(e);
    console.error("Falha ao interpretar extrato legado:", msg);
    if (msg.includes("402")) {
      return jsonError(402, "Os créditos de IA da empresa acabaram. Peça ao administrador para adicionar créditos.");
    }
    if (msg.includes("429")) {
      return jsonError(429, "Muitas leituras ao mesmo tempo. Aguarde alguns segundos e tente novamente.");
    }
    return jsonError(500, "Não consegui interpretar o extrato. Confira o arquivo e tente novamente.");
  }
});
