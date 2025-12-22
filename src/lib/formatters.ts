/**
 * Funções de formatação para CPF, CNPJ, Placa e documentos
 */

/**
 * Formata um CPF para o padrão 000.000.000-00
 */
export function formatCpf(value: string | null | undefined): string {
  if (!value) return "";
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

/**
 * Formata um CNPJ para o padrão 00.000.000/0000-00
 */
export function formatCnpj(value: string | null | undefined): string {
  if (!value) return "";
  const digits = value.replace(/\D/g, "").slice(0, 14);
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
}

/**
 * Formata CPF ou CNPJ automaticamente baseado no tamanho
 */
export function formatCpfCnpj(value: string | null | undefined): string {
  if (!value) return "";
  const digits = value.replace(/\D/g, "");
  if (digits.length <= 11) {
    return formatCpf(value);
  }
  return formatCnpj(value);
}

/**
 * Formata placa de veículo
 * Suporta padrão antigo (ABC-1234) e Mercosul (ABC1D23)
 */
export function formatPlaca(value: string | null | undefined): string {
  if (!value) return "";
  const clean = value.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 7);
  
  if (clean.length <= 3) return clean;
  
  // Detectar padrão Mercosul (ABC1D23 - letra na 5ª posição)
  const isMercosul = clean.length >= 5 && /[A-Z]/.test(clean[4]);
  
  if (isMercosul) {
    // Mercosul: ABC1D23 (sem hífen)
    return clean;
  } else {
    // Padrão antigo: ABC-1234
    return `${clean.slice(0, 3)}-${clean.slice(3)}`;
  }
}

/**
 * Remove formatação de documento (CPF, CNPJ, etc)
 */
export function unformatDocument(value: string | null | undefined): string {
  if (!value) return "";
  return value.replace(/\D/g, "");
}

/**
 * Remove formatação de placa
 */
export function unformatPlaca(value: string | null | undefined): string {
  if (!value) return "";
  return value.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
}

/**
 * Formata CEP para o padrão 00000-000
 */
export function formatCep(value: string | null | undefined): string {
  if (!value) return "";
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

/**
 * Formata telefone para o padrão (00) 00000-0000 ou (00) 0000-0000
 */
export function formatTelefone(value: string | null | undefined): string {
  if (!value) return "";
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits.length ? `(${digits}` : "";
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

/**
 * Formata Inscrição Estadual
 */
export function formatIe(value: string | null | undefined): string {
  if (!value) return "";
  // IE varia por estado, mantemos apenas números e pontuação básica
  return value.replace(/[^0-9./-]/g, "");
}
