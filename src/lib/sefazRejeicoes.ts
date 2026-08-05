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
    padroes: [/\bbairro\b/i, /\bxBairro\b/i],
    orientacao:
      "Bairro não informado. O Bairro é obrigatório na NF-e: preencha o campo Bairro no cadastro do destinatário (Clientes/Fornecedores ou Local de Entrega) ou do emitente (Produtores > Inscrições) e emita novamente.",
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

/* ------------------------------------------------------------------ *
 * Detalhamento de erros de Schema XML                                *
 * ------------------------------------------------------------------ */

export interface ErroDetalhadoSefaz {
  /** Campo técnico do XML (ex.: xBairro, UFPlaca) — quando informado */
  campo: string | null;
  /** Descrição original devolvida pela SEFAZ/Focus NFe */
  mensagem: string;
  /** Código de erro/rejeição, quando informado */
  codigo?: string | null;
}

/**
 * Mapa de campos técnicos do XML da NF-e para a localização no sistema.
 * A chave é comparada em minúsculas, por conteúdo (substring), de forma que
 * caminhos como "infNFe/dest/enderDest/xBairro" também sejam reconhecidos.
 */
const CAMPOS_SCHEMA: Array<{ chaves: string[]; onde: string }> = [
  { chaves: ["xbairro", "bairro"], onde: "Bairro — cadastro do destinatário (Clientes e Fornecedores / Local de Entrega) ou do emitente (Produtores > Inscrições)." },
  { chaves: ["xlgr", "logradouro"], onde: "Logradouro (endereço) do emitente/destinatário no cadastro correspondente." },
  { chaves: ["nro", "numero_emitente", "numero_destinatario"], onde: "Número do endereço no cadastro do emitente/destinatário (use S/N quando não houver)." },
  { chaves: ["cep"], onde: "CEP no cadastro do emitente/destinatário (8 dígitos)." },
  { chaves: ["cmun", "xmun", "municipio"], onde: "Município/UF no cadastro do emitente, destinatário ou local de entrega (o código IBGE é buscado pelo CEP)." },
  { chaves: ["uf"], onde: "UF no cadastro correspondente (emitente, destinatário, local de entrega ou veículo)." },
  { chaves: ["ie", "inscricao_estadual"], onde: "Inscrição Estadual — Produtores > Inscrições (emitente) ou Clientes e Fornecedores (destinatário)." },
  { chaves: ["cnpj"], onde: "CNPJ no cadastro do emitente/destinatário." },
  { chaves: ["cpf"], onde: "CPF no cadastro do emitente/destinatário." },
  { chaves: ["xnome", "nome"], onde: "Nome/Razão Social no cadastro do emitente/destinatário." },
  { chaves: ["email"], onde: "E-mail no cadastro do destinatário." },
  { chaves: ["ufplaca", "veiculo_uf"], onde: "Aba Transporte > Veículo: UF da Placa (obrigatória quando a placa é informada)." },
  { chaves: ["placa"], onde: "Aba Transporte > Veículo: Placa com 7 caracteres, sem pontos ou traços." },
  { chaves: ["rntc"], onde: "Aba Transporte > Veículo: RNTC (registro ANTT) — corrija ou deixe em branco." },
  { chaves: ["modfrete"], onde: "Aba Transporte: Modalidade do Frete." },
  { chaves: ["transporta"], onde: "Aba Transporte > Transportador: dados incompletos (Nome, CPF/CNPJ, IE, Município, UF)." },
  { chaves: ["ncm"], onde: "NCM do produto (Produtos > cadastro do item) — 8 dígitos válidos." },
  { chaves: ["cfop"], onde: "CFOP dos itens da nota (aba Itens)." },
  { chaves: ["ucom", "unidade"], onde: "Unidade comercial do produto (Produtos > Unidade de Medida)." },
  { chaves: ["qcom", "quantidade"], onde: "Quantidade do item (aba Itens)." },
  { chaves: ["vuncom", "valor_unitario"], onde: "Valor unitário do item (aba Itens)." },
  { chaves: ["vprod", "valor_bruto"], onde: "Valor total do item (quantidade × valor unitário) na aba Itens." },
  { chaves: ["cclasstrib", "classificacao_tributaria"], onde: "Classificação Tributária (cClassTrib) de IBS/CBS — cadastro do Produto ou do Emitente NF-e." },
  { chaves: ["ibs", "cbs", "gibscbs"], onde: "Dados de IBS/CBS (Reforma Tributária) — CST, cClassTrib e alíquotas no cadastro do Produto/Emitente." },
  { chaves: ["cst", "csosn"], onde: "CST/CSOSN do item — cadastro do Produto, do CFOP ou do Emitente NF-e." },
  { chaves: ["icms"], onde: "Tributação de ICMS do item — revise CST e base de cálculo (botão Calcular Impostos)." },
  { chaves: ["pis"], onde: "Tributação de PIS do item — CST e alíquota no cadastro do Produto/Emitente." },
  { chaves: ["cofins"], onde: "Tributação de COFINS do item — CST e alíquota no cadastro do Produto/Emitente." },
  { chaves: ["natop", "natureza"], onde: "Natureza da Operação da nota (máx. 60 caracteres)." },
  { chaves: ["dhemi", "data_emissao"], onde: "Data/Hora de emissão da nota." },
  { chaves: ["nfref", "refnfe", "refnf"], onde: "Aba Notas Referenciadas: vincule a NF/NFP de origem." },
  { chaves: ["infcpl", "informacoes_adicionais"], onde: "Informações Complementares da nota (aba Observações)." },
  { chaves: ["dup", "cobr", "fatura"], onde: "Aba Cobrança: duplicatas/parcelas (datas e valores)." },
  { chaves: ["indiedest"], onde: "Indicador de Inscrição Estadual do destinatário (Contribuinte / Isento / Não contribuinte)." },
];

