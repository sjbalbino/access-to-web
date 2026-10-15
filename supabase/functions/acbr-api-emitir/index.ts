// Emite NF-e via ACBr API Nuvem. O payload (notaData) usa o mesmo schema fiscal
// já gerado pelo mapeador do Sisagro (compatível Focus NFe / ACBr API).
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { assertNotaFiscalTenant, getCallerTenant, tenantErrorResponse } from "../_shared/tenant-guard.ts";
import { montarErrosApi, normalizarErrosFocus, resumirErros } from "../_shared/nfe-erros.ts";
import { extrairDatasNfe } from "../_shared/nfe-datas.ts";
import { montarPayloadAcbr, mensagemErroAcbr } from "../_shared/acbr-nfe-mapper.ts";
import { acbrAmbienteLabel, acbrFetch, buscarCredenciaisAcbr } from "../_shared/acbr-api.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const onlyDigits = (value: unknown) => String(value ?? "").replace(/\D/g, "");

const formatCst3 = (value: unknown) => {
  const digits = onlyDigits(value);
  return digits ? digits.padStart(3, "0") : undefined;
};

const formatClassTrib6 = (value: unknown) => {
  const digits = onlyDigits(value);
  return digits ? digits.padStart(6, "0") : undefined;
};

const defaultClassTribIbsCbs = (cst: string | undefined) => (cst === "000" ? "000001" : undefined);

const firstNumber = (...values: unknown[]) => {
  for (const value of values) {
    if (value === null || value === undefined || value === "") continue;
    const numberValue = Number(value);
    if (Number.isFinite(numberValue)) return numberValue;
  }
  return undefined;
};

const hasAnyNonZeroNumber = (...values: unknown[]) => values.some((value) => {
  if (value === null || value === undefined || value === "") return false;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) && numberValue !== 0;
});

const roundCurrency = (value: number) => Number(value.toFixed(2));

const sumNumbers = (items: Record<string, unknown>[], field: string) => roundCurrency(
  items.reduce((total, item) => {
    const value = Number(item[field]);
    return Number.isFinite(value) ? total + value : total;
  }, 0),
);

function ensureReformaTributariaTotals(notaData: Record<string, unknown>) {
  const items = Array.isArray(notaData.items)
    ? (notaData.items as Record<string, unknown>[])
    : [];
  const itensComIbsCbs = items.filter((item) => item.ibs_cbs_situacao_tributaria);

  if (itensComIbsCbs.length === 0) return;

  const baseTotal = sumNumbers(itensComIbsCbs, "ibs_cbs_base_calculo");
  const ibsUfTotal = sumNumbers(itensComIbsCbs, "ibs_uf_valor");
  const ibsMunTotal = sumNumbers(itensComIbsCbs, "ibs_mun_valor");
  const cbsTotal = sumNumbers(itensComIbsCbs, "cbs_valor");
  const isTotal = sumNumbers(items, "is_valor");

  notaData.ibs_cbs_base_calculo = baseTotal;
  notaData.ibs_uf_valor_total = ibsUfTotal;
  notaData.ibs_mun_valor_total = ibsMunTotal;
  notaData.ibs_valor_total = roundCurrency(ibsUfTotal + ibsMunTotal);
  notaData.cbs_valor_total = cbsTotal;
  if (isTotal > 0) {
    notaData.is_valor_total = isTotal;
  }
}

