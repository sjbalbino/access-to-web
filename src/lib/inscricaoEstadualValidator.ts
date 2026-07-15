/**
 * Validação de Inscrição Estadual (IE) brasileira.
 * - isIeGenerica: rejeita placeholders óbvios (zeros, repetições, sequências)
 * - validarIeUF: aplica algoritmo de dígito verificador por UF (SINTEGRA)
 *
 * Aceita "ISENTO" / "ISENTA" como IE válida (contribuinte isento).
 */

export type ResultadoValidacaoIE = { valida: boolean; motivo?: string };

const onlyDigits = (v: string) => (v || "").replace(/\D/g, "");

export function isIeIsento(ie: string): boolean {
  const s = (ie || "").trim().toUpperCase();
  return s === "ISENTO" || s === "ISENTA";
}

export function isIeGenerica(ie: string): boolean {
  const raw = (ie || "").trim();
  if (!raw) return true;
  if (isIeIsento(raw)) return false;
  const d = onlyDigits(raw);
  if (d.length < 2) return true;
  // todos dígitos iguais (000..., 111..., 999...)
  if (/^(\d)\1+$/.test(d)) return true;
  // sequências óbvias
  const sequenciasProibidas = [
    "123456789",
    "12345678",
    "1234567890",
    "987654321",
    "0123456789",
  ];
  if (sequenciasProibidas.includes(d)) return true;
  return false;
}

// ---------- Helpers ----------

/** Soma ponderada `sum(digits[i] * weights[i])`. */
function somaPesos(digits: number[], weights: number[]): number {
  let s = 0;
  for (let i = 0; i < weights.length; i++) s += (digits[i] ?? 0) * weights[i];
  return s;
}

/** DV padrão módulo 11: resto 0 ou 1 => 0, senão 11 - resto. */
function dvMod11Padrao(soma: number): number {
  const r = soma % 11;
  return r < 2 ? 0 : 11 - r;
}

function toDigits(s: string): number[] {
  return s.split("").map((c) => parseInt(c, 10));
}

// ---------- Validadores por UF ----------

