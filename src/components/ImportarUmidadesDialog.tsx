import { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Upload, FileSpreadsheet, Check, AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import * as XLSX from 'xlsx';

interface CulturaInfo {
  codigo: string;
  existingId: string | null;
  existingName: string | null;
  willCreate: boolean;
}

interface ImportRow {
  cultura_codigo: string;
  umidade_minima: number;
  umidade_maxima: number;
  desconto_percentual: number;
  melhoria_ph: number;
}

interface ImportarUmidadesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ImportarUmidadesDialog({ open, onOpenChange }: ImportarUmidadesDialogProps) {
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ImportRow[]>([]);
  const [culturas, setCulturas] = useState<CulturaInfo[]>([]);
  const [clearExisting, setClearExisting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isParsing, setIsParsing] = useState(false);

  const resetState = () => {
    setFile(null);
    setParsedData([]);
    setCulturas([]);
    setClearExisting(false);
    setIsLoading(false);
    setIsParsing(false);
  };

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setIsParsing(true);

    try {
      const data = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet);

      // Parse rows
      const rows: ImportRow[] = jsonData.map((row) => ({
        cultura_codigo: String(row['um_produto'] || row['UM_PRODUTO'] || ''),
        umidade_minima: parseFloat(row['um_umid1'] || row['UM_UMID1'] || 0),
        umidade_maxima: parseFloat(row['um_umid2'] || row['UM_UMID2'] || 0),
        desconto_percentual: parseFloat(row['um_desc'] || row['UM_DESC'] || 0),
        melhoria_ph: parseFloat(row['um_melph'] || row['UM_MELPH'] || 0),
      }));

      setParsedData(rows);

      // Get unique culture codes
      const uniqueCodes = [...new Set(rows.map((r) => r.cultura_codigo).filter(Boolean))];

      // Check existing cultures
      const { data: existingCulturas } = await supabase
        .from('culturas')
        .select('id, codigo, nome');

      const culturaInfos: CulturaInfo[] = uniqueCodes.map((codigo) => {
        const existing = existingCulturas?.find((c) => c.codigo === codigo);
        return {
          codigo,
          existingId: existing?.id || null,
          existingName: existing?.nome || null,
          willCreate: !existing,
        };
      });

      setCulturas(culturaInfos);
    } catch (error) {
      console.error('Error parsing file:', error);
      toast.error('Erro ao ler o arquivo Excel');
    } finally {
      setIsParsing(false);
    }
  }, []);

  const handleImport = async () => {
    if (parsedData.length === 0) {
      toast.error('Nenhum dado para importar');
      return;
    }

    setIsLoading(true);

    try {
      // Step 1: Create missing cultures
      const culturasToCreate = culturas.filter((c) => c.willCreate);
      const culturaIdMap: Record<string, string> = {};

      // Add existing cultures to map
      culturas.filter((c) => !c.willCreate).forEach((c) => {
        if (c.existingId) culturaIdMap[c.codigo] = c.existingId;
      });

      // Create new cultures
      for (const cultura of culturasToCreate) {
        const { data: newCultura, error } = await supabase
          .from('culturas')
          .insert({
            codigo: cultura.codigo,
            nome: `Cultura (Código ${cultura.codigo})`,
            ativa: true,
          })
          .select('id')
          .single();

        if (error) throw error;
        culturaIdMap[cultura.codigo] = newCultura.id;
      }

      // Step 2: Clear existing data if requested
      if (clearExisting) {
        const { error } = await supabase.from('tabela_umidades').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        if (error) throw error;
      }

      // Step 3: Insert humidity records in batches
      const batchSize = 100;
      for (let i = 0; i < parsedData.length; i += batchSize) {
        const batch = parsedData.slice(i, i + batchSize).map((row) => ({
          cultura_id: culturaIdMap[row.cultura_codigo] || null,
          umidade_minima: row.umidade_minima,
          umidade_maxima: row.umidade_maxima,
          desconto_percentual: row.desconto_percentual,
          melhoria_ph: row.melhoria_ph,
          ativa: true,
        }));

        const { error } = await supabase.from('tabela_umidades').insert(batch);
        if (error) throw error;
      }

      await queryClient.invalidateQueries({ queryKey: ['tabela_umidades'] });
      await queryClient.invalidateQueries({ queryKey: ['culturas'] });

      toast.success(`Importação concluída! ${parsedData.length} registros importados.`);
      onOpenChange(false);
      resetState();
    } catch (error: any) {
      console.error('Import error:', error);
      toast.error('Erro na importação: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const existingCount = culturas.filter((c) => !c.willCreate).length;
  const newCount = culturas.filter((c) => c.willCreate).length;

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) resetState(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            Importar Tabela de Umidades do Excel
          </DialogTitle>
          <DialogDescription>
            Selecione um arquivo Excel (.xlsx, .xls) com os dados de umidade
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          {/* File Upload */}
          <div className="space-y-2">
            <Label>Arquivo Excel</Label>
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
              <Input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                {isParsing ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <span className="text-sm text-muted-foreground">Processando arquivo...</span>
                  </div>
                ) : file ? (
                  <div className="flex flex-col items-center gap-2">
                    <FileSpreadsheet className="h-8 w-8 text-green-500" />
                    <span className="text-sm font-medium">{file.name}</span>
                    <span className="text-xs text-muted-foreground">Clique para trocar</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="h-8 w-8 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      Arraste ou clique para selecionar
                    </span>
                  </div>
                )}
              </label>
            </div>
          </div>

          {/* Cultures Found */}
          {culturas.length > 0 && (
            <Card>
              <CardContent className="pt-4">
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  Culturas Encontradas
                  <Badge variant="outline">{culturas.length}</Badge>
                </h4>
                <ScrollArea className="h-[150px]">
                  <div className="space-y-2">
                    {culturas.map((c) => (
                      <div key={c.codigo} className="flex items-center justify-between text-sm p-2 rounded bg-muted/50">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">Código: {c.codigo}</Badge>
                          <span>{c.existingName || `Cultura (Código ${c.codigo})`}</span>
                        </div>
                        {c.willCreate ? (
                          <Badge variant="outline" className="text-amber-600 border-amber-600">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Será criada
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-green-600 border-green-600">
                            <Check className="h-3 w-3 mr-1" />
                            Já existe
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}

          {/* Preview */}
          {parsedData.length > 0 && (
            <Card>
              <CardContent className="pt-4">
                <h4 className="font-medium mb-3">Pré-visualização (primeiros 10 registros)</h4>
                <ScrollArea className="h-[200px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Cultura</TableHead>
                        <TableHead className="text-right">Umid. Mín</TableHead>
                        <TableHead className="text-right">Umid. Máx</TableHead>
                        <TableHead className="text-right">Desconto</TableHead>
                        <TableHead className="text-right">Melhoria PH</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parsedData.slice(0, 10).map((row, idx) => (
                        <TableRow key={idx}>
                          <TableCell>
                            <Badge variant="secondary">{row.cultura_codigo}</Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono">{row.umidade_minima.toFixed(2)}%</TableCell>
                          <TableCell className="text-right font-mono">{row.umidade_maxima.toFixed(2)}%</TableCell>
                          <TableCell className="text-right font-mono">{row.desconto_percentual.toFixed(2)}%</TableCell>
                          <TableCell className="text-right font-mono">{row.melhoria_ph.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          )}

          {/* Summary & Options */}
          {parsedData.length > 0 && (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                <strong>{parsedData.length}</strong> registros | <strong>{existingCount}</strong> culturas existentes | <strong>{newCount}</strong> culturas a criar
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={clearExisting}
                  onCheckedChange={setClearExisting}
                  id="clear-existing"
                />
                <Label htmlFor="clear-existing" className="text-sm">
                  Limpar dados de umidade existentes antes de importar
                </Label>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => { onOpenChange(false); resetState(); }}>
            Cancelar
          </Button>
          <Button
            onClick={handleImport}
            disabled={parsedData.length === 0 || isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Importando...
              </>
            ) : (
              `Importar ${parsedData.length} registros`
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}