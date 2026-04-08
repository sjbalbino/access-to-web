// Parser de XML de NF-e (layout 4.00 SEFAZ)

export interface NfeEmitente {
  cnpj?: string;
  cpf?: string;
  nome: string;
  nomeFantasia?: string;
  inscricaoEstadual?: string;
  logradouro?: string;
  numero?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  cep?: string;
}

export interface NfeDestinatario {
  cnpj?: string;
  cpf?: string;
  nome: string;
  inscricaoEstadual?: string;
}

export interface NfeItem {
  numero: number;
  codigoProduto: string;
  descricao: string;
  ncm: string;
  cfop: string;
  unidade: string;
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
  valorDesconto: number;
  valorFreteRateio: number;
  cstIcms: string;
  baseIcms: number;
  aliqIcms: number;
  valorIcms: number;
  cstIpi: string;
  baseIpi: number;
  aliqIpi: number;
  valorIpi: number;
  cstPis: string;
  basePis: number;
  aliqPis: number;
  valorPis: number;
  cstCofins: string;
  baseCofins: number;
  aliqCofins: number;
  valorCofins: number;
}

export interface NfeTotais {
  valorProdutos: number;
  valorFrete: number;
  valorSeguro: number;
  valorDesconto: number;
  valorOutrasDespesas: number;
  valorIpi: number;
  valorIcms: number;
  valorIcmsSt: number;
  valorPis: number;
  valorCofins: number;
  valorTotal: number;
}

export interface NfeParsed {
  chaveAcesso: string;
  numero: string;
  serie: string;
  dataEmissao: string;
  naturezaOperacao: string;
  emitente: NfeEmitente;
  destinatario: NfeDestinatario;
  itens: NfeItem[];
  totais: NfeTotais;
  xmlContent: string;
}

function getTextContent(parent: Element, tagName: string): string {
  const el = parent.getElementsByTagName(tagName)[0];
  return el?.textContent?.trim() || '';
}

function getNumber(parent: Element, tagName: string): number {
  const val = getTextContent(parent, tagName);
  return val ? parseFloat(val) : 0;
}

