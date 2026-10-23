// Geradores de XML no padrão SEFAZ (NF-e 4.00) para a Unimake (UniNFe Cloud).
// A Unimake recebe o XML sem assinatura e assina no servidor com o certificado
// A1 enviado previamente; por isso aqui não há <Signature>.
// deno-lint-ignore-file no-explicit-any
type Rec = Record<string, any>;

const NS = "http://www.portalfiscal.inf.br/nfe";

export const UF_CODIGO: Record<string, number> = {
  RO: 11, AC: 12, AM: 13, RR: 14, PA: 15, AP: 16, TO: 17, MA: 21, PI: 22, CE: 23, RN: 24,
  PB: 25, PE: 26, AL: 27, SE: 28, BA: 29, MG: 31, ES: 32, RJ: 33, SP: 35, PR: 41, SC: 42,
  RS: 43, MS: 50, MT: 51, GO: 52, DF: 53,
};

const dig = (v: unknown) => String(v ?? "").replace(/\D/g, "");

export const escXml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

/** Data/hora no formato SEFAZ com fuso de Brasília: AAAA-MM-DDThh:mm:ss-03:00. */
export function dataHoraSefaz(valor?: unknown): string {
  let d = valor ? new Date(String(valor)) : new Date();
  if (Number.isNaN(d.getTime())) d = new Date();
  const br = new Date(d.getTime() - 3 * 3600 * 1000);
  return `${br.toISOString().slice(0, 19)}-03:00`;
}

/** Formata números conforme o tipo decimal exigido pelo schema SEFAZ. */
function fmtNum(chave: string, v: number): string {
  if (chave === "vUnCom" || chave === "vUnTrib") {
    const s = v.toFixed(10).replace(/0+$/, "");
    const [i, d = ""] = s.split(".");
    return `${i}.${d.padEnd(2, "0")}`;
  }
  if (chave === "qCom" || chave === "qTrib") return v.toFixed(4);
  if (/^p[A-Z]/.test(chave)) return v.toFixed(4);
  if (/^v[A-Z]/.test(chave)) return v.toFixed(2);
  return String(Math.trunc(v));
}

/** Serializa objeto → XML preservando a ordem das chaves (ordem do schema). */
export function paraXml(tag: string, valor: unknown, attrs: Record<string, string> = {}): string {
  if (valor === undefined || valor === null || valor === "") return "";
  if (Array.isArray(valor)) return valor.map((v) => paraXml(tag, v)).join("");
  const a = Object.entries(attrs).map(([k, v]) => ` ${k}="${escXml(v)}"`).join("");
  if (typeof valor === "object") {
    const obj = { ...(valor as Rec) };
    // Atributos conhecidos do schema
    const extra: Record<string, string> = {};
    if (tag === "det" && obj.nItem !== undefined) { extra.nItem = String(obj.nItem); delete obj.nItem; }
    const ea = Object.entries(extra).map(([k, v]) => ` ${k}="${escXml(v)}"`).join("");
    const filhos = Object.entries(obj).map(([k, v]) => paraXml(k, v)).join("");
    if (!filhos) return "";
    return `<${tag}${a}${ea}>${filhos}</${tag}>`;
  }
  const texto = typeof valor === "number" ? fmtNum(tag, valor) : escXml(String(valor));
  return `<${tag}${a}>${texto}</${tag}>`;
}

/** Dígito verificador (módulo 11) da chave de acesso. */
export function digitoChave(base43: string): number {
  let peso = 2, soma = 0;
  for (let i = base43.length - 1; i >= 0; i--) {
    soma += Number(base43[i]) * peso;
    peso = peso === 9 ? 2 : peso + 1;
  }
  const resto = soma % 11;
  return resto < 2 ? 0 : 11 - resto;
}

/**
 * Monta o XML <enviNFe> a partir do infNFe gerado por montarPayloadAcbr
 * (mesma árvore de tags SEFAZ). Calcula cNF, cDV e a chave de acesso.
 */