/** Devolve a orientação de onde corrigir, a partir do campo e/ou da mensagem. */
export function orientacaoCampoSchema(
  campo: string | null | undefined,
  mensagem?: string | null
): string | null {
  const alvoCampo = (campo || "").toLowerCase();
  if (alvoCampo) {
    const achado = CAMPOS_SCHEMA.find((c) => c.chaves.some((k) => alvoCampo.includes(k)));
    if (achado) return achado.onde;
  }

  // Fallback: tenta reconhecer pela mensagem usando as regras de rejeição
  const { orientacao } = analisarRejeicaoSefaz(mensagem);
  if (orientacao) return orientacao;

  const alvoMsg = (mensagem || "").toLowerCase();
  if (alvoMsg) {
    const achado = CAMPOS_SCHEMA.find((c) => c.chaves.some((k) => k.length > 3 && alvoMsg.includes(k)));
    if (achado) return achado.onde;
  }
  return null;
}

function textoOuNulo(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "string") return v.trim() || null;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return null;
}

/**
 * Extrai a lista de erros detalhados de qualquer formato conhecido:
 * - objeto salvo em notas_fiscais.erros_api ({ erros: [...] })
 * - retorno da edge function ({ erros: [...] } ou { details: { erros: [...] } })
 * - array cru de strings ou de objetos { campo, mensagem }
 */
export function extrairErrosDetalhados(fonte: unknown): ErroDetalhadoSefaz[] {
  if (!fonte) return [];

  let brutos: unknown = fonte;
  if (!Array.isArray(fonte) && typeof fonte === "object") {
    const o = fonte as Record<string, unknown>;
    brutos =
      o.erros ??
      (o.errosApi as Record<string, unknown> | undefined)?.erros ??
      (o.erros_api as Record<string, unknown> | undefined)?.erros ??
      (o.details as Record<string, unknown> | undefined)?.erros ??
      (o.data as Record<string, unknown> | undefined)?.erros ??
      null;
  }

  const lista: ErroDetalhadoSefaz[] = [];
  const push = (campo: unknown, mensagem: unknown, codigo?: unknown) => {
    const msg = textoOuNulo(mensagem);
    if (!msg) return;
    lista.push({ campo: textoOuNulo(campo), mensagem: msg, codigo: textoOuNulo(codigo) });
  };

  if (Array.isArray(brutos)) {
    for (const item of brutos) {
      if (typeof item === "string") push(null, item);
      else if (item && typeof item === "object") {
        const o = item as Record<string, unknown>;
        push(
          o.campo ?? o.field ?? o.caminho ?? o.path ?? null,
          o.mensagem ?? o.message ?? o.descricao ?? o.erro ?? null,
          o.codigo ?? o.code ?? null
        );
      }
    }
  } else if (brutos && typeof brutos === "object") {
    for (const [campo, valor] of Object.entries(brutos as Record<string, unknown>)) {
      if (Array.isArray(valor)) valor.forEach((v) => push(campo, v));
      else push(campo, valor);
    }
  } else if (typeof brutos === "string") {
    push(null, brutos);
  }

  return lista;
}

