// Assistente virtual de ajuda do SISAGRO.
// Somente leitura: responde dúvidas de uso e consulta dados da empresa respeitando a RLS do usuário.
import { convertToModelMessages, streamText, tool, stepCountIs, type UIMessage } from "npm:ai@7";
import { createOpenAI } from "npm:@ai-sdk/openai@2";
import { z } from "npm:zod@4.1.5";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SISAGRO_KNOWLEDGE, TOURS_DISPONIVEIS } from "./knowledge.ts";

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

const LIMITE = 200;

// deno-lint-ignore no-explicit-any
type Db = any;

const somaKg = (rows: Array<Record<string, unknown>>, campos: string[]) =>
  rows.reduce((acc, row) => {
    for (const campo of campos) {
      const valor = Number(row[campo] ?? 0);
      if (valor) return acc + valor;
    }
    return acc;
  }, 0);

const arredondar = (n: number) => Math.round(n);

function criarFerramentas(db: Db) {
  return {
    buscar_produtores: tool({
      description:
        "Busca produtores e suas inscrições estaduais cadastradas pelo nome, CPF/CNPJ ou inscrição estadual.",
      inputSchema: z.object({
        termo: z
          .string()
          .nullable()
          .describe("Parte do nome, CPF/CNPJ ou inscrição estadual. Use null para listar os primeiros."),
      }),
      execute: async ({ termo }) => {
        let q = db
          .from("inscricoes_produtor")
          .select("id, nome, nome_inscricao, cpf_cnpj, inscricao_estadual, cidade, uf, ativa")
          .order("nome")
          .limit(50);
        if (termo && termo.trim()) {
          const t = termo.trim();
          q = q.or(
            `nome.ilike.%${t}%,nome_inscricao.ilike.%${t}%,cpf_cnpj.ilike.%${t}%,inscricao_estadual.ilike.%${t}%`,
          );
        }
        const { data, error } = await q;
        if (error) return { erro: error.message };
        return { total: data?.length ?? 0, inscricoes: data ?? [] };
      },
    }),

    consultar_saldo_produtor: tool({
      description:
        "Calcula o saldo físico em depósito (kg) de uma inscrição de produtor: colheitas + transferências recebidas " +
        "- transferências enviadas - devoluções - compras de cereais. Informa também o total já usado em notas de depósito emitidas.",
      inputSchema: z.object({
        inscricao_id: z
          .string()
          .nullable()
          .describe("ID da inscrição obtido em buscar_produtores. Se null, informe o termo."),
        termo: z.string().nullable().describe("Nome, CPF/CNPJ ou IE, quando não souber o ID."),
      }),
      execute: async ({ inscricao_id, termo }) => {
        let id = inscricao_id;
        let identificacao: Record<string, unknown> | null = null;

        if (!id) {
          if (!termo?.trim()) return { erro: "Informe o ID da inscrição ou um termo de busca." };
          const { data } = await db
            .from("inscricoes_produtor")
            .select("id, nome, cpf_cnpj, inscricao_estadual")
            .or(
              `nome.ilike.%${termo.trim()}%,cpf_cnpj.ilike.%${termo.trim()}%,inscricao_estadual.ilike.%${termo.trim()}%`,
            )
            .limit(5);
          if (!data?.length) return { erro: "Nenhuma inscrição encontrada com esse termo." };
          if (data.length > 1) {
            return { ambiguo: true, opcoes: data, mensagem: "Mais de uma inscrição encontrada. Peça ao usuário para escolher." };
          }
          id = data[0].id;
          identificacao = data[0];
        } else {
          const { data } = await db
            .from("inscricoes_produtor")
            .select("id, nome, cpf_cnpj, inscricao_estadual")
            .eq("id", id)
            .maybeSingle();
          identificacao = data ?? null;
        }

        const [colheitas, recebidas, enviadas, devolucoes, compras, depositos] = await Promise.all([
          db.from("colheitas").select("producao_liquida_kg, producao_kg").eq("inscricao_produtor_id", id).limit(5000),
          db.from("transferencias_deposito").select("quantidade_kg").eq("inscricao_destino_id", id).limit(5000),
          db.from("transferencias_deposito").select("quantidade_kg").eq("inscricao_origem_id", id).limit(5000),
          db.from("devolucoes_deposito").select("quantidade_kg").eq("inscricao_produtor_id", id).limit(5000),
          db.from("compras_cereais").select("quantidade_kg").eq("inscricao_vendedor_id", id).limit(5000),
          db.from("notas_deposito_emitidas").select("quantidade_kg").eq("inscricao_produtor_id", id).limit(5000),
        ]);

        const kgColheita = somaKg(colheitas.data ?? [], ["producao_liquida_kg", "producao_kg"]);
        const kgRecebidas = somaKg(recebidas.data ?? [], ["quantidade_kg"]);
        const kgEnviadas = somaKg(enviadas.data ?? [], ["quantidade_kg"]);
        const kgDevolucoes = somaKg(devolucoes.data ?? [], ["quantidade_kg"]);
        const kgCompras = somaKg(compras.data ?? [], ["quantidade_kg"]);
        const kgDepositos = somaKg(depositos.data ?? [], ["quantidade_kg"]);

        const saldoFisico = kgColheita + kgRecebidas - kgEnviadas - kgDevolucoes - kgCompras;

        return {
          inscricao: identificacao,
          kg_colheitas: arredondar(kgColheita),
          kg_transferencias_recebidas: arredondar(kgRecebidas),
          kg_transferencias_enviadas: arredondar(kgEnviadas),
          kg_devolucoes: arredondar(kgDevolucoes),
          kg_compras_cereais: arredondar(kgCompras),
          kg_notas_deposito_emitidas: arredondar(kgDepositos),
          saldo_fisico_kg: arredondar(saldoFisico),
          saldo_fisico_sacos: Math.round(saldoFisico / 60),
          observacao:
            "Saldo consolidado de todos os locais de entrega. Para o saldo por local, o usuário deve conferir na tela Notas de Depósito ou no relatório Saldo Disponível.",
        };
      },
    }),

    resumo_colheita: tool({
      description: "Resumo das colheitas registradas em um período: kg líquidos, sacos, área colhida e número de cargas.",
      inputSchema: z.object({
        data_inicio: z.string().nullable().describe("Data inicial no formato AAAA-MM-DD. Null = sem limite."),
        data_fim: z.string().nullable().describe("Data final no formato AAAA-MM-DD. Null = sem limite."),
      }),
      execute: async ({ data_inicio, data_fim }) => {
        let q = db
          .from("colheitas")
          .select("data_colheita, producao_liquida_kg, producao_kg, area_colhida, total_sacos")
          .order("data_colheita", { ascending: false })
          .limit(5000);
        if (data_inicio) q = q.gte("data_colheita", data_inicio);
        if (data_fim) q = q.lte("data_colheita", data_fim);
        const { data, error } = await q;
        if (error) return { erro: error.message };
        const rows = data ?? [];
        const kg = somaKg(rows, ["producao_liquida_kg", "producao_kg"]);
        return {
          periodo: { de: data_inicio, ate: data_fim },
          cargas: rows.length,
          kg_liquidos: arredondar(kg),
          sacos: Math.round(kg / 60),
          area_colhida_ha: Number(rows.reduce((a, r) => a + Number(r.area_colhida ?? 0), 0).toFixed(2)),
        };
      },
    }),

    listar_notas_fiscais: tool({
      description: "Lista notas fiscais emitidas com número, série, status, destinatário, data e valor total.",
      inputSchema: z.object({
        numero: z.string().nullable().describe("Número da nota, quando o usuário citar um."),
        status: z
          .string()
          .nullable()
          .describe("Status exato, por exemplo: rascunho, processando_autorizacao, autorizada, cancelada, erro_autorizacao."),
        limite: z.number().nullable().describe("Quantidade máxima de notas (padrão 20)."),
      }),
      execute: async ({ numero, status, limite }) => {
        let q = db
          .from("notas_fiscais")
          .select("numero, serie, status, operacao, dest_nome, dest_cpf_cnpj, data_emissao, total_nota, motivo_status")
          .order("data_emissao", { ascending: false })
          .limit(Math.min(limite ?? 20, LIMITE));
        if (numero) q = q.eq("numero", Number(numero.replace(/\D/g, "")) || -1);
        if (status) q = q.eq("status", status);
        const { data, error } = await q;
        if (error) return { erro: error.message };
        return { total: data?.length ?? 0, notas: data ?? [] };
      },
    }),

    consultar_contratos_venda: tool({
      description: "Consulta contratos de venda da produção: comprador, produto, quantidade, preço, valor e situação.",
      inputSchema: z.object({
        termo: z.string().nullable().describe("Parte do nome do comprador ou número do contrato."),
        limite: z.number().nullable().describe("Quantidade máxima (padrão 20)."),
      }),
      execute: async ({ termo, limite }) => {
        let q = db
          .from("contratos_venda")
          .select(
            "numero, numero_contrato_comprador, data_contrato, quantidade_kg, quantidade_sacos, preco_kg, valor_total, fechada, local_entrega_nome, comprador:comprador_id(nome, cpf_cnpj), produto:produto_id(nome)",
          )
          .order("data_contrato", { ascending: false })
          .limit(Math.min(limite ?? 20, LIMITE));
        if (termo?.trim()) q = q.or(`numero.ilike.%${termo.trim()}%,numero_contrato_comprador.ilike.%${termo.trim()}%`);
        const { data, error } = await q;
        if (error) return { erro: error.message };
        return { total: data?.length ?? 0, contratos: data ?? [] };
      },
    }),

    iniciar_tour: tool({
      description:
        "Oferece ao usuário um tour guiado na tela indicada, destacando os pontos onde clicar. " +
        "Use quando o usuário pedir para ser mostrado na tela ou quando o passo a passo ficar mais claro visualmente.",
      inputSchema: z.object({
        tour_id: z
          .enum(["entrada-colheita", "notas-deposito", "transferencias", "compra-cereais", "vendas-producao", "entradas-nfe", "relatorios"])
          .describe("Identificador do tour disponível."),
      }),
      execute: async ({ tour_id }) => {
        const tour = TOURS_DISPONIVEIS.find((t) => t.id === tour_id);
        if (!tour) return { erro: "Tour não disponível." };
        return { tour_id: tour.id, titulo: tour.titulo, rota: tour.rota, acao: "botao_iniciar_tour" };
      },
    }),
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return jsonError(401, "Não autorizado");

    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableApiKey) return jsonError(500, "Assistente não configurado (chave de IA ausente).");

    // Cliente com o token do próprio usuário: a RLS continua valendo em todas as consultas.
    const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData } = await db.auth.getUser();
    if (!userData?.user) return jsonError(401, "Sessão inválida. Faça login novamente.");

    const { data: profile } = await db
      .from("profiles")
      .select("nome, tenant_id")
      .eq("id", userData.user.id)
      .maybeSingle();

    let empresa: string | null = null;
    if (profile?.tenant_id) {
      const { data: tenant } = await db
        .from("tenants")
        .select("razao_social, nome_fantasia")
        .eq("id", profile.tenant_id)
        .maybeSingle();
      empresa = tenant ? (tenant.nome_fantasia || tenant.razao_social) : null;
    }

    const body = await req.json();
    const messages: UIMessage[] = body?.messages ?? [];
    const rotaAtual: string | null = typeof body?.rotaAtual === "string" ? body.rotaAtual : null;

    const lovable = createOpenAI({
      baseURL: "https://ai.gateway.lovable.dev/v1",
      apiKey: lovableApiKey,
      headers: {
        "Lovable-API-Key": lovableApiKey,
        "X-Lovable-AIG-SDK": "vercel-ai-sdk",
      },
    });

    const contexto = [
      profile?.nome ? `Usuário: ${profile.nome}.` : null,
      empresa ? `Empresa ativa: ${empresa}.` : "Usuário sem empresa ativa selecionada.",
      rotaAtual ? `Tela em que o usuário está agora: ${rotaAtual}.` : null,
      `Data de hoje: ${new Date().toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}.`,
    ]
      .filter(Boolean)
      .join(" ");

    const result = streamText({
      model: lovable.responses("openai/gpt-6-astra"),
      system: `Você é o assistente de ajuda do SISAGRO. ${contexto}\n\n${SISAGRO_KNOWLEDGE}`,
      messages: await convertToModelMessages(messages),
      tools: criarFerramentas(db),
      stopWhen: stepCountIs(50),
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

    return result.toUIMessageStreamResponse({
      headers: corsHeaders,
      onError: (error) => {
        console.error("Erro no assistente:", error);
        const msg = error instanceof Error ? error.message : String(error);
        if (msg.includes("402")) return "Os créditos de IA da empresa acabaram. Peça ao administrador para adicionar créditos.";
        if (msg.includes("429")) return "Muitas perguntas ao mesmo tempo. Aguarde alguns segundos e tente novamente.";
        if (msg.includes("403")) return "O assistente está bloqueado nas configurações da empresa.";
        return "Não consegui responder agora. Tente novamente em instantes.";
      },
    });
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      return new Response(null, { status: 499, headers: corsHeaders });
    }
    console.error("Falha no assistente-ajuda:", e);
    return jsonError(500, e instanceof Error ? e.message : "Erro inesperado");
  }
});
