// Validação consistente de Peso Tara / Peso Bruto (em kg)
// Regras: inteiros, >= 0, <= 200.000 kg, bruto > tara e bruto > 0.

const MAX_KG = 200_000;

export interface PesosInput {
  pesoTara: number;
  pesoBruto: number;
}

export function validarPesos({ pesoTara, pesoBruto }: PesosInput): string | null {
  if (!Number.isFinite(pesoTara) || !Number.isFinite(pesoBruto)) {
    return "Informe valores numéricos válidos para Peso Tara e Peso Bruto.";
  }
  if (!Number.isInteger(pesoTara) || !Number.isInteger(pesoBruto)) {
    return "Os pesos devem ser números inteiros (em kg, sem casas decimais).";
  }
  if (pesoTara < 0 || pesoBruto < 0) {
    return "Os pesos não podem ser negativos.";
  }
  if (pesoBruto <= 0) {
    return "Informe o Peso Bruto (kg) maior que zero.";
  }
  if (pesoTara > MAX_KG || pesoBruto > MAX_KG) {
    return `Os pesos devem ser menores ou iguais a ${MAX_KG.toLocaleString("pt-BR")} kg.`;
  }
  if (pesoBruto <= pesoTara) {
    return "O Peso Bruto deve ser maior que o Peso Tara.";
  }
  return null;
}
