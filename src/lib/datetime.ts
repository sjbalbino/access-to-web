import { formatInTimeZone } from "date-fns-tz";
import { parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

/**
 * Padronização de data/hora em todo o sistema.
 * Todo display de data e hora é normalizado para o fuso horário de
 * America/Sao_Paulo (Horário de Brasília), independentemente do fuso do
 * cliente ou do servidor.
 */
export const TZ_SP = "America/Sao_Paulo";

const toDate = (input: Date | string | number | null | undefined): Date | null => {
  if (input === null || input === undefined || input === "") return null;
  if (input instanceof Date) return isNaN(input.getTime()) ? null : input;
  if (typeof input === "number") {
    const d = new Date(input);
    return isNaN(d.getTime()) ? null : d;
  }
  try {
    // Datas puras ("YYYY-MM-DD") — força meio-dia UTC para não sofrer shift.
    if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
      return parseISO(`${input}T12:00:00Z`);
    }
    return parseISO(input);
  } catch {
    return null;
  }
};

/** Formata `dd/MM/yyyy HH:mm` em America/Sao_Paulo. */
export const formatDateTimeSP = (
  input: Date | string | number | null | undefined,
  pattern = "dd/MM/yyyy HH:mm",
): string => {
  const d = toDate(input);
  if (!d) return "-";
  return formatInTimeZone(d, TZ_SP, pattern, { locale: ptBR });
};

/** Formata `dd/MM/yyyy` em America/Sao_Paulo. */
export const formatDateSP = (
  input: Date | string | number | null | undefined,
): string => {
  const d = toDate(input);
  if (!d) return "-";
  return formatInTimeZone(d, TZ_SP, "dd/MM/yyyy", { locale: ptBR });
};

/** Formata `HH:mm` em America/Sao_Paulo. */
export const formatTimeSP = (
  input: Date | string | number | null | undefined,
): string => {
  const d = toDate(input);
  if (!d) return "";
  return formatInTimeZone(d, TZ_SP, "HH:mm", { locale: ptBR });
};

/** Formatação livre em America/Sao_Paulo com locale pt-BR. */
export const formatSP = (
  input: Date | string | number | null | undefined,
  pattern: string,
): string => {
  const d = toDate(input);
  if (!d) return "";
  return formatInTimeZone(d, TZ_SP, pattern, { locale: ptBR });
};

/** ISO com offset de America/Sao_Paulo (ex.: 2026-07-21T14:35:12-03:00). */
export const nowIsoSP = (): string =>
  formatInTimeZone(new Date(), TZ_SP, "yyyy-MM-dd'T'HH:mm:ssXXX");

/** "Agora" formatado como `dd/MM/yyyy HH:mm` em America/Sao_Paulo. */
export const nowDateTimeSP = (pattern = "dd/MM/yyyy HH:mm"): string =>
  formatInTimeZone(new Date(), TZ_SP, pattern, { locale: ptBR });