export function montarEnviNFe(infNFe: Rec, docEmitente: string): { xml: string; chave: string } {
  const ide = infNFe.ide as Rec;
  const dhEmi = dataHoraSefaz(ide.dhEmi);
  const aamm = dhEmi.slice(2, 4) + dhEmi.slice(5, 7);
  const serie = Number(ide.serie ?? 1);
  const nNF = Number(ide.nNF);
  let cNF = String(Math.floor(Math.random() * 1e8)).padStart(8, "0");
  if (Number(cNF) === nNF) cNF = String((nNF + 1) % 1e8).padStart(8, "0");
  const base = `${String(ide.cUF).padStart(2, "0")}${aamm}${dig(docEmitente).padStart(14, "0")}55` +
    `${String(serie).padStart(3, "0")}${String(nNF).padStart(9, "0")}${ide.tpEmis ?? 1}${cNF}`;
  const cDV = digitoChave(base);
  const chave = `${base}${cDV}`;

  // Ordem exata do grupo ide no schema 4.00
  const ideOrdenado: Rec = {
    cUF: ide.cUF, cNF, natOp: ide.natOp, mod: ide.mod ?? 55, serie, nNF, dhEmi,
    tpNF: ide.tpNF, idDest: ide.idDest, cMunFG: ide.cMunFG, tpImp: ide.tpImp ?? 1,
    tpEmis: ide.tpEmis ?? 1, cDV, tpAmb: ide.tpAmb, finNFe: ide.finNFe, indFinal: ide.indFinal,
    indPres: ide.indPres, indIntermed: ide.indIntermed, procEmi: ide.procEmi ?? 0,
    verProc: ide.verProc ?? "Sisagro 1.0", NFref: ide.NFref,
  };
  const { versao: _v, ide: _i, ...resto } = infNFe;
  const corpo = paraXml("ide", ideOrdenado) +
    Object.entries(resto).map(([k, v]) => paraXml(k, v)).join("");
  const nfe = `<NFe xmlns="${NS}"><infNFe Id="NFe${chave}" versao="4.00">${corpo}</infNFe></NFe>`;
  const idLote = String(Date.now()).slice(-15);
  const xml = `<?xml version="1.0" encoding="UTF-8"?><enviNFe xmlns="${NS}" versao="4.00">` +
    `<idLote>${idLote}</idLote><indSinc>1</indSinc>${nfe}</enviNFe>`;
  return { xml, chave };
}

const docTag = (doc: string) => (dig(doc).length === 11 ? `<CPF>${dig(doc)}</CPF>` : `<CNPJ>${dig(doc)}</CNPJ>`);

const COND_USO_CCE =
  "A Carta de Correcao e disciplinada pelo paragrafo 1o-A do art. 7o do Convenio S/N, de 15 de dezembro de 1970 e pode ser utilizada para regularizacao de erro ocorrido na emissao de documento fiscal, desde que o erro nao esteja relacionado com: I - as variaveis que determinam o valor do imposto tais como: base de calculo, aliquota, diferenca de preco, quantidade, valor da operacao ou da prestacao; II - a correcao de dados cadastrais que implique mudanca do remetente ou do destinatario; III - a data de emissao ou de saida.";

/** XML <envEvento> de cancelamento (110111) ou carta de correção (110110). */
export function montarEnvEvento(p: {
  tipo: "cancelamento" | "cce";
  chave: string;
  docEmitente: string;
  tpAmb: number;
  nSeq?: number;
  protocolo?: string;
  justificativa?: string;
  correcao?: string;
}): string {
  const tpEvento = p.tipo === "cancelamento" ? "110111" : "110110";
  const seq = p.nSeq ?? 1;
  const id = `ID${tpEvento}${p.chave}${String(seq).padStart(2, "0")}`;
  const det = p.tipo === "cancelamento"
    ? `<descEvento>Cancelamento</descEvento><nProt>${escXml(p.protocolo ?? "")}</nProt><xJust>${escXml(p.justificativa ?? "")}</xJust>`
    : `<descEvento>Carta de Correcao</descEvento><xCorrecao>${escXml(p.correcao ?? "")}</xCorrecao><xCondUso>${COND_USO_CCE}</xCondUso>`;
  return `<?xml version="1.0" encoding="UTF-8"?><envEvento xmlns="${NS}" versao="1.00">` +
    `<idLote>${String(Date.now()).slice(-15)}</idLote>` +
    `<evento versao="1.00"><infEvento Id="${id}">` +
    `<cOrgao>${p.chave.slice(0, 2)}</cOrgao><tpAmb>${p.tpAmb}</tpAmb>${docTag(p.docEmitente)}` +
    `<chNFe>${p.chave}</chNFe><dhEvento>${dataHoraSefaz()}</dhEvento><tpEvento>${tpEvento}</tpEvento>` +
    `<nSeqEvento>${seq}</nSeqEvento><verEvento>1.00</verEvento>` +
    `<detEvento versao="1.00">${det}</detEvento></infEvento></evento></envEvento>`;
}

