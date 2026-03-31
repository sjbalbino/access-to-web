import { useState, useCallback, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Upload, FileSpreadsheet, Loader2, AlertTriangle, CheckCircle2, XCircle, ChevronsUpDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import * as XLSX from 'xlsx';
import { TableConfig, transformRow, resolveReferences } from '@/lib/importacaoConfig';

interface ImportacaoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: TableConfig;
  tenantId?: string;
  onImportComplete?: (count: number) => void;
}

type ImportStatus = 'idle' | 'parsing' | 'previewing' | 'importing' | 'done' | 'error';

interface SubCentroComboboxProps {
  value: string;
  onChange: (val: string) => void;
  subCentros: { id: string; descricao: string; centro_nome: string }[];
}

function SubCentroCombobox({ value, onChange, subCentros }: SubCentroComboboxProps) {
  const [open, setOpen] = useState(false);
  const selected = subCentros.find(s => s.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={open} className="h-8 w-[280px] justify-between text-xs font-normal">
          {selected ? (
            <span className="truncate">{selected.centro_nome ? `${selected.centro_nome} → ` : ''}{selected.descricao}</span>
          ) : (
            <span className="text-muted-foreground">Selecione...</span>
          )}
          <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Pesquisar sub-centro..." className="text-xs" />
          <CommandList>
            <CommandEmpty className="text-xs py-4 text-center">Nenhum encontrado.</CommandEmpty>
            <CommandGroup>
              {subCentros.map(sub => (
                <CommandItem
                  key={sub.id}
                  value={`${sub.centro_nome} ${sub.descricao}`}
                  onSelect={() => { onChange(sub.id); setOpen(false); }}
                  className="text-xs"
                >
                  <Check className={cn("mr-2 h-3 w-3", value === sub.id ? "opacity-100" : "opacity-0")} />
                  {sub.centro_nome ? <span className="text-muted-foreground mr-1">{sub.centro_nome} →</span> : null}
                  {sub.descricao}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export function ImportacaoDialog({ open, onOpenChange, config, tenantId, onImportComplete }: ImportacaoDialogProps) {
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [rawData, setRawData] = useState<Record<string, any>[]>([]);
  const [transformedData, setTransformedData] = useState<Record<string, any>[]>([]);
  const [transformErrors, setTransformErrors] = useState<string[]>([]);
  const [referenceErrors, setReferenceErrors] = useState<string[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [clearExisting, setClearExisting] = useState(false);
  const [status, setStatus] = useState<ImportStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [importedCount, setImportedCount] = useState(0);
  const [excelColumns, setExcelColumns] = useState<string[]>([]);
  const [contaGerencialMap, setContaGerencialMap] = useState<Record<number, string>>({});
  const [subCentros, setSubCentros] = useState<{ id: string; descricao: string; centro_nome: string }[]>([]);

  const needsContaGerencial = config.interactiveColumns?.includes('conta_gerencial_id');

  const normalize = (s: string) =>
    s.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // Auto-match sub-centros by name
  useEffect(() => {
    if (!needsContaGerencial || transformedData.length === 0 || subCentros.length === 0) return;
    const autoMap: Record<number, string> = {};
    transformedData.forEach((row, idx) => {
      const nome = normalize(String(row.nome ?? ''));
      if (!nome) return;
      const match = subCentros.find(s => normalize(s.descricao) === nome);
      if (match) autoMap[idx] = match.id;
    });
    if (Object.keys(autoMap).length > 0) {
      setContaGerencialMap(prev => ({ ...autoMap, ...prev }));
    }
  }, [transformedData, subCentros, needsContaGerencial]);

  useEffect(() => {
    if (open && needsContaGerencial) {
      supabase
        .from('sub_centros_custo' as any)
        .select('id, descricao, centro_custo_id')
        .order('descricao')
        .then(async ({ data: subs }) => {
          if (!subs) return;
          // Fetch parent names
          const centroIds = [...new Set((subs as any[]).map((s: any) => s.centro_custo_id))];
          const { data: centros } = await supabase
            .from('plano_contas_gerencial')
            .select('id, descricao')
            .in('id', centroIds);
          const centroMap = new Map((centros || []).map((c: any) => [c.id, c.descricao]));
          setSubCentros((subs as any[]).map((s: any) => ({
            id: s.id,
            descricao: s.descricao,
            centro_nome: centroMap.get(s.centro_custo_id) || '',
          })));
        });
    }
  }, [open, needsContaGerencial]);

  const resetState = () => {
    setFile(null);
    setRawData([]);
    setTransformedData([]);
    setTransformErrors([]);
    setReferenceErrors([]);
    setImportErrors([]);
    setClearExisting(false);
    setStatus('idle');
    setProgress(0);
    setImportedCount(0);
    setExcelColumns([]);
    setContaGerencialMap({});
  };

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setStatus('parsing');

    try {
      const data = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet);

      if (jsonData.length === 0) {
        toast.error('Planilha vazia');
        setStatus('idle');
        return;
      }

      setExcelColumns(Object.keys(jsonData[0]));
      setRawData(jsonData);

      // Transform rows
      const allErrors: string[] = [];
      const transformed = jsonData.map((row, idx) => {
        const { data: tData, errors } = transformRow(row, config.columns);
        errors.forEach(e => allErrors.push(`Linha ${idx + 1}: ${e}`));
        return tData;
      });

      setTransformErrors(allErrors);

      // Resolve references if any
      if (config.references && config.references.length > 0) {
        const { resolved, errors: refErrors } = await resolveReferences(config.references, transformed);
        
        // Composite lookup: controle_lavoura_id + lavoura_id for colheitas (via safra_codigo)
        if (config.key === 'colheitas') {
          const compositeErrors: string[] = [];
          
          // Buscar controle_lavouras e safras para construir cache por safra_codigo
          const [{ data: controles }, { data: safras }] = await Promise.all([
            supabase.from('controle_lavouras').select('id, safra_id, lavoura_id'),
            supabase.from('safras').select('id, codigo'),
          ]);
          
          // Mapear safra_id → safra_codigo (normalizado)
          const safraIdToCodigo = new Map<string, string>();
          (safras || []).forEach((s: any) => {
            if (s.codigo) {
              const norm = String(s.codigo).replace(/^0+/, '') || s.codigo;
              safraIdToCodigo.set(s.id, norm);
            }
          });
          
          // Cache: safra_codigo → { controle_id, lavoura_id }
          // Se houver múltiplos controles para a mesma safra, usa o primeiro encontrado
          const ctrlMap = new Map<string, { controle_id: string; lavoura_id: string }>();
          (controles || []).forEach((c: any) => {
            const safraCodigo = safraIdToCodigo.get(c.safra_id);
            if (safraCodigo && !ctrlMap.has(safraCodigo)) {
              ctrlMap.set(safraCodigo, { controle_id: c.id, lavoura_id: c.lavoura_id });
            }
          });

          for (let i = 0; i < resolved.length; i++) {
            const row = resolved[i];
            // Usar o valor original da planilha (safra_codigo) para buscar
            const safraCodigo = String(jsonData[i]?.['safra_codigo'] || '').trim().replace(/^0+/, '');
            if (safraCodigo) {
              const match = ctrlMap.get(safraCodigo);
              if (match) {
                row.controle_lavoura_id = match.controle_id;
                row.lavoura_id = match.lavoura_id;
              } else {
                compositeErrors.push(`Linha ${i + 1}: Controle de Lavoura não encontrado para safra código "${safraCodigo}"`);
              }
            }
          }
          
          setReferenceErrors([...refErrors, ...compositeErrors]);
        } else {
          setReferenceErrors(refErrors);
        }
        
        setTransformedData(resolved);
      } else {
        setTransformedData(transformed);
      }

      setStatus('previewing');
    } catch (error: any) {
      console.error('Error parsing file:', error);
      toast.error('Erro ao ler o arquivo: ' + error.message);
      setStatus('error');
    }
  }, [config]);

  const handleImport = async () => {
    if (transformedData.length === 0) return;

    setStatus('importing');
    setProgress(0);
    setImportErrors([]);
    let imported = 0;

    try {
      // UPDATE MODE: lookup by code and update fields
      if (config.updateMode) {
        const { lookupColumn, sourceColumn, updateColumns } = config.updateMode;
        const errors: string[] = [];

        for (let i = 0; i < transformedData.length; i++) {
          const row = transformedData[i];
          const lookupValue = row[sourceColumn];

          if (!lookupValue) {
            errors.push(`Linha ${i + 1}: ${sourceColumn} vazio, ignorada`);
            setProgress(Math.round(((i + 1) / transformedData.length) * 100));
            continue;
          }

          // Find existing record
          const { data: existing, error: findErr } = await (supabase
            .from(config.tableName as any)
            .select('id') as any)
            .eq(lookupColumn, lookupValue)
            .limit(1);

          if (findErr) {
            errors.push(`Linha ${i + 1}: Erro ao buscar: ${findErr.message}`);
            setProgress(Math.round(((i + 1) / transformedData.length) * 100));
            continue;
          }

          if (!existing || existing.length === 0) {
            errors.push(`Linha ${i + 1}: ${lookupColumn}="${lookupValue}" não encontrado`);
            setProgress(Math.round(((i + 1) / transformedData.length) * 100));
            continue;
          }

          // Build update payload
          const updatePayload: Record<string, any> = {};
          for (const uc of updateColumns) {
            updatePayload[uc.dbColumn] = row[uc.sourceColumn] ?? null;
          }

          const { error: updateErr } = await (supabase
            .from(config.tableName as any)
            .update(updatePayload as any) as any)
            .eq('id', (existing[0] as any).id);

          if (updateErr) {
            errors.push(`Linha ${i + 1}: Erro ao atualizar: ${updateErr.message}`);
          } else {
            imported++;
          }

          setProgress(Math.round(((i + 1) / transformedData.length) * 100));
          setImportedCount(imported);
        }

        setImportErrors(errors);

        if (errors.length === 0) {
          toast.success(`${imported} registros atualizados com sucesso!`);
        } else {
          toast.warning(`Atualização parcial: ${imported} atualizados, ${errors.length} erros`);
        }

        await queryClient.invalidateQueries({ queryKey: [config.key] });
        await queryClient.invalidateQueries({ queryKey: [config.tableName] });
        if (imported > 0) {
          onImportComplete?.(imported);
        }
        setStatus('done');
        return;
      }

      // STANDARD INSERT MODE
      // Clear existing if requested
      if (clearExisting) {
        const { error } = await supabase
          .from(config.tableName as any)
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000');
        if (error) throw error;
      }

      // Filter out rows that had reference errors (keep only clean rows)
      const cleanRows = transformedData.filter((_, idx) => {
        return !referenceErrors.some(e => e.startsWith(`Linha ${idx + 1}:`));
      });

      // Remove extra columns not in the mapping or references
      const validDbColumns = new Set(config.columns.map(c => c.dbName));
      if (config.references) {
        config.references.forEach(r => validDbColumns.add(r.dbColumn));
      }
      if (config.interactiveColumns) {
        config.interactiveColumns.forEach(c => validDbColumns.add(c));
      }

      const sanitizedRows = cleanRows.map((row, idx) => {
        const clean: Record<string, any> = {};
        for (const [key, value] of Object.entries(row)) {
          if (validDbColumns.has(key)) {
            clean[key] = value;
          }
        }
        // Inject tenant_id for granjas table
        if (config.tableName === 'granjas' && tenantId) {
          clean['tenant_id'] = tenantId;
        }
        // Inject interactive conta_gerencial_id
        if (needsContaGerencial && contaGerencialMap[idx]) {
          clean['conta_gerencial_id'] = contaGerencialMap[idx];
        }
        return clean;
      });

      // Batch insert
      const batchSize = 100;
      const errors: string[] = [];

      for (let i = 0; i < sanitizedRows.length; i += batchSize) {
        const batch = sanitizedRows.slice(i, i + batchSize);
        const { error } = await supabase.from(config.tableName as any).insert(batch as any);

        if (error) {
          // Fallback: try inserting each row individually
          for (let j = 0; j < batch.length; j++) {
            const { error: rowErr } = await supabase.from(config.tableName as any).insert(batch[j] as any);
            if (rowErr) {
              errors.push(`Linha ${i + j + 1}: ${rowErr.message}`);
            } else {
              imported++;
            }
          }
        } else {
          imported += batch.length;
        }

        setProgress(Math.round(((i + batchSize) / sanitizedRows.length) * 100));
        setImportedCount(imported);
      }

      // Post-insert: resolve self-references (e.g. produto_residuo_id)
      const selfRefs = config.references?.filter(r => r.selfReference) || [];
      if (selfRefs.length > 0 && imported > 0) {
        for (const ref of selfRefs) {
          // Build lookup map: codigo -> id from just-inserted records
          const { data: insertedRecords } = await (supabase
            .from(config.tableName as any)
            .select('*') as any);
          
          if (insertedRecords) {
            const codeToId: Record<string, string> = {};
            (insertedRecords as any[]).forEach((r: any) => {
              const key = String(r[ref.lookupColumn] || '').trim();
              if (key) {
                codeToId[key] = r.id;
                codeToId[key.toLowerCase()] = r.id;
              }
            });

            // Update records that have self-reference values
            for (const row of cleanRows) {
              const sourceVal = String(row[ref.sourceColumn] || '').trim();
              if (!sourceVal || sourceVal === '0' || sourceVal === '') continue;
              const targetId = codeToId[sourceVal] || codeToId[sourceVal.toLowerCase()];
              const rowCode = String(row.codigo || '').trim();
              if (targetId && rowCode) {
                await (supabase
                  .from(config.tableName as any)
                  .update({ [ref.dbColumn]: targetId } as any) as any)
                  .eq('codigo', rowCode);
              }
            }
          }
        }
      }

      setImportErrors(errors);

      if (errors.length === 0) {
        toast.success(`${imported} registros importados com sucesso!`);
      } else {
        toast.warning(`Importação parcial: ${imported} importados, ${errors.length} erros`);
      }

      await queryClient.invalidateQueries({ queryKey: [config.key] });
      await queryClient.invalidateQueries({ queryKey: [config.tableName] });
      if (imported > 0) {
        onImportComplete?.(imported);
      }
      setStatus('done');
    } catch (error: any) {
      toast.error('Erro na importação: ' + error.message);
      setImportErrors([error.message]);
      setStatus('error');
    }
  };

  const totalErrors = transformErrors.length + referenceErrors.length;
  const previewColumns = config.columns.slice(0, 6);

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) resetState(); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            Importar {config.label}
          </DialogTitle>
          <DialogDescription>{config.description}</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          {/* File Upload */}
          {(status === 'idle' || status === 'parsing') && (
            <div className="space-y-2">
              <Label>Arquivo Excel (.xlsx)</Label>
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                <Input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileChange}
                  className="hidden"
                  id={`file-upload-${config.key}`}
                />
                <label htmlFor={`file-upload-${config.key}`} className="cursor-pointer">
                  {status === 'parsing' ? (
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      <span className="text-sm text-muted-foreground">Processando arquivo...</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <Upload className="h-8 w-8 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Clique para selecionar o arquivo</span>
                    </div>
                  )}
                </label>
              </div>

              {/* Expected columns hint */}
              <div className="text-xs text-muted-foreground">
                <strong>Colunas esperadas:</strong>{' '}
                {config.columns.map(c => c.accessName).join(', ')}
                {config.references && config.references.length > 0 && (
                  <>, {config.references.map(r => r.sourceColumn).join(', ')}</>
                )}
              </div>
            </div>
          )}

          {/* Excel columns found */}
          {excelColumns.length > 0 && status === 'previewing' && (
            <Card>
              <CardContent className="pt-4">
                <h4 className="font-medium mb-2 text-sm">Colunas encontradas no Excel:</h4>
                <div className="flex flex-wrap gap-1">
                  {excelColumns.map(col => {
                    const mapped = config.columns.some(c =>
                      c.accessName === col || c.accessName.toUpperCase() === col || c.accessName.toLowerCase() === col
                    ) || config.references?.some(r =>
                      r.sourceColumn === col || r.sourceColumn.toUpperCase() === col
                    );
                    return (
                      <Badge key={col} variant={mapped ? 'default' : 'outline'} className="text-xs">
                        {col}
                      </Badge>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Errors summary */}
          {totalErrors > 0 && status === 'previewing' && (
            <Card className="border-warning">
              <CardContent className="pt-4">
                <h4 className="font-medium mb-2 flex items-center gap-2 text-warning">
                  <AlertTriangle className="h-4 w-4" />
                  {totalErrors} aviso(s) encontrado(s)
                </h4>
                <ScrollArea className="max-h-[120px]">
                  <ul className="text-xs space-y-1 text-muted-foreground">
                    {[...transformErrors, ...referenceErrors].slice(0, 20).map((e, i) => (
                      <li key={i}>• {e}</li>
                    ))}
                    {totalErrors > 20 && <li>... e mais {totalErrors - 20} avisos</li>}
                  </ul>
                </ScrollArea>
              </CardContent>
            </Card>
          )}

          {/* Preview */}
          {status === 'previewing' && transformedData.length > 0 && (
            <Card>
              <CardContent className="pt-4">
                <h4 className="font-medium mb-3 text-sm">
                  Pré-visualização ({rawData.length} registros, mostrando primeiros 10)
                </h4>
                <ScrollArea className="h-[200px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">#</TableHead>
                        {previewColumns.map(col => (
                          <TableHead key={col.dbName} className="text-xs">{col.accessName}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rawData.slice(0, 10).map((row, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="text-xs text-muted-foreground">{idx + 1}</TableCell>
                          {previewColumns.map(col => (
                            <TableCell key={col.dbName} className="text-xs font-mono max-w-[150px] truncate">
                              {String(row[col.accessName] ?? row[col.accessName.toUpperCase()] ?? '')}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          )}

          {/* Interactive conta gerencial assignment */}
          {status === 'previewing' && needsContaGerencial && transformedData.length > 0 && (
            <Card>
              <CardContent className="pt-4">
                <h4 className="font-medium mb-3 text-sm">
                  Atribuir Conta Gerencial a cada grupo
                </h4>
                <ScrollArea className="h-[250px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">#</TableHead>
                        <TableHead className="text-xs">Nome</TableHead>
                        <TableHead className="text-xs">Conta Gerencial</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transformedData.map((row, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="text-xs text-muted-foreground">{idx + 1}</TableCell>
                          <TableCell className="text-xs font-mono">{String(row.nome ?? '')}</TableCell>
                          <TableCell>
                          <SubCentroCombobox
                            value={contaGerencialMap[idx] || ''}
                            onChange={(val) =>
                              setContaGerencialMap(prev => ({ ...prev, [idx]: val }))
                            }
                            subCentros={subCentros}
                          />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          )}

          {status === 'previewing' && (
            <div className="flex items-center gap-2">
              <Switch checked={clearExisting} onCheckedChange={setClearExisting} id="clear-existing" />
              <Label htmlFor="clear-existing" className="text-sm">
                Limpar dados existentes de "{config.label}" antes de importar
              </Label>
            </div>
          )}

          {/* Import progress */}
          {status === 'importing' && (
            <Card>
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <span className="text-sm font-medium">Importando...</span>
                </div>
                <Progress value={progress} />
                <p className="text-xs text-muted-foreground">{importedCount} de {transformedData.length} registros</p>
              </CardContent>
            </Card>
          )}

          {/* Done */}
          {status === 'done' && (
            <Card className={importErrors.length > 0 ? 'border-warning' : 'border-green-500'}>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-2">
                  {importErrors.length === 0 ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-warning" />
                  )}
                  <span className="font-medium">
                    {importedCount} registros importados com sucesso
                  </span>
                </div>
                {importErrors.length > 0 && (
                  <ScrollArea className="max-h-[100px]">
                    <ul className="text-xs space-y-1 text-destructive">
                      {importErrors.map((e, i) => <li key={i}>• {e}</li>)}
                    </ul>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          )}

          {/* Error */}
          {status === 'error' && (
            <Card className="border-destructive">
              <CardContent className="pt-4 flex items-center gap-2">
                <XCircle className="h-5 w-5 text-destructive" />
                <span className="text-sm text-destructive">Erro na importação. Verifique os dados e tente novamente.</span>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => { onOpenChange(false); resetState(); }}>
            {status === 'done' ? 'Fechar' : 'Cancelar'}
          </Button>
          {status === 'previewing' && (
            <Button onClick={handleImport} disabled={transformedData.length === 0}>
              {config.updateMode ? 'Atualizar' : 'Importar'} {transformedData.length} registros
            </Button>
          )}
          {(status === 'done' || status === 'error') && (
            <Button variant="outline" onClick={resetState}>
              Nova importação
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
