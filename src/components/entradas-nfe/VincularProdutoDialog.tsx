import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useProdutos, useCreateProduto } from "@/hooks/useProdutos";
import { Search, Plus } from "lucide-react";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  xmlDescricao: string;
  xmlCodigo: string;
  xmlNcm: string;
  onVincular: (produtoId: string) => void;
}

export function VincularProdutoDialog({ open, onOpenChange, xmlDescricao, xmlCodigo, xmlNcm, onVincular }: Props) {
  const [busca, setBusca] = useState(xmlDescricao);
  const [criandoNovo, setCriandoNovo] = useState(false);
  const [novoNome, setNovoNome] = useState(xmlDescricao);
  const [novoCodFornecedor, setNovoCodFornecedor] = useState(xmlCodigo);
  const [novoNcm, setNovoNcm] = useState(xmlNcm);

  const { data: produtos } = useProdutos();
  const createProduto = useCreateProduto();

  const filtered = (produtos || []).filter((p: any) => {
    if (!busca) return true;
    const term = busca.toLowerCase();
    return (
      p.nome?.toLowerCase().includes(term) ||
      p.codigo?.toLowerCase().includes(term) ||
      p.cod_fornecedor?.toLowerCase().includes(term) ||
      p.ncm?.includes(term)
    );
  });

  const handleCriarNovo = async () => {
    if (!novoNome.trim()) { toast.error('Nome é obrigatório.'); return; }
    try {
      const data = await createProduto.mutateAsync({
        nome: novoNome,
        tipo: 'insumo',
        cod_fornecedor: novoCodFornecedor || null,
        ncm: novoNcm || null,
        codigo: null,
        descricao: `Importado do XML - Cód: ${xmlCodigo}`,
        unidade_medida_id: null,
        estoque_minimo: null,
        estoque_atual: null,
        preco_custo: null,
        preco_venda: null,
        fornecedor_id: null,
        ativo: true,
        granja_id: null,
        codigo_barras: null,
        grupo: null,
        artigo_nfe: null,
        preco_prazo: null,
        estoque_maximo: null,
        tempo_maximo: null,
        qtd_venda: null,
        peso_saco: null,
        produto_residuo_id: null,
        cst_pis: null,
        cst_cofins: null,
        cst_icms: null,
        cst_ipi: null,
        natureza_receita: null,
        observacao_tributaria: null,
        cst_ibs: null,
        cst_cbs: null,
        cst_is: null,
        cclass_trib_ibs: null,
        cclass_trib_cbs: null,
      });
      onVincular(data.id);
      toast.success('Produto criado e vinculado!');
    } catch {}
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Vincular Produto</DialogTitle>
          <DialogDescription>
            Produto do XML: <strong>{xmlDescricao}</strong> | Código: <strong>{xmlCodigo}</strong> | NCM: <strong>{xmlNcm}</strong>
          </DialogDescription>
        </DialogHeader>

        {!criandoNovo ? (
          <>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar produto..." value={busca} onChange={(e) => setBusca(e.target.value)} className="pl-10" />
            </div>

            <ScrollArea className="max-h-64">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead>NCM</TableHead>
                    <TableHead className="w-20" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.slice(0, 20).map((p: any) => (
                    <TableRow key={p.id} className="cursor-pointer hover:bg-accent" onClick={() => onVincular(p.id)}>
                      <TableCell className="font-medium">{p.nome}</TableCell>
                      <TableCell>{p.codigo || p.cod_fornecedor || '-'}</TableCell>
                      <TableCell>{p.ncm || '-'}</TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); onVincular(p.id); }}>Vincular</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-4 text-muted-foreground">Nenhum produto encontrado</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </ScrollArea>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setCriandoNovo(true)}>
                <Plus className="h-4 w-4 mr-1" /> Criar Produto Novo
              </Button>
              <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
            </div>
          </>
        ) : (
          <div className="space-y-4">
            <div>
              <Label>Nome do Produto *</Label>
              <Input value={novoNome} onChange={(e) => setNovoNome(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Código Fornecedor</Label>
                <Input value={novoCodFornecedor} onChange={(e) => setNovoCodFornecedor(e.target.value)} />
              </div>
              <div>
                <Label>NCM</Label>
                <Input value={novoNcm} onChange={(e) => setNovoNcm(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCriandoNovo(false)}>Voltar</Button>
              <Button onClick={handleCriarNovo} disabled={createProduto.isPending}>
                {createProduto.isPending ? 'Criando...' : 'Criar e Vincular'}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
