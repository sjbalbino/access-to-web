import { useState, useEffect, useMemo } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Truck, Scale, Check, Loader2, AlertCircle, Package, Search, FileText, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";

import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

import { useSafras } from "@/hooks/useSafras";
import { useSilos } from "@/hooks/useSilos";
import { useInscricoesCompletas } from "@/hooks/useInscricoesCompletas";
import { useLocaisEntrega, useLocalSede } from "@/hooks/useLocaisEntrega";
import { usePlacas, useCreatePlaca } from "@/hooks/usePlacas";
import { formatPlaca, unformatPlaca } from "@/lib/formatters";
import { useProdutosSementes } from "@/hooks/useProdutosSementes";
import { useControleLavouras, useCreateControleLavoura } from "@/hooks/useControleLavouras";
import { useTabelaUmidades } from "@/hooks/useTabelaUmidades";
import { useColheitasPendentes, useCreateColheitaEntrada, useUpdateColheitaSaida } from "@/hooks/useColheitasEntrada";
import { useLavouras } from "@/hooks/useLavouras";
import { useAuth } from "@/contexts/AuthContext";
import { useCfops } from "@/hooks/useCfops";
import { useCreateNotaDepositoEmitida } from "@/hooks/useNotasDepositoEmitidas";
import { useInscricaoEmitentePrincipal } from "@/hooks/useInscricaoEmitentePrincipal";
import { useFocusNfe } from "@/hooks/useFocusNfe";
import { supabase } from "@/integrations/supabase/client";
import type { NotaFiscalData, NotaFiscalItemData } from "@/lib/focusNfeMapper";

// Tipos para controle do painel de emissão
type EmissionStep = "idle" | "validating" | "creating" | "sending" | "processing" | "success" | "error";

interface EmissionStatus {
  step: EmissionStep;
  message: string;
  progress: number;
  details?: string;
  chaveAcesso?: string;
  protocolo?: string;
}

interface FormEntrada {
  peso_bruto: number;
  placa_id: string;
  motorista: string;
  tipo_colheita: string;
  variedade_id: string;
}

interface FormSaida {
  peso_tara: number;
  impureza: number;
  umidade: number;
  percentual_avariados: number;
  percentual_outros: number;
  ph: number;
}

interface FormContraNota {
  emitir: boolean;
  tipo: "bloco" | "nfpe";
  numero_nfp: string;
  serie_nfp: string;
  data_emissao_nfp: string;
  chave_acesso: string;
}

const initialFormEntrada: FormEntrada = {
  peso_bruto: 0,
  placa_id: "",
  motorista: "",
  tipo_colheita: "industria",
  variedade_id: "",
};

const initialFormSaida: FormSaida = {
  peso_tara: 0,
  impureza: 0,
  umidade: 0,
  percentual_avariados: 0,
  percentual_outros: 0,
  ph: 0,
};

const initialFormContraNota: FormContraNota = {
  emitir: false,
  tipo: "bloco",
  numero_nfp: "",
  serie_nfp: "",
  data_emissao_nfp: format(new Date(), "yyyy-MM-dd"),
  chave_acesso: "",
};

export default function EntradaColheita() {
  const { profile } = useAuth();
  
  // Filtros
  const [safraId, setSafraId] = useState<string>("");
  const [siloId, setSiloId] = useState<string>("");
  const [inscricaoId, setInscricaoId] = useState<string>("");
  const [localEntregaId, setLocalEntregaId] = useState<string>("");
  const [balanceiro, setBalanceiro] = useState<string>("");

  // Combobox produtor
  const [produtorOpen, setProdutorOpen] = useState(false);
  const [produtorSearch, setProdutorSearch] = useState("");

  // Combobox placa
  const [placaOpen, setPlacaOpen] = useState(false);
  const [placaSearch, setPlacaSearch] = useState("");
  const [creatingPlaca, setCreatingPlaca] = useState(false);

  // Seleções
  const [selectedLavouraId, setSelectedLavouraId] = useState<string | null>(null);
  const [selectedPendente, setSelectedPendente] = useState<string | null>(null);

  // Formulários
  const [formEntrada, setFormEntrada] = useState<FormEntrada>(initialFormEntrada);
  const [formSaida, setFormSaida] = useState<FormSaida>(initialFormSaida);
  const [formContraNota, setFormContraNota] = useState<FormContraNota>(initialFormContraNota);
  const [pesoBrutoSelecionado, setPesoBrutoSelecionado] = useState<number>(0);

  // Estados para painel de emissão
  const [isEmissionDialogOpen, setIsEmissionDialogOpen] = useState(false);
  const [emissionStatus, setEmissionStatus] = useState<EmissionStatus>({
    step: "idle",
    message: "",
    progress: 0,
  });

  // Queries
  const { data: safras = [] } = useSafras();
  const { data: silos = [] } = useSilos();
  const { data: inscricoes = [] } = useInscricoesCompletas();
  const { data: locaisEntrega = [] } = useLocaisEntrega();
  const { data: localSede } = useLocalSede();
  const { data: placas = [] } = usePlacas();
  const { data: sementes = [] } = useProdutosSementes();
  const { data: tabelaUmidades = [] } = useTabelaUmidades();
  const { data: controleLavouras = [] } = useControleLavouras(safraId || null);
  const { data: cargasPendentes = [], isLoading: loadingPendentes } = useColheitasPendentes(safraId || null);
  const { data: lavouras = [] } = useLavouras();
  const { cfops = [] } = useCfops();
  
  // Buscar inscrição emitente principal da granja (sócio com is_emitente_principal = true)
  const { data: inscricaoPrincipal } = useInscricaoEmitentePrincipal(localSede?.granja_id || undefined);

  // Mutations
  const createControleLavoura = useCreateControleLavoura();
  const createColheitaEntrada = useCreateColheitaEntrada();
  const updateColheitaSaida = useUpdateColheitaSaida();
  const createNotaDeposito = useCreateNotaDepositoEmitida();
  const createPlaca = useCreatePlaca();
  const { emitirNfe, pollStatus } = useFocusNfe();

  // Filtrar placas ativas com busca
  const placasAtivas = useMemo(() => {
    const ativas = placas.filter(p => p.ativa);
    if (!placaSearch) return ativas;
    
    const search = placaSearch.toUpperCase().replace(/[^A-Z0-9]/g, '');
    return ativas.filter(p => 
      p.placa?.toUpperCase().replace(/[^A-Z0-9]/g, '').includes(search)
    );
  }, [placas, placaSearch]);

  // Verifica se a placa digitada não existe
  const placaParaCriar = useMemo(() => {
    if (!placaSearch || placaSearch.length < 3) return null;
    const searchFormatted = placaSearch.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const existe = placas.some(p => 
      p.placa?.toUpperCase().replace(/[^A-Z0-9]/g, '') === searchFormatted
    );
    if (!existe && searchFormatted.length >= 3) {
      return searchFormatted.slice(0, 7);
    }
    return null;
  }, [placaSearch, placas]);

  // Handler para criar nova placa
  const handleCreatePlaca = async (placaStr: string) => {
    try {
      setCreatingPlaca(true);
      const result = await createPlaca.mutateAsync({
        placa: placaStr,
        ativa: true,
        granja_id: localSede?.granja_id || null,
        tipo: null,
        marca: null,
        modelo: null,
        ano: null,
        cor: null,
        capacidade_kg: null,
        proprietario: null,
        observacoes: null,
      });
      setFormEntrada(prev => ({ ...prev, placa_id: result.id }));
      setPlacaSearch("");
      setPlacaOpen(false);
    } catch (error) {
      console.error("Erro ao criar placa:", error);
    } finally {
      setCreatingPlaca(false);
    }
  };

  // Preencher balanceiro com nome do usuário logado
  useEffect(() => {
    if (profile?.nome && !balanceiro) {
      setBalanceiro(profile.nome);
    }
  }, [profile?.nome]);

  // Preencher local de entrega com sede padrão
  useEffect(() => {
    if (localSede?.id && !localEntregaId) {
      setLocalEntregaId(localSede.id);
    }
  }, [localSede?.id]);

  // Buscar cultura da safra selecionada
  const safraSelecionada = useMemo(() => 
    safras.find(s => s.id === safraId), 
    [safras, safraId]
  );
  
  const culturaId = safraSelecionada?.cultura_id;

  // Filtrar inscrições ativas de produtores ativos com busca
  const inscricoesAtivas = useMemo(() => {
    // Apenas inscrições ativas de produtores ativos
    const ativas = inscricoes.filter(i => i.ativa && i.produtores?.ativo !== false);
    if (!produtorSearch) return ativas;
    
    const search = produtorSearch.toLowerCase();
    return ativas.filter(i => 
      i.produtores?.nome?.toLowerCase().includes(search) ||
      i.cpf_cnpj?.includes(search) ||
      i.inscricao_estadual?.toLowerCase().includes(search)
    );
  }, [inscricoes, produtorSearch]);

  // Inscricao selecionada
  const inscricaoSelecionada = useMemo(() => 
    inscricoes.find(i => i.id === inscricaoId),
    [inscricoes, inscricaoId]
  );

  // Determinar tipo do produtor selecionado (usa valor direto do banco: "produtor" ou "socio")
  const tipoProdutor = useMemo(() => {
    if (!inscricaoSelecionada) return "todos";
    return inscricaoSelecionada.produtores?.tipo_produtor || "todos";
  }, [inscricaoSelecionada]);

  // Filtrar lavouras automaticamente pelo tipo de produtor selecionado
  const lavourasFiltradasPorTipo = useMemo(() => {
    if (tipoProdutor === "todos") {
      return controleLavouras;
    }
    
    if (tipoProdutor === "produtor") {
      // Produtor externo: mostrar apenas lavouras com recebe_terceiros = true
      return controleLavouras.filter(cl => {
        const lavoura = lavouras.find(l => l.id === cl.lavoura_id);
        return lavoura?.recebe_terceiros === true;
      });
    }
    
    // Sócio: mostrar lavouras que NÃO são de terceiros
    return controleLavouras.filter(cl => {
      const lavoura = lavouras.find(l => l.id === cl.lavoura_id);
      return lavoura?.recebe_terceiros !== true;
    });
  }, [controleLavouras, lavouras, tipoProdutor]);

  // Obter controle_lavoura_id para a lavoura selecionada
  const controleLavouraSelecionado = useMemo(() => 
    controleLavouras.find(cl => cl.lavoura_id === selectedLavouraId),
    [controleLavouras, selectedLavouraId]
  );

  // Calcular descontos automáticos
  const calculos = useMemo(() => {
    const pesoLiquido = pesoBrutoSelecionado - formSaida.peso_tara;
    
    // Kg Impureza
    const kgImpureza = pesoLiquido * (formSaida.impureza / 100);
    
    // Buscar desconto de umidade na tabela
    const faixaUmidade = tabelaUmidades.find(
      t => t.cultura_id === culturaId && 
           formSaida.umidade >= t.umidade_minima && 
           formSaida.umidade <= t.umidade_maxima
    );
    const percentualDescontoUmidade = faixaUmidade?.desconto_percentual || 0;
    const kgUmidade = pesoLiquido * (percentualDescontoUmidade / 100);
    
    // Avariados e Outros
    const kgAvariados = pesoLiquido * (formSaida.percentual_avariados / 100);
    const kgOutros = pesoLiquido * (formSaida.percentual_outros / 100);
    
    // Total descontos
    const totalDescontos = kgImpureza + kgUmidade + kgAvariados + kgOutros;
    
    // Líquido final
    const liquidoFinal = pesoLiquido - totalDescontos;
    
    // Sacos (60kg para indústria, 40kg para semente)
    const pesoSaco = formEntrada.tipo_colheita === "semente" ? 40 : 60;
    const totalSacos = liquidoFinal / pesoSaco;

    // Melhoria PH (para cálculo do PHC = PH corrigido)
    const melhoriaPh = faixaUmidade?.melhoria_ph || 0;

    return {
      pesoLiquido,
      kgImpureza,
      percentualDescontoUmidade,
      kgUmidade,
      kgAvariados,
      kgOutros,
      totalDescontos,
      liquidoFinal,
      totalSacos,
      melhoriaPh,
    };
  }, [pesoBrutoSelecionado, formSaida, formEntrada.tipo_colheita, tabelaUmidades, culturaId]);

  // Resetar seleções quando muda a safra
  useEffect(() => {
    setSelectedLavouraId(null);
    setSelectedPendente(null);
    setFormEntrada(initialFormEntrada);
    setFormSaida(initialFormSaida);
    setFormContraNota(initialFormContraNota);
    setPesoBrutoSelecionado(0);
  }, [safraId]);

  // Quando seleciona uma carga pendente
  useEffect(() => {
    if (selectedPendente) {
      const carga = cargasPendentes.find(c => c.id === selectedPendente);
      if (carga) {
        setPesoBrutoSelecionado(carga.peso_bruto || 0);
        setFormEntrada(prev => ({
          ...prev,
          tipo_colheita: carga.tipo_colheita || "industria",
          variedade_id: carga.variedade_id || "",
        }));
        setFormSaida(initialFormSaida);
        setFormContraNota(initialFormContraNota);
      }
    }
  }, [selectedPendente, cargasPendentes]);

  // Confirmar entrada
  const handleConfirmarEntrada = async () => {
    if (!safraId) {
      toast.error("Selecione uma safra");
      return;
    }
    if (!selectedLavouraId) {
      toast.error("Selecione uma lavoura");
      return;
    }
    if (formEntrada.peso_bruto <= 0) {
      toast.error("Informe o peso bruto");
      return;
    }

    try {
      let controleLavouraId = controleLavouraSelecionado?.id;
      
      // Se não existe controle de lavoura, criar um
      if (!controleLavouraId) {
        const lavoura = controleLavouras[0]?.lavouras || 
          await supabase.from("lavouras").select("total_hectares").eq("id", selectedLavouraId).single().then(r => r.data);
        
        const novoControle = await createControleLavoura.mutateAsync({
          safra_id: safraId,
          lavoura_id: selectedLavouraId,
          area_total: lavoura?.total_hectares || null,
          ha_plantado: null,
          cobertura_solo: null,
        });
        controleLavouraId = novoControle.id;
      }

      await createColheitaEntrada.mutateAsync({
        controle_lavoura_id: controleLavouraId,
        safra_id: safraId,
        lavoura_id: selectedLavouraId,
        data_colheita: format(new Date(), "yyyy-MM-dd"),
        peso_bruto: formEntrada.peso_bruto,
        placa_id: formEntrada.placa_id || null,
        motorista: formEntrada.motorista || null,
        tipo_colheita: formEntrada.tipo_colheita,
        variedade_id: formEntrada.variedade_id || null,
        silo_id: siloId || null,
        inscricao_produtor_id: inscricaoId || null,
        local_entrega_terceiro_id: localEntregaId || null,
        observacoes: balanceiro ? `Balanceiro: ${balanceiro}` : null,
      });

      toast.success("Entrada registrada com sucesso!");
      setFormEntrada(initialFormEntrada);
      setSelectedLavouraId(null);
    } catch (error: any) {
      toast.error("Erro ao registrar entrada: " + error.message);
    }
  };

  // Confirmar saída
  const handleConfirmarSaida = async () => {
    if (!selectedPendente) {
      toast.error("Selecione uma carga pendente");
      return;
    }
    if (formSaida.peso_tara <= 0) {
      toast.error("Informe o peso da tara");
      return;
    }

    // Validar contra nota se marcado
    if (formContraNota.emitir) {
      if (formContraNota.tipo === "bloco") {
        if (!formContraNota.numero_nfp || !formContraNota.serie_nfp) {
          toast.error("Informe o número e série da NFP");
          return;
        }
      } else {
        if (!formContraNota.chave_acesso || formContraNota.chave_acesso.length !== 44) {
          toast.error("Informe a chave de acesso com 44 dígitos");
          return;
        }
      }
    }

    try {
      // Atualizar colheita
      await updateColheitaSaida.mutateAsync({
        id: selectedPendente,
        peso_tara: formSaida.peso_tara,
        producao_kg: calculos.pesoLiquido,
        impureza: formSaida.impureza,
        kg_impureza: calculos.kgImpureza,
        umidade: formSaida.umidade,
        percentual_desconto: calculos.percentualDescontoUmidade,
        kg_umidade: calculos.kgUmidade,
        percentual_avariados: formSaida.percentual_avariados,
        kg_avariados: calculos.kgAvariados,
        percentual_outros: formSaida.percentual_outros,
        kg_outros: calculos.kgOutros,
        kg_desconto_total: calculos.totalDescontos,
        producao_liquida_kg: calculos.liquidoFinal,
        total_sacos: calculos.totalSacos,
        ph: formSaida.ph || null,
      });

      // Se emitir contra nota
      if (formContraNota.emitir && inscricaoId) {
        // Abrir dialog de emissão
        setIsEmissionDialogOpen(true);
        setEmissionStatus({ step: "validating", message: "Validando dados da nota...", progress: 10 });

        // Buscar CFOP 1905
        const cfop1905 = cfops.find(c => c.codigo === "1905");
        if (!cfop1905) {
          setEmissionStatus({ 
            step: "error", 
            message: "Erro na validação", 
            progress: 10,
            details: "CFOP 1905 não encontrado. Cadastre o CFOP antes de emitir."
          });
          return;
        }
        
        // Usar inscricao emitente principal (sócio) para emitir a contra-nota
        if (!inscricaoPrincipal?.emitente) {
          setEmissionStatus({ 
            step: "error", 
            message: "Erro na validação", 
            progress: 10,
            details: "Nenhum emitente principal configurado para esta granja. Configure uma inscrição de sócio como emitente principal."
          });
          return;
        }
        
        const emitente = inscricaoPrincipal.emitente;
        
        // Buscar granja do local sede
        const { data: granja, error: granjaError } = await supabase
          .from("granjas")
          .select("*")
          .eq("id", localSede?.granja_id)
          .single();
        
        if (granjaError || !granja) {
          setEmissionStatus({ 
            step: "error", 
            message: "Erro na validação", 
            progress: 10,
            details: "Erro ao buscar dados da granja."
          });
          return;
        }
        
        setEmissionStatus({ step: "creating", message: "Criando nota fiscal...", progress: 30 });
        
        // Buscar variedade selecionada
        const variedade = sementes.find(s => s.id === formEntrada.variedade_id);
        
        // Buscar carga para pegar placa
        const cargaSelecionada = cargasPendentes.find(c => c.id === selectedPendente);
        const placa = placas.find(p => p.id === cargaSelecionada?.placa_id);
        
        // Buscar preço à vista do produto/variedade
        const valorUnitario = variedade?.preco_venda || 0;
        const valorTotal = calculos.liquidoFinal * valorUnitario;
        
        // Dados do produtor/remetente
        const dataEmissao = formContraNota.tipo === "bloco" 
          ? formContraNota.data_emissao_nfp 
          : format(new Date(), "yyyy-MM-dd'T'HH:mm:ssXXX");
        
        // Calcular próximo número da NF-e
        const proximoNumero = (emitente.numero_atual_nfe || 0) + 1;
        
        // Criar NF-e na tabela notas_fiscais
        // IMPORTANTE: inscricao_produtor_id = sócio principal (emitente)
        //             inscricao_remetente_id = produtor que entregou a colheita
        const { data: notaFiscal, error: notaError } = await supabase
          .from("notas_fiscais")
          .insert({
            granja_id: granja.id,
            emitente_id: emitente.id,
            // Emitente: inscrição do sócio principal
            inscricao_produtor_id: inscricaoPrincipal.id,
            produtor_id: inscricaoPrincipal.produtor_id,
            // Série e número automáticos do emitente
            serie: emitente.serie_nfe || 1,
            numero: proximoNumero,
            operacao: 0, // 0 = Entrada
            natureza_operacao: cfop1905.natureza_operacao || "Entrada Depósito",
            cfop_id: cfop1905.id,
            data_emissao: dataEmissao,
            data_saida_entrada: dataEmissao,
            status: "rascunho",
            finalidade: 1, // 1 = NF-e Normal
            ind_consumidor_final: 0, // 0 = Normal (não é consumidor final)
            ind_presenca: 9, // 9 = Operação não presencial
            forma_pagamento: 0, // 0 = À Vista
            tipo_pagamento: "90", // 90 = Sem pagamento
            modalidade_frete: 9, // 9 = Sem frete
            // Remetente: inscrição do produtor que entregou a colheita (para notas de entrada)
            inscricao_remetente_id: inscricaoSelecionada?.id || null,
            // Remetente = Produtor (campos dest_ para entrada) - Tipo 2 = Produtor Rural
            dest_tipo: inscricaoSelecionada?.produtores?.tipo_produtor === "produtor" ? "2" : 
              (inscricaoSelecionada?.cpf_cnpj && inscricaoSelecionada.cpf_cnpj.replace(/\D/g, "").length > 11 ? "1" : "0"),
            dest_cpf_cnpj: inscricaoSelecionada?.cpf_cnpj?.replace(/\D/g, "") || "",
            dest_nome: inscricaoSelecionada?.produtores?.nome || "",
            dest_ie: inscricaoSelecionada?.inscricao_estadual?.replace(/\D/g, "") || "",
            dest_logradouro: inscricaoSelecionada?.logradouro || "",
            dest_numero: inscricaoSelecionada?.numero || "S/N",
            dest_complemento: inscricaoSelecionada?.complemento || "",
            dest_bairro: inscricaoSelecionada?.bairro || "",
            dest_cidade: inscricaoSelecionada?.cidade || "",
            dest_uf: inscricaoSelecionada?.uf || "",
            dest_cep: inscricaoSelecionada?.cep?.replace(/\D/g, "") || "",
            dest_email: inscricaoSelecionada?.email || null,
            // Totais
            total_produtos: valorTotal,
            total_nota: valorTotal,
            total_icms: 0,
            total_pis: 0,
            total_cofins: 0,
            // Volumes
            volumes_quantidade: 1,
            volumes_peso_bruto: pesoBrutoSelecionado,
            volumes_peso_liquido: calculos.liquidoFinal,
            volumes_especie: "GRANEL",
            // Veículo (extrair UF da placa se no formato Mercosul ABC1D23)
            veiculo_placa: placa?.placa || cargaSelecionada?.placas?.placa || null,
            veiculo_uf: granja.uf || null, // Usar UF da granja como padrão
            // NF-e referenciada (se tipo NFP-e)
            nfe_referenciada: formContraNota.tipo === "nfpe" ? formContraNota.chave_acesso : null,
            // Informações complementares
            info_complementar: (() => {
              const partes: string[] = [];
              
              // Referência da NFP
              if (formContraNota.tipo === "bloco") {
                partes.push(`NFP Bloco Nº ${formContraNota.numero_nfp} Série ${formContraNota.serie_nfp}`);
              } else {
                partes.push(`Contra Nota ref. NFP-e Chave: ${formContraNota.chave_acesso}`);
              }
              
              // Safra
              if (safraSelecionada?.nome) {
                partes.push(`Safra: ${safraSelecionada.nome}`);
              }
              
              // PRODUTO JÁ TESTADO POR [Emitente]
              const nomeEmitente = inscricaoPrincipal?.produtores?.nome || "";
              const cidadeEmitente = inscricaoPrincipal?.cidade || "";
              const cpfEmitente = inscricaoPrincipal?.cpf_cnpj || "";
              
              if (nomeEmitente) {
                partes.push(`PRODUTO JÁ TESTADO POR ${nomeEmitente} - ${cidadeEmitente} - CPF: ${cpfEmitente}`);
              }
              
              // PH e PHC (se produto tiver PH informado)
              if (formSaida.ph && formSaida.ph > 0) {
                const phCorrigido = formSaida.ph + calculos.melhoriaPh;
                partes.push(`PH: ${formSaida.ph} / PHC: ${phCorrigido.toFixed(1)}`);
              }
              
              return partes.join(" | ");
            })(),
          })
          .select()
          .single();
        
        if (notaError || !notaFiscal) {
          setEmissionStatus({ 
            step: "error", 
            message: "Erro ao criar nota fiscal", 
            progress: 30,
            details: notaError?.message || "Erro desconhecido"
          });
          return;
        }
        
        // Criar item da NF-e
        const { error: itemError } = await supabase
          .from("notas_fiscais_itens")
          .insert({
            nota_fiscal_id: notaFiscal.id,
            numero_item: 1,
            produto_id: formEntrada.variedade_id || null,
            codigo: variedade?.codigo || "001",
            descricao: variedade?.nome || "SOJA EM GRÃOS",
            ncm: variedade?.ncm || "12010090", // NCM do produto ou padrão soja
            cfop: cfop1905.codigo,
            unidade: "KG",
            quantidade: calculos.liquidoFinal,
            valor_unitario: valorUnitario,
            valor_total: valorTotal,
            origem: 0, // 0 = Nacional
            cst_icms: emitente.cst_icms_padrao || "51",
            base_icms: 0,
            aliq_icms: 0,
            valor_icms: 0,
            cst_pis: emitente.cst_pis_padrao || "09",
            base_pis: 0,
            aliq_pis: 0,
            valor_pis: 0,
            cst_cofins: emitente.cst_cofins_padrao || "09",
            base_cofins: 0,
            aliq_cofins: 0,
            valor_cofins: 0,
            info_adicional: `Umidade: ${formSaida.umidade}% | Impureza: ${formSaida.impureza}% | Peso Bruto: ${pesoBrutoSelecionado}kg`,
          });
        
        if (itemError) {
          setEmissionStatus({ 
            step: "error", 
            message: "Erro ao criar item da nota", 
            progress: 30,
            details: itemError.message
          });
          // Tentar excluir a nota criada
          await supabase.from("notas_fiscais").delete().eq("id", notaFiscal.id);
          return;
        }
        
        // CRIAR NOTA REFERENCIADA (OBRIGATÓRIO para SEFAZ - evita Rejeição 318)
        if (formContraNota.tipo === "nfpe" && formContraNota.chave_acesso) {
          // Referência a NF-e eletrônica (modelo 55)
          await supabase.from("notas_fiscais_referenciadas").insert({
            nota_fiscal_id: notaFiscal.id,
            tipo: "nfe",
            chave_nfe: formContraNota.chave_acesso,
          });
        } else if (formContraNota.tipo === "bloco") {
          // Referência a NFP em talão (modelo 04)
          const aamm = format(
            formContraNota.data_emissao_nfp 
              ? new Date(formContraNota.data_emissao_nfp) 
              : new Date(), 
            "yyMM"
          );
          const cpfCnpjLimpo = inscricaoSelecionada?.cpf_cnpj?.replace(/\D/g, "") || "";
          
          await supabase.from("notas_fiscais_referenciadas").insert({
            nota_fiscal_id: notaFiscal.id,
            tipo: "nfp",
            nfp_cpf: cpfCnpjLimpo.length <= 11 ? cpfCnpjLimpo : null,
            nfp_cnpj: cpfCnpjLimpo.length > 11 ? cpfCnpjLimpo : null,
            nfp_ie: inscricaoSelecionada?.inscricao_estadual?.replace(/\D/g, "") || "",
            nfp_uf: inscricaoSelecionada?.uf || "RS",
            nfp_aamm: aamm,
            nfp_modelo: "04", // Nota de Produtor
            nfp_serie: parseInt(formContraNota.serie_nfp) || 0,
            nfp_numero: parseInt(formContraNota.numero_nfp) || 0,
          });
        }
        
        // Incrementar número atual da NF-e no emitente
        await supabase
          .from("emitentes_nfe")
          .update({ numero_atual_nfe: proximoNumero })
          .eq("id", emitente.id);
        
        // Dados para registrar nota de depósito emitida APÓS autorização
        const dadosNotaDeposito = {
          inscricao_produtor_id: inscricaoId,
          safra_id: safraId,
          produto_id: formEntrada.variedade_id || null,
          quantidade_kg: calculos.liquidoFinal,
          data_emissao: formContraNota.tipo === "bloco" 
            ? formContraNota.data_emissao_nfp 
            : format(new Date(), "yyyy-MM-dd"),
          granja_id: granja.id,
          nota_fiscal_id: notaFiscal.id,
        };

        setEmissionStatus({ step: "sending", message: "Enviando à SEFAZ...", progress: 50 });

        // Emissão automática à SEFAZ usando o hook useFocusNfe
        try {
          // Montar dados da nota no formato esperado pelo hook
          const notaDataParaEmissao: NotaFiscalData = {
            id: notaFiscal.id,
            data_emissao: dataEmissao,
            natureza_operacao: cfop1905.natureza_operacao || "Entrada Depósito",
            operacao: 0, // Entrada
            finalidade: 1,
            ind_consumidor_final: 0,
            ind_presenca: 9,
            modalidade_frete: 9,
            forma_pagamento: 0,
            info_complementar: notaFiscal.info_complementar || null,
            info_fisco: null,
            numero: proximoNumero,
            serie: emitente.serie_nfe || 1,
            // Destinatário (remetente da colheita)
            dest_cpf_cnpj: inscricaoSelecionada?.cpf_cnpj || "",
            dest_nome: inscricaoSelecionada?.produtores?.nome || "",
            dest_ie: inscricaoSelecionada?.inscricao_estadual || "",
            dest_logradouro: inscricaoSelecionada?.logradouro || "",
            dest_numero: inscricaoSelecionada?.numero || "S/N",
            dest_bairro: inscricaoSelecionada?.bairro || "",
            dest_cidade: inscricaoSelecionada?.cidade || "",
            dest_uf: inscricaoSelecionada?.uf || "",
            dest_cep: inscricaoSelecionada?.cep?.replace(/\D/g, "") || "",
            dest_tipo: inscricaoSelecionada?.produtores?.tipo_produtor === "produtor" ? "2" : "0",
            dest_email: inscricaoSelecionada?.email || null,
            dest_telefone: null,
            // Dados do emitente (sócio principal)
            inscricaoProdutor: {
              cpf_cnpj: inscricaoPrincipal?.cpf_cnpj || null,
              inscricao_estadual: inscricaoPrincipal?.inscricao_estadual || null,
              logradouro: inscricaoPrincipal?.logradouro || null,
              numero: inscricaoPrincipal?.numero || null,
              complemento: inscricaoPrincipal?.complemento || null,
              bairro: inscricaoPrincipal?.bairro || null,
              cidade: inscricaoPrincipal?.cidade || null,
              uf: inscricaoPrincipal?.uf || null,
              cep: inscricaoPrincipal?.cep?.replace(/\D/g, "") || null,
              produtorNome: inscricaoPrincipal?.produtores?.nome || null,
              granjaNome: granja.razao_social || null,
            },
            emitente: {
              crt: emitente.crt || 3,
            },
          };

          // Montar item da nota
          const itensParaEmissao: NotaFiscalItemData[] = [{
            numero_item: 1,
            codigo: variedade?.codigo || "001",
            descricao: variedade?.nome || "SOJA EM GRÃOS",
            cfop: cfop1905.codigo,
            unidade: "KG",
            quantidade: calculos.liquidoFinal,
            valor_unitario: valorUnitario,
            valor_total: valorTotal,
            ncm: variedade?.ncm || "12010090",
            origem: 0,
            cst_icms: emitente.cst_icms_padrao || "51",
            modalidade_bc_icms: 3,
            base_icms: 0,
            aliq_icms: 0,
            valor_icms: 0,
            cst_pis: emitente.cst_pis_padrao || "09",
            base_pis: 0,
            aliq_pis: 0,
            valor_pis: 0,
            cst_cofins: emitente.cst_cofins_padrao || "09",
            base_cofins: 0,
            aliq_cofins: 0,
            valor_cofins: 0,
            cst_ipi: null,
            base_ipi: null,
            aliq_ipi: null,
            valor_ipi: null,
            valor_desconto: null,
            valor_frete: null,
            valor_seguro: null,
            valor_outros: null,
            cst_ibs: null,
            base_ibs: null,
            aliq_ibs: null,
            valor_ibs: null,
            cclass_trib_ibs: null,
            cst_cbs: null,
            base_cbs: null,
            aliq_cbs: null,
            valor_cbs: null,
            cclass_trib_cbs: null,
            cst_is: null,
            base_is: null,
            aliq_is: null,
            valor_is: null,
          }];

          // Emitir via hook (faz mapeamento, busca notas referenciadas e envia)
          const resultEmissao = await emitirNfe(notaFiscal.id, notaDataParaEmissao, itensParaEmissao);

          if (resultEmissao?.success && resultEmissao?.ref) {
            setEmissionStatus({ step: "processing", message: "Aguardando retorno da SEFAZ...", progress: 70 });
            
            // Polling com callback para registrar nota de depósito após autorização
            const pollResult = await pollStatus(resultEmissao.ref, notaFiscal.id);
            
            // Verificar se foi autorizada e registrar nota de depósito
            if (pollResult?.success && (pollResult?.data?.status === "autorizado" || pollResult?.data?.status === "autorizada")) {
              try {
                await createNotaDeposito.mutateAsync(dadosNotaDeposito);
              } catch (depositoErr) {
                console.error("Erro ao registrar nota de depósito:", depositoErr);
              }
              setEmissionStatus({ 
                step: "success", 
                message: "NF-e autorizada com sucesso!", 
                progress: 100,
                chaveAcesso: String(pollResult?.data?.chave_nfe || pollResult?.data?.chave || ""),
                protocolo: String(pollResult?.data?.protocolo || "")
              });
            } else if (pollResult?.success === false) {
              setEmissionStatus({ 
                step: "error", 
                message: "Erro no processamento", 
                progress: 70,
                details: pollResult?.error || "Erro ao consultar status da SEFAZ"
              });
            } else {
              // Status final mas não autorizada (cancelada, rejeitada, etc)
              setEmissionStatus({ 
                step: "error", 
                message: "Nota não autorizada", 
                progress: 70,
                details: String(pollResult?.data?.mensagem_sefaz || pollResult?.data?.motivo || "Status: " + (pollResult?.data?.status || "desconhecido"))
              });
            }
          } else if (!resultEmissao?.success) {
            setEmissionStatus({ 
              step: "error", 
              message: "Erro na transmissão", 
              progress: 50,
              details: resultEmissao?.error || "Erro ao emitir. NF-e criada como rascunho."
            });
          }
        } catch (emissaoErr: any) {
          setEmissionStatus({ 
            step: "error", 
            message: "Erro na transmissão", 
            progress: 50,
            details: emissaoErr?.message || "Erro na transmissão. NF-e criada como rascunho."
          });
          console.error("Erro emissão:", emissaoErr);
        }
      }

      toast.success("Saída registrada com sucesso!");
      setSelectedPendente(null);
      setFormSaida(initialFormSaida);
      setFormContraNota(initialFormContraNota);
      setPesoBrutoSelecionado(0);
    } catch (error: any) {
      toast.error("Erro ao registrar saída: " + error.message);
    }
  };

  // Funções auxiliares para o painel de emissão
  const getStepStatus = (step: EmissionStep): "pending" | "active" | "completed" | "error" => {
    const steps: EmissionStep[] = ["validating", "creating", "sending", "processing"];
    const currentIndex = steps.indexOf(emissionStatus.step);
    const stepIndex = steps.indexOf(step);
    
    if (emissionStatus.step === "error") {
      if (stepIndex <= currentIndex) return "error";
      return "pending";
    }
    if (emissionStatus.step === "success") return "completed";
    if (stepIndex < currentIndex) return "completed";
    if (stepIndex === currentIndex) return "active";
    return "pending";
  };

  const handleCloseEmissionDialog = () => {
    if (emissionStatus.step === "success" || emissionStatus.step === "error") {
      setIsEmissionDialogOpen(false);
      setEmissionStatus({ step: "idle", message: "", progress: 0 });
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-orange-500/20">
            <Truck className="h-6 w-6 text-orange-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Entrada de Colheita</h1>
            <p className="text-sm text-muted-foreground">
              Registro rápido de pesagem de entrada e saída
            </p>
          </div>
        </div>

        {/* Filtros */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Contexto da Pesagem</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="space-y-2">
                <Label>Safra *</Label>
                <Select value={safraId} onValueChange={setSafraId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {safras.filter(s => s.status === 'ativa').map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Produtor/Inscrição com Combobox de busca */}
              <div className="space-y-2 lg:col-span-2">
                <Label>Produtor/Inscrição</Label>
                <Popover open={produtorOpen} onOpenChange={setProdutorOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={produtorOpen}
                      className="w-full justify-between font-normal"
                    >
                      {inscricaoId ? (
                        <span className="truncate">
                          {inscricaoSelecionada?.produtores?.nome} - {inscricaoSelecionada?.inscricao_estadual}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Buscar nome/CPF/IE...</span>
                      )}
                      <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[400px] p-0" align="start">
                    <Command shouldFilter={false}>
                      <CommandInput 
                        placeholder="Buscar por nome, CPF ou Inscrição..." 
                        value={produtorSearch}
                        onValueChange={setProdutorSearch}
                      />
                      <CommandList>
                        <CommandEmpty>Nenhum produtor encontrado.</CommandEmpty>
                        <CommandGroup>
                          <CommandItem
                            value="_none"
                            onSelect={() => {
                              setInscricaoId("");
                              setProdutorOpen(false);
                              setProdutorSearch("");
                            }}
                          >
                            <span className="text-muted-foreground">Nenhum</span>
                          </CommandItem>
                          {inscricoesAtivas.slice(0, 20).map(i => (
                            <CommandItem
                              key={i.id}
                              value={i.id}
                              onSelect={() => {
                                setInscricaoId(i.id);
                                setProdutorOpen(false);
                                setProdutorSearch("");
                              }}
                            >
                              <div className="flex flex-col">
                                <span className="font-medium">{i.produtores?.nome}</span>
                                <span className="text-xs text-muted-foreground">
                                  {i.cpf_cnpj} | IE: {i.inscricao_estadual} | {i.produtores?.tipo_produtor === "produtor" ? "Produtor Externo" : "Sócio"}
                                </span>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>Silo (Destino)</Label>
                <Select value={siloId || "_none"} onValueChange={v => setSiloId(v === "_none" ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">Nenhum</SelectItem>
                    {silos.filter(s => s.ativo).map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Local Entrega</Label>
                <Select value={localEntregaId || "_none"} onValueChange={v => setLocalEntregaId(v === "_none" ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">Nenhum</SelectItem>
                    {locaisEntrega.filter(l => l.ativo).map(l => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.nome} {l.is_sede && "(Sede)"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Balanceiro</Label>
                <Input 
                  value={balanceiro} 
                  onChange={e => setBalanceiro(e.target.value)}
                  placeholder="Nome"
                  className="bg-muted"
                  readOnly
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {!safraId && (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="font-medium text-lg mb-1">Selecione uma Safra</h3>
              <p className="text-sm text-muted-foreground">
                Para iniciar o registro de colheitas, selecione uma safra no campo acima.
              </p>
            </CardContent>
          </Card>
        )}

        {safraId && (
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Coluna Esquerda: Lavouras e Pesagem Entrada */}
            <div className="space-y-6">
              {/* Lista de Lavouras */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      Lista de Lavouras
                      {tipoProdutor !== "todos" && (
                        <Badge variant="secondary" className="ml-2">
                          {tipoProdutor === "socio" ? "Sócios" : "Produtor Externo"}
                        </Badge>
                      )}
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="max-h-48 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Lavoura</TableHead>
                          <TableHead className="text-right">Área (ha)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {lavourasFiltradasPorTipo.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={2} className="text-center text-muted-foreground py-8">
                              Nenhuma lavoura cadastrada para esta safra
                            </TableCell>
                          </TableRow>
                        ) : (
                          lavourasFiltradasPorTipo.map(cl => (
                            <TableRow 
                              key={cl.id}
                              className={cn(
                                "cursor-pointer transition-colors",
                                selectedLavouraId === cl.lavoura_id && "bg-primary/10"
                              )}
                              onClick={() => {
                                setSelectedLavouraId(cl.lavoura_id);
                                setSelectedPendente(null);
                              }}
                            >
                              <TableCell className="font-medium">
                                {cl.lavouras?.nome}
                              </TableCell>
                              <TableCell className="text-right">
                                {cl.ha_plantado?.toFixed(2) || cl.lavouras?.total_hectares?.toFixed(2) || "-"}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {/* Pesagem de Entrada */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Scale className="h-4 w-4" />
                    Pesagem de Entrada
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2 space-y-2">
                      <Label>Kgs Entrada (Bruto) *</Label>
                      <Input
                        type="number"
                        value={formEntrada.peso_bruto || ""}
                        onChange={e => setFormEntrada(prev => ({ ...prev, peso_bruto: Number(e.target.value) }))}
                        placeholder="0"
                        className="text-lg font-bold"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Placa</Label>
                      <Popover open={placaOpen} onOpenChange={setPlacaOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={placaOpen}
                            className="w-full justify-between font-normal"
                          >
                            {formEntrada.placa_id 
                              ? placas.find(p => p.id === formEntrada.placa_id)?.placa || "Selecione"
                              : "Selecione ou digite"}
                            <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[250px] p-0" align="start">
                          <Command shouldFilter={false}>
                            <CommandInput 
                              placeholder="Buscar ou criar placa..." 
                              value={placaSearch}
                              onValueChange={setPlacaSearch}
                            />
                            <CommandList>
                              <CommandEmpty>
                                {placaParaCriar ? (
                                  <Button
                                    variant="ghost"
                                    className="w-full justify-start"
                                    disabled={creatingPlaca}
                                    onClick={() => handleCreatePlaca(placaParaCriar)}
                                  >
                                    {creatingPlaca ? (
                                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                      <Truck className="mr-2 h-4 w-4" />
                                    )}
                                    Criar placa {placaParaCriar}
                                  </Button>
                                ) : (
                                  "Nenhuma placa encontrada"
                                )}
                              </CommandEmpty>
                              <CommandGroup>
                                <CommandItem
                                  value="_none"
                                  onSelect={() => {
                                    setFormEntrada(prev => ({ ...prev, placa_id: "" }));
                                    setPlacaOpen(false);
                                    setPlacaSearch("");
                                  }}
                                >
                                  Nenhuma
                                </CommandItem>
                                {placasAtivas.map(p => (
                                  <CommandItem
                                    key={p.id}
                                    value={p.id}
                                    onSelect={() => {
                                      setFormEntrada(prev => ({ ...prev, placa_id: p.id }));
                                      setPlacaOpen(false);
                                      setPlacaSearch("");
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        formEntrada.placa_id === p.id ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    {p.placa}
                                    {p.tipo && <span className="ml-2 text-muted-foreground text-xs">({p.tipo})</span>}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                              {placaParaCriar && placasAtivas.length > 0 && (
                                <CommandGroup heading="Nova placa">
                                  <CommandItem
                                    value={`criar_${placaParaCriar}`}
                                    onSelect={() => handleCreatePlaca(placaParaCriar)}
                                    disabled={creatingPlaca}
                                  >
                                    {creatingPlaca ? (
                                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                      <Truck className="mr-2 h-4 w-4" />
                                    )}
                                    Criar placa {placaParaCriar}
                                  </CommandItem>
                                </CommandGroup>
                              )}
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div className="space-y-2">
                      <Label>Motorista</Label>
                      <Input
                        value={formEntrada.motorista}
                        onChange={e => setFormEntrada(prev => ({ ...prev, motorista: e.target.value }))}
                        placeholder="Nome"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Tipo</Label>
                      <Select 
                        value={formEntrada.tipo_colheita} 
                        onValueChange={v => setFormEntrada(prev => ({ ...prev, tipo_colheita: v }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="industria">Indústria (60kg)</SelectItem>
                          <SelectItem value="semente">Semente (40kg)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Variedade</Label>
                      <Select 
                        value={formEntrada.variedade_id || "_none"} 
                        onValueChange={v => setFormEntrada(prev => ({ ...prev, variedade_id: v === "_none" ? "" : v }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="_none">Nenhuma</SelectItem>
                          {sementes.map(s => (
                            <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Button 
                    onClick={handleConfirmarEntrada}
                    disabled={!selectedLavouraId || formEntrada.peso_bruto <= 0 || createColheitaEntrada.isPending}
                    className="w-full"
                  >
                    {createColheitaEntrada.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4 mr-2" />
                    )}
                    Confirmar Entrada
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Coluna Direita: Cargas Pendentes e Pesagem Saída */}
            <div className="space-y-6">
              {/* Cargas Pendentes */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Truck className="h-4 w-4" />
                    Cargas Pendentes (Aguardando Saída)
                    {cargasPendentes.length > 0 && (
                      <Badge variant="secondary">{cargasPendentes.length}</Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="max-h-48 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Lavoura</TableHead>
                          <TableHead>Placa</TableHead>
                          <TableHead className="text-right">Bruto</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {loadingPendentes ? (
                          <TableRow>
                            <TableCell colSpan={3} className="text-center py-8">
                              <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                            </TableCell>
                          </TableRow>
                        ) : cargasPendentes.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                              Nenhuma carga pendente
                            </TableCell>
                          </TableRow>
                        ) : (
                          cargasPendentes.map(carga => (
                            <TableRow 
                              key={carga.id}
                              className={cn(
                                "cursor-pointer transition-colors",
                                selectedPendente === carga.id && "bg-primary/10"
                              )}
                              onClick={() => {
                                setSelectedPendente(carga.id);
                                setSelectedLavouraId(null);
                              }}
                            >
                              <TableCell className="font-medium">
                                {carga.lavouras?.nome}
                              </TableCell>
                              <TableCell>
                                {carga.placas?.placa || "-"}
                              </TableCell>
                              <TableCell className="text-right font-mono">
                                {carga.peso_bruto?.toLocaleString("pt-BR")}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {/* Pesagem de Saída */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Scale className="h-4 w-4" />
                    Pesagem de Saída
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Kgs Entrada</Label>
                      <Input
                        value={pesoBrutoSelecionado.toLocaleString("pt-BR")}
                        readOnly
                        className="bg-muted font-mono"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Kgs Tara *</Label>
                      <Input
                        type="number"
                        value={formSaida.peso_tara || ""}
                        onChange={e => setFormSaida(prev => ({ ...prev, peso_tara: Number(e.target.value) }))}
                        placeholder="0"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Kgs Líquido</Label>
                      <Input
                        value={calculos.pesoLiquido.toLocaleString("pt-BR")}
                        readOnly
                        className="bg-muted font-mono"
                      />
                    </div>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Impureza %</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={formSaida.impureza || ""}
                        onChange={e => setFormSaida(prev => ({ ...prev, impureza: Number(e.target.value) }))}
                        placeholder="0.00"
                      />
                      <p className="text-xs text-muted-foreground">
                        Kg: {calculos.kgImpureza.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>Umidade %</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={formSaida.umidade || ""}
                        onChange={e => setFormSaida(prev => ({ ...prev, umidade: Number(e.target.value) }))}
                        placeholder="0.00"
                      />
                      <p className="text-xs text-muted-foreground">
                        Desc: {calculos.percentualDescontoUmidade}% | Kg: {calculos.kgUmidade.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>Avariados %</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={formSaida.percentual_avariados || ""}
                        onChange={e => setFormSaida(prev => ({ ...prev, percentual_avariados: Number(e.target.value) }))}
                        placeholder="0.00"
                      />
                      <p className="text-xs text-muted-foreground">
                        Kg: {calculos.kgAvariados.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>Outros %</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={formSaida.percentual_outros || ""}
                        onChange={e => setFormSaida(prev => ({ ...prev, percentual_outros: Number(e.target.value) }))}
                        placeholder="0.00"
                      />
                      <p className="text-xs text-muted-foreground">
                        Kg: {calculos.kgOutros.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>PH</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={formSaida.ph || ""}
                        onChange={e => setFormSaida(prev => ({ ...prev, ph: Number(e.target.value) }))}
                        placeholder="0.0"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Total Descontos</Label>
                      <Input
                        value={calculos.totalDescontos.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}
                        readOnly
                        className="bg-muted font-mono"
                      />
                    </div>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-base font-semibold">Líquido Final (Kg)</Label>
                      <Input
                        value={calculos.liquidoFinal.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}
                        readOnly
                        className="bg-primary/10 font-mono text-lg font-bold"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-base font-semibold">Total Sacos</Label>
                      <Input
                        value={calculos.totalSacos.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}
                        readOnly
                        className="bg-primary/10 font-mono text-lg font-bold"
                      />
                    </div>
                  </div>

                  <Separator />

                  {/* Seção Contra Nota - apenas para produtores externos */}
                  {tipoProdutor === "produtor" ? (
                    <Card className="border-dashed">
                      <CardHeader className="pb-3">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id="emitir_contra_nota"
                            checked={formContraNota.emitir}
                            onCheckedChange={(checked) => 
                              setFormContraNota(prev => ({ ...prev, emitir: checked === true }))
                            }
                          />
                          <Label htmlFor="emitir_contra_nota" className="text-base font-semibold flex items-center gap-2 cursor-pointer">
                            <FileText className="h-4 w-4" />
                            Emitir Contra Nota (CFOP 1905)
                          </Label>
                        </div>
                      </CardHeader>
                    
                    {formContraNota.emitir && (
                      <CardContent className="space-y-4 pt-0">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Tipo NFP</Label>
                            <Select 
                              value={formContraNota.tipo} 
                              onValueChange={(v: "bloco" | "nfpe") => 
                                setFormContraNota(prev => ({ ...prev, tipo: v }))
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="bloco">NFP Bloco</SelectItem>
                                <SelectItem value="nfpe">NFPe Eletrônica</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {formContraNota.tipo === "bloco" ? (
                          <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                              <Label>Número NFP *</Label>
                              <Input
                                value={formContraNota.numero_nfp}
                                onChange={e => setFormContraNota(prev => ({ ...prev, numero_nfp: e.target.value }))}
                                placeholder="000000"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Série *</Label>
                              <Input
                                value={formContraNota.serie_nfp}
                                onChange={e => setFormContraNota(prev => ({ ...prev, serie_nfp: e.target.value }))}
                                placeholder="1"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Data Emissão</Label>
                              <Input
                                type="date"
                                value={formContraNota.data_emissao_nfp}
                                onChange={e => setFormContraNota(prev => ({ ...prev, data_emissao_nfp: e.target.value }))}
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <Label>Chave de Acesso NFPe (44 dígitos) *</Label>
                            <Input
                              value={formContraNota.chave_acesso}
                              onChange={e => setFormContraNota(prev => ({ ...prev, chave_acesso: e.target.value.replace(/\D/g, '').slice(0, 44) }))}
                              placeholder="00000000000000000000000000000000000000000000"
                              maxLength={44}
                            />
                            <p className="text-xs text-muted-foreground">
                              {formContraNota.chave_acesso.length}/44 dígitos
                            </p>
                          </div>
                        )}
                      </CardContent>
                    )}
                  </Card>
                  ) : tipoProdutor === "socio" ? (
                    <Card className="border-dashed bg-muted/50">
                      <CardContent className="py-4">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <AlertCircle className="h-4 w-4" />
                          <span className="text-sm">
                            Contra-nota não aplicável para sócios (o sócio não pode ser emitente e destinatário da mesma nota)
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ) : null}

                  <Button 
                    onClick={handleConfirmarSaida}
                    disabled={!selectedPendente || formSaida.peso_tara <= 0 || updateColheitaSaida.isPending}
                    className="w-full"
                    variant="default"
                  >
                    {updateColheitaSaida.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4 mr-2" />
                    )}
                    {formContraNota.emitir ? "Confirmar Saída + Emitir Nota" : "Confirmar Saída"}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>

      {/* Dialog de Progresso da Emissão NF-e */}
      <Dialog open={isEmissionDialogOpen} onOpenChange={(open) => {
        if (!open && (emissionStatus.step === "success" || emissionStatus.step === "error")) {
          handleCloseEmissionDialog();
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {emissionStatus.step === "success" ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : emissionStatus.step === "error" ? (
                <XCircle className="h-5 w-5 text-red-500" />
              ) : (
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              )}
              Emissão de NF-e
            </DialogTitle>
            <DialogDescription>
              {emissionStatus.message}
            </DialogDescription>
          </DialogHeader>
          
          {/* Progress bar */}
          <div className="space-y-4 py-4">
            <Progress value={emissionStatus.progress} className="h-2" />
            
            {/* Steps visuais */}
            <div className="space-y-2">
              {[
                { step: "validating", label: "Validando dados" },
                { step: "creating", label: "Criando nota fiscal" },
                { step: "sending", label: "Enviando à SEFAZ" },
                { step: "processing", label: "Aguardando retorno" },
              ].map(({ step, label }) => {
                const status = getStepStatus(step as EmissionStep);
                return (
                  <div key={step} className="flex items-center gap-2">
                    {status === "completed" ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : status === "active" ? (
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    ) : status === "error" ? (
                      <XCircle className="h-4 w-4 text-red-500" />
                    ) : (
                      <div className="h-4 w-4 rounded-full border-2 border-muted" />
                    )}
                    <span className={cn(
                      "text-sm",
                      status === "active" && "font-medium text-primary",
                      status === "completed" && "text-green-600",
                      status === "error" && "text-red-500",
                      status === "pending" && "text-muted-foreground"
                    )}>
                      {label}
                    </span>
                  </div>
                );
              })}
            </div>
            
            {/* Alertas de sucesso/erro */}
            {emissionStatus.step === "success" && emissionStatus.chaveAcesso && (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertTitle className="text-green-800">NF-e Autorizada!</AlertTitle>
                <AlertDescription className="text-green-700 text-xs break-all">
                  Chave: {emissionStatus.chaveAcesso}
                  {emissionStatus.protocolo && <><br />Protocolo: {emissionStatus.protocolo}</>}
                </AlertDescription>
              </Alert>
            )}
            
            {emissionStatus.step === "error" && emissionStatus.details && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertTitle>Erro na Emissão</AlertTitle>
                <AlertDescription className="text-sm">
                  {emissionStatus.details}
                </AlertDescription>
              </Alert>
            )}
          </div>
          
          <DialogFooter>
            <Button 
              onClick={handleCloseEmissionDialog}
              disabled={emissionStatus.step !== "success" && emissionStatus.step !== "error"}
            >
              {emissionStatus.step === "success" || emissionStatus.step === "error" ? "Fechar" : "Aguarde..."}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
