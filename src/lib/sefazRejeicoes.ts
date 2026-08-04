/**
 * Tradução de rejeições/erros da SEFAZ (e da API Focus NFe) para mensagens
 * acionáveis em português, apontando exatamente qual campo o operador deve
 * corrigir no sistema.
 *
 * Motivação: rejeições como "Rejeicao: UF do veiculo nao informada" (ou mensagens
 * genéricas de schema) não indicam onde corrigir, gerando retrabalho.
 */

export interface RegraRejeicao {
  /** Códigos de rejeição SEFAZ (cStat) associados */
  codigos?: string[];
  /** Padrões (case-insensitive) buscados na mensagem original */
  padroes: RegExp[];
  /** Orientação acionável para o operador */
  orientacao: string;
}

const REGRAS: RegraRejeicao[] = [
  // ---------- Grupo de Transporte / Veículo ----------
  {
    codigos: ["574"],
    padroes: [/uf\s+(do\s+)?ve[ií]culo/i, /uf\s+da\s+placa/i, /\bUFPlaca\b/i],
    orientacao:
      "Aba Transporte > Veículo: a UF da Placa não foi informada. Preencha a UF do veículo (obrigatória sempre que a placa é informada) e emita novamente.",
  },
  {
    padroes: [/placa.*(inv[áa]lid|formato)/i, /\bplaca\b.*n[ãa]o\s+informad/i, /\bplaca\b.*obrigat/i],
    orientacao:
      "Aba Transporte > Veículo: a Placa está ausente ou em formato inválido. Use 7 caracteres, sem pontos ou traços (ex.: ABC1D23 ou ABC1234).",
  },
  {
    padroes: [/rntc/i],
    orientacao:
      "Aba Transporte > Veículo: o RNTC (registro ANTT) informado é inválido. Corrija ou deixe o campo em branco.",
  },
  {
    padroes: [/transportador/i, /\btransp\b/i],
    orientacao:
      "Aba Transporte > Transportador: dados do transportador incompletos ou inválidos (Nome, CPF/CNPJ, IE, Município e UF). Revise os campos ou remova o transportador se o frete não é contratado.",
  },
  {
    padroes: [/modalidade\s+do?\s+frete/i, /\bmodFrete\b/i],
    orientacao:
      "Aba Transporte: a Modalidade do Frete está incompatível com os dados informados. Use 'Sem Frete' quando não houver transporte, ou informe o transportador/veículo correspondente.",
  },

  // ---------- Destinatário / Emitente ----------
  {
    codigos: ["209", "210", "247", "248"],
    padroes: [/inscri[çc][ãa]o\s+estadual/i, /\bIE\b\s+(do|de)/i],
    orientacao:
      "Inscrição Estadual inválida para o emitente ou destinatário. Confira a IE no cadastro (Inscrições do Produtor / Clientes e Fornecedores).",
  },
  {
    codigos: ["270", "271", "272", "273", "274"],
    padroes: [/c[óo]digo\s+do\s+munic[íi]pio/i, /\bcMun\b/i, /\bxMun\b/i],
    orientacao:
      "Município inválido: o código IBGE ou o nome do município não coincidem. Revise Cidade/UF no cadastro do destinatário, emitente ou local de entrega.",
  },
  {
    padroes: [/\bCEP\b/i],
    orientacao:
      "CEP inválido. Informe um CEP válido (8 dígitos) no cadastro do emitente/destinatário.",
  },

  // ---------- Itens / Tributos ----------
  {
    padroes: [/\bNCM\b/i],
    orientacao:
      "NCM inválido em um dos itens. Corrija o NCM no cadastro do produto (8 dígitos válidos na tabela).",
  },
  {
    padroes: [/\bCFOP\b/i],
    orientacao:
      "CFOP incompatível com a operação (dentro/fora do estado, tipo de destinatário). Revise o CFOP dos itens.",
  },
  {
    padroes: [/\bcClassTrib\b/i, /classifica[çc][ãa]o\s+tribut[áa]ria/i],
    orientacao:
      "Classificação Tributária (cClassTrib) de IBS/CBS ausente ou inválida. Configure no cadastro do produto ou do emitente.",
  },
  {
    padroes: [/\bIBS\b/i, /\bCBS\b/i],
    orientacao:
      "Dados de IBS/CBS (Reforma Tributária) inconsistentes. Revise CST, cClassTrib e alíquotas no cadastro do produto/emitente.",
  },

  // ---------- Numeração / Duplicidade ----------
  {
    codigos: ["539", "204"],
    padroes: [/duplicidade/i],
    orientacao:
      "Já existe uma NF-e autorizada com este número. O número foi liberado — clique em Emitir NF-e novamente para usar o próximo número.",
  },
  {
    codigos: ["318"],
    padroes: [/documento\s+referenciado/i, /nota\s+referenciada/i],
    orientacao:
      "Nota Fiscal referenciada obrigatória não informada. Vincule a NF/NFP de origem na aba de Notas Referenciadas.",
  },
];

export interface RejeicaoTraduzida {
  /** Mensagem amigável e acionável */
  orientacao: string | null;
  /** Mensagem original da SEFAZ/API, para auditoria */
  original: string;
  /** Código de rejeição, quando disponível */
  codigo?: string;
}

/**
 * Analisa a mensagem de rejeição e devolve orientação acionável quando reconhecida.
 */
export function analisarRejeicaoSefaz(
  mensagem: string | null | undefined,
  codigo?: string | number | null
): RejeicaoTraduzida {
  const original = (mensagem || "").toString().trim();
  const cod = codigo != null && String(codigo).trim() !== "" ? String(codigo).trim() : undefined;

  if (!original && !cod) {
    return { orientacao: null, original: "", codigo: cod };
  }

  const regra = REGRAS.find(
    (r) =>
      (cod && r.codigos?.includes(cod)) ||
      r.padroes.some((p) => p.test(original))
  );

  return { orientacao: regra?.orientacao ?? null, original, codigo: cod };
}

/**
 * Devolve o texto a exibir ao usuário: orientação acionável (quando reconhecida)
 * seguida da mensagem original da SEFAZ.
 */
export function traduzirRejeicaoSefaz(
  mensagem: string | null | undefined,
  codigo?: string | number | null
): string {
  const { orientacao, original, codigo: cod } = analisarRejeicaoSefaz(mensagem, codigo);
  const detalhe = [cod ? `Rejeição ${cod}` : null, original || null].filter(Boolean).join(": ");

  if (orientacao) {
    return detalhe ? `${orientacao}\n\n(SEFAZ — ${detalhe})` : orientacao;
  }
  return detalhe || "Erro desconhecido na emissão da NF-e";
}
