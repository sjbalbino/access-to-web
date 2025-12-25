// Mapeia dados do sistema para o formato da API Focus NFe
// Referência: https://focusnfe.com.br/doc/

// Interface para referência de NFe (modelo 55)
export interface FocusNfeRefNFe {
  chave_nfe: string; // Chave de acesso da NFe referenciada (44 dígitos)
}

// Interface para referência de NFP - Nota Fiscal de Produtor (modelo 04 ou 01)
export interface FocusNfeRefNFP {
  uf_nf_produtor: string; // UF do emitente (nota produtor rural)
  mes_nf_produtor: number; // Ano e mês de emissão no formato AAMM (nota produtor rural)
  cnpj_nf_produtor?: string; // CNPJ do emitente (nota produtor rural)
  cpf_nf_produtor?: string; // CPF do emitente (nota produtor rural)
  inscricao_estadual_nf_produtor: string; // IE do emitente (nota produtor rural)
  modelo_nf_produtor: string; // 04 (produtor) ou 01
  serie_nf_produtor: number; // Série (informar 0 se não existir)
  numero_nf_produtor: number; // Número
}

// Union type para notas referenciadas
export type FocusNfeNotaReferenciada = FocusNfeRefNFe | FocusNfeRefNFP;

export interface FocusNfeNota {
  natureza_operacao: string;
  data_emissao: string;
  tipo_documento: number; // 0=Entrada, 1=Saída
  finalidade_emissao: number; // 1=Normal, 2=Complementar, 3=Ajuste, 4=Devolução
  consumidor_final: number; // 0=Normal, 1=Consumidor Final
  presenca_comprador: number; // 0=Não se aplica, 1=Presencial, etc.
  
  // Numeração (IMPORTANTE: enviar para evitar que a API gere automaticamente)
  numero?: number;
  serie?: string;
  
  // Notas Fiscais Referenciadas (obrigatório para contranota de produtor)
  notas_referenciadas?: FocusNfeNotaReferenciada[];
  
  // Emitente (preenchido via certificado na Focus NFe, mas enviamos para validação)
  cnpj_emitente?: string;
  cpf_emitente?: string;
  nome_emitente: string;
  nome_fantasia_emitente?: string;
  inscricao_estadual_emitente: string;
  logradouro_emitente: string;
  numero_emitente: string;
  bairro_emitente: string;
  municipio_emitente: string;
  uf_emitente: string;
  cep_emitente: string;
  regime_tributario_emitente: number; // 1=Simples, 2=Excesso sublimite, 3=Normal
  
  // Destinatário
  cpf_destinatario?: string;
  cnpj_destinatario?: string;
  nome_destinatario: string;
  inscricao_estadual_destinatario?: string;
  logradouro_destinatario: string;
  numero_destinatario: string;
  bairro_destinatario: string;
  municipio_destinatario: string;
  uf_destinatario: string;
  cep_destinatario?: string;
  indicador_inscricao_estadual_destinatario: number; // 1=Contribuinte, 2=Isento, 9=Não Contribuinte
  email_destinatario?: string;
  telefone_destinatario?: string;
  
  // Transporte
  modalidade_frete: number; // 0=CIF, 1=FOB, 2=Terceiros, 9=Sem Frete
  
  // Pagamento
  forma_pagamento?: number; // 0=À Vista, 1=A Prazo
  
  // Itens
  items: FocusNfeItem[];
  
  // Informações adicionais
  informacoes_adicionais_contribuinte?: string;
  informacoes_adicionais_fisco?: string;
}

export interface FocusNfeItem {
  numero_item: number;
  codigo_produto: string;
  descricao: string;
  cfop: string;
  unidade_comercial: string;
  quantidade_comercial: number;
  valor_unitario_comercial: number;
  valor_bruto: number;
  
  // Tributação
  codigo_ncm: string;
  icms_origem: number; // 0=Nacional, 1=Estrangeira Importação Direta, etc.
  icms_situacao_tributaria: string; // 00, 10, 20, 40, 41, 60, etc.
  icms_modalidade_base_calculo?: number;
  icms_base_calculo?: number;
  icms_aliquota?: number;
  icms_valor?: number;
  
  // PIS
  pis_situacao_tributaria: string;
  pis_base_calculo?: number;
  pis_aliquota?: number;
  pis_valor?: number;
  
