import { formatCpfCnpj, formatCpf } from "@/lib/formatters";

export interface InfoComplementarLocalEntrega {
  local_entrega_nome?: string | null;
  local_entrega_cnpj_cpf?: string | null;
  local_entrega_ie?: string | null;
  local_entrega_logradouro?: string | null;
  local_entrega_numero?: string | null;
  local_entrega_bairro?: string | null;
  local_entrega_cidade?: string | null;
  local_entrega_uf?: string | null;
}

export interface InfoComplementarContrato {
  numero?: number | string | null;
  numero_contrato_comprador?: string | null;
  observacoes?: string | null;
  local_entrega_nome?: string | null;
  local_entrega_cnpj_cpf?: string | null;
  local_entrega_ie?: string | null;
  local_entrega_logradouro?: string | null;
  local_entrega_numero?: string | null;
  local_entrega_bairro?: string | null;
  local_entrega_cidade?: string | null;
  local_entrega_uf?: string | null;
}

export interface InfoComplementarRemessa {
  codigo?: number | null;
  romaneio?: number | null;
  motorista?: string | null;
  motorista_cpf?: string | null;
  placa?: string | null;
  uf_placa?: string | null;
  local_entrega_nome?: string | null;
  local_entrega_cnpj_cpf?: string | null;
  local_entrega_ie?: string | null;
  local_entrega_logradouro?: string | null;
  local_entrega_numero?: string | null;
  local_entrega_bairro?: string | null;
  local_entrega_cidade?: string | null;
  local_entrega_uf?: string | null;
}

export interface InfoComplementarTransportadora {
  nome?: string | null;
  cpf_cnpj?: string | null;
  inscricao_estadual?: string | null;
}

export interface BuildInfoComplementarParams {
  contrato: InfoComplementarContrato | null | undefined;
  remessa: InfoComplementarRemessa | null | undefined;
  transportadora?: InfoComplementarTransportadora | null;
  localEntrega?: InfoComplementarLocalEntrega | null;
}

/**
 * Monta o texto de Informações Complementares (campo infCpl) da NFe.
 * Usado tanto na emissão automática quanto na prévia do dialog de edição da remessa.
 */
export function buildInfoComplementarRemessa({
  contrato,
  remessa,
  transportadora,
  localEntrega,
}: BuildInfoComplementarParams): string {
  const partes: string[] = [];

  if (contrato?.numero) {
    let contratoStr = `Contrato de Venda nº ${contrato.numero}`;
    if (contrato.numero_contrato_comprador) {
      contratoStr += ` - Contrato Comprador: ${contrato.numero_contrato_comprador}`;
    }
    partes.push(contratoStr);
  }

  if (remessa?.romaneio || remessa?.codigo) {
    partes.push(`Romaneio: ${remessa.romaneio || remessa.codigo}`);
  }

  // Local de Entrega — prioriza dados do prop localEntrega (form atual), depois contrato, depois remessa
  const leNome =
    localEntrega?.local_entrega_nome ||
    contrato?.local_entrega_nome ||
    remessa?.local_entrega_nome;

  if (leNome) {
    let leStr = `Local de Entrega: ${leNome}`;
    const leDoc =
      localEntrega?.local_entrega_cnpj_cpf ||
      contrato?.local_entrega_cnpj_cpf ||
      remessa?.local_entrega_cnpj_cpf;
    const leIe =
      localEntrega?.local_entrega_ie ||
      contrato?.local_entrega_ie ||
      remessa?.local_entrega_ie;
    if (leDoc) leStr += ` - CNPJ/CPF: ${formatCpfCnpj(leDoc)}`;
    if (leIe) leStr += ` - IE: ${leIe}`;

    const leLog =
      localEntrega?.local_entrega_logradouro ||
      contrato?.local_entrega_logradouro ||
      remessa?.local_entrega_logradouro;
    const leNum =
      localEntrega?.local_entrega_numero ||
      contrato?.local_entrega_numero ||
      remessa?.local_entrega_numero;
    const leBairro =
      localEntrega?.local_entrega_bairro ||
      contrato?.local_entrega_bairro ||
      remessa?.local_entrega_bairro;
    const enderecoParts = [leLog, leNum, leBairro].filter(Boolean).join(", ");
    if (enderecoParts) leStr += ` - ${enderecoParts}`;

    const leCidade =
      localEntrega?.local_entrega_cidade ||
      contrato?.local_entrega_cidade ||
      remessa?.local_entrega_cidade;
    const leUf =
      localEntrega?.local_entrega_uf ||
      contrato?.local_entrega_uf ||
      remessa?.local_entrega_uf;
    const cidadeUf = [leCidade, leUf].filter(Boolean).join("/");
    if (cidadeUf) leStr += ` - ${cidadeUf}`;

    partes.push(leStr);
  }

  // Transportadora (só entra em info complementar se existir; senão os dados do motorista já vão nos campos oficiais)
  if (transportadora?.nome) {
    let transpStr = `Transportador: ${transportadora.nome}`;
    if (transportadora.cpf_cnpj) transpStr += ` - CNPJ/CPF: ${formatCpfCnpj(transportadora.cpf_cnpj)}`;
    if (transportadora.inscricao_estadual) transpStr += ` - IE: ${transportadora.inscricao_estadual}`;
    partes.push(transpStr);
  }

  // Motorista — sempre em info complementar quando houver (a DANFE não tem campo próprio)
  if (remessa?.motorista) {
    let motoStr = `Motorista: ${remessa.motorista}`;
    if (remessa.motorista_cpf) motoStr += ` - CPF: ${formatCpf(remessa.motorista_cpf)}`;
    partes.push(motoStr);
  }

  // Placa
  if (remessa?.placa) {
    const placaFmt = remessa.placa.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
    let placaStr = `Placa: ${placaFmt}`;
    if (remessa.uf_placa) placaStr += `/${remessa.uf_placa}`;
    partes.push(placaStr);
  }

  if (contrato?.observacoes) {
    partes.push(`Obs: ${contrato.observacoes}`);
  }

  return partes.length > 0 ? partes.join(". ") + "." : "";
}
