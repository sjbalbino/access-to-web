import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CnpjResultado {
  cnpj: string;
  razao_social: string;
  nome_fantasia: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
  cep: string;
  telefone: string;
  email: string;
  situacao_cadastral: string;
  data_situacao_cadastral: string;
  natureza_juridica: string;
  porte: string;
  capital_social: number;
  atividade_principal: string;
}

function formatCnpj(cnpj: string): string {
  return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
}

function formatCep(cep: string | null | undefined): string {
  if (!cep) return '';
  const d = cep.replace(/\D/g, '');
  return d.length === 8 ? d.replace(/(\d{5})(\d{3})/, '$1-$2') : cep;
}

function formatTelefone(ddd: string | null | undefined, numero: string | null | undefined): string {
  if (!numero) return '';
  const dddClean = (ddd || '').toString().replace(/\D/g, '');
  const numClean = numero.toString().replace(/\D/g, '');
  if (!numClean) return '';
  if (dddClean) return `(${dddClean}) ${numClean}`;
  // BrasilAPI concatena ddd+numero em ddd_telefone_1
  if (numClean.length >= 10) return `(${numClean.substring(0, 2)}) ${numClean.substring(2)}`;
  return numClean;
}

async function fetchCnpjaOpen(cnpj: string): Promise<CnpjResultado | null> {
  try {
    const resp = await fetch(`https://open.cnpja.com/office/${cnpj}`);
    if (!resp.ok) return null;
    const d = await resp.json();
    const addr = d.address || {};
    const phone = Array.isArray(d.phones) && d.phones[0] ? d.phones[0] : null;
    const email = Array.isArray(d.emails) && d.emails[0]?.address ? d.emails[0].address : '';
    return {
      cnpj: formatCnpj(cnpj),
      razao_social: d.company?.name || '',
      nome_fantasia: d.alias || '',
      logradouro: addr.street || '',
      numero: addr.number || '',
      complemento: addr.details || '',
      bairro: addr.district || '',
      cidade: addr.city || '',
      uf: addr.state || '',
      cep: formatCep(addr.zip),
      telefone: phone ? formatTelefone(phone.area, phone.number) : '',
      email,
      situacao_cadastral: d.status?.text || '',
      data_situacao_cadastral: d.statusDate || '',
      natureza_juridica: d.company?.nature?.text || '',
      porte: d.company?.size?.text || '',
      capital_social: Number(d.company?.equity) || 0,
      atividade_principal: d.mainActivity?.text || '',
    };
  } catch (e) {
    console.error('CNPJa Open falhou:', e);
    return null;
  }
}

async function fetchReceitaWs(cnpj: string): Promise<CnpjResultado | null> {
  try {
    const resp = await fetch(`https://receitaws.com.br/v1/cnpj/${cnpj}`);
    if (!resp.ok) return null;
    const d = await resp.json();
    if (d.status === 'ERROR') return null;
    return {
      cnpj: formatCnpj(cnpj),
      razao_social: d.nome || '',
      nome_fantasia: d.fantasia || '',
      logradouro: d.logradouro || '',
      numero: d.numero || '',
      complemento: d.complemento || '',
      bairro: d.bairro || '',
      cidade: d.municipio || '',
      uf: d.uf || '',
      cep: formatCep(d.cep),
      telefone: d.telefone || '',
      email: d.email || '',
      situacao_cadastral: d.situacao || '',
      data_situacao_cadastral: d.data_situacao || '',
      natureza_juridica: d.natureza_juridica || '',
      porte: d.porte || '',
      capital_social: Number(d.capital_social) || 0,
      atividade_principal: d.atividade_principal?.[0]?.text || '',
    };
  } catch (e) {
    console.error('ReceitaWS falhou:', e);
    return null;
  }
}

async function fetchBrasilApi(cnpj: string): Promise<CnpjResultado | null> {
  try {
    const resp = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`);
    if (!resp.ok) return null;
    const d = await resp.json();
    const tipoLog = d.descricao_tipo_de_logradouro ? `${d.descricao_tipo_de_logradouro} ` : '';
    return {
      cnpj: formatCnpj(cnpj),
      razao_social: d.razao_social || '',
      nome_fantasia: d.nome_fantasia || '',
      logradouro: `${tipoLog}${d.logradouro || ''}`.trim(),
      numero: d.numero || '',
      complemento: d.complemento || '',
      bairro: d.bairro || '',
      cidade: d.municipio || '',
      uf: d.uf || '',
      cep: formatCep(d.cep),
      telefone: formatTelefone(null, d.ddd_telefone_1),
      email: d.email || '',
      situacao_cadastral: d.descricao_situacao_cadastral || '',
      data_situacao_cadastral: d.data_situacao_cadastral || '',
      natureza_juridica: d.natureza_juridica || '',
      porte: d.porte || d.descricao_porte || '',
      capital_social: d.capital_social || 0,
      atividade_principal: d.cnae_fiscal_descricao || '',
    };
  } catch (e) {
    console.error('BrasilAPI falhou:', e);
    return null;
  }
}

function isMaisCompleto(a: CnpjResultado, b: CnpjResultado): boolean {
  const score = (r: CnpjResultado) =>
    [r.logradouro, r.numero, r.bairro, r.cep, r.telefone, r.atividade_principal, r.nome_fantasia]
      .filter((v) => v && v.trim().length > 0).length;
  return score(a) >= score(b);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const authClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: userData, error: userErr } = await authClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: 'Não autenticado' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { cnpj } = await req.json();
    if (!cnpj) {
      return new Response(JSON.stringify({ error: 'CNPJ é obrigatório' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const cnpjLimpo = cnpj.replace(/\D/g, '');
    if (cnpjLimpo.length !== 14) {
      return new Response(JSON.stringify({ error: 'CNPJ inválido. Deve conter 14 dígitos.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Consultando CNPJ: ${cnpjLimpo}`);

    // Consulta múltiplas fontes em paralelo e escolhe a mais completa.
    // CNPJa Open e ReceitaWS costumam ter dados mais atualizados que BrasilAPI.
    const [cnpja, receitaws, brasil] = await Promise.all([
      fetchCnpjaOpen(cnpjLimpo),
      fetchReceitaWs(cnpjLimpo),
      fetchBrasilApi(cnpjLimpo),
    ]);

    const candidatos = [cnpja, receitaws, brasil].filter((c): c is CnpjResultado => c !== null);
    const resultado = candidatos.length
      ? candidatos.reduce((melhor, atual) => (isMaisCompleto(atual, melhor) ? atual : melhor))
      : null;

    if (!resultado) {
      return new Response(
        JSON.stringify({ error: 'CNPJ não encontrado ou serviço indisponível. Tente novamente.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`CNPJ encontrado: ${resultado.razao_social}`);
    return new Response(JSON.stringify(resultado), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Erro na função consulta-cnpj:', error);
    return new Response(JSON.stringify({ error: 'Erro interno ao processar a requisição' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