  // COFINS
  cofins_situacao_tributaria: string;
  cofins_base_calculo?: number;
  cofins_aliquota?: number;
  cofins_valor?: number;
  
  // IPI (quando aplicável)
  ipi_situacao_tributaria?: string;
  ipi_codigo_enquadramento?: string; // cEnq - obrigatório quando IPI é informado
  ipi_base_calculo?: number;
  ipi_aliquota?: number;
  ipi_valor?: number;
  
  // Reforma Tributária (NT 2025.002) - IBS
  ibs_situacao_tributaria?: string;
  ibs_base_calculo?: number;
  ibs_aliquota?: number;
  ibs_valor?: number;
  cclass_trib_ibs?: string;
  
  // Reforma Tributária (NT 2025.002) - CBS
  cbs_situacao_tributaria?: string;
  cbs_base_calculo?: number;
  cbs_aliquota?: number;
  cbs_valor?: number;
  cclass_trib_cbs?: string;
  
  // Reforma Tributária (NT 2025.002) - IS
  is_situacao_tributaria?: string;
  is_base_calculo?: number;
  is_aliquota?: number;
  is_valor?: number;
  
  // Valores adicionais
  valor_desconto?: number;
  valor_frete?: number;
  valor_seguro?: number;
  valor_outras_despesas?: number;
}

