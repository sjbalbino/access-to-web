import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { assertNotaFiscalTenant, getCallerTenant, tenantErrorResponse } from "../_shared/tenant-guard.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

// Determina ambiente baseado no cadastro do emitente
const getBaseUrl = (ambiente: number | null | undefined) => {
  const isHomologacao = ambiente === 2;
  console.log("Ambiente do emitente:", isHomologacao ? "HOMOLOGAÇÃO" : "PRODUÇÃO");
  if (isHomologacao) {
    return "https://homologacao.focusnfe.com.br";
  }
  return "https://api.focusnfe.com.br";
};

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

    // Inicializar cliente Supabase
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Tenant isolation: verifica que a nota pertence ao tenant do caller
    {
      const caller = await getCallerTenant(supabase, _userData.user.id);
      const guard = await assertNotaFiscalTenant(supabase, notaFiscalId, caller);
      if (!guard.ok) return tenantErrorResponse(guard, corsHeaders);
    }

    // Buscar nota fiscal com dados do emitente para determinar o ambiente e token
    const { data: existingNota } = await supabase
      .from("notas_fiscais")
      .select(`
        uuid_api, 
        status, 
        motivo_status,
        numero,
        emitente_id,
        emitentes_nfe!notas_fiscais_emitente_id_fkey(id, ambiente, numero_atual_nfe, serie_nfe, emitentes_nfe_credentials(api_access_token, api_access_token_homologacao))
      `)
      .eq("id", notaFiscalId)
      .maybeSingle();

    // Verificar se a nota existe
    if (!existingNota) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Nota fiscal não encontrada no banco de dados",
        }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Obter ambiente e token do emitente
    const emitenteData = (existingNota as unknown as { emitente_id?: string; emitentes_nfe?: { id?: string; ambiente: number | null; numero_atual_nfe?: number | null; serie_nfe?: number | string | null; emitentes_nfe_credentials?: Array<{ api_access_token: string | null; api_access_token_homologacao: string | null }> | { api_access_token: string | null; api_access_token_homologacao: string | null } | null } })?.emitentes_nfe;
    const ambiente = emitenteData?.ambiente;
    const credObj = Array.isArray(emitenteData?.emitentes_nfe_credentials) ? emitenteData?.emitentes_nfe_credentials?.[0] : emitenteData?.emitentes_nfe_credentials;
    const emitenteToken = ambiente === 2 ? credObj?.api_access_token_homologacao : credObj?.api_access_token;
    const ambienteLabel = ambiente === 2 ? "homologação" : "produção";

    // Verificar se o token do emitente está configurado
    if (!emitenteToken) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Token de ${ambienteLabel} da Focus NFe não configurado para este emitente. Configure o token no cadastro do emitente.`,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Se já existe uma nota autorizada, não permitir nova emissão
    if (existingNota?.status === "autorizada") {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Esta nota já foi autorizada anteriormente",
          details: { status: existingNota.status },
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // SEMPRE gerar nova referência única para evitar cache da Focus NFe
    // Usar timestamp + random para garantir unicidade absoluta
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    
    // Sempre gerar nova referência - a Focus NFe faz cache por referência
    // Se reusar uma referência antiga, ela retorna o resultado anterior
    const ref = `nfe_${notaFiscalId}_${timestamp}_${randomSuffix}`;
    
    console.log("Gerando NOVA referência única:", ref);
    console.log("Status anterior:", existingNota?.status);
    console.log("UUID_API anterior:", existingNota?.uuid_api || "NENHUM");

    normalizeReformaTributariaPayload(notaData as Record<string, unknown>);

    // Validar série preenchida (vazia gera Rejeição 236 - DV da chave inválido)
    // Fallback: se a nota está sem série, usa a série configurada no emitente
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
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Forçar número sequencial a partir de emitentes_nfe.numero_atual_nfe + 1
    // numero_atual_nfe = 0 é válido (emitente novo → próxima NFe será nº 1)
    const numeroAtual = Number(emitenteData?.numero_atual_nfe ?? 0);
    if (Number.isNaN(numeroAtual) || numeroAtual < 0) {
      return new Response(
        JSON.stringify({
          error: "Numeração da NF-e inválida no emitente. O campo 'numero_atual_nfe' deve ser zero ou o último número autorizado.",
          codigo: "NUMERO_ATUAL_INVALIDO",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const proximoNumero = numeroAtual + 1;
    (notaData as Record<string, unknown>).numero = proximoNumero;
    console.log(`Forçando número da NFe: ${proximoNumero} (numero_atual_nfe=${numeroAtual}, serie=${serieNota})`);


    console.log("Emitindo NF-e:", notaFiscalId);
    console.log("Referência:", ref);
    console.log("Dados:", JSON.stringify(notaData, null, 2));

    // Chamar API Focus NFe usando o ambiente do emitente
    const baseUrl = getBaseUrl(ambiente);
    console.log("URL Base:", baseUrl);
    
    const response = await fetch(`${baseUrl}/v2/nfe?ref=${ref}`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(`${emitenteToken}:`)}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(notaData),
    });

    // Verificar se a resposta é JSON válido
    const responseText = await response.text();
    console.log("Resposta bruta Focus NFe:", responseText);
    
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      // Resposta não é JSON válido - provavelmente erro de autenticação
      console.error("Resposta não é JSON válido:", responseText);
      
      await supabase
        .from("notas_fiscais")
        .update({
          status: "rejeitada",
          motivo_status: `Erro de comunicação com Focus NFe: ${responseText.substring(0, 200)}`,
        })
        .eq("id", notaFiscalId);

      return new Response(
        JSON.stringify({
          success: false,
          error: "Erro de autenticação ou comunicação com Focus NFe. Verifique se o token está correto para o ambiente selecionado.",
          details: responseText.substring(0, 500),
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    
    console.log("Resposta Focus NFe:", JSON.stringify(responseData, null, 2));

    if (!response.ok) {
      // Verificar se é erro de duplicidade (código 539)
      const isDuplicidade = responseData.status_sefaz === "539" || 
        responseData.mensagem_sefaz?.includes("Duplicidade");

      // Se for erro de duplicidade, LIMPAR uuid_api para forçar nova referência na próxima tentativa
      if (isDuplicidade) {
        await supabase
          .from("notas_fiscais")
          .update({
            status: "erro_autorizacao",
            motivo_status: responseData.mensagem_sefaz || "NFe com número duplicado. Tente novamente com outro número.",
            uuid_api: null, // CRÍTICO: limpar para forçar nova referência
            chave_acesso: null,
            protocolo: null,
          })
          .eq("id", notaFiscalId);
      } else {
        // Atualizar nota com erro normal
        await supabase
          .from("notas_fiscais")
          .update({
            status: "rejeitada",
            motivo_status: responseData.mensagem || responseData.erros?.join("; ") || "Erro desconhecido",
          })
          .eq("id", notaFiscalId);
      }

      return new Response(
        JSON.stringify({
          success: false,
          error: isDuplicidade 
            ? "NFe com número duplicado. Altere o número da NFe e tente novamente."
            : (responseData.mensagem || "Erro ao emitir NF-e"),
          details: responseData,
          isDuplicidade,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Atualizar nota com dados da API
    const updateData: Record<string, unknown> = {
      status: responseData.status || "processando",
      uuid_api: ref,
    };

    if (responseData.chave_nfe) {
      updateData.chave_acesso = responseData.chave_nfe;
    }
    if (responseData.numero) {
      updateData.numero = responseData.numero;
    }
    if (responseData.serie) {
      updateData.serie = responseData.serie;
    } else if (serieNota !== undefined && serieNota !== null && String(serieNota).trim() !== "") {
      updateData.serie = serieNota;
    }
    if (responseData.protocolo) {
      updateData.protocolo = responseData.protocolo;
    }
    if (responseData.caminho_xml_nota_fiscal) {
      updateData.xml_url = responseData.caminho_xml_nota_fiscal;
    }
    if (responseData.caminho_danfe) {
      updateData.danfe_url = responseData.caminho_danfe;
    }
    if (responseData.mensagem_sefaz) {
      updateData.motivo_status = responseData.mensagem_sefaz;
    }

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
          ref,
          updateError: updateError.message,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("Nota fiscal atualizada com sucesso no banco de dados");

    // Atualizar numero_atual_nfe do emitente para o número usado
    const numeroEmitido = Number(responseData.numero ?? proximoNumero);
    if (emitenteData?.id && numeroEmitido > 0) {
      const { error: emitErr } = await supabase
        .from("emitentes_nfe")
        .update({ numero_atual_nfe: numeroEmitido })
        .eq("id", emitenteData.id);
      if (emitErr) console.error("Erro ao atualizar numero_atual_nfe:", emitErr);
      else console.log(`numero_atual_nfe atualizado para ${numeroEmitido}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: responseData,
        ref,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Erro ao emitir NF-e:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
