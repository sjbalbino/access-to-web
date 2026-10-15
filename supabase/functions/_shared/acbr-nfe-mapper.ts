// Converte o payload fiscal "plano" do Sisagro (formato Focus NFe) na árvore
// infNFe exigida pela ACBr API Nuvem (Nfe.DTO.TNfePedidoEmissao).
// deno-lint-ignore-file no-explicit-any
type Admin = any;
type Rec = Record<string, any>;

const UF_CODIGO: Record<string, number> = {
  RO: 11, AC: 12, AM: 13, RR: 14, PA: 15, AP: 16, TO: 17, MA: 21, PI: 22, CE: 23, RN: 24,
  PB: 25, PE: 26, AL: 27, SE: 28, BA: 29, MG: 31, ES: 32, RJ: 33, SP: 35, PR: 41, SC: 42,
  RS: 43, MS: 50, MT: 51, GO: 52, DF: 53,
};

const dig = (v: unknown) => String(v ?? "").replace(/\D/g, "");
const num = (v: unknown, d = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};
const r2 = (v: number) => Number(v.toFixed(2));
// O schema da NF-e só aceita caracteres Latin-1 (espaço até ÿ), sem quebras de
// linha nem espaços nas pontas. Convertemos travessões, aspas tipográficas etc.
const textoSefaz = (s: string): string =>
  s
    .replace(/[\u2013\u2014\u2212]/g, "-")
    .replace(/[\u2018\u2019\u201A\u2032]/g, "'")
    .replace(/[\u201C\u201D\u201E\u2033]/g, '"')
    .replace(/\u2026/g, "...")
    .replace(/[\u2022\u00B7]/g, "-")
    .replace(/\s+/g, " ")
    .replace(/[^\x20-\xFF]/g, "")
    .trim();
const clean = <T>(obj: T): T => {
  if (typeof obj === "string") return textoSefaz(obj) as unknown as T;
  if (Array.isArray(obj)) return obj.map(clean).filter((v) => v !== undefined) as unknown as T;
  if (obj && typeof obj === "object") {
    const out: Rec = {};
    for (const [k, v] of Object.entries(obj as Rec)) {
      if (v === undefined || v === null || v === "") continue;
      const c = clean(v);
      if (c && typeof c === "object" && !Array.isArray(c) && Object.keys(c).length === 0) continue;
      out[k] = c;
    }
    return out as T;
  }
  return obj;
};

const normalizar = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toUpperCase();

async function resolverCodigoMunicipio(admin: Admin, nome: unknown, uf: unknown): Promise<string | undefined> {
  const n = String(nome ?? "").trim();
  const u = String(uf ?? "").trim().toUpperCase();
  if (/^\d{7}$/.test(n)) return n;
  if (!n || !u) return undefined;
  const { data } = await admin.from("ibge_municipios").select("codigo_ibge, nome").eq("uf", u);
  const alvo = normalizar(n);
  const achado = (data ?? []).find((m: Rec) => normalizar(String(m.nome)) === alvo);
  return achado?.codigo_ibge ? String(achado.codigo_ibge) : undefined;
}

function grupoIcms(it: Rec, crt: number): Rec {
  const orig = num(it.icms_origem, 0);
  const cst = dig(it.icms_situacao_tributaria);
  if (crt === 1 || crt === 4 || cst.length === 3) {
    const csosn = cst || "102";
    if (csosn === "101") return { ICMSSN101: { orig, CSOSN: csosn, pCredSN: 0, vCredICMSSN: 0 } };
    if (csosn === "900") return { ICMSSN900: { orig, CSOSN: csosn } };
    return { ICMSSN102: { orig, CSOSN: csosn } };
  }
  const c = cst.padStart(2, "0");
  const vBC = num(it.icms_base_calculo), pICMS = num(it.icms_aliquota), vICMS = num(it.icms_valor);
  const modBC = num(it.icms_modalidade_base_calculo, 3);
  if (c === "00") return { ICMS00: { orig, CST: c, modBC, vBC, pICMS, vICMS } };
  if (c === "20") return { ICMS20: { orig, CST: c, modBC, pRedBC: num(it.icms_reducao_base_calculo), vBC, pICMS, vICMS } };
  if (["40", "41", "50"].includes(c)) return { ICMS40: { orig, CST: c } };
  if (c === "51") return { ICMS51: { orig, CST: c, modBC, vBC, pICMS, vICMS } };
  if (c === "60") return { ICMS60: { orig, CST: c } };
  return { ICMS90: { orig, CST: "90", modBC, vBC, pICMS, vICMS } };
}