// Formatar data para o padrão ISO 8601 com timezone do Brasil
// IMPORTANTE: Subtrai alguns minutos para evitar erro 703 (Data-Hora de Emissao posterior)
// devido a diferenças de sincronização entre o relógio do cliente e servidor da SEFAZ
function formatDateForFocusNfe(dateStr: string | null): string {
  if (!dateStr) return "";
  
  // Capturar a hora ATUAL e subtrair 2 minutos como margem de segurança
  const agora = new Date();
  agora.setMinutes(agora.getMinutes() - 2); // Margem de segurança para evitar erro 703
  
  // Calcular o offset de timezone do Brasil (-03:00)
  // Usar o offset local pode causar problemas se o servidor estiver em outro fuso
  // Forçar -03:00 que é o fuso padrão de Brasília
  const hours = String(agora.getHours()).padStart(2, '0');
  const minutes = String(agora.getMinutes()).padStart(2, '0');
  const seconds = String(agora.getSeconds()).padStart(2, '0');
  
  // Usar a data atual (não a do formulário) para evitar inconsistências
  const year = agora.getFullYear();
  const month = String(agora.getMonth() + 1).padStart(2, '0');
  const day = String(agora.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}-03:00`;
}

// Mapeamento do indicador de IE do destinatário
function mapIndicadorIE(destTipo: string | null, destIe: string | null): number {
  if (destIe && destIe.toUpperCase() !== "ISENTO" && destIe.trim() !== "") {
    return 1; // Contribuinte ICMS
  }
  if (destIe?.toUpperCase() === "ISENTO") {
    return 2; // Isento
  }
  return 9; // Não Contribuinte
}

// Mapeamento do CST ICMS baseado no CRT
function mapCstIcms(cstOriginal: string | null, crt: number | null): string {
  if (!cstOriginal) {
    // Default baseado no CRT
    if (crt === 1) return "102"; // Simples Nacional - ICMS cobrado anteriormente
    return "00"; // Normal - Tributação normal
  }
  return cstOriginal;
}

export interface NotaFiscalData {
  id: string;
  data_emissao: string | null;
  natureza_operacao: string;
  operacao: number | null; // 0=Entrada, 1=Saída
  finalidade: number | null;
  ind_consumidor_final: number | null;
  ind_presenca: number | null;
  modalidade_frete: number | null;
  forma_pagamento: number | null;
  info_complementar: string | null;
  info_fisco: string | null;
  
  // Numeração da NFe (IMPORTANTE: enviar para evitar duplicidade)
  numero?: number | null;
  serie?: number | null;
  
  // Destinatário
  dest_cpf_cnpj: string | null;
  dest_nome: string | null;
  dest_ie: string | null;
  dest_logradouro: string | null;
  dest_numero: string | null;
  dest_bairro: string | null;
  dest_cidade: string | null;
  dest_uf: string | null;
  dest_cep: string | null;
  dest_tipo: string | null;
  dest_email: string | null;
  dest_telefone: string | null;
  
  // Inscrição do Produtor (emitente) - dados fiscais vêm daqui
  inscricaoProdutor?: {
    cpf_cnpj: string | null;
    inscricao_estadual: string | null;
    logradouro: string | null;
    numero: string | null;
    complemento: string | null;
    bairro: string | null;
    cidade: string | null;
    uf: string | null;
    cep: string | null;
    produtorNome: string | null;
    granjaNome: string | null;
  };
  
  // Emitente config (configurações da API)
  emitente?: {
    crt: number | null;
  };
}

export interface NotaFiscalItemData {
  numero_item: number;
  codigo: string | null;
  descricao: string;
  cfop: string | null;
  unidade: string;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
  ncm: string | null;
  origem: number | null;
  cst_icms: string | null;
  modalidade_bc_icms: number | null;
  base_icms: number | null;
  aliq_icms: number | null;
  valor_icms: number | null;
  cst_pis: string | null;
  base_pis: number | null;
  aliq_pis: number | null;
  valor_pis: number | null;
  cst_cofins: string | null;
  base_cofins: number | null;
  aliq_cofins: number | null;
  valor_cofins: number | null;
  cst_ipi: string | null;
  base_ipi: number | null;
  aliq_ipi: number | null;
  valor_ipi: number | null;
  valor_desconto: number | null;
  valor_frete: number | null;
  valor_seguro: number | null;
  valor_outros: number | null;
  // Reforma Tributária (NT 2025.002)
  cst_ibs: string | null;
  base_ibs: number | null;
  aliq_ibs: number | null;
  valor_ibs: number | null;
  cclass_trib_ibs: string | null;
  cst_cbs: string | null;
  base_cbs: number | null;
  aliq_cbs: number | null;
  valor_cbs: number | null;
  cclass_trib_cbs: string | null;
  cst_is: string | null;
  base_is: number | null;
  aliq_is: number | null;
  valor_is: number | null;
}

// Interface para notas referenciadas do banco de dados
export interface NotaReferenciadaData {
  tipo: 'nfe' | 'nfp';
  chave_nfe: string | null;
  nfp_uf: string | null;
  nfp_aamm: string | null;
  nfp_cnpj: string | null;
  nfp_cpf: string | null;
  nfp_ie: string | null;
  nfp_modelo: string | null;
  nfp_serie: number | null;
  nfp_numero: number | null;
}

// Mapeia notas referenciadas do banco para formato Focus NFe
function mapNotasReferenciadas(notas: NotaReferenciadaData[]): FocusNfeNotaReferenciada[] {
  return notas
    .map((nota) => {
      if (nota.tipo === "nfe" && nota.chave_nfe) {
        // Referência de NFe - apenas a chave de acesso
        return {
          chave_nfe: nota.chave_nfe.replace(/\D/g, ""), // Apenas dígitos
        } as FocusNfeRefNFe;
      }

      // Referência de NFP (produtor rural) - schema da Focus: *_nf_produtor
      const mes = Number(String(nota.nfp_aamm ?? "").replace(/\D/g, ""));
      let serie = Number(nota.nfp_serie ?? 0);
      const numero = Number(nota.nfp_numero ?? 0);
      
      // IMPORTANTE: serie_nf_produtor deve ser 0-999 (padrão SEFAZ)
      // Se série informada for maior que 999, usar 0 (sem série)
      if (!Number.isFinite(serie) || serie < 0 || serie > 999) {
        serie = 0;
      }

      const refNfp: FocusNfeRefNFP = {
        uf_nf_produtor: (nota.nfp_uf || "").toString().slice(0, 2),
        mes_nf_produtor: Number.isFinite(mes) && mes > 0 ? mes : 0,
        inscricao_estadual_nf_produtor: nota.nfp_ie?.replace(/\D/g, "") || "",
        modelo_nf_produtor: (nota.nfp_modelo || "04").toString().padStart(2, "0"),
        serie_nf_produtor: serie,
        numero_nf_produtor: Number.isFinite(numero) ? numero : 0,
      };

      const cpfLimpo = nota.nfp_cpf?.replace(/\D/g, "") || "";
      const cnpjLimpo = nota.nfp_cnpj?.replace(/\D/g, "") || "";

      if (cpfLimpo.length === 11) {
        refNfp.cpf_nf_produtor = cpfLimpo;
      } else if (cnpjLimpo.length === 14) {
        refNfp.cnpj_nf_produtor = cnpjLimpo;
      }

      return refNfp;
    })
    .filter((ref) => {
      if ("chave_nfe" in ref) return !!ref.chave_nfe;
      const nfp = ref as FocusNfeRefNFP;
      return (
        !!nfp.uf_nf_produtor &&
        !!nfp.inscricao_estadual_nf_produtor &&
        !!nfp.modelo_nf_produtor &&
        !!nfp.numero_nf_produtor
      );
    });
}

export function mapNotaToFocusNfe(
  nota: NotaFiscalData,
  itens: NotaFiscalItemData[],
  notasReferenciadas?: NotaReferenciadaData[]
): FocusNfeNota {
  const inscricao = nota.inscricaoProdutor;
  const emitente = nota.emitente;
  
  if (!inscricao) {
    throw new Error("Dados da inscrição do produtor (emitente) são obrigatórios");
  }
  
  if (!nota.dest_nome || !nota.dest_cpf_cnpj) {
    throw new Error("Dados do destinatário são obrigatórios");
  }
  
  if (itens.length === 0) {
    throw new Error("A nota deve ter pelo menos um item");
  }
  
  // Determinar se é CPF ou CNPJ do destinatário
  const cpfCnpjLimpo = nota.dest_cpf_cnpj.replace(/\D/g, "");
  const isCpf = cpfCnpjLimpo.length === 11;
  
  // Determinar se emitente é CPF ou CNPJ
  const emitenteCpfCnpjLimpo = inscricao.cpf_cnpj?.replace(/\D/g, "") || "";
  const emitenteIsCpf = emitenteCpfCnpjLimpo.length === 11;
  
  // Nome do emitente: usar nome do produtor ou nome da granja
  const nomeEmitente = inscricao.produtorNome || inscricao.granjaNome || "Produtor Rural";
  
  const focusNota: FocusNfeNota = {
    natureza_operacao: nota.natureza_operacao,
    data_emissao: formatDateForFocusNfe(nota.data_emissao),
    tipo_documento: nota.operacao ?? 1, // Default: Saída
    finalidade_emissao: nota.finalidade ?? 1, // Default: Normal
    consumidor_final: nota.ind_consumidor_final ?? 0,
    presenca_comprador: nota.ind_presenca ?? 0,
    
    // Numeração (IMPORTANTE: enviar para garantir que a SEFAZ use o número correto)
    numero: nota.numero ?? undefined,
    serie: nota.serie ? String(nota.serie) : undefined,
    
    // Notas Fiscais Referenciadas (obrigatório para contranota de produtor - CFOP 1905)
    notas_referenciadas:
      notasReferenciadas && notasReferenciadas.length > 0
        ? mapNotasReferenciadas(notasReferenciadas)
        : undefined,
    
    // Emitente - usar CPF ou CNPJ conforme disponível
    ...(emitenteIsCpf
      ? { cpf_emitente: emitenteCpfCnpjLimpo }
      : { cnpj_emitente: emitenteCpfCnpjLimpo }),
    nome_emitente: nomeEmitente,
    nome_fantasia_emitente: inscricao.granjaNome || undefined,
    inscricao_estadual_emitente: inscricao.inscricao_estadual?.replace(/\D/g, "") || "",
    logradouro_emitente: inscricao.logradouro || "",
    numero_emitente: inscricao.numero || "S/N",
    bairro_emitente: inscricao.bairro || "",
    municipio_emitente: inscricao.cidade || "",
    uf_emitente: inscricao.uf || "",
    cep_emitente: inscricao.cep?.replace(/\D/g, "") || "",
    regime_tributario_emitente: emitente?.crt ?? 3, // Default: Normal
    
    // Destinatário
    ...(isCpf
      ? { cpf_destinatario: cpfCnpjLimpo }
      : { cnpj_destinatario: cpfCnpjLimpo }),
    nome_destinatario: nota.dest_nome,
    inscricao_estadual_destinatario: nota.dest_ie?.replace(/\D/g, "") || undefined,
    logradouro_destinatario: nota.dest_logradouro || "",
    numero_destinatario: nota.dest_numero || "S/N",
    bairro_destinatario: nota.dest_bairro || "",
    municipio_destinatario: nota.dest_cidade || "",
    uf_destinatario: nota.dest_uf || "",
    cep_destinatario: nota.dest_cep?.replace(/\D/g, "") || undefined,
    indicador_inscricao_estadual_destinatario: mapIndicadorIE(nota.dest_tipo, nota.dest_ie),
    email_destinatario: nota.dest_email || undefined,
    telefone_destinatario: nota.dest_telefone?.replace(/\D/g, "") || undefined,
    
    // Transporte
    modalidade_frete: nota.modalidade_frete ?? 9, // Default: Sem Frete
    
    // Pagamento
    forma_pagamento: nota.forma_pagamento ?? 0,
    
    // Itens
    items: itens.map((item, index) => mapItemToFocusNfe(item, index + 1, emitente?.crt)),
    
    // Informações adicionais
    informacoes_adicionais_contribuinte: nota.info_complementar || undefined,
    informacoes_adicionais_fisco: nota.info_fisco || undefined,
  };
  
  return focusNota;
}

// Formata CST para 3 dígitos (padrão NFe para IBS/CBS/IS)
function formatCst3Digits(cst: string | null | undefined): string | undefined {
  if (!cst) return undefined;
  const cstLimpo = cst.replace(/\D/g, "");
  if (!cstLimpo) return undefined;
  return cstLimpo.padStart(3, "0");
}

function mapItemToFocusNfe(
  item: NotaFiscalItemData,
  numeroItem: number,
  crt: number | null | undefined
): FocusNfeItem {
  const cstIcms = mapCstIcms(item.cst_icms, crt ?? null);
  
  // Verificar se tem dados de IBS preenchidos
  const temIbs = item.cst_ibs && (item.base_ibs || item.valor_ibs);
  // Verificar se tem dados de CBS preenchidos
  const temCbs = item.cst_cbs && (item.base_cbs || item.valor_cbs);
  // Verificar se tem dados de IS preenchidos
  const temIs = item.cst_is && (item.base_is || item.valor_is);
  
  const focusItem: FocusNfeItem = {
    numero_item: numeroItem,
    codigo_produto: item.codigo || `PROD${numeroItem}`,
    descricao: item.descricao,
    cfop: item.cfop || "5102", // Default: Venda de mercadoria adquirida
    unidade_comercial: item.unidade,
    quantidade_comercial: item.quantidade,
    valor_unitario_comercial: item.valor_unitario,
    valor_bruto: item.valor_total,
    
    // Tributação
    codigo_ncm: item.ncm?.replace(/\D/g, "") || "00000000",
    icms_origem: item.origem ?? 0,
    icms_situacao_tributaria: cstIcms,
    icms_modalidade_base_calculo: item.modalidade_bc_icms ?? 3, // Default: Valor da operação
    icms_base_calculo: item.base_icms || undefined,
    icms_aliquota: item.aliq_icms || undefined,
    icms_valor: item.valor_icms || undefined,
    
    // PIS
    pis_situacao_tributaria: item.cst_pis || "07", // Default: Operação isenta
    pis_base_calculo: item.base_pis || undefined,
    pis_aliquota: item.aliq_pis || undefined,
    pis_valor: item.valor_pis || undefined,
    
    // COFINS
    cofins_situacao_tributaria: item.cst_cofins || "07", // Default: Operação isenta
    cofins_base_calculo: item.base_cofins || undefined,
    cofins_aliquota: item.aliq_cofins || undefined,
    cofins_valor: item.valor_cofins || undefined,
    
    // IPI - Para produtos agrícolas (CFOP 1905, 5905, etc) e CST NT/Isento (53), não enviar grupo IPI
    // Apenas incluir IPI quando CST for tributado (00, 49, 50, 99) ou tiver valor calculado
    // CST 53 = IPINT (Não Tributado) - não deve ter grupo IPI no XML
    ...(item.cst_ipi && !['53', '52', '51', '54', '55'].includes(item.cst_ipi) ? {
      ipi_situacao_tributaria: item.cst_ipi,
      ipi_codigo_enquadramento: "999", // 999 = Outros (padrão)
      ipi_base_calculo: item.base_ipi || undefined,
      ipi_aliquota: item.aliq_ipi || undefined,
      ipi_valor: item.valor_ipi || undefined,
    } : {}),
    
    // Valores adicionais
    valor_desconto: item.valor_desconto || undefined,
    valor_frete: item.valor_frete || undefined,
    valor_seguro: item.valor_seguro || undefined,
    valor_outras_despesas: item.valor_outros || undefined,
  };
  
  // Reforma Tributária (NT 2025.002) - IBS/CBS/IS
  // IMPORTANTE: A API Focus NFe ainda não suporta esses campos (schema não aceita gIBSCBS)
  // Os campos são mantidos no banco de dados mas não são enviados para a API até que seja suportado
  // Quando a Focus NFe liberar suporte, descomentar o código abaixo:
  
  // TODO: Descomentar quando Focus NFe suportar NT 2025.002
  // if (temIbs) {
  //   focusItem.ibs_situacao_tributaria = formatCst3Digits(item.cst_ibs);
  //   focusItem.cclass_trib_ibs = item.cclass_trib_ibs || undefined;
  //   focusItem.ibs_base_calculo = item.base_ibs || undefined;
  //   focusItem.ibs_aliquota = item.aliq_ibs || undefined;
  //   focusItem.ibs_valor = item.valor_ibs || undefined;
  // }
  // if (temCbs) {
  //   focusItem.cbs_situacao_tributaria = formatCst3Digits(item.cst_cbs);
  //   focusItem.cclass_trib_cbs = item.cclass_trib_cbs || undefined;
  //   focusItem.cbs_base_calculo = item.base_cbs || undefined;
  //   focusItem.cbs_aliquota = item.aliq_cbs || undefined;
  //   focusItem.cbs_valor = item.valor_cbs || undefined;
  // }
  // if (temIs) {
  //   focusItem.is_situacao_tributaria = formatCst3Digits(item.cst_is);
  //   focusItem.is_base_calculo = item.base_is || undefined;
  //   focusItem.is_aliquota = item.aliq_is || undefined;
  //   focusItem.is_valor = item.valor_is || undefined;
  // }
  
  return focusItem;
}

// Validação de dados antes do envio
export function validateNotaForEmission(nota: NotaFiscalData, itens: NotaFiscalItemData[]): string[] {
  const errors: string[] = [];
  
  if (!nota.data_emissao) {
    errors.push("Data de emissão é obrigatória");
  }
  
  // Validar emitente (inscrição do produtor) - aceitar CPF ou CNPJ
  if (!nota.inscricaoProdutor?.cpf_cnpj) {
    errors.push("CPF ou CNPJ do emitente é obrigatório");
  }
  if (!nota.inscricaoProdutor?.inscricao_estadual) {
    errors.push("Inscrição Estadual do emitente é obrigatória");
  }
  if (!nota.inscricaoProdutor?.logradouro || !nota.inscricaoProdutor?.cidade || !nota.inscricaoProdutor?.uf) {
    errors.push("Endereço completo do emitente é obrigatório");
  }
  
  // Validar destinatário
  if (!nota.dest_cpf_cnpj) {
    errors.push("CPF/CNPJ do destinatário é obrigatório");
  }
  if (!nota.dest_nome) {
    errors.push("Nome do destinatário é obrigatório");
  }
  if (!nota.dest_logradouro || !nota.dest_cidade || !nota.dest_uf) {
    errors.push("Endereço completo do destinatário é obrigatório");
  }
  
  // Validar itens
  if (itens.length === 0) {
    errors.push("A nota deve ter pelo menos um item");
  }
  
  itens.forEach((item, index) => {
    if (!item.descricao) {
      errors.push(`Item ${index + 1}: Descrição é obrigatória`);
    }
    if (!item.quantidade || item.quantidade <= 0) {
      errors.push(`Item ${index + 1}: Quantidade deve ser maior que zero`);
    }
    if (!item.valor_unitario || item.valor_unitario <= 0) {
      errors.push(`Item ${index + 1}: Valor unitário deve ser maior que zero`);
    }
    if (!item.cfop) {
      errors.push(`Item ${index + 1}: CFOP é obrigatório`);
    }
    if (!item.ncm) {
      errors.push(`Item ${index + 1}: NCM é obrigatório`);
    }
  });
  
  return errors;
}