/** XML <inutNFe> de inutilização de faixa (somente CNPJ). */
export function montarInutNFe(p: {
  uf: string; cnpj: string; tpAmb: number; serie: number; nIni: number; nFin: number; justificativa: string;
}): string {
  const cUF = UF_CODIGO[p.uf.toUpperCase()];
  if (!cUF) throw new Error(`UF do emitente inválida (${p.uf || "vazia"}).`);
  const ano = String(new Date().getFullYear()).slice(-2);
  const id = `ID${cUF}${ano}${dig(p.cnpj)}55${String(p.serie).padStart(3, "0")}` +
    `${String(p.nIni).padStart(9, "0")}${String(p.nFin).padStart(9, "0")}`;
  return `<?xml version="1.0" encoding="UTF-8"?><inutNFe xmlns="${NS}" versao="4.00"><infInut Id="${id}">` +
    `<tpAmb>${p.tpAmb}</tpAmb><xServ>INUTILIZAR</xServ><cUF>${cUF}</cUF><ano>${ano}</ano>` +
    `<CNPJ>${dig(p.cnpj)}</CNPJ><mod>55</mod><serie>${p.serie}</serie><nNFIni>${p.nIni}</nNFIni>` +
    `<nNFFin>${p.nFin}</nNFFin><xJust>${escXml(p.justificativa)}</xJust></infInut></inutNFe>`;
}

/**
 * Lê um campo da resposta da Unimake, que pode vir em XML (tags SEFAZ) ou JSON
 * (objetos .NET com nomes em PascalCase). Busca sem diferenciar maiúsculas.
 * Retorna a última ocorrência (no XML, protNFe/retEvento vêm depois do lote).
 */
export function campoResposta(texto: string, nome: string): string | undefined {
  const alvo = nome.toLowerCase();
  try {
    const json = JSON.parse(texto);
    let achado: string | undefined;
    const visitar = (o: unknown) => {
      if (!o || typeof o !== "object") return;
      for (const [k, v] of Object.entries(o as Rec)) {
        const kk = k.toLowerCase();
        if ((kk === alvo || kk === `${alvo}field`) && v !== null && typeof v !== "object") achado = String(v);
        else visitar(v);
      }
    };
    visitar(json);
    if (achado !== undefined) return achado;
  } catch { /* não é JSON */ }
  const re = new RegExp(`<(?:\\w+:)?${nome}>([^<]*)</(?:\\w+:)?${nome}>`, "gi");
  let ultimo: string | undefined;
  for (const m of texto.matchAll(re)) ultimo = m[1];
  return ultimo;
}

const DESCS_MANIFESTACAO: Record<string, string> = {
  "210200": "Confirmacao da Operacao",
  "210210": "Ciencia da Operacao",
  "210220": "Desconhecimento da Operacao",
  "210240": "Operacao nao Realizada",
};

/** XML <distDFeInt> de pedido de distribuição de DF-e (consulta por NSU ou por chave de acesso). */
export function montarDistDFeInt(p: {
  doc: string;
  tpAmb: number;
  cUfAutor: number;
  tipo: "dist_nsu" | "chave";
  ultNsu?: number;
  chave?: string;
}): string {
  const corpo = p.tipo === "chave"
    ? `<consChNFe><chNFe>${dig(p.chave ?? "")}</chNFe></consChNFe>`
    : `<distNSU><ultNSU>${String(Math.max(0, Math.floor(p.ultNsu ?? 0))).padStart(15, "0")}</ultNSU></distNSU>`;
  return `<?xml version="1.0" encoding="UTF-8"?><distDFeInt xmlns="${NS}" versao="1.01">` +
    `<tpAmb>${p.tpAmb}</tpAmb><cUFAutor>${p.cUfAutor}</cUFAutor>${docTag(p.doc)}${corpo}</distDFeInt>`;
}

/** XML <envEvento> de manifestação do destinatário (eventos 210200–210240, cOrgao = AN). */
export function montarEventoManifestacao(p: {
  tipoEvento: string;
  chave: string;
  doc: string;
  tpAmb: number;
  nSeq?: number;
  justificativa?: string;
}): string {
  const desc = DESCS_MANIFESTACAO[p.tipoEvento];
  if (!desc) throw new Error(`Tipo de manifestação inválido (${p.tipoEvento}).`);
  const seq = p.nSeq ?? 1;
  const id = `ID${p.tipoEvento}${p.chave}${String(seq).padStart(2, "0")}`;
  const just = p.tipoEvento === "210240" || p.tipoEvento === "210220"
    ? `<xJust>${escXml((p.justificativa ?? "").slice(0, 255))}</xJust>`
    : "";
  return `<?xml version="1.0" encoding="UTF-8"?><envEvento xmlns="${NS}" versao="1.00">` +
    `<idLote>${String(Date.now()).slice(-15)}</idLote>` +
    `<evento versao="1.00"><infEvento Id="${id}">` +
    `<cOrgao>91</cOrgao><tpAmb>${p.tpAmb}</tpAmb>${docTag(p.doc)}` +
    `<chNFe>${p.chave}</chNFe><dhEvento>${dataHoraSefaz()}</dhEvento><tpEvento>${p.tipoEvento}</tpEvento>` +
    `<nSeqEvento>${seq}</nSeqEvento><verEvento>1.00</verEvento>` +
    `<detEvento versao="1.00"><descEvento>${desc}</descEvento>${just}</detEvento>` +
    `</infEvento></evento></envEvento>`;
}