/** Soma um campo (ex.: vBC) dentro do grupo de imposto (ICMS/PIS/COFINS) já montado em cada item. */
function somaGrupo(det: Array<{ imposto: Record<string, unknown> }>, imposto: string, campo: string): number {
  const total = det.reduce((t, d) => {
    const grupo = d.imposto?.[imposto] as Record<string, Record<string, unknown>> | undefined;
    if (!grupo) return t;
    const sub = Object.values(grupo)[0];
    const v = Number(sub?.[campo]);
    return Number.isFinite(v) ? t + v : t;
  }, 0);
  return Number(total.toFixed(2));
}

function grupoPisCofins(it: Rec, tipo: "pis" | "cofins"): Rec {
  const P = tipo === "pis" ? "PIS" : "COFINS";
  const cst = dig(it[`${tipo}_situacao_tributaria`]).padStart(2, "0") || "07";
  const vBC = num(it[`${tipo}_base_calculo`]);
  const aliq = num(it[`${tipo}_aliquota`]);
  const valor = num(it[`${tipo}_valor`]);
  if (["01", "02"].includes(cst)) return { [`${P}Aliq`]: { CST: cst, vBC, [`p${P}`]: aliq, [`v${P}`]: valor } };
  if (["04", "05", "06", "07", "08", "09"].includes(cst)) return { [`${P}NT`]: { CST: cst } };
  return { [`${P}Outr`]: { CST: cst, vBC, [`p${P}`]: aliq, [`v${P}`]: valor } };
}

function grupoIbsCbs(it: Rec): Rec | undefined {
  if (!it.ibs_cbs_situacao_tributaria) return undefined;
  const vIBSUF = num(it.ibs_uf_valor), vIBSMun = num(it.ibs_mun_valor);
  return {
    CST: String(it.ibs_cbs_situacao_tributaria),
    cClassTrib: it.ibs_cbs_classificacao_tributaria,
    gIBSCBS: {
      vBC: num(it.ibs_cbs_base_calculo),
      gIBSUF: { pIBSUF: num(it.ibs_uf_aliquota), vIBSUF },
      gIBSMun: { pIBSMun: num(it.ibs_mun_aliquota), vIBSMun },
      vIBS: r2(vIBSUF + vIBSMun),
      gCBS: { pCBS: num(it.cbs_aliquota), vCBS: num(it.cbs_valor) },
    },
  };
}

function endereco(prefixo: string, n: Rec, cMun: string | undefined): Rec {
  return {
    xLgr: n[`logradouro_${prefixo}`] || "NAO INFORMADO",
    nro: n[`numero_${prefixo}`] || "S/N",
    xCpl: n[`complemento_${prefixo}`],
    xBairro: n[`bairro_${prefixo}`] || "NAO INFORMADO",
    cMun: cMun ? Number(cMun) : undefined,
    xMun: n[`municipio_${prefixo}`],
    UF: n[`uf_${prefixo}`],
    CEP: dig(n[`cep_${prefixo}`]) || undefined,
    cPais: 1058,
    xPais: "BRASIL",
    fone: dig(n[`telefone_${prefixo}`]) || undefined,
  };
}

