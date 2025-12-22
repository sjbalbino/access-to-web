import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface RemessaData {
  id: string;
  codigo?: number | null;
  romaneio?: string | null;
  data_carregamento?: string | null;
  status?: string | null;
  placa?: string | null;
  motorista?: string | null;
  kg_remessa?: number | null;
  kg_nota?: number | null;
  valor_nota?: number | null;
  nota_fiscal_id?: string | null;
  notas_fiscais?: {
    numero?: number | null;
    status?: string | null;
  } | null;
}

interface ContratoData {
  id: string;
  numero: number;
  data_contrato: string;
  quantidade_kg?: number | null;
  quantidade_sacos?: number | null;
  preco_kg?: number | null;
  valor_total?: number | null;
  total_carregado_kg?: number | null;
  saldo_kg?: number | null;
  observacoes?: string | null;
  numero_contrato_comprador?: string | null;
  tipo_venda?: string | null;
  modalidade_frete?: number | null;
  venda_entrega_futura?: boolean | null;
  a_fixar?: boolean | null;
  exportacao?: boolean | null;
  local_entrega_nome?: string | null;
  local_entrega_cidade?: string | null;
  local_entrega_uf?: string | null;
  local_entrega_logradouro?: string | null;
  local_entrega_numero?: string | null;
  local_entrega_bairro?: string | null;
  local_entrega_cep?: string | null;
  corretor?: string | null;
  percentual_comissao?: number | null;
  valor_comissao?: number | null;
  safras?: { nome?: string } | null;
  produtos?: { nome?: string } | null;
  clientes_fornecedores?: { nome?: string; cpf_cnpj?: string } | null;
  inscricoes_produtor?: { 
    granja?: string; 
    cpf_cnpj?: string;
    produtores?: { nome?: string } | null;
  } | null;
  granjas?: { razao_social?: string; cnpj?: string } | null;
}

const formatCurrency = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return "-";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

const formatNumber = (value: number | null | undefined, decimals = 3): string => {
  if (value === null || value === undefined) return "-";
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  }).format(value);
};

const formatDate = (dateStr: string | null | undefined): string => {
  if (!dateStr) return "-";
  try {
    return format(new Date(dateStr.split("T")[0] + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR });
  } catch {
    return dateStr;
  }
};

const getModalidadeFrete = (modalidade: number | null | undefined): string => {
  const modalidades: Record<number, string> = {
    0: "Por conta do emitente",
    1: "Por conta do destinatário",
    2: "Por conta de terceiros",
    3: "Próprio por conta do remetente",
    4: "Próprio por conta do destinatário",
    9: "Sem frete",
  };
  return modalidades[modalidade ?? 9] || "Sem frete";
};

const getStatusRemessa = (status: string | null | undefined): string => {
  const statusMap: Record<string, string> = {
    aberta: "Aberta",
    pesado_bruto: "Pesado Bruto",
    carregado: "Carregado",
    carregado_nfe: "Carregado/NFe",
    cancelada: "Cancelada",
  };
  return statusMap[status || "aberta"] || status || "Aberta";
};

