// Mapeia dados do sistema para o formato da API Focus NFe
// Referência: https://focusnfe.com.br/doc/

export interface FocusNfeNota {
  natureza_operacao: string;
  tipo_documento: number; // 0=Entrada, 1=Saída
  finalidade_emissao: number; // 1=Normal, 2=Complementar, 3=Ajuste, 4=Devolução
  consumidor_final: number; // 0=Normal, 1=Consumidor Final
  presenca_comprador: number; // 0=Não se aplica, 1=Presencial, etc.
  
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
  ipi_base_calculo?: number;
  ipi_aliquota?: number;
  ipi_valor?: number;
  
  // Valores adicionais
  valor_desconto?: number;
  valor_frete?: number;
  valor_seguro?: number;
  valor_outras_despesas?: number;
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
  natureza_operacao: string;
  operacao: number | null; // 0=Entrada, 1=Saída
  finalidade: number | null;
  ind_consumidor_final: number | null;
  ind_presenca: number | null;
  modalidade_frete: number | null;
  forma_pagamento: number | null;
  info_complementar: string | null;
  info_fisco: string | null;
  
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
  
  // Granja (emitente)
  granja?: {
    cpf: string | null;
    cnpj: string | null;
    razao_social: string;
    nome_fantasia: string | null;
    inscricao_estadual: string | null;
    logradouro: string | null;
    numero: string | null;
    bairro: string | null;
    cidade: string | null;
    uf: string | null;
    cep: string | null;
  };
  
  // Emitente config
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
}

export function mapNotaToFocusNfe(
  nota: NotaFiscalData,
  itens: NotaFiscalItemData[]
): FocusNfeNota {
  const granja = nota.granja;
  const emitente = nota.emitente;
  
  if (!granja) {
    throw new Error("Dados da granja (emitente) são obrigatórios");
  }
  
  if (!nota.dest_nome || !nota.dest_cpf_cnpj) {
    throw new Error("Dados do destinatário são obrigatórios");
  }
  
  if (itens.length === 0) {
    throw new Error("A nota deve ter pelo menos um item");
  }
  
  // Determinar se é CPF ou CNPJ
  const cpfCnpjLimpo = nota.dest_cpf_cnpj.replace(/\D/g, "");
  const isCpf = cpfCnpjLimpo.length === 11;
  // Determinar se emitente é CPF ou CNPJ
  const emitenteCpfCnpj = granja.cpf || granja.cnpj || "";
  const emitenteIsCpf = granja.cpf && granja.cpf.replace(/\D/g, "").length === 11;
  
  const focusNota: FocusNfeNota = {
    natureza_operacao: nota.natureza_operacao,
    tipo_documento: nota.operacao ?? 1, // Default: Saída
    finalidade_emissao: nota.finalidade ?? 1, // Default: Normal
    consumidor_final: nota.ind_consumidor_final ?? 0,
    presenca_comprador: nota.ind_presenca ?? 0,
    
    // Emitente - usar CPF ou CNPJ conforme disponível
    ...(emitenteIsCpf
      ? { cpf_emitente: granja.cpf?.replace(/\D/g, "") || "" }
      : { cnpj_emitente: granja.cnpj?.replace(/\D/g, "") || "" }),
    nome_emitente: granja.razao_social,
    nome_fantasia_emitente: granja.nome_fantasia || undefined,
    inscricao_estadual_emitente: granja.inscricao_estadual?.replace(/\D/g, "") || "",
    logradouro_emitente: granja.logradouro || "",
    numero_emitente: granja.numero || "S/N",
    bairro_emitente: granja.bairro || "",
    municipio_emitente: granja.cidade || "",
    uf_emitente: granja.uf || "",
    cep_emitente: granja.cep?.replace(/\D/g, "") || "",
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

function mapItemToFocusNfe(
  item: NotaFiscalItemData,
  numeroItem: number,
  crt: number | null | undefined
): FocusNfeItem {
  const cstIcms = mapCstIcms(item.cst_icms, crt ?? null);
  
  return {
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
    
    // IPI
    ipi_situacao_tributaria: item.cst_ipi || undefined,
    ipi_base_calculo: item.base_ipi || undefined,
    ipi_aliquota: item.aliq_ipi || undefined,
    ipi_valor: item.valor_ipi || undefined,
    
    // Valores adicionais
    valor_desconto: item.valor_desconto || undefined,
    valor_frete: item.valor_frete || undefined,
    valor_seguro: item.valor_seguro || undefined,
    valor_outras_despesas: item.valor_outros || undefined,
  };
}

// Validação de dados antes do envio
export function validateNotaForEmission(nota: NotaFiscalData, itens: NotaFiscalItemData[]): string[] {
  const errors: string[] = [];
  
  // Validar emitente - aceitar CPF ou CNPJ
  if (!nota.granja?.cnpj && !nota.granja?.cpf) {
    errors.push("CPF ou CNPJ do emitente é obrigatório");
  }
  if (!nota.granja?.inscricao_estadual) {
    errors.push("Inscrição Estadual do emitente é obrigatória");
  }
  if (!nota.granja?.logradouro || !nota.granja?.cidade || !nota.granja?.uf) {
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