function normalizeReformaTributariaPayload(notaData: Record<string, unknown>) {
  const items = Array.isArray(notaData.items) ? notaData.items : [];

  items.forEach((rawItem) => {
    const item = rawItem as Record<string, unknown>;

    const cstIbsCbs = formatCst3(
      item.ibs_cbs_situacao_tributaria ?? item.ibs_situacao_tributaria ?? item.cbs_situacao_tributaria,
    );
    const classTribIbsCbs =
      formatClassTrib6(
        item.ibs_cbs_classificacao_tributaria ?? item.cclass_trib_ibs ?? item.cclass_trib_cbs,
      ) ?? defaultClassTribIbsCbs(cstIbsCbs);
    const baseIbsCbs = firstNumber(item.ibs_cbs_base_calculo, item.ibs_base_calculo, item.cbs_base_calculo, item.valor_bruto);
    const ibsAliquota = firstNumber(item.ibs_uf_aliquota, item.ibs_aliquota);
    const ibsValor = firstNumber(item.ibs_uf_valor, item.ibs_valor);
    const cbsAliquota = firstNumber(item.cbs_aliquota);
    const cbsValor = firstNumber(item.cbs_valor);

    delete item.ibs_situacao_tributaria;
    delete item.ibs_base_calculo;
    delete item.ibs_aliquota;
    delete item.ibs_valor;
    delete item.cclass_trib_ibs;
    delete item.cbs_situacao_tributaria;
    delete item.cbs_base_calculo;
    delete item.cclass_trib_cbs;

    if (cstIbsCbs && classTribIbsCbs && baseIbsCbs !== undefined) {
      item.ibs_cbs_situacao_tributaria = cstIbsCbs;
      item.ibs_cbs_classificacao_tributaria = classTribIbsCbs;
      item.ibs_cbs_base_calculo = baseIbsCbs;
      if (ibsAliquota !== undefined) item.ibs_uf_aliquota = ibsAliquota;
      if (ibsValor !== undefined) {
        item.ibs_uf_valor = ibsValor;
        item.ibs_valor_total = firstNumber(item.ibs_valor_total, ibsValor);
      }
      item.ibs_mun_aliquota = firstNumber(item.ibs_mun_aliquota, 0);
      item.ibs_mun_valor = firstNumber(item.ibs_mun_valor, 0);
      if (cbsAliquota !== undefined) item.cbs_aliquota = cbsAliquota;
      if (cbsValor !== undefined) item.cbs_valor = cbsValor;
    }

    const classTribIs = formatClassTrib6(item.is_classificacao_tributaria ?? item.cclass_trib_is);
    const hasEffectiveIs = hasAnyNonZeroNumber(item.is_aliquota, item.is_valor);
    if (!classTribIs || !hasEffectiveIs) {
      delete item.is_situacao_tributaria;
      delete item.is_classificacao_tributaria;
      delete item.is_base_calculo;
      delete item.is_aliquota;
      delete item.is_valor;
      delete item.cclass_trib_is;
    } else {
      item.is_situacao_tributaria = formatCst3(item.is_situacao_tributaria);
      item.is_classificacao_tributaria = classTribIs;
      item.is_base_calculo = firstNumber(item.is_base_calculo, item.valor_bruto);
    }
  });

  ensureReformaTributariaTotals(notaData);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // --- Auth ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const _authClient = createClient(SUPABASE_URL!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: _userData, error: _userErr } = await _authClient.auth.getUser();
    if (_userErr || !_userData?.user) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const _adminClient = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    const { data: _roles } = await _adminClient.from("user_roles").select("role").eq("user_id", _userData.user.id);
    if (!(_roles || []).some((r: { role: string }) => ["admin", "gerente", "operador"].includes(r.role))) {
      return new Response(JSON.stringify({ error: "Permissão insuficiente" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { notaFiscalId, notaData } = await req.json();

    if (!notaFiscalId || !notaData) {
      throw new Error("notaFiscalId e notaData são obrigatórios");
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Tenant isolation
    {
      const caller = await getCallerTenant(supabase, _userData.user.id);
      const guard = await assertNotaFiscalTenant(supabase, notaFiscalId, caller);
      if (!guard.ok) return tenantErrorResponse(guard, corsHeaders);
    }

    // Buscar nota com dados do emitente
    const { data: existingNota } = await supabase
      .from("notas_fiscais")
      .select(`
        uuid_api,
        status,
        motivo_status,
        numero,
        emitente_id,
        emitentes_nfe!notas_fiscais_emitente_id_fkey(id, ambiente, numero_atual_nfe, serie_nfe)
      `)
      .eq("id", notaFiscalId)
      .maybeSingle();

    if (!existingNota) {
      return new Response(
        JSON.stringify({ success: false, error: "Nota fiscal não encontrada no banco de dados" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const emitenteData = (existingNota as unknown as {
      emitente_id?: string;
      emitentes_nfe?: { id?: string; ambiente: number | null; numero_atual_nfe?: number | null; serie_nfe?: number | string | null };
    })?.emitentes_nfe;
    const ambiente = emitenteData?.ambiente;
    const ambienteLabel = acbrAmbienteLabel(ambiente);

    // Credenciais OAuth da ACBr API do emitente
    const cred = await buscarCredenciaisAcbr(supabase, existingNota.emitente_id);
    if (!cred) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Client ID / Client Secret da ACBr API não configurados para este emitente. Configure as credenciais no cadastro do emitente.`,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Nota já autorizada (ex.: clique duplo / reenvio): não reemite e não trata
    // como erro — devolve sucesso para a tela apenas atualizar o status.
    if (existingNota?.status === "autorizada") {
      return new Response(
        JSON.stringify({
          success: true,
          jaAutorizada: true,
          ref: existingNota.uuid_api,
          data: { status: "autorizado", mensagem_sefaz: existingNota.motivo_status },
          provedor: "acbrapi",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Referência única para evitar cache do provedor
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    // ACBr limita "referencia" a 50 caracteres
    const ref = `${String(notaFiscalId).replace(/-/g, "")}${timestamp.toString(36)}`.slice(0, 50);
    void randomSuffix;

    console.log("Gerando NOVA referência única (ACBr):", ref);
    console.log("Status anterior:", existingNota?.status);

    normalizeReformaTributariaPayload(notaData as Record<string, unknown>);

    // Série: fallback para a série configurada no emitente
    let serieNota = (notaData as Record<string, unknown>).serie;
    if (serieNota === null || serieNota === undefined || String(serieNota).trim() === "") {
      const serieEmitente = emitenteData?.serie_nfe;
      if (serieEmitente !== null && serieEmitente !== undefined && String(serieEmitente).trim() !== "") {
        serieNota = serieEmitente;
        (notaData as Record<string, unknown>).serie = serieEmitente;
        console.log(`Série da nota vazia — usando série do emitente: ${serieEmitente}`);
      } else {
        return new Response(
          JSON.stringify({
            error: "Série da NF-e não informada. Configure a série no emitente antes de emitir.",
            codigo: "SERIE_VAZIA",
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    // Numeração: respeita número reservado; senão numero_atual_nfe + 1
    const numeroAtual = Number(emitenteData?.numero_atual_nfe ?? 0);
    if (Number.isNaN(numeroAtual) || numeroAtual < 0) {
      return new Response(
        JSON.stringify({
          error: "Numeração da NF-e inválida no emitente. O campo 'numero_atual_nfe' deve ser zero ou o último número autorizado.",
          codigo: "NUMERO_ATUAL_INVALIDO",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const numeroReservado = Number((existingNota as { numero?: number | null }).numero ?? 0);
    const proximoNumero = numeroReservado > 0 ? numeroReservado : numeroAtual + 1;
    (notaData as Record<string, unknown>).numero = proximoNumero;
    console.log(`Número da NFe: ${proximoNumero} (reservado=${numeroReservado}, numero_atual_nfe=${numeroAtual}, serie=${serieNota})`);

    console.log("Emitindo NF-e via ACBr API:", notaFiscalId);
    console.log("Referência:", ref);

    const payloadAcbr = await montarPayloadAcbr(supabase, notaData as Record<string, unknown>, ambiente, ref);
    console.log("Payload ACBr infNFe:", JSON.stringify(payloadAcbr));
    const response = await acbrFetch(cred, `/nfe`, { method: "POST", body: payloadAcbr });

    const responseText = await response.text();
    console.log("Resposta bruta ACBr API:", responseText);

    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      console.error("Resposta não é JSON válido:", responseText);

      await supabase
        .from("notas_fiscais")
        .update({
          status: "rejeitada",
          motivo_status: `Erro de comunicação com a ACBr API: ${responseText.substring(0, 200)}`,
        })
        .eq("id", notaFiscalId);

      return new Response(
        JSON.stringify({
          success: false,
          error: "Erro de autenticação ou comunicação com a ACBr API. Verifique o Client ID e o Client Secret do emitente.",
          details: responseText.substring(0, 500),
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    console.log("Resposta ACBr API:", JSON.stringify(responseData, null, 2));

    if (!response.ok) {
      const errosDetalhados = normalizarErrosFocus(responseData);
      const errosApi = montarErrosApi(responseData);
      console.log("Erros detalhados normalizados:", JSON.stringify(errosDetalhados));

      const isDuplicidade = responseData.status_sefaz === "539" ||
        responseData.mensagem_sefaz?.includes("Duplicidade");

      if (isDuplicidade) {
        const numeroQueimado = Number((existingNota as { numero?: number | null }).numero ?? 0);
        const numeroAtualEmit = Number(emitenteData?.numero_atual_nfe ?? 0);
        const novoNumeroAtual = Math.max(numeroAtualEmit, numeroQueimado);

        await supabase
          .from("notas_fiscais")
          .update({
            status: "erro_autorizacao",
            motivo_status: responseData.mensagem_sefaz || "NFe com número duplicado na SEFAZ. Número liberado — tente emitir novamente para receber um novo número.",
            erros_api: errosApi,
            numero: null,
            uuid_api: null,
            chave_acesso: null,
            protocolo: null,
          })
          .eq("id", notaFiscalId);

        if (emitenteData?.id && novoNumeroAtual > numeroAtualEmit) {
          await supabase
            .from("emitentes_nfe")
            .update({ numero_atual_nfe: novoNumeroAtual })
            .eq("id", emitenteData.id);
          console.log(`Numero_atual_nfe avançado de ${numeroAtualEmit} para ${novoNumeroAtual}`);
        }
      } else {
        const mensagemRejeicao = resumirErros(
          mensagemErroAcbr(responseData),
          errosDetalhados,
        );
        const codigoRejeicao = responseData.status_sefaz ? `Rejeição ${responseData.status_sefaz}: ` : "";

        await supabase
          .from("notas_fiscais")
          .update({
            status: "rejeitada",
            motivo_status: `${codigoRejeicao}${mensagemRejeicao}`.substring(0, 1000),
            erros_api: errosApi,
          })
          .eq("id", notaFiscalId);
      }

      return new Response(
        JSON.stringify({
          success: false,
          error: isDuplicidade
            ? "Duplicidade na SEFAZ: já existe uma NF-e autorizada com este número. O número foi liberado e o próximo será usado — clique em Emitir NF-e novamente."
            : mensagemErroAcbr(responseData),
          details: responseData,
          erros: errosDetalhados,
          errosApi,
          isDuplicidade,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Atualizar nota com dados da API
    const statusAcbr = String(responseData.status || "").toLowerCase();
    const statusMap: Record<string, string> = {
      autorizado: "autorizada", autorizada: "autorizada", rejeitado: "rejeitada", rejeitada: "rejeitada",
      denegado: "denegada", cancelado: "cancelada", pendente: "processando", erro: "rejeitada",
    };
    const aut = responseData.autorizacao || {};
    if (responseData.chave && !responseData.chave_nfe) responseData.chave_nfe = responseData.chave;
    if (aut.numero_protocolo && !responseData.protocolo) responseData.protocolo = aut.numero_protocolo;
    if (aut.motivo_status && !responseData.mensagem_sefaz) {
      responseData.mensagem_sefaz = `${aut.codigo_status ?? ""} ${aut.motivo_status}`.trim();
    }
    const updateData: Record<string, unknown> = {
      status: statusMap[statusAcbr] || "processando",
      uuid_api: responseData.id || ref,
    };

    if (responseData.chave_nfe) updateData.chave_acesso = responseData.chave_nfe;
    if (responseData.numero) updateData.numero = responseData.numero;
    if (responseData.serie) {
      updateData.serie = responseData.serie;
    } else if (serieNota !== undefined && serieNota !== null && String(serieNota).trim() !== "") {
      updateData.serie = serieNota;
    }
    if (responseData.protocolo) updateData.protocolo = responseData.protocolo;
    if (responseData.caminho_xml_nota_fiscal) updateData.xml_url = responseData.caminho_xml_nota_fiscal;
    if (responseData.caminho_danfe) updateData.danfe_url = responseData.caminho_danfe;
    if (responseData.mensagem_sefaz) updateData.motivo_status = responseData.mensagem_sefaz;
    updateData.erros_api = montarErrosApi(responseData);

    const datasOficiais = extrairDatasNfe(responseData);
    if (datasOficiais.data_emissao) updateData.data_emissao = datasOficiais.data_emissao;
    if (datasOficiais.data_autorizacao) updateData.data_autorizacao = datasOficiais.data_autorizacao;
    console.log("Datas oficiais extraídas da API:", JSON.stringify(datasOficiais));

    const { error: updateError } = await supabase
      .from("notas_fiscais")
      .update(updateData)
      .eq("id", notaFiscalId);

    if (updateError) {
      console.error("Erro ao atualizar nota fiscal no banco:", updateError);
      return new Response(
        JSON.stringify({
          success: true,
          warning: "NF-e processada pela SEFAZ, mas houve erro ao atualizar o banco de dados local",
          data: responseData,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        ref: updateData.uuid_api,
        data: responseData,
        ambiente: ambienteLabel,
        provedor: "acbrapi",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Erro ao emitir NF-e via ACBr API:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