export function gerarExtratoContrato(contrato: ContratoData, remessas: RemessaData[]): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let yPos = 20;

  // Título
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("EXTRATO DO CONTRATO DE VENDA", pageWidth / 2, yPos, { align: "center" });
  
  yPos += 10;
  doc.setFontSize(12);
  doc.text(`Contrato Nº ${contrato.numero}`, pageWidth / 2, yPos, { align: "center" });

  // Dados do Contrato
  yPos += 15;
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("DADOS DO CONTRATO", 14, yPos);
  doc.setFont("helvetica", "normal");
  
  yPos += 6;
  const contratoInfo = [
    [`Data: ${formatDate(contrato.data_contrato)}`, `Safra: ${contrato.safras?.nome || "-"}`],
    [`Tipo: ${contrato.tipo_venda === "semente" ? "Semente" : "Indústria"}`, `Frete: ${getModalidadeFrete(contrato.modalidade_frete)}`],
    [`Quantidade: ${formatNumber(contrato.quantidade_kg)} kg (${formatNumber(contrato.quantidade_sacos)} sacos)`, `Preço/kg: ${formatCurrency(contrato.preco_kg)}`],
    [`Valor Total: ${formatCurrency(contrato.valor_total)}`, ``],
  ];

  contratoInfo.forEach(([left, right]) => {
    doc.text(left, 14, yPos);
    if (right) doc.text(right, pageWidth / 2, yPos);
    yPos += 5;
  });

  if (contrato.numero_contrato_comprador) {
    doc.text(`Contrato Comprador: ${contrato.numero_contrato_comprador}`, 14, yPos);
    yPos += 5;
  }

  // Flags
  const flags = [];
  if (contrato.venda_entrega_futura) flags.push("Entrega Futura");
  if (contrato.a_fixar) flags.push("A Fixar");
  if (contrato.exportacao) flags.push("Exportação");
  if (flags.length > 0) {
    doc.text(`Condições: ${flags.join(", ")}`, 14, yPos);
    yPos += 5;
  }

  // Vendedor
  yPos += 7;
  doc.setFont("helvetica", "bold");
  doc.text("VENDEDOR:", 14, yPos);
  doc.setFont("helvetica", "normal");
  yPos += 5;
  const vendedorNome = contrato.inscricoes_produtor?.granja || "-";
  doc.text(vendedorNome, 14, yPos);
  if (contrato.inscricoes_produtor?.cpf_cnpj) {
    yPos += 5;
    doc.text(`CPF/CNPJ: ${contrato.inscricoes_produtor.cpf_cnpj}`, 14, yPos);
  }

  // Comprador
  yPos += 7;
  doc.setFont("helvetica", "bold");
  doc.text("COMPRADOR:", 14, yPos);
  doc.setFont("helvetica", "normal");
  yPos += 5;
  const compradorNome = contrato.clientes_fornecedores?.nome || "-";
  doc.text(compradorNome, 14, yPos);
  if (contrato.clientes_fornecedores?.cpf_cnpj) {
    yPos += 5;
    doc.text(`CNPJ/CPF: ${contrato.clientes_fornecedores.cpf_cnpj}`, 14, yPos);
  }

  // Local de Entrega
  if (contrato.local_entrega_nome) {
    yPos += 7;
    doc.setFont("helvetica", "bold");
    doc.text("LOCAL DE ENTREGA:", 14, yPos);
    doc.setFont("helvetica", "normal");
    yPos += 5;
    doc.text(contrato.local_entrega_nome, 14, yPos);
    
    const endereco = [
      contrato.local_entrega_logradouro,
      contrato.local_entrega_numero,
      contrato.local_entrega_bairro,
      contrato.local_entrega_cidade,
      contrato.local_entrega_uf,
    ].filter(Boolean).join(", ");
    
    if (endereco) {
      yPos += 5;
      doc.text(endereco, 14, yPos);
    }
  }

  // Corretor
  if (contrato.corretor) {
    yPos += 7;
    doc.setFont("helvetica", "bold");
    doc.text("CORRETOR:", 14, yPos);
    doc.setFont("helvetica", "normal");
    yPos += 5;
    doc.text(`${contrato.corretor} - Comissão: ${contrato.percentual_comissao || 0}% (${formatCurrency(contrato.valor_comissao)})`, 14, yPos);
  }

  // Totais
  yPos += 12;
  doc.setFont("helvetica", "bold");
  doc.text("TOTAIS", 14, yPos);
  doc.setFont("helvetica", "normal");
  yPos += 6;
  doc.text(`Carregado: ${formatNumber(contrato.total_carregado_kg)} kg`, 14, yPos);
  doc.text(`Saldo: ${formatNumber(contrato.saldo_kg)} kg`, pageWidth / 2, yPos);

  // Observações
  if (contrato.observacoes) {
    yPos += 10;
    doc.setFont("helvetica", "bold");
    doc.text("OBSERVAÇÕES:", 14, yPos);
    doc.setFont("helvetica", "normal");
    yPos += 5;
    const obsLines = doc.splitTextToSize(contrato.observacoes, pageWidth - 28);
    doc.text(obsLines, 14, yPos);
    yPos += obsLines.length * 5;
  }

  // Tabela de Remessas
  if (remessas && remessas.length > 0) {
    yPos += 10;
    doc.setFont("helvetica", "bold");
    doc.text("REMESSAS", 14, yPos);

    const remessasData = remessas
      .filter(r => r.status !== "cancelada")
      .map((r) => [
        r.codigo?.toString() || "-",
        formatDate(r.data_carregamento),
        r.placa || "-",
        r.motorista || "-",
        formatNumber(r.kg_remessa || r.kg_nota, 0),
        formatCurrency(r.valor_nota),
        getStatusRemessa(r.status),
        r.notas_fiscais?.numero?.toString() || "-",
      ]);

    autoTable(doc, {
      startY: yPos + 3,
      head: [["Cód", "Data", "Placa", "Motorista", "Kg", "Valor", "Status", "NFe"]],
      body: remessasData,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [66, 66, 66], textColor: 255 },
      columnStyles: {
        0: { halign: "center", cellWidth: 12 },
        1: { halign: "center", cellWidth: 22 },
        2: { halign: "center", cellWidth: 20 },
        3: { cellWidth: 32 },
        4: { halign: "right", cellWidth: 20 },
        5: { halign: "right", cellWidth: 24 },
        6: { halign: "center", cellWidth: 24 },
        7: { halign: "center", cellWidth: 18 },
      },
    });
  }

  // Rodapé
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(
      `Gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })} - Página ${i} de ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: "center" }
    );
  }

  // Download direto do PDF (evita bloqueio de pop-up)
  const pdfBlob = doc.output("blob");
  const pdfUrl = URL.createObjectURL(pdfBlob);
  const link = document.createElement("a");
  link.href = pdfUrl;
  link.download = `extrato_contrato_${contrato.numero}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Revogar URL após download
  setTimeout(() => URL.revokeObjectURL(pdfUrl), 1000);
}