export async function montarPayloadAcbr(
  admin: Admin,
  n: Rec,
  ambiente: number | null | undefined,
  referencia: string,
): Promise<Rec> {
  const ufEmit = String(n.uf_emitente ?? "").toUpperCase();
  const ufDest = String(n.uf_destinatario ?? "").toUpperCase();
  const cUF = UF_CODIGO[ufEmit];
  if (!cUF) throw new Error(`UF do emitente inválida ou não informada (${ufEmit || "vazia"}).`);

  const [cMunEmit, cMunDest] = await Promise.all([
    resolverCodigoMunicipio(admin, n.municipio_emitente, ufEmit),
    resolverCodigoMunicipio(admin, n.municipio_destinatario, ufDest),
  ]);
  if (!cMunEmit) throw new Error(`Código IBGE do município do emitente não encontrado (${n.municipio_emitente}/${ufEmit}).`);
  if (!cMunDest && ufDest !== "EX") throw new Error(`Código IBGE do município do destinatário não encontrado (${n.municipio_destinatario}/${ufDest}).`);

  const crt = num(n.regime_tributario_emitente, 3);
  const items: Rec[] = Array.isArray(n.items) ? n.items : [];
  if (items.length === 0) throw new Error("A nota não possui itens.");

  const det = items.map((it, i) => {
    const qCom = num(it.quantidade_comercial ?? it.quantidade);
    const vUnCom = num(it.valor_unitario_comercial ?? it.valor_unitario);
    const vProd = r2(num(it.valor_bruto, qCom * vUnCom));
    const ipi = it.ipi_situacao_tributaria
      ? {
        cEnq: it.ipi_codigo_enquadramento || "999",
        ...(["00", "49", "50", "99"].includes(dig(it.ipi_situacao_tributaria).padStart(2, "0"))
          ? { IPITrib: { CST: dig(it.ipi_situacao_tributaria).padStart(2, "0"), vBC: num(it.ipi_base_calculo), pIPI: num(it.ipi_aliquota), vIPI: num(it.ipi_valor) } }
          : { IPINT: { CST: dig(it.ipi_situacao_tributaria).padStart(2, "0") } }),
      }
      : undefined;
    return {
      nItem: num(it.numero_item, i + 1),
      prod: {
        cProd: String(it.codigo_produto ?? i + 1),
        cEAN: "SEM GTIN",
        xProd: it.descricao,
        NCM: dig(it.codigo_ncm) || "00000000",
        CFOP: Number(dig(it.cfop)),
        uCom: it.unidade_comercial || "UN",
        qCom,
        vUnCom,
        vProd,
        cEANTrib: "SEM GTIN",
        uTrib: it.unidade_tributavel || it.unidade_comercial || "UN",
        qTrib: num(it.quantidade_tributavel, qCom),
        vUnTrib: num(it.valor_unitario_tributavel, vUnCom),
        vFrete: num(it.valor_frete) || undefined,
        vSeg: num(it.valor_seguro) || undefined,
        vDesc: num(it.valor_desconto) || undefined,
        vOutro: num(it.valor_outras_despesas) || undefined,
        indTot: 1,
      },
      imposto: {
        ICMS: grupoIcms(it, crt),
        IPI: ipi,
        PIS: grupoPisCofins(it, "pis"),
        COFINS: grupoPisCofins(it, "cofins"),
        IBSCBS: grupoIbsCbs(it),
      },
      infAdProd: it.informacoes_adicionais_item,
    };
  });

  const soma = (campo: string) => r2(items.reduce((t, it) => t + num(it[campo]), 0));
  const vProd = r2(det.reduce((t, d) => t + d.prod.vProd, 0));
  const vFrete = soma("valor_frete"), vSeg = soma("valor_seguro"), vDesc = soma("valor_desconto");
  const vOutro = soma("valor_outras_despesas"), vIPI = soma("ipi_valor");
  const vNF = r2(vProd + vFrete + vSeg + vOutro + vIPI - vDesc);

  const nfRef = Array.isArray(n.notas_referenciadas)
    ? n.notas_referenciadas.map((r: Rec) => {
      if (r.chave_nfe) return { refNFe: dig(r.chave_nfe) };
      if (r.numero_nf_produtor) {
        return {
          refNFP: {
            cUF: UF_CODIGO[String(r.uf_nf_produtor ?? ufEmit).toUpperCase()],
            AAMM: dig(r.mes_nf_produtor),
            ...(dig(r.cpf_nf_produtor) ? { CPF: dig(r.cpf_nf_produtor) } : { CNPJ: dig(r.cnpj_nf_produtor) || undefined }),
            IE: dig(r.inscricao_estadual_nf_produtor) || "ISENTO",
            mod: String(r.modelo_nf_produtor ?? "04").padStart(2, "0"),
            serie: num(r.serie_nf_produtor),
            nNF: num(r.numero_nf_produtor),
          },
        };
      }
      return undefined;
    })
    : undefined;

  const ibsItens = det.filter((d) => d.imposto.IBSCBS);
  const IBSCBSTot = ibsItens.length
    ? {
      vBCIBSCBS: r2(ibsItens.reduce((t, d) => t + num(d.imposto.IBSCBS!.gIBSCBS.vBC), 0)),
      gIBS: {
        gIBSUF: { vDif: 0, vDevTrib: 0, vIBSUF: soma("ibs_uf_valor") },
        gIBSMun: { vDif: 0, vDevTrib: 0, vIBSMun: soma("ibs_mun_valor") },
        vIBS: r2(soma("ibs_uf_valor") + soma("ibs_mun_valor")),
        vCredPres: 0, vCredPresCondSus: 0,
      },
      gCBS: { vDif: 0, vDevTrib: 0, vCBS: soma("cbs_valor"), vCredPres: 0, vCredPresCondSus: 0 },
    }
    : undefined;

  const tpAmb = ambiente === 2 ? 2 : 1;
  const destDoc = dig(n.cpf_destinatario || n.cnpj_destinatario);
  const emitDoc = dig(n.cpf_emitente || n.cnpj_emitente);
  const transpDoc = dig(n.cpf_transportador || n.cnpj_transportador);
  const indIEDest = num(n.indicador_inscricao_estadual_destinatario, 9);

  const formaPag = num(n.forma_pagamento, 0);
  const tPag = num(n.meio_pagamento, 90); // 90 = sem pagamento (padrão)
  const detPag = tPag === 90
    ? [{ indPag: 0, tPag: "90", vPag: 0 }]
    : [{ indPag: formaPag === 1 ? 1 : 0, tPag: String(tPag).padStart(2, "0"), vPag: vNF }];

  return clean({
    ambiente: tpAmb === 2 ? "homologacao" : "producao",
    referencia,
    infNFe: {
      versao: "4.00",
      ide: {
        cUF,
        natOp: n.natureza_operacao,
        mod: 55,
        serie: num(n.serie, 1),
        nNF: num(n.numero),
        dhEmi: n.data_emissao || new Date().toISOString(),
        tpNF: num(n.tipo_documento, 1),
        idDest: ufDest === "EX" ? 3 : ufDest && ufDest !== ufEmit ? 2 : 1,
        cMunFG: Number(cMunEmit),
        tpImp: 1,
        tpEmis: 1,
        tpAmb,
        finNFe: num(n.finalidade_emissao, 1),
        indFinal: num(n.consumidor_final, 0),
        indPres: num(n.presenca_comprador, 0),
        // NT 2020.006: obrigatório quando indPres ∈ {2,3,4,9}. 0 = sem intermediador.
        ...([2, 3, 4, 9].includes(num(n.presenca_comprador, 0))
          ? { indIntermed: num(n.indicador_intermediador, 0) }
          : {}),
        procEmi: 0,
        verProc: "Sisagro 1.0",
        NFref: nfRef && nfRef.length ? nfRef : undefined,
      },
      emit: {
        ...(emitDoc.length === 11 ? { CPF: emitDoc } : { CNPJ: emitDoc }),
        xNome: n.nome_emitente,
        xFant: n.nome_fantasia_emitente,
        enderEmit: endereco("emitente", n, cMunEmit),
        IE: dig(n.inscricao_estadual_emitente) || "ISENTO",
        CRT: crt,
      },
      dest: {
        ...(destDoc.length === 11 ? { CPF: destDoc } : destDoc.length === 14 ? { CNPJ: destDoc } : {}),
        xNome: tpAmb === 2 ? "NF-E EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL" : n.nome_destinatario,
        enderDest: endereco("destinatario", n, cMunDest),
        indIEDest,
        IE: indIEDest === 1 ? dig(n.inscricao_estadual_destinatario) : undefined,
        email: n.email_destinatario,
      },
      det,
      total: {
        ICMSTot: {
          // Totais calculados a partir dos grupos efetivamente enviados nos itens
          // (ex.: CST 40/41/50 não têm vBC) — evita Rejeição 531/532.
          vBC: somaGrupo(det, "ICMS", "vBC"), vICMS: somaGrupo(det, "ICMS", "vICMS"), vICMSDeson: 0, vFCP: 0,
          vBCST: 0, vST: 0, vFCPST: 0, vFCPSTRet: 0, vProd, vFrete, vSeg, vDesc, vII: 0,
          vIPI, vIPIDevol: 0, vPIS: somaGrupo(det, "PIS", "vPIS"), vCOFINS: somaGrupo(det, "COFINS", "vCOFINS"), vOutro, vNF,
        },
        IBSCBSTot,
      },
      transp: {
        modFrete: num(n.modalidade_frete, 9),
        transporta: n.nome_transportador || transpDoc
          ? {
            ...(transpDoc.length === 11 ? { CPF: transpDoc } : transpDoc.length === 14 ? { CNPJ: transpDoc } : {}),
            xNome: n.nome_transportador,
            IE: dig(n.inscricao_estadual_transportador) || undefined,
            xEnder: n.endereco_transportador,
            xMun: n.municipio_transportador,
            UF: n.uf_transportador,
          }
          : undefined,
        veicTransp: n.veiculo_placa ? { placa: String(n.veiculo_placa).replace(/[^A-Z0-9]/gi, "").toUpperCase(), UF: n.veiculo_uf } : undefined,
      },
      pag: { detPag },
      infAdic: {
        infAdFisco: n.informacoes_adicionais_fisco,
        infCpl: n.informacoes_adicionais_contribuinte,
      },
    },
  });
}

/** Extrai mensagem legível do retorno de erro da ACBr API. */
export function mensagemErroAcbr(d: Rec | null | undefined): string {
  if (!d) return "Erro desconhecido na ACBr API";
  const e = d.error ?? d;
  const partes: string[] = [];
  if (e?.message) partes.push(String(e.message));
  if (Array.isArray(e?.errors)) {
    for (const x of e.errors) partes.push(typeof x === "string" ? x : x?.message ?? JSON.stringify(x));
  }
  const aut = d.autorizacao;
  if (aut?.motivo_status) partes.push(`Rejeição ${aut.codigo_status ?? ""}: ${aut.motivo_status}`.trim());
  if (d.mensagem_sefaz) partes.push(d.mensagem_sefaz);
  if (d.mensagem) partes.push(d.mensagem);
  return [...new Set(partes.filter(Boolean))].join(" | ") || "Erro desconhecido na ACBr API";
}
