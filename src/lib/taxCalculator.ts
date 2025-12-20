/**
 * Calculadora de impostos para NF-e
 * Cálculo básico baseado em CRT, CFOP e alíquotas do emitente
 */

export interface TaxCalculatorInput {
  // Valor base
  valorTotal: number;
  
  // Emitente
  crt: number | null; // 1=Simples Nacional, 2=Simples excesso, 3=Regime Normal
  aliqIcmsPadrao: number | null;
  aliqPisPadrao: number | null;
  aliqCofinsPadrao: number | null;
  aliqIbsPadrao: number | null;
  aliqCbsPadrao: number | null;
  aliqIsPadrao: number | null;
  ufEmitente: string;
  
  // CFOP
  cfopCodigo: string;
  incidenciaIcms: boolean;
  incidenciaPisCofins: boolean;
  incidenciaIbsCbs: boolean;
  cstIcmsPadrao: string | null;
  cstPisPadrao: string | null;
  cstCofinsPadrao: string | null;
  cstIbsPadrao: string | null;
  cstCbsPadrao: string | null;
  cstIsPadrao: string | null;
  
  // Produto (opcional - CST do cadastro do produto)
  produtoCstIcms: string | null;
  produtoCstPis: string | null;
  produtoCstCofins: string | null;
  produtoCstIbs: string | null;
  produtoCstCbs: string | null;
  produtoCstIs: string | null;
  produtoCclassTribIbs: string | null;
  produtoCclassTribCbs: string | null;
  
  // Destinatário
  ufDestinatario: string;
  origemProduto: number; // 0=Nacional, 1-8=Importado
}

export interface TaxCalculatorOutput {
  // ICMS
  cstIcms: string;
  aliqIcms: number;
  baseIcms: number;
  valorIcms: number;
  
  // PIS
  cstPis: string;
  aliqPis: number;
  basePis: number;
  valorPis: number;
  
  // COFINS
  cstCofins: string;
  aliqCofins: number;
  baseCofins: number;
  valorCofins: number;
  
  // IBS
  cstIbs: string;
  aliqIbs: number;
  baseIbs: number;
  valorIbs: number;
  
  // CBS
  cstCbs: string;
  aliqCbs: number;
  baseCbs: number;
  valorCbs: number;
  
  // IS
  cstIs: string;
  aliqIs: number;
  baseIs: number;
  valorIs: number;
  
  // Origem do produto
  origem: number;
}