export function parseNfeXml(xmlString: string): NfeParsed {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlString, 'text/xml');

  const errorNode = doc.querySelector('parsererror');
  if (errorNode) {
    throw new Error('XML inválido: não foi possível interpretar o arquivo.');
  }

  // Busca o nfeProc ou NFe
  const infNfe = doc.getElementsByTagName('infNFe')[0];
  if (!infNfe) {
    throw new Error('XML não contém uma NF-e válida (infNFe não encontrado).');
  }

  const chaveAcesso = infNfe.getAttribute('Id')?.replace('NFe', '') || '';

  // Identificação
  const ide = infNfe.getElementsByTagName('ide')[0];
  const numero = getTextContent(ide, 'nNF');
  const serie = getTextContent(ide, 'serie');
  const dataEmissaoRaw = getTextContent(ide, 'dhEmi') || getTextContent(ide, 'dEmi');
  const dataEmissao = dataEmissaoRaw ? dataEmissaoRaw.substring(0, 10) : '';
  const naturezaOperacao = getTextContent(ide, 'natOp');

  // Emitente
  const emit = infNfe.getElementsByTagName('emit')[0];
  const emitente: NfeEmitente = {
    cnpj: getTextContent(emit, 'CNPJ'),
    cpf: getTextContent(emit, 'CPF'),
    nome: getTextContent(emit, 'xNome'),
    nomeFantasia: getTextContent(emit, 'xFant'),
    inscricaoEstadual: getTextContent(emit, 'IE'),
  };
  const enderEmit = emit.getElementsByTagName('enderEmit')[0];
  if (enderEmit) {
    emitente.logradouro = getTextContent(enderEmit, 'xLgr');
    emitente.numero = getTextContent(enderEmit, 'nro');
    emitente.bairro = getTextContent(enderEmit, 'xBairro');
    emitente.cidade = getTextContent(enderEmit, 'xMun');
    emitente.uf = getTextContent(enderEmit, 'UF');
    emitente.cep = getTextContent(enderEmit, 'CEP');
  }

  // Destinatário
  const dest = infNfe.getElementsByTagName('dest')[0];
  const destinatario: NfeDestinatario = {
    cnpj: dest ? getTextContent(dest, 'CNPJ') : '',
    cpf: dest ? getTextContent(dest, 'CPF') : '',
    nome: dest ? getTextContent(dest, 'xNome') : '',
    inscricaoEstadual: dest ? getTextContent(dest, 'IE') : '',
  };

  // Itens
  const detElements = infNfe.getElementsByTagName('det');
  const itens: NfeItem[] = [];
  for (let i = 0; i < detElements.length; i++) {
    const det = detElements[i];
    const prod = det.getElementsByTagName('prod')[0];
    const imposto = det.getElementsByTagName('imposto')[0];

    // ICMS - pode ter várias tags (ICMS00, ICMS10, etc.)
    let cstIcms = '', baseIcms = 0, aliqIcms = 0, valorIcms = 0;
    const icmsGroup = imposto?.getElementsByTagName('ICMS')[0];
    if (icmsGroup) {
      const icmsTag = icmsGroup.children[0];
      if (icmsTag) {
        cstIcms = getTextContent(icmsTag, 'CST') || getTextContent(icmsTag, 'CSOSN');
        baseIcms = getNumber(icmsTag, 'vBC');
        aliqIcms = getNumber(icmsTag, 'pICMS');
        valorIcms = getNumber(icmsTag, 'vICMS');
      }
    }

    // IPI
    let cstIpi = '', baseIpi = 0, aliqIpi = 0, valorIpi = 0;
    const ipiGroup = imposto?.getElementsByTagName('IPI')[0];
    if (ipiGroup) {
      const ipiTrib = ipiGroup.getElementsByTagName('IPITrib')[0];
      if (ipiTrib) {
        cstIpi = getTextContent(ipiTrib, 'CST');
        baseIpi = getNumber(ipiTrib, 'vBC');
        aliqIpi = getNumber(ipiTrib, 'pIPI');
        valorIpi = getNumber(ipiTrib, 'vIPI');
      } else {
        const ipiNt = ipiGroup.getElementsByTagName('IPINT')[0];
        if (ipiNt) cstIpi = getTextContent(ipiNt, 'CST');
      }
    }

    // PIS
    let cstPis = '', basePis = 0, aliqPis = 0, valorPis = 0;
    const pisGroup = imposto?.getElementsByTagName('PIS')[0];
    if (pisGroup) {
      const pisTag = pisGroup.children[0];
      if (pisTag) {
        cstPis = getTextContent(pisTag, 'CST');
        basePis = getNumber(pisTag, 'vBC');
        aliqPis = getNumber(pisTag, 'pPIS');
        valorPis = getNumber(pisTag, 'vPIS');
      }
    }

    // COFINS
    let cstCofins = '', baseCofins = 0, aliqCofins = 0, valorCofins = 0;
    const cofinsGroup = imposto?.getElementsByTagName('COFINS')[0];
    if (cofinsGroup) {
      const cofinsTag = cofinsGroup.children[0];
      if (cofinsTag) {
        cstCofins = getTextContent(cofinsTag, 'CST');
        baseCofins = getNumber(cofinsTag, 'vBC');
        aliqCofins = getNumber(cofinsTag, 'pCOFINS');
        valorCofins = getNumber(cofinsTag, 'vCOFINS');
      }
    }

    itens.push({
      numero: parseInt(det.getAttribute('nItem') || `${i + 1}`),
      codigoProduto: getTextContent(prod, 'cProd'),
      descricao: getTextContent(prod, 'xProd'),
      ncm: getTextContent(prod, 'NCM'),
      cfop: getTextContent(prod, 'CFOP'),
      unidade: getTextContent(prod, 'uCom'),
      quantidade: getNumber(prod, 'qCom'),
      valorUnitario: getNumber(prod, 'vUnCom'),
      valorTotal: getNumber(prod, 'vProd'),
      valorDesconto: getNumber(prod, 'vDesc'),
      valorFreteRateio: getNumber(prod, 'vFrete'),
      cstIcms, baseIcms, aliqIcms, valorIcms,
      cstIpi, baseIpi, aliqIpi, valorIpi,
      cstPis, basePis, aliqPis, valorPis,
      cstCofins, baseCofins, aliqCofins, valorCofins,
    });
  }

  // Totais
  const icmsTot = infNfe.getElementsByTagName('ICMSTot')[0];
  const totais: NfeTotais = {
    valorProdutos: getNumber(icmsTot, 'vProd'),
    valorFrete: getNumber(icmsTot, 'vFrete'),
    valorSeguro: getNumber(icmsTot, 'vSeg'),
    valorDesconto: getNumber(icmsTot, 'vDesc'),
    valorOutrasDespesas: getNumber(icmsTot, 'vOutro'),
    valorIpi: getNumber(icmsTot, 'vIPI'),
    valorIcms: getNumber(icmsTot, 'vICMS'),
    valorIcmsSt: getNumber(icmsTot, 'vST'),
    valorPis: getNumber(icmsTot, 'vPIS'),
    valorCofins: getNumber(icmsTot, 'vCOFINS'),
    valorTotal: getNumber(icmsTot, 'vNF'),
  };

  return {
    chaveAcesso,
    numero,
    serie,
    dataEmissao,
    naturezaOperacao,
    emitente,
    destinatario,
    itens,
    totais,
    xmlContent: xmlString,
  };
}
