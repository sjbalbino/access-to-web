import { z } from "zod";

const aliquotaSchema = z
  .number({ error: "Informe um número válido." })
  .finite("Informe um número válido.")
  .min(0, "A alíquota não pode ser negativa.")
  .max(100, "A alíquota não pode ser maior que 100%.");

const aliquotasEmitenteSchema = z.object({
  aliq_icms_padrao: aliquotaSchema,
  aliq_pis_padrao: aliquotaSchema,
  aliq_cofins_padrao: aliquotaSchema,
  aliq_ibs_padrao: aliquotaSchema,
  aliq_cbs_padrao: aliquotaSchema,
  aliq_is_padrao: aliquotaSchema,
});

const ROTULOS_ALIQUOTAS: Record<string, string> = {
  aliq_icms_padrao: "ICMS",
  aliq_pis_padrao: "PIS",
  aliq_cofins_padrao: "COFINS",
  aliq_ibs_padrao: "IBS",
  aliq_cbs_padrao: "CBS",
  aliq_is_padrao: "IS",
};

export interface ResultadoValidacaoAliquotas {
  valido: boolean;
  campo?: string;
  mensagem?: string;
}

export function validarAliquotasEmitente(dados: unknown): ResultadoValidacaoAliquotas {
  const resultado = aliquotasEmitenteSchema.safeParse(dados);
  if (resultado.success) return { valido: true };

  const erro = resultado.error.issues[0];
  const campo = String(erro?.path[0] ?? "");
  const rotulo = ROTULOS_ALIQUOTAS[campo] ?? "Alíquota";

  return {
    valido: false,
    campo,
    mensagem: `${rotulo}: ${erro?.message ?? "valor inválido."}`,
  };
}

export function mensagemErroEmitente(error: Error): string {
  const mensagem = error.message.toLowerCase();
  if (mensagem.includes("numeric field overflow") || mensagem.includes("22003")) {
    return "Uma alíquota ou numeração excede o limite permitido. Revise os valores informados.";
  }
  return error.message;
}