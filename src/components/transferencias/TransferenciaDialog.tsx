import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Check, ChevronsUpDown, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useSafras } from "@/hooks/useSafras";
import { useSilos } from "@/hooks/useSilos";
import { useProdutos } from "@/hooks/useProdutos";
import { useAllInscricoes, InscricaoComProdutor } from "@/hooks/useAllInscricoes";
import { useLocaisEntrega } from "@/hooks/useLocaisEntrega";
import { useSaldoProdutor } from "@/hooks/useSaldoProdutor";
import { useCreateTransferenciaDeposito, useUpdateTransferenciaDeposito, TransferenciaDeposito } from "@/hooks/useTransferenciasDeposito";
import { formatNumber } from "@/lib/formatters";
import { toast } from "@/hooks/use-toast";

interface TransferenciaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transferencia?: TransferenciaDeposito | null;
}

export function TransferenciaDialog({ open, onOpenChange, transferencia }: TransferenciaDialogProps) {
  const [dataTransferencia, setDataTransferencia] = useState<Date | undefined>(undefined);
  const [safraId, setSafraId] = useState("");
  const [produtoId, setProdutoId] = useState("");
  const [siloId, setSiloId] = useState("");
  const [inscricaoOrigemId, setInscricaoOrigemId] = useState("");
  const [localSaidaId, setLocalSaidaId] = useState("");
  const [inscricaoDestinoId, setInscricaoDestinoId] = useState("");
  const [localEntradaId, setLocalEntradaId] = useState("");
  const [quantidadeKg, setQuantidadeKg] = useState("");
  const [observacoes, setObservacoes] = useState("");

  const [origemOpen, setOrigemOpen] = useState(false);
  const [destinoOpen, setDestinoOpen] = useState(false);
  const [origemSearch, setOrigemSearch] = useState("");
  const [destinoSearch, setDestinoSearch] = useState("");

  const { data: safras = [] } = useSafras();
  const { data: silos = [] } = useSilos();
  const { data: produtos = [] } = useProdutos();
  const { data: todasInscricoes = [] } = useAllInscricoes();
  const { data: locaisEntrega = [] } = useLocaisEntrega();

  const { data: saldoOrigem } = useSaldoProdutor({
    inscricaoProdutorId: inscricaoOrigemId,
    safraId,
    produtoId,
  });

  const createTransferencia = useCreateTransferenciaDeposito();
  const updateTransferencia = useUpdateTransferenciaDeposito();

  const isEditing = !!transferencia;

  useEffect(() => {
    if (transferencia) {
      setDataTransferencia(new Date(transferencia.data_transferencia));
      setSafraId(transferencia.safra_id || "");
      setProdutoId(transferencia.produto_id || "");
      setSiloId(transferencia.silo_id || "");
      setInscricaoOrigemId(transferencia.inscricao_origem_id || "");
      setLocalSaidaId(transferencia.local_saida_id || "");
      setInscricaoDestinoId(transferencia.inscricao_destino_id || "");
      setLocalEntradaId(transferencia.local_entrada_id || "");
      setQuantidadeKg(String(transferencia.quantidade_kg || ""));
      setObservacoes(transferencia.observacoes || "");
    } else {
      resetForm();
    }
  }, [transferencia, open]);

  const resetForm = () => {
    setDataTransferencia(new Date());
    setSafraId("");
    setProdutoId("");
    setSiloId("");
    setInscricaoOrigemId("");
    setLocalSaidaId("");
    setInscricaoDestinoId("");
    setLocalEntradaId("");
    setQuantidadeKg("");
    setObservacoes("");
    setOrigemSearch("");
    setDestinoSearch("");
  };

  const getInscricaoLabel = (inscricao: InscricaoComProdutor) => {
    const produtorNome = inscricao.produtores?.nome || "";
    const ie = inscricao.inscricao_estadual || "";
    const granja = inscricao.granjas?.razao_social || "";
    
    let label = produtorNome;
    if (ie) label += ` (IE: ${ie})`;
    if (granja) label += ` - ${granja}`;
    return label || ie || "Sem nome";
  };

  const filteredInscricoesOrigem = todasInscricoes.filter((i) => {
    const label = getInscricaoLabel(i).toLowerCase();
    return label.includes(origemSearch.toLowerCase());
  });

  const filteredInscricoesDestino = todasInscricoes.filter((i) => {
    const label = getInscricaoLabel(i).toLowerCase();
    return label.includes(destinoSearch.toLowerCase());
  });

  const selectedOrigemLabel = inscricaoOrigemId 
    ? getInscricaoLabel(todasInscricoes.find(i => i.id === inscricaoOrigemId)!)
    : "Selecione a inscrição...";

  const selectedDestinoLabel = inscricaoDestinoId 
    ? getInscricaoLabel(todasInscricoes.find(i => i.id === inscricaoDestinoId)!)
    : "Selecione a inscrição...";

  const handleSubmit = async () => {
    if (!dataTransferencia || !safraId || !produtoId || !inscricaoOrigemId || !inscricaoDestinoId || !localSaidaId || !localEntradaId || !quantidadeKg) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    if (inscricaoOrigemId === inscricaoDestinoId) {
      toast({
        title: "Erro",
        description: "A inscrição de origem deve ser diferente da inscrição de destino.",
        variant: "destructive",
      });
      return;
    }

    const quantidade = parseFloat(quantidadeKg);
    
    // Validar saldo apenas para nova transferência ou se mudou origem/quantidade
    if (!isEditing && saldoOrigem && quantidade > saldoOrigem.saldo) {
      toast({
        title: "Saldo insuficiente",
        description: `Saldo disponível: ${formatNumber(saldoOrigem.saldo)} kg`,
        variant: "destructive",
      });
      return;
    }

    const inscricaoOrigem = todasInscricoes.find(i => i.id === inscricaoOrigemId);
    const inscricaoDestino = todasInscricoes.find(i => i.id === inscricaoDestinoId);

    const data = {
      data_transferencia: format(dataTransferencia, "yyyy-MM-dd"),
      granja_origem_id: inscricaoOrigem?.granja_id || null,
      inscricao_origem_id: inscricaoOrigemId,
      granja_destino_id: inscricaoDestino?.granja_id || null,
      inscricao_destino_id: inscricaoDestinoId,
      safra_id: safraId,
      produto_id: produtoId,
      silo_id: siloId || null,
      quantidade_kg: quantidade,
      observacoes: observacoes || null,
      local_saida_id: localSaidaId,
      local_entrada_id: localEntradaId,
    };

    if (isEditing && transferencia) {
      await updateTransferencia.mutateAsync({ id: transferencia.id, ...data });
    } else {
      await createTransferencia.mutateAsync(data);
    }

    onOpenChange(false);
    resetForm();
  };

  const isPending = createTransferencia.isPending || updateTransferencia.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Transferência" : "Nova Transferência"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Linha 1: Data, Safra, Produto, Silo */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Data *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dataTransferencia && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dataTransferencia ? format(dataTransferencia, "dd/MM/yyyy") : "Selecione"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dataTransferencia}
                    onSelect={setDataTransferencia}
                    locale={ptBR}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Safra *</Label>
              <Select value={safraId} onValueChange={setSafraId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {safras.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Produto *</Label>
              <Select value={produtoId} onValueChange={setProdutoId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {produtos.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Silo</Label>
              <Select value={siloId || "__none__"} onValueChange={(v) => setSiloId(v === "__none__" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Nenhum" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Nenhum</SelectItem>
                  {silos.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* SAÍDA (Origem) */}
          <div className="space-y-3 p-4 rounded-lg border bg-muted/30">
            <h4 className="font-medium text-sm text-muted-foreground">SAÍDA (Origem)</h4>
            
            <div className="space-y-2">
              <Label>Inscrição *</Label>
              <Popover open={origemOpen} onOpenChange={setOrigemOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={origemOpen}
                    className="w-full justify-between font-normal"
                  >
                    <span className="truncate">{selectedOrigemLabel}</span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0" align="start">
                  <Command>
                    <CommandInput 
                      placeholder="Buscar por nome do produtor..." 
                      value={origemSearch}
                      onValueChange={setOrigemSearch}
                    />
                    <CommandList>
                      <CommandEmpty>Nenhuma inscrição encontrada.</CommandEmpty>
                      <CommandGroup>
                        {filteredInscricoesOrigem.map((i) => (
                          <CommandItem
                            key={i.id}
                            value={i.id}
                            onSelect={() => {
                              setInscricaoOrigemId(i.id);
                              setOrigemOpen(false);
                              setOrigemSearch("");
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                inscricaoOrigemId === i.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <span className="truncate">{getInscricaoLabel(i)}</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              
              {safraId && produtoId && inscricaoOrigemId && saldoOrigem && (
                <p className="text-sm text-muted-foreground">
                  Saldo disponível: <span className="font-medium text-foreground">{formatNumber(saldoOrigem.saldo)} kg</span>
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Local de Saída *</Label>
              <Select value={localSaidaId} onValueChange={setLocalSaidaId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o local" />
                </SelectTrigger>
                <SelectContent>
                  {locaisEntrega.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.nome} {l.cidade ? `- ${l.cidade}/${l.uf}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Seta */}
          <div className="flex justify-center">
            <ArrowDown className="h-6 w-6 text-muted-foreground" />
          </div>

          {/* ENTRADA (Destino) */}
          <div className="space-y-3 p-4 rounded-lg border bg-muted/30">
            <h4 className="font-medium text-sm text-muted-foreground">ENTRADA (Destino)</h4>
            
            <div className="space-y-2">
              <Label>Inscrição *</Label>
              <Popover open={destinoOpen} onOpenChange={setDestinoOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={destinoOpen}
                    className="w-full justify-between font-normal"
                  >
                    <span className="truncate">{selectedDestinoLabel}</span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0" align="start">
                  <Command>
                    <CommandInput 
                      placeholder="Buscar por nome do produtor..." 
                      value={destinoSearch}
                      onValueChange={setDestinoSearch}
                    />
                    <CommandList>
                      <CommandEmpty>Nenhuma inscrição encontrada.</CommandEmpty>
                      <CommandGroup>
                        {filteredInscricoesDestino.map((i) => (
                          <CommandItem
                            key={i.id}
                            value={i.id}
                            onSelect={() => {
                              setInscricaoDestinoId(i.id);
                              setDestinoOpen(false);
                              setDestinoSearch("");
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                inscricaoDestinoId === i.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <span className="truncate">{getInscricaoLabel(i)}</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Local de Entrada *</Label>
              <Select value={localEntradaId} onValueChange={setLocalEntradaId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o local" />
                </SelectTrigger>
                <SelectContent>
                  {locaisEntrega.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.nome} {l.cidade ? `- ${l.cidade}/${l.uf}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Quantidade (kg) *</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={quantidadeKg}
                onChange={(e) => setQuantidadeKg(e.target.value)}
                placeholder="0,00"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Observações adicionais..."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