// UFs do Sul/Sudeste (exceto ES)
const UFS_SUL_SUDESTE = ["SP", "RJ", "MG", "PR", "SC", "RS"];
// UFs do Norte/Nordeste/Centro-Oeste + ES
const UFS_OUTROS = ["AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "PA", "PB", "PE", "PI", "RN", "RO", "RR", "SE", "TO"];

/**
 * Retorna a alíquota de ICMS interestadual
 */
export function getAliquotaInterestadual(ufOrigem: string, ufDestino: string, origemProduto: number): number {
  // Mesmo estado = alíquota interna (retorna 0 para indicar que deve usar a do emitente)
  if (ufOrigem === ufDestino) {
    return 0;
  }
  
  // Produto importado (origem 1, 2, 3, 8) = 4%
  if ([1, 2, 3, 8].includes(origemProduto)) {
    return 4;
  }
  
  const origemSulSudeste = UFS_SUL_SUDESTE.includes(ufOrigem);
  const destinoSulSudeste = UFS_SUL_SUDESTE.includes(ufDestino);
  
  // Sul/Sudeste → Norte/Nordeste/Centro-Oeste/ES = 7%
  if (origemSulSudeste && !destinoSulSudeste) {
    return 7;
  }
  
  // Norte/Nordeste/Centro-Oeste/ES → Sul/Sudeste = 12%
  // Sul/Sudeste → Sul/Sudeste = 12%
  // Norte/Nordeste/Centro-Oeste → Norte/Nordeste/Centro-Oeste = 12%
  return 12;
}

/**
 * Verifica se o CST indica que há tributação de ICMS
 */
function cstIcmsTemTributacao(cst: string): boolean {
  // CSTs que indicam tributação normal
  const cstsTributados = ["00", "10", "20", "70", "90"];
  return cstsTributados.includes(cst);
}

/**
 * Verifica se o CST indica que há tributação de PIS/COFINS
 */
function cstPisCofinsTemTributacao(cst: string): boolean {
  // CSTs que indicam tributação (01, 02, 05)
  const cstsTributados = ["01", "02", "05"];
  return cstsTributados.includes(cst);
}

/**
 * Verifica se o CFOP é interestadual (começa com 6)
 */
function isInterestadual(cfop: string): boolean {
  return cfop.startsWith("6");
}

/**
 * Calcula os impostos automaticamente
 */
export function calculateTaxes(input: TaxCalculatorInput): TaxCalculatorOutput {
  const resultado: TaxCalculatorOutput = {
    cstIcms: "00",
    aliqIcms: 0,
    baseIcms: 0,
    valorIcms: 0,
    cstPis: "01",
    aliqPis: 0,
    basePis: 0,
    valorPis: 0,
    cstCofins: "01",
    aliqCofins: 0,
    baseCofins: 0,
    valorCofins: 0,
    cstIbs: "000",
    aliqIbs: 0,
    baseIbs: 0,
    valorIbs: 0,
    cstCbs: "000",
    aliqCbs: 0,
    baseCbs: 0,
    valorCbs: 0,
    cstIs: "000",
    aliqIs: 0,
    baseIs: 0,
    valorIs: 0,
    origem: input.origemProduto || 0,
  };
  
  // ========== ICMS ==========
  // Determina CST (prioridade: produto > CFOP > padrão)
  if (input.produtoCstIcms) {
    resultado.cstIcms = input.produtoCstIcms;
  } else if (input.cstIcmsPadrao) {
    resultado.cstIcms = input.cstIcmsPadrao;
  } else {
    // CST padrão baseado no CRT
    if (input.crt === 1 || input.crt === 2) {
      // Simples Nacional - usa CSOSN
      resultado.cstIcms = "102"; // CSOSN 102 = Tributada SN sem permissão de crédito
    } else {
      // Regime Normal
      resultado.cstIcms = "00"; // CST 00 = Tributada integralmente
    }
  }
  
  // Calcula ICMS se houver incidência
  if (input.incidenciaIcms && cstIcmsTemTributacao(resultado.cstIcms)) {
    resultado.baseIcms = input.valorTotal;
    
    // Se for operação interestadual, usa alíquota interestadual
    if (isInterestadual(input.cfopCodigo)) {
      const aliqInterestadual = getAliquotaInterestadual(
        input.ufEmitente,
        input.ufDestinatario,
        input.origemProduto
      );
      resultado.aliqIcms = aliqInterestadual > 0 ? aliqInterestadual : (input.aliqIcmsPadrao || 18);
    } else {
      resultado.aliqIcms = input.aliqIcmsPadrao || 18;
    }
    
    resultado.valorIcms = Number(((resultado.baseIcms * resultado.aliqIcms) / 100).toFixed(2));
  }
  
  // ========== PIS ==========
  // Determina CST
  if (input.produtoCstPis) {
    resultado.cstPis = input.produtoCstPis;
  } else if (input.cstPisPadrao) {
    resultado.cstPis = input.cstPisPadrao;
  } else {
    resultado.cstPis = "01"; // Operação tributável
  }
  
  // Calcula PIS se houver incidência
  if (input.incidenciaPisCofins && cstPisCofinsTemTributacao(resultado.cstPis)) {
    resultado.basePis = input.valorTotal;
    resultado.aliqPis = input.aliqPisPadrao || 1.65;
    resultado.valorPis = Number(((resultado.basePis * resultado.aliqPis) / 100).toFixed(2));
  }
  
  // ========== COFINS ==========
  // Determina CST
  if (input.produtoCstCofins) {
    resultado.cstCofins = input.produtoCstCofins;
  } else if (input.cstCofinsPadrao) {
    resultado.cstCofins = input.cstCofinsPadrao;
  } else {
    resultado.cstCofins = "01"; // Operação tributável
  }
  
  // Calcula COFINS se houver incidência
  if (input.incidenciaPisCofins && cstPisCofinsTemTributacao(resultado.cstCofins)) {
    resultado.baseCofins = input.valorTotal;
    resultado.aliqCofins = input.aliqCofinsPadrao || 7.6;
    resultado.valorCofins = Number(((resultado.baseCofins * resultado.aliqCofins) / 100).toFixed(2));
  }
  
  // ========== IBS/CBS/IS (Reforma Tributária) ==========
  if (input.incidenciaIbsCbs) {
    // IBS - prioridade: produto > CFOP > padrão
    resultado.cstIbs = input.produtoCstIbs || input.cstIbsPadrao || "000";
    if (input.aliqIbsPadrao && input.aliqIbsPadrao > 0) {
      resultado.baseIbs = input.valorTotal;
      resultado.aliqIbs = input.aliqIbsPadrao;
      resultado.valorIbs = Number(((resultado.baseIbs * resultado.aliqIbs) / 100).toFixed(2));
    }
    
    // CBS - prioridade: produto > CFOP > padrão
    resultado.cstCbs = input.produtoCstCbs || input.cstCbsPadrao || "000";
    if (input.aliqCbsPadrao && input.aliqCbsPadrao > 0) {
      resultado.baseCbs = input.valorTotal;
      resultado.aliqCbs = input.aliqCbsPadrao;
      resultado.valorCbs = Number(((resultado.baseCbs * resultado.aliqCbs) / 100).toFixed(2));
    }
    
    // IS - prioridade: produto > CFOP > padrão
    resultado.cstIs = input.produtoCstIs || input.cstIsPadrao || "000";
    if (input.aliqIsPadrao && input.aliqIsPadrao > 0) {
      resultado.baseIs = input.valorTotal;
      resultado.aliqIs = input.aliqIsPadrao;
      resultado.valorIs = Number(((resultado.baseIs * resultado.aliqIs) / 100).toFixed(2));
    }
  }
  
  return resultado;
}

/**
 * Função auxiliar para formatar CST com zeros à esquerda
 */
export function formatCst(cst: string | null | undefined, digits: number = 2): string {
  if (!cst) return "";
  return cst.padStart(digits, "0");
}