function validarAC(ie: string): boolean {
  const d = onlyDigits(ie);
  if (d.length !== 13) return false;
  if (!d.startsWith("01")) return false;
  const pesos1 = [4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const dig = toDigits(d);
  const dv1 = dvMod11Padrao(somaPesos(dig.slice(0, 11), pesos1));
  if (dv1 !== dig[11]) return false;
  const pesos2 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const dv2 = dvMod11Padrao(somaPesos(dig.slice(0, 12), pesos2));
  return dv2 === dig[12];
}

function validarAL(ie: string): boolean {
  const d = onlyDigits(ie);
  if (d.length !== 9) return false;
  if (!d.startsWith("24")) return false;
  const pesos = [9, 8, 7, 6, 5, 4, 3, 2];
  const dig = toDigits(d);
  const soma = somaPesos(dig.slice(0, 8), pesos) * 10;
  const dv = soma % 11 === 10 ? 0 : soma % 11;
  return dv === dig[8];
}

function validarAP(ie: string): boolean {
  const d = onlyDigits(ie);
  if (d.length !== 9) return false;
  if (!d.startsWith("03")) return false;
  const num = parseInt(d.slice(0, 8), 10);
  let p = 0, dd = 0;
  if (num >= 3000001 && num <= 3017000) { p = 5; dd = 0; }
  else if (num >= 3017001 && num <= 3019022) { p = 9; dd = 1; }
  else { p = 0; dd = 0; }
  const pesos = [9, 8, 7, 6, 5, 4, 3, 2];
  const dig = toDigits(d);
  const soma = somaPesos(dig.slice(0, 8), pesos) + p;
  const r = soma % 11;
  let dv = 11 - r;
  if (dv === 10) dv = 0;
  else if (dv === 11) dv = dd;
  return dv === dig[8];
}

function validarAM(ie: string): boolean {
  const d = onlyDigits(ie);
  if (d.length !== 9) return false;
  const pesos = [9, 8, 7, 6, 5, 4, 3, 2];
  const dig = toDigits(d);
  const soma = somaPesos(dig.slice(0, 8), pesos);
  let dv: number;
  if (soma < 11) dv = 11 - soma;
  else {
    const r = soma % 11;
    dv = r <= 1 ? 0 : 11 - r;
  }
  return dv === dig[8];
}

function validarBA(ie: string): boolean {
  const d = onlyDigits(ie);
  if (d.length !== 8 && d.length !== 9) return false;
  const dig = toDigits(d);
  const usarMod10 = /^[0-6,8]/.test(d.length === 9 ? d[1] : d[0]);
  // BA: se 2º dígito (9) ou 1º (8) for 0,1,2,3,4,5,8 => módulo 10; senão módulo 11.
  const checkDigit = d.length === 9 ? d[1] : d[0];
  const mod = "012345678".includes(checkDigit) ? 10 : 11;

  const len = d.length;
  const dv2Weights = len === 9 ? [8, 7, 6, 5, 4, 3, 2] : [7, 6, 5, 4, 3, 2];
  const dv1Weights = len === 9 ? [9, 8, 7, 6, 5, 4, 3, 2] : [8, 7, 6, 5, 4, 3, 2];

  const bodyForDv2 = dig.slice(0, len - 2);
  const bodyForDv1 = dig.slice(0, len - 2).concat([dig[len - 1]]); // corpo + dv2 posição

  const calcDv = (soma: number) => {
    if (mod === 10) {
      const r = soma % 10;
      return r === 0 ? 0 : 10 - r;
    }
    const r = soma % 11;
    return r < 2 ? 0 : 11 - r;
  };

  const dv2 = calcDv(somaPesos(bodyForDv2, dv2Weights));
  if (dv2 !== dig[len - 1]) return false;

  // Para o dv1, usamos o corpo + dv2 já validado.
  const dv1SourceDigits = dig.slice(0, len - 2).concat([dig[len - 1]]);
  const dv1 = calcDv(somaPesos(dv1SourceDigits, dv1Weights));
  // O DV verificador 1 fica na posição len-2.
  return dv1 === dig[len - 2];
}

function validarCE(ie: string): boolean {
  const d = onlyDigits(ie);
  if (d.length !== 9) return false;
  const pesos = [9, 8, 7, 6, 5, 4, 3, 2];
  const dig = toDigits(d);
  const dv = dvMod11Padrao(somaPesos(dig.slice(0, 8), pesos));
  return dv === dig[8];
}

function validarDF(ie: string): boolean {
  const d = onlyDigits(ie);
  if (d.length !== 13) return false;
  const dig = toDigits(d);
  const pesos1 = [4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const dv1 = dvMod11Padrao(somaPesos(dig.slice(0, 11), pesos1));
  if (dv1 !== dig[11]) return false;
  const pesos2 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const dv2 = dvMod11Padrao(somaPesos(dig.slice(0, 12), pesos2));
  return dv2 === dig[12];
}

function validarES(ie: string): boolean {
  const d = onlyDigits(ie);
  if (d.length !== 9) return false;
  const pesos = [9, 8, 7, 6, 5, 4, 3, 2];
  const dig = toDigits(d);
  const dv = dvMod11Padrao(somaPesos(dig.slice(0, 8), pesos));
  return dv === dig[8];
}

function validarGO(ie: string): boolean {
  const d = onlyDigits(ie);
  if (d.length !== 9) return false;
  const prefixo = d.slice(0, 2);
  if (!["10", "11", "15"].includes(prefixo)) return false;
  const pesos = [9, 8, 7, 6, 5, 4, 3, 2];
  const dig = toDigits(d);
  const soma = somaPesos(dig.slice(0, 8), pesos);
  const r = soma % 11;
  let dv: number;
  if (r === 0) dv = 0;
  else if (r === 1) {
    const num = parseInt(d.slice(0, 8), 10);
    dv = num >= 10103105 && num <= 10119997 ? 1 : 0;
  } else dv = 11 - r;
  return dv === dig[8];
}

function validarMA(ie: string): boolean {
  const d = onlyDigits(ie);
  if (d.length !== 9) return false;
  if (!d.startsWith("12")) return false;
  const pesos = [9, 8, 7, 6, 5, 4, 3, 2];
  const dig = toDigits(d);
  const dv = dvMod11Padrao(somaPesos(dig.slice(0, 8), pesos));
  return dv === dig[8];
}

function validarMT(ie: string): boolean {
  const d = onlyDigits(ie);
  if (d.length !== 11) return false;
  const pesos = [3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const dig = toDigits(d);
  const dv = dvMod11Padrao(somaPesos(dig.slice(0, 10), pesos));
  return dv === dig[10];
}

function validarMS(ie: string): boolean {
  const d = onlyDigits(ie);
  if (d.length !== 9) return false;
  if (!d.startsWith("28")) return false;
  const pesos = [9, 8, 7, 6, 5, 4, 3, 2];
  const dig = toDigits(d);
  const dv = dvMod11Padrao(somaPesos(dig.slice(0, 8), pesos));
  return dv === dig[8];
}

function validarMG(ie: string): boolean {
  const d = onlyDigits(ie);
  if (d.length !== 13) return false;
  const dig = toDigits(d);
  // DV1: insere '0' na 4ª posição e aplica pesos alternados 1,2,1,2,...
  const base = d.slice(0, 3) + "0" + d.slice(3, 11);
  const pesosDv1 = [1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2];
  let somaDv1 = 0;
  for (let i = 0; i < base.length; i++) {
    const prod = parseInt(base[i], 10) * pesosDv1[i];
    somaDv1 += Math.floor(prod / 10) + (prod % 10);
  }
  const proxMult = Math.ceil(somaDv1 / 10) * 10;
  const dv1 = proxMult - somaDv1;
  if (dv1 !== dig[11]) return false;
  const pesosDv2 = [3, 2, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2];
  const dv2 = dvMod11Padrao(somaPesos(dig.slice(0, 12), pesosDv2));
  return dv2 === dig[12];
}

function validarPA(ie: string): boolean {
  const d = onlyDigits(ie);
  if (d.length !== 9) return false;
  if (!d.startsWith("15")) return false;
  const pesos = [9, 8, 7, 6, 5, 4, 3, 2];
  const dig = toDigits(d);
  const dv = dvMod11Padrao(somaPesos(dig.slice(0, 8), pesos));
  return dv === dig[8];
}

function validarPB(ie: string): boolean {
  const d = onlyDigits(ie);
  if (d.length !== 9) return false;
  const pesos = [9, 8, 7, 6, 5, 4, 3, 2];
  const dig = toDigits(d);
  const soma = somaPesos(dig.slice(0, 8), pesos);
  const r = soma % 11;
  let dv = 11 - r;
  if (dv === 10 || dv === 11) dv = 0;
  return dv === dig[8];
}

function validarPR(ie: string): boolean {
  const d = onlyDigits(ie);
  if (d.length !== 10) return false;
  const dig = toDigits(d);
  const pesos1 = [3, 2, 7, 6, 5, 4, 3, 2];
  const dv1 = dvMod11Padrao(somaPesos(dig.slice(0, 8), pesos1));
  if (dv1 !== dig[8]) return false;
  const pesos2 = [4, 3, 2, 7, 6, 5, 4, 3, 2];
  const dv2 = dvMod11Padrao(somaPesos(dig.slice(0, 9), pesos2));
  return dv2 === dig[9];
}

function validarPE(ie: string): boolean {
  const d = onlyDigits(ie);
  if (d.length !== 9) return false;
  const dig = toDigits(d);
  const pesos1 = [8, 7, 6, 5, 4, 3, 2];
  const dv1 = dvMod11Padrao(somaPesos(dig.slice(0, 7), pesos1));
  if (dv1 !== dig[7]) return false;
  const pesos2 = [9, 8, 7, 6, 5, 4, 3, 2];
  const dv2 = dvMod11Padrao(somaPesos(dig.slice(0, 8), pesos2));
  return dv2 === dig[8];
}

function validarPI(ie: string): boolean {
  const d = onlyDigits(ie);
  if (d.length !== 9) return false;
  const pesos = [9, 8, 7, 6, 5, 4, 3, 2];
  const dig = toDigits(d);
  const dv = dvMod11Padrao(somaPesos(dig.slice(0, 8), pesos));
  return dv === dig[8];
}

function validarRJ(ie: string): boolean {
  const d = onlyDigits(ie);
  if (d.length !== 8) return false;
  const pesos = [2, 7, 6, 5, 4, 3, 2];
  const dig = toDigits(d);
  const dv = dvMod11Padrao(somaPesos(dig.slice(0, 7), pesos));
  return dv === dig[7];
}

function validarRN(ie: string): boolean {
  const d = onlyDigits(ie);
  if (d.length !== 9 && d.length !== 10) return false;
  if (!d.startsWith("20")) return false;
  const dig = toDigits(d);
  const pesos = d.length === 9 ? [9, 8, 7, 6, 5, 4, 3, 2] : [10, 9, 8, 7, 6, 5, 4, 3, 2];
  const body = dig.slice(0, d.length - 1);
  const soma = somaPesos(body, pesos) * 10;
  let dv = soma % 11;
  if (dv === 10) dv = 0;
  return dv === dig[d.length - 1];
}

function validarRS(ie: string): boolean {
  const d = onlyDigits(ie);
  if (d.length !== 10) return false;
  const mun = parseInt(d.slice(0, 3), 10);
  if (mun < 1 || mun > 497) return false;
  const pesos = [2, 9, 8, 7, 6, 5, 4, 3, 2];
  const dig = toDigits(d);
  const soma = somaPesos(dig.slice(0, 9), pesos);
  const r = soma % 11;
  let dv = 11 - r;
  if (dv >= 10) dv = 0;
  return dv === dig[9];
}

function validarRO(ie: string): boolean {
  const d = onlyDigits(ie);
  if (d.length !== 14) return false;
  const pesos = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const dig = toDigits(d);
  const soma = somaPesos(dig.slice(0, 13), pesos);
  const r = soma % 11;
  let dv = 11 - r;
  if (dv >= 10) dv -= 10;
  return dv === dig[13];
}

function validarRR(ie: string): boolean {
  const d = onlyDigits(ie);
  if (d.length !== 9) return false;
  if (!d.startsWith("24")) return false;
  const pesos = [1, 2, 3, 4, 5, 6, 7, 8];
  const dig = toDigits(d);
  const soma = somaPesos(dig.slice(0, 8), pesos);
  const dv = soma % 9;
  return dv === dig[8];
}

function validarSC(ie: string): boolean {
  const d = onlyDigits(ie);
  if (d.length !== 9) return false;
  const pesos = [9, 8, 7, 6, 5, 4, 3, 2];
  const dig = toDigits(d);
  const dv = dvMod11Padrao(somaPesos(dig.slice(0, 8), pesos));
  return dv === dig[8];
}

function validarSP(ie: string): boolean {
  const raw = (ie || "").trim().toUpperCase();
  const isProdutorRural = raw.startsWith("P");
  if (isProdutorRural) {
    const d = onlyDigits(raw);
    if (d.length !== 12) return false;
    const dig = toDigits(d);
    const pesos = [1, 3, 4, 5, 6, 7, 8, 10];
    const soma = somaPesos(dig.slice(0, 8), pesos);
    let dv = soma % 11;
    if (dv === 10) dv = 0;
    return dv === dig[8];
  }
  const d = onlyDigits(raw);
  if (d.length !== 12) return false;
  const dig = toDigits(d);
  const pesos1 = [1, 3, 4, 5, 6, 7, 8, 10];
  let s1 = somaPesos(dig.slice(0, 8), pesos1);
  let dv1 = s1 % 11;
  if (dv1 === 10) dv1 = 0;
  if (dv1 !== dig[8]) return false;
  const pesos2 = [3, 2, 10, 9, 8, 7, 6, 5, 4, 3, 2];
  const s2 = somaPesos(dig.slice(0, 11), pesos2);
  let dv2 = s2 % 11;
  if (dv2 === 10) dv2 = 0;
  return dv2 === dig[11];
}

function validarSE(ie: string): boolean {
  const d = onlyDigits(ie);
  if (d.length !== 9) return false;
  const pesos = [9, 8, 7, 6, 5, 4, 3, 2];
  const dig = toDigits(d);
  const soma = somaPesos(dig.slice(0, 8), pesos);
  let dv = 11 - (soma % 11);
  if (dv >= 10) dv = 0;
  return dv === dig[8];
}

function validarTO(ie: string): boolean {
  let d = onlyDigits(ie);
  if (d.length !== 9 && d.length !== 11) return false;
  // Nova regra: 9 dígitos (elimina-se o antigo tipo de identificação)
  // Se vier com 11, remove os dígitos 3 e 4 (tipo) para o cálculo.
  let base: string;
  if (d.length === 11) base = d.slice(0, 2) + d.slice(4);
  else base = d;
  const pesos = [9, 8, 7, 6, 5, 4, 3, 2];
  const dig = toDigits(base);
  const dv = dvMod11Padrao(somaPesos(dig.slice(0, 8), pesos));
  return dv === dig[8];
}

const VALIDADORES: Record<string, (ie: string) => boolean> = {
  AC: validarAC, AL: validarAL, AP: validarAP, AM: validarAM, BA: validarBA,
  CE: validarCE, DF: validarDF, ES: validarES, GO: validarGO, MA: validarMA,
  MT: validarMT, MS: validarMS, MG: validarMG, PA: validarPA, PB: validarPB,
  PR: validarPR, PE: validarPE, PI: validarPI, RJ: validarRJ, RN: validarRN,
  RS: validarRS, RO: validarRO, RR: validarRR, SC: validarSC, SP: validarSP,
  SE: validarSE, TO: validarTO,
};

export function validarIeUF(ie: string, uf: string): ResultadoValidacaoIE {
  const raw = (ie || "").trim();
  if (!raw) return { valida: false, motivo: "Informe a Inscrição Estadual." };
  if (isIeIsento(raw)) return { valida: true };
  if (!uf) return { valida: false, motivo: "Selecione a UF antes de validar a IE." };
  const validador = VALIDADORES[uf.toUpperCase()];
  if (!validador) return { valida: true }; // UF sem validador conhecido — não bloqueia
  const ok = validador(raw);
  if (!ok) {
    return {
      valida: false,
      motivo: `Inscrição Estadual inválida para ${uf.toUpperCase()} (dígito verificador não confere).`,
    };
  }
  return { valida: true };
}
