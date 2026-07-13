import { useState, useCallback, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
import { Upload, FileSpreadsheet, Loader2, AlertTriangle, CheckCircle2, XCircle, ChevronsUpDown, Check, Building } from 'lucide-react';
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

function extractErroredLineNumbers(errors: string[]) {
  return new Set(
    errors
      .map((error) => {
        // Handle "Linha X: ..." format
        const match = error.match(/^Linha\s+(\d+):/i);
        if (match) return match[1];
        // Handle PostgREST "Could not find column '...' of '...' in the schema cache"
        // These don't have line numbers in the raw error message from Supabase usually,
        // but if they come from our internal mapping they might.
        return null;
      })
      .filter((line): line is string => Boolean(line))
      .map(Number)
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
  const [upsertMode, setUpsertMode] = useState(false);
  const [status, setStatus] = useState<ImportStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [importedCount, setImportedCount] = useState(0);
  const [excelColumns, setExcelColumns] = useState<string[]>([]);
  const [contaGerencialMap, setContaGerencialMap] = useState<Record<number, string>>({});
  const [subCentros, setSubCentros] = useState<{ id: string; descricao: string; centro_nome: string }[]>([]);
  const [granjas, setGranjas] = useState<{ id: string; razao_social: string }[]>([]);
  const [selectedGranjaId, setSelectedGranjaId] = useState<string>('');

  const needsGranja = config.references?.some(r => r.dbColumn === 'granja_id' || r.dbColumn === '_granja_id') && config.key !== 'granjas';


  const needsContaGerencial = config.interactiveColumns?.includes('conta_gerencial_id');

  // Tabelas que suportam upsert (atualizar existentes + inserir novos)
  // baseado em índices únicos existentes no banco
  const UPSERT_KEYS: Record<string, string> = {
    dre_contas: 'tenant_id,codigo',
    granjas: 'tenant_id,codigo',
    safras: 'tenant_id,codigo',
    culturas: 'tenant_id,codigo',
    unidades_medida: 'tenant_id,codigo',
    contas_bancarias: 'tenant_id,codigo_legado',
    contas_pagar: 'tenant_id,codigo_legado',
    contas_receber: 'tenant_id,codigo_legado',
    produtores: 'granja_id,codigo',
    produtos: 'tenant_id,codigo',
    grupos_produtos: 'tenant_id,nome',
    controle_lavouras: 'granja_id,lavoura_id,safra_id',
    transferencias_deposito: 'codigo',
  };
  const CUSTOM_SYNC_KEYS: Record<string, string> = {
    inscricoes_produtor: 'granja_id,codigo',
  };
  const upsertConflict = UPSERT_KEYS[config.tableName];
  const syncConflictLabel = upsertConflict ?? CUSTOM_SYNC_KEYS[config.tableName];
  const upsertSupported = !!syncConflictLabel && !config.updateMode;

  const normalize = (s: string) =>
    s.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // Auto-match sub-centros by name or by specific column
  useEffect(() => {
    if (!needsContaGerencial || transformedData.length === 0 || subCentros.length === 0) return;
    const autoMap: Record<number, string> = {};
    transformedData.forEach((row, idx) => {
      // Prioritize resolved FK if it came from the spreadsheet
      if (row.conta_gerencial_id) {
        autoMap[idx] = row.conta_gerencial_id;
        return;
      }
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

  useEffect(() => {
    if (open && tenantId) {
      supabase
        .from('granjas')
        .select('id, razao_social')
        .eq('tenant_id', tenantId)
        .order('razao_social')
        .then(({ data }) => {
          if (data) setGranjas(data);
        });
    }
  }, [open, tenantId]);

  const resetState = () => {
    setFile(null);
    setRawData([]);
    setTransformedData([]);
    setTransformErrors([]);
    setReferenceErrors([]);
    setImportErrors([]);
    setClearExisting(false);
    setUpsertMode(false);
    setStatus('idle');
    setProgress(0);
    setImportedCount(0);
    setExcelColumns([]);
    setContaGerencialMap({});
    setSelectedGranjaId('');
  };


  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setStatus('parsing');

    try {
      const data = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(data, { cellDates: true });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' });

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
        // Prepare resolved references
        const { resolved, errors: refErrors } = await resolveReferences(config.references, transformed, tenantId);
        
        // --- LOGICA DE GRANJA PARA IMPORTAÇÃO ---
        // Se a planilha não tem coluna de granja mas o usuário selecionou uma na UI, aplicamos a todas as linhas
        // que ainda não tenham granja_id resolvido.
        for (let i = 0; i < resolved.length; i++) {
          const row = resolved[i];
          const hasGranjaInSheet = Object.keys(jsonData[i] || {}).some(k => 
            normalize(k) === 'granjacodigo' || normalize(k) === 'granjid' || normalize(k) === 'granja'
          );

          // colheitas e plantios NÃO possuem granja_id na tabela — manter apenas em _granja_id auxiliar
          if (config.key === 'colheitas' || config.key === 'plantios') {
            if (!row._granja_id && selectedGranjaId && selectedGranjaId !== 'none') {
              row._granja_id = selectedGranjaId;
            }
            continue;
          }

          if (!row.granja_id && !row._granja_id && !hasGranjaInSheet && selectedGranjaId && selectedGranjaId !== 'none') {
            row.granja_id = selectedGranjaId;
          }
          if (row._granja_id && !row.granja_id) {
            row.granja_id = row._granja_id;
          }
        }
        
        const compositeErrors: string[] = [];

        // Composite lookup: lavoura_id for controle_lavouras (via _lavoura_codigo + granja_id)
        if (config.key === 'controle_lavouras') {
          const { data: lavouras } = await supabase
            .from('lavouras')
            .select('id, codigo, granja_id, tenant_id');
          
          const lavMap = new Map<string, string>();
          const lavIdMap = new Map<string, string>();

          (lavouras || []).forEach((l: any) => {
            if (l.id) {
              lavIdMap.set(l.id, l.id);
            }
            if (l.codigo) {
              const norm = String(l.codigo).trim();
              // Build key combining tenant_id, granja_id and code to ensure uniqueness
              // Even if different tenants or different granjas have the same code, we isolate it.
              const key = `${l.tenant_id}|${l.granja_id}|${norm}`;
              lavMap.set(key, l.id);
            }
          });

          for (let i = 0; i < resolved.length; i++) {
            const row = resolved[i];
            const codigoLavoura = String(row._lavoura_codigo || '').trim();
            const granjaId = row.granja_id;
            const rowTenantId = tenantId; // The selected tenant in the UI
            
            if (codigoLavoura) {
              // Priority 1: Check if it's already a UUID
              if (lavIdMap.has(codigoLavoura)) {
                row.lavoura_id = codigoLavoura;
              } else {
                // Priority 2: Use the composite key with tenant_id and granja_id
                const key = `${rowTenantId}|${granjaId}|${codigoLavoura}`;
                const match = lavMap.get(key);
                
                if (match) {
                  row.lavoura_id = match;
                } else {
                  compositeErrors.push(`Linha ${i + 1}: Lavoura não encontrada para código "${codigoLavoura}" na Granja selecionada (ID: ${granjaId})`);
                }
              }
            } else {
              compositeErrors.push(`Linha ${i + 1}: Código da lavoura ausente`);
            }
            delete row._lavoura_codigo;
          }
          setReferenceErrors([...refErrors, ...compositeErrors]);
        }
        // Composite lookup: controle_lavoura_id for colheitas and plantios (via safra_codigo)
        else if (config.key === 'colheitas' || config.key === 'plantios') {
          // Buscar controle_lavouras pelo campo codigo para cache direto
          const { data: controles } = await supabase
            .from('controle_lavouras')
            .select('id, safra_id, codigo, granja_id, lavoura_id');
          
          // Cache: controle_lavouras.codigo (normalizado) + granja_id → { controle_id, safra_id }
          // Cache: controle_lavouras.codigo (normalizado) + granja_id + safra_id → { controle_id, safra_id }
          const ctrlMap = new Map<string, { controle_id: string; safra_id: string; granja_id: string; lavoura_id: string }>();
          (controles || []).forEach((c: any) => {
            if (c.codigo) {
              const norm = String(c.codigo).trim().replace(/^0+/, '') || c.codigo;
              const val = { 
                controle_id: c.id, 
                safra_id: c.safra_id, 
                granja_id: c.granja_id,
                lavoura_id: c.lavoura_id 
              };

              // Cache: codigo + granja + safra (most specific)
              ctrlMap.set(`${norm}|${c.granja_id}|${c.safra_id}`, val);
              
              // Cache: codigo + granja
              const keyWithGranja = `${norm}|${c.granja_id}`;
              if (!ctrlMap.has(keyWithGranja)) {
                ctrlMap.set(keyWithGranja, val);
              }

              // Cache: just codigo
              if (!ctrlMap.has(norm)) {
                ctrlMap.set(norm, val);
              }
            }
          });

          for (let i = 0; i < resolved.length; i++) {
            const row = resolved[i];
            const rawCode = row._safra_codigo || jsonData[i]?.['safra_codigo'] || jsonData[i]?.['SAFRA_CODIGO'] || jsonData[i]?.['safras_codigo'] || '';
            const codigoControle = String(rawCode).trim().replace(/^0+/, '');
            const granjaId = row._granja_id;
            const safraId = row.safra_id;

            if (!codigoControle) {
              compositeErrors.push(`Linha ${i + 1}: safra_codigo vazio — não é possível vincular ao Controle de Lavoura`);
            } else if (!granjaId) {
              compositeErrors.push(`Linha ${i + 1}: Granja não informada — selecione a Granja correta acima do upload ou inclua a coluna "granja" / "codigo_granja" na planilha (código de controle "${codigoControle}" pode existir em mais de uma granja)`);
            } else {
              const keyFull = `${codigoControle}|${granjaId}|${safraId}`;
              const keyWithGranja = `${codigoControle}|${granjaId}`;

              // ATENÇÃO: NÃO usar fallback por código puro — isso vincula a granja errada
              // quando o mesmo código de controle existe em mais de uma granja.
              const match = ctrlMap.get(keyFull) || ctrlMap.get(keyWithGranja);

              if (match) {
                row.controle_lavoura_id = match.controle_id;
                if (match.safra_id) {
                  row.safra_id = match.safra_id;
                }

                // Em plantios, o lavoura_id deve ser preenchido com o valor vindo do controle_lavoura
                if (config.key === 'plantios' && match.lavoura_id) {
                  row.lavoura_id = match.lavoura_id;
                }
              } else {
                compositeErrors.push(`Linha ${i + 1}: Controle de Lavoura código "${codigoControle}" não encontrado na Granja selecionada`);
              }
            }

            // Limpar campos auxiliares após resolução
            delete (row as any)._safra_codigo;
            delete (row as any)._granja_id;
            delete (row as any)._granja_codigo_raw;
            delete (row as any)._produto_codigo_raw;
            delete (row as any).granja_id;
            if (config.key !== 'plantios') {
               delete (row as any).lavoura_id;
            }
          }

          
          setReferenceErrors([...refErrors, ...compositeErrors]);
        } else if (config.key === 'inscricoes' || config.key === 'produtores') {
          // Lookup automático de cidade/uf via codigo_ibge ou CEP
          const geoErrors: string[] = [];
          
          // 1. Coletar códigos IBGE únicos
          const codigosIbge = Array.from(new Set(
            resolved
              .map(r => String((r as any)._codigo_ibge ?? '').trim())
              .filter(c => c.length > 0)
          ));
          
          // 2. Coletar CEPs únicos (apenas se cidade ou UF estiverem vazios na linha)
          const ceps = Array.from(new Set(
            resolved
              .filter(r => {
                const row = r as any;
                return (!row.cidade || !row.uf) && String(row.cep ?? '').replace(/\D/g, '').length === 8;
              })
              .map(r => String((r as any).cep ?? '').replace(/\D/g, ''))
          ));

          let ibgeMap = new Map<string, { nome: string; uf: string }>();
          let cepMap = new Map<string, { nome: string; uf: string }>();

          // Buscar por IBGE
          if (codigosIbge.length > 0) {
            const { data: municipios } = await supabase
              .from('ibge_municipios')
              .select('codigo_ibge, nome, uf')
              .in('codigo_ibge', codigosIbge);
            (municipios || []).forEach((m: any) => {
              ibgeMap.set(String(m.codigo_ibge), { nome: m.nome, uf: m.uf });
            });
          }

          // Buscar por CEP (apenas o que não foi resolvido por IBGE ou já preenchido)
          if (ceps.length > 0) {
            const { data: cepData } = await supabase
              .from('cep_municipios' as any)
              .select('cep, nome_municipio, uf')
              .in('cep', ceps);
            (cepData || []).forEach((c: any) => {
              cepMap.set(String(c.cep), { nome: c.nome_municipio, uf: c.uf });
            });
          }

          for (let i = 0; i < resolved.length; i++) {
            const row = resolved[i] as any;
            const codIbge = String(row._codigo_ibge ?? '').trim();
            const cleanCep = String(row.cep ?? '').replace(/\D/g, '');
            delete row._codigo_ibge;

            let geoMatch: { nome: string; uf: string } | undefined;

            // Prioridade 1: Código IBGE
            if (codIbge) {
              geoMatch = ibgeMap.get(codIbge);
              if (!geoMatch) {
                geoErrors.push(`Linha ${i + 1}: código IBGE "${codIbge}" não encontrado`);
              }
            }

            // Prioridade 2: CEP (se cidade/uf ainda vazios e IBGE não resolveu)
            if (!geoMatch && cleanCep.length === 8 && (!row.cidade || !row.uf)) {
              geoMatch = cepMap.get(cleanCep);
            }

            if (geoMatch) {
              if (!row.cidade) row.cidade = geoMatch.nome;
              if (!row.uf) row.uf = geoMatch.uf;
            }
          }
          setReferenceErrors([...refErrors, ...geoErrors]);
        } else if (config.key === 'contra_notas_recebidas') {
          // Resolver CR.codigo_legado -> contrato_venda_id + granja_id e deduplicar por contrato
          const crErrors: string[] = [];
          const codigos = Array.from(new Set(
            resolved.map(r => String((r as any)._cr_codigo_legado ?? '').trim()).filter(Boolean)
          ));
          const crMap = new Map<string, { contrato_venda_id: string | null; granja_id: string | null }>();
          if (codigos.length > 0) {
            const PAGE = 1000;
            for (let p = 0; p < codigos.length; p += PAGE) {
              const slice = codigos.slice(p, p + PAGE);
              const { data: crs } = await supabase
                .from('contas_receber')
                .select('codigo_legado, contrato_venda_id, granja_id')
                .in('codigo_legado', slice);
              (crs || []).forEach((cr: any) => {
                const k = String(cr.codigo_legado).trim();
                if (!crMap.has(k)) {
                  crMap.set(k, { contrato_venda_id: cr.contrato_venda_id, granja_id: cr.granja_id });
                }
              });
            }
          }
          const seenContrato = new Set<string>();
          for (let i = 0; i < resolved.length; i++) {
            const row = resolved[i] as any;
            const cod = String(row._cr_codigo_legado ?? '').trim();
            delete row._cr_codigo_legado;
            if (!cod) {
              crErrors.push(`Linha ${i + 1}: cr_codigo_legado vazio`);
              continue;
            }
            const cr = crMap.get(cod);
            if (!cr) {
              crErrors.push(`Linha ${i + 1}: Contas a Receber com codigo_legado="${cod}" não encontrado`);
              continue;
            }
            if (!cr.contrato_venda_id) {
              crErrors.push(`Linha ${i + 1}: CR "${cod}" sem contrato_venda vinculado — contra-nota só vale para vendas`);
              continue;
            }
            if (seenContrato.has(cr.contrato_venda_id)) {
              crErrors.push(`Linha ${i + 1}: contra-nota duplicada para o mesmo contrato (CR "${cod}") — ignorada`);
              continue;
            }
            seenContrato.add(cr.contrato_venda_id);
            row.contrato_venda_id = cr.contrato_venda_id;
            row.granja_id = cr.granja_id;
            row.eh_contra_nota = true;
            if (!row.data_entrada) row.data_entrada = row.data_emissao;
          }
          setReferenceErrors([...refErrors, ...crErrors]);
        } else if (config.key === 'baixas_contas_receber') {
          // Resolver CR.codigo_legado -> conta_id
          const brErrors: string[] = [];
          const codigos = Array.from(new Set(
            resolved.map(r => String((r as any)._cr_codigo_legado ?? '').trim()).filter(Boolean)
          ));
          const crMap = new Map<string, string>();
          if (codigos.length > 0) {
            const PAGE = 1000;
            for (let p = 0; p < codigos.length; p += PAGE) {
              const slice = codigos.slice(p, p + PAGE);
              const { data: crs } = await supabase
                .from('contas_receber')
                .select('id, codigo_legado')
                .in('codigo_legado', slice);
              (crs || []).forEach((cr: any) => {
                const k = String(cr.codigo_legado).trim();
                if (!crMap.has(k)) crMap.set(k, cr.id);
              });
            }
          }
          for (let i = 0; i < resolved.length; i++) {
            const row = resolved[i] as any;
            const cod = String(row._cr_codigo_legado ?? '').trim();
            delete row._cr_codigo_legado;
            if (!cod) {
              brErrors.push(`Linha ${i + 1}: cr_codigo_legado vazio`);
              continue;
            }
            const contaId = crMap.get(cod);
            if (!contaId) {
              brErrors.push(`Linha ${i + 1}: Contas a Receber com codigo_legado="${cod}" não encontrado`);
              continue;
            }
            row.conta_id = contaId;
          }
          setReferenceErrors([...refErrors, ...brErrors]);
        } else if (config.key === 'baixas_contas_pagar') {
          // Resolver CP.codigo_legado -> conta_id
          const bpErrors: string[] = [];
          const codigos = Array.from(new Set(
            resolved.map(r => String((r as any)._cp_codigo_legado ?? '').trim()).filter(Boolean)
          ));
          const cpMap = new Map<string, string>();
          if (codigos.length > 0) {
            const PAGE = 1000;
            for (let p = 0; p < codigos.length; p += PAGE) {
              const slice = codigos.slice(p, p + PAGE);
              const { data: cps } = await supabase
                .from('contas_pagar')
                .select('id, codigo_legado')
                .in('codigo_legado', slice);
              (cps || []).forEach((cp: any) => {
                const k = String(cp.codigo_legado).trim();
                if (!cpMap.has(k)) cpMap.set(k, cp.id);
              });
            }
          }
          for (let i = 0; i < resolved.length; i++) {
            const row = resolved[i] as any;
            const cod = String(row._cp_codigo_legado ?? '').trim();
            delete row._cp_codigo_legado;
            if (!cod) {
              bpErrors.push(`Linha ${i + 1}: cp_codigo_legado vazio`);
              continue;
            }
            const contaId = cpMap.get(cod);
            if (!contaId) {
              bpErrors.push(`Linha ${i + 1}: Contas a Pagar com codigo_legado="${cod}" não encontrado`);
              continue;
            }
            row.conta_id = contaId;
          }
          setReferenceErrors([...refErrors, ...bpErrors]);
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
    if (transformedData.length === 0 || (!config.updateMode && validRowCount === 0)) {
      toast.error('Nenhuma linha válida para importar');
      return;
    }

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
      // Clear existing if requested — escopado por tenant, filhos primeiro, em lotes
      if (clearExisting) {
        const CHILD_TABLES: Record<string, string[]> = {
          contas_pagar: ['contas_pagar_baixas'],
          contas_receber: ['contas_receber_baixas'],
        };
        const TENANT_COL_TABLES = new Set([
          'contas_pagar', 'contas_receber', 'contas_pagar_baixas', 'contas_receber_baixas',
          'granjas','produtos','grupos_produtos','placas','transportadoras','locais_entrega','safras',
          'lavouras','silos','controle_lavouras','plantios','aplicacoes','chuvas','floracoes',
          'insetos','plantas_invasoras','analises_solo','pivos','dre_contas','tabela_umidades',
          'plano_contas_gerencial','culturas','unidades_medida','sub_centros_custo',
          'contratos_venda','remessas_venda','clientes_fornecedores'
        ]);

        const resolveTargetIds = async (table: string): Promise<string[] | null> => {
          if (TENANT_COL_TABLES.has(table) && tenantId) {
            const { data, error } = await supabase.from(table as any).select('id').eq('tenant_id', tenantId);
            if (error) throw error;
            return (data || []).map((r: any) => r.id);
          }
          return null;
        };

        const deleteInChunks = async (table: string, col: string, ids: string[]) => {
          const CHUNK = 300;
          for (let i = 0; i < ids.length; i += CHUNK) {
            const slice = ids.slice(i, i + CHUNK);
            const { error } = await supabase.from(table as any).delete().in(col, slice);
            if (error) throw error;
          }
        };

        try {
          const childs = CHILD_TABLES[config.tableName] || [];
          const parentIds = await resolveTargetIds(config.tableName);

          for (const child of childs) {
            if (parentIds && parentIds.length > 0) {
              await deleteInChunks(child, 'conta_id', parentIds);
            } else if (parentIds === null) {
              const { error } = await supabase.from(child as any).delete().neq('id', '00000000-0000-0000-0000-000000000000');
              if (error) throw error;
            }
          }

          if (parentIds && parentIds.length > 0) {
            await deleteInChunks(config.tableName, 'id', parentIds);
          } else if (parentIds === null) {
            const { error } = await supabase.from(config.tableName as any).delete().neq('id', '00000000-0000-0000-0000-000000000000');
            if (error) throw error;
          }
        } catch (err: any) {
          throw new Error(`Falha ao limpar "${config.tableName}": ${err.message}`);
        }
      }

      // Filter out rows that had transform/reference errors (keep only clean rows)
      const cleanRows = transformedData.filter((_, idx) => {
        return !invalidLineNumbers.has(idx + 1);
      });

      // Remove extra columns not in the mapping or references
      const validDbColumns = new Set(config.columns.map(c => c.dbName));
      if (config.references) {
        config.references.forEach(r => validDbColumns.add(r.dbColumn));
      }
      if (config.interactiveColumns) {
        config.interactiveColumns.forEach(c => validDbColumns.add(c));
      }
      // Incluir campos calculados ou injetados
      if (config.key === 'colheitas' || config.key === 'plantios') {
        // Tabela colheitas e plantios NÃO possuem granja_id nem lavoura_id (esses ficam em controle_lavouras)
        validDbColumns.add('controle_lavoura_id');
        validDbColumns.add('safra_id');
        if (config.key === 'colheitas') {
          validDbColumns.add('silo_id');
          validDbColumns.add('placa_id');
          validDbColumns.add('variedade_id');
          validDbColumns.add('inscricao_produtor_id');
          validDbColumns.add('local_entrega_terceiro_id');
        } else if (config.key === 'plantios') {
          validDbColumns.add('cultura_id');
          validDbColumns.add('variedade_id');
        }
      }
      if (config.key === 'controle_lavouras') {
        validDbColumns.add('lavoura_id');
        validDbColumns.add('granja_id');
        validDbColumns.add('safra_id');
      }
      if (config.key === 'contra_notas_recebidas') {
        validDbColumns.add('contrato_venda_id');
        validDbColumns.add('granja_id');
        validDbColumns.add('eh_contra_nota');
      }
      if (config.key === 'baixas_contas_receber' || config.key === 'baixas_contas_pagar') {
        validDbColumns.add('conta_id');
      }

      const TABLES_WITH_GRANJA_ID = new Set(['contratos_venda', 'inscricoes_produtor', 'produtores', 'controle_lavouras', 'granjas', 'produtos', 'silos', 'lavouras', 'contas_pagar', 'contas_receber', 'compras_cereais', 'devolucoes_deposito', 'notas_deposito_emitidas', 'placas']);

      const sanitizedRows = cleanRows.map((row, idx) => {
        const clean: Record<string, any> = {};
        
        // Use mapping config to determine which fields should go to DB
        // We iterate over the row keys but only keep what's valid
        for (const [key, value] of Object.entries(row)) {
          if (validDbColumns.has(key) || (TABLES_WITH_GRANJA_ID.has(config.tableName) && key === 'granja_id')) {
            clean[key] = value;
          }
        }

        // Blindagem: colheitas NÃO possuem granja_id nem lavoura_id no schema
        // Plantios NÃO possuem granja_id, mas PODEM possuir lavoura_id (embora geralmente venha do controle_lavoura_id)
        if (config.key === 'colheitas') {
          delete clean.granja_id;
          delete clean.lavoura_id;
          delete clean._granja_id;
          delete clean._granja_codigo_raw;
          delete clean._safra_codigo;
        } else if (config.key === 'plantios') {
          delete clean.granja_id;
          // Mantemos lavoura_id se ele existir (pode ter vindo do match ou da planilha)
          delete clean._granja_id;
          delete clean._granja_codigo_raw;
          delete clean._safra_codigo;
        }

        // Inject tenant_id para tabelas isoladas por empresa contratante
        const SCR_TENANT_SCOPED_TABLES = new Set([
          'contas_pagar', 'contas_receber', 'contas_pagar_baixas', 'contas_receber_baixas',
          'granjas','produtos','grupos_produtos','placas','transportadoras','locais_entrega','safras',
          'lavouras','silos','controle_lavouras',
          'plantios','aplicacoes','chuvas','floracoes','insetos','plantas_invasoras','analises_solo','pivos',
          'dre_contas','tabela_umidades','plano_contas_gerencial',
          'culturas','unidades_medida','sub_centros_custo',
          'contratos_venda','remessas_venda','clientes_fornecedores'
        ]);
        if (SCR_TENANT_SCOPED_TABLES.has(config.tableName) && tenantId) {
          clean['tenant_id'] = tenantId;
        }
        // Inject interactive conta_gerencial_id
        if (needsContaGerencial && contaGerencialMap[idx]) {
          clean['conta_gerencial_id'] = contaGerencialMap[idx];
        }
        return clean;
      });

      // ===== VALIDAÇÃO DE INTEGRIDADE POR TENANT =====
      const SCR_VALIDATION_TENANT_SCOPED_TABLES = new Set([
        'contas_pagar', 'contas_receber', 'contas_pagar_baixas', 'contas_receber_baixas',
        'granjas','produtos','grupos_produtos','placas','transportadoras','locais_entrega','safras',
        'lavouras','silos','controle_lavouras',
        'plantios','aplicacoes','chuvas','floracoes','insetos','plantas_invasoras','analises_solo','pivos',
        'dre_contas','tabela_umidades','plano_contas_gerencial',
        'culturas','unidades_medida','sub_centros_custo',
        'contratos_venda','remessas_venda','clientes_fornecedores'
      ]);
      const REQUIRES_GRANJA = new Set(['contratos_venda', 'inscricoes_produtor', 'produtores', 'controle_lavouras']);
      const validationErrors: string[] = [];
      const validRows: Record<string, any>[] = [];

      // Buscar códigos de granjas disponíveis (apenas se necessário)
      let granjaCodigosDisponiveis: string[] = [];
      if (typeof REQUIRES_GRANJA !== 'undefined' && REQUIRES_GRANJA.has(config.tableName) && tenantId) {
        const { data: gs } = await supabase
          .from('granjas')
          .select('codigo')
          .eq('tenant_id', tenantId);
        granjaCodigosDisponiveis = (gs || [])
          .map((g: any) => String(g.codigo ?? '').trim())
          .filter(Boolean)
          .sort();
      }

      sanitizedRows.forEach((row, idx) => {
        const lineNum = idx + 1;
        // 1. Tabela isolada por tenant → exige tenantId selecionado
        if (SCR_VALIDATION_TENANT_SCOPED_TABLES.has(config.tableName)) {
          if (!tenantId) {
            validationErrors.push(`Linha ${lineNum}: empresa contratante não selecionada.`);
            return;
          }
          if (!row['tenant_id']) {
            validationErrors.push(`Linha ${lineNum}: tenant_id ausente após mapeamento.`);
            return;
          }
          if (row['tenant_id'] !== tenantId) {
            validationErrors.push(`Linha ${lineNum}: tenant_id (${row['tenant_id']}) diferente do selecionado (${tenantId}).`);
            return;
          }
        }
        // 2. Tabelas que exigem granja_id (chave do isolamento operacional)
        if (typeof REQUIRES_GRANJA !== 'undefined' && REQUIRES_GRANJA.has(config.tableName) && !row['granja_id']) {
          const lista = granjaCodigosDisponiveis.length > 0
            ? ` Códigos de granja disponíveis para a empresa: ${granjaCodigosDisponiveis.join(', ')}.`
            : ' Nenhuma granja cadastrada para a empresa selecionada.';
          validationErrors.push(
            `Linha ${lineNum}: granja_id não resolvido — verifique se a coluna "granja_codigo" existe na planilha e se o código corresponde a uma granja da empresa selecionada.${lista}`
          );
          return;
        }
        // 3. Colheitas: exigem controle_lavoura_id (não têm granja_id)
        if (config.tableName === 'colheitas' && !row['controle_lavoura_id']) {
          validationErrors.push(
            `Linha ${lineNum}: controle_lavoura_id não resolvido — verifique se "safra_codigo" da planilha corresponde ao código de um Controle de Lavoura cadastrado.`
          );
          return;
        }
        validRows.push(row);
      });

      if (validationErrors.length > 0) {
        console.warn(`[Importação ${config.tableName}] ${validationErrors.length} linha(s) rejeitada(s):`, validationErrors);
      }
      if (validRows.length === 0) {
        throw new Error(`Nenhuma linha válida para importar. ${validationErrors.length} rejeitada(s). Verifique o console para detalhes.`);
      }

      // Campo preco_kg ampliado para numeric(18,6) — sem mais pré-validação de limite.
      const finalRows: Record<string, any>[] = validRows;

      // Batch insert / upsert
      // - upsertMode (usuário marcou): atualiza existentes + insere novos
      // - CP/CR já usam upsert nativo p/ ignorar duplicados por codigo_legado
      const isCpCr = config.tableName === 'contas_pagar' || config.tableName === 'contas_receber';
      const useUpsert = isCpCr || (upsertMode && !!upsertConflict);
      const conflictTarget = upsertMode && upsertConflict
        ? upsertConflict
        : (isCpCr ? 'tenant_id,codigo_legado' : undefined);
      // Em upsertMode queremos MERGE (ignoreDuplicates: false); em CP/CR padrão queremos ignorar.
      const ignoreDuplicates = upsertMode ? false : isCpCr;
      const batchSize = useUpsert ? 500 : 100;
      const errors: string[] = [...validationErrors];

      // Helper: enriquecer mensagem de overflow numérico com os campos suspeitos da linha
      const enrichNumericError = (row: Record<string, any>, msg: string): string => {
        if (!/numeric field overflow|out of range|value too long/i.test(msg)) return msg;
        const numericFields = ['preco_kg','quantidade_kg','quantidade_sacos','valor_total','percentual_comissao','valor_comissao'];
        const dump = numericFields
          .filter(f => row[f] !== undefined && row[f] !== null && row[f] !== '')
          .map(f => `${f}=${row[f]}`)
          .join(', ');
        return dump ? `${msg} — valores: ${dump}` : msg;
      };

      // Para contas_pagar/_receber: forçar rateio_modo='manual' para que o trigger
      // trg_rateio_cp/cr entre no caminho rápido (sem consultar produtores nem
      // inserir em lancamento_rateio_socios). Acelera a importação drasticamente.
      // O usuário pode reconfigurar o rateio da conta depois pela tela normal.
      if (isCpCr) {
        for (const row of finalRows) {
          if (!row.rateio_modo) row.rateio_modo = 'manual';
          // Constraint contas_*_valor_original_check exige >= 0.
          // Estornos do Access vinham negativos -> converter para ABS.
          if (row.valor_original !== undefined && row.valor_original !== null && Number(row.valor_original) < 0) {
            row.valor_original = Math.abs(Number(row.valor_original));
          }
        }
      }

      if (config.tableName === 'inscricoes_produtor' && upsertMode) {
        const syncErrors: string[] = [...errors];
        const normalizedRows = finalRows.map((row, idx) => ({
          row,
          line: idx + 1,
          granjaId: String(row.granja_id ?? '').trim(),
          codigo: String(row.codigo ?? '').trim(),
        }));
        const rowsWithKey = normalizedRows.filter(item => {
          if (item.granjaId && item.codigo) return true;
          syncErrors.push(`Linha ${item.line}: granja_id e codigo são obrigatórios para atualizar existentes.`);
          return false;
        });

        const granjaIds = Array.from(new Set(rowsWithKey.map(item => item.granjaId)));
        const codigos = Array.from(new Set(rowsWithKey.map(item => item.codigo)));
        const existingByKey = new Map<string, string>();

        for (let i = 0; i < granjaIds.length; i += 100) {
          const granjaSlice = granjaIds.slice(i, i + 100);
          for (let j = 0; j < codigos.length; j += 500) {
            const codigoSlice = codigos.slice(j, j + 500);
            const { data, error } = await supabase
              .from('inscricoes_produtor')
              .select('id, granja_id, codigo')
              .in('granja_id', granjaSlice)
              .in('codigo', codigoSlice);

            if (error) {
              throw new Error(`Erro ao buscar inscrições existentes: ${error.message}`);
            }

            (data || []).forEach((item: any) => {
              const key = `${String(item.granja_id).trim()}|${String(item.codigo).trim()}`;
              if (!existingByKey.has(key)) existingByKey.set(key, item.id);
            });
          }
        }

        const rowsToUpdate: Array<{ row: Record<string, any>; line: number; id: string }> = [];
        const rowsToInsert: Record<string, any>[] = [];

        rowsWithKey.forEach(item => {
          const existingId = existingByKey.get(`${item.granjaId}|${item.codigo}`);
          if (existingId) {
            rowsToUpdate.push({ row: item.row, line: item.line, id: existingId });
          } else {
            rowsToInsert.push(item.row);
          }
        });

        const totalToProcess = Math.max(rowsToUpdate.length + rowsToInsert.length, 1);
        let processed = 0;

        for (const item of rowsToUpdate) {
          const payload = Object.fromEntries(
            Object.entries(item.row).filter(([key, value]) => key !== 'id' && value !== undefined)
          );
          const { error } = await supabase
            .from('inscricoes_produtor')
            .update(payload as any)
            .eq('id', item.id);

          if (error) {
            syncErrors.push(`Linha ${item.line}: Erro ao atualizar: ${error.message}`);
          } else {
            imported++;
          }

          processed++;
          setProgress(Math.round((processed / totalToProcess) * 100));
          setImportedCount(imported);
        }

        for (let i = 0; i < rowsToInsert.length; i += 100) {
          const batch = rowsToInsert.slice(i, i + 100);
          const { error } = await supabase.from('inscricoes_produtor').insert(batch as any);

          if (error) {
            for (let j = 0; j < batch.length; j++) {
              const { error: rowErr } = await supabase.from('inscricoes_produtor').insert(batch[j] as any);
              if (rowErr) {
                syncErrors.push(`Linha nova ${i + j + 1}: ${rowErr.message}`);
              } else {
                imported++;
              }
              processed++;
              setProgress(Math.round((processed / totalToProcess) * 100));
              setImportedCount(imported);
            }
          } else {
            imported += batch.length;
            processed += batch.length;
            setProgress(Math.round((processed / totalToProcess) * 100));
            setImportedCount(imported);
          }
        }

        setImportErrors(syncErrors);

        if (syncErrors.length === 0) {
          toast.success(`${imported} registros sincronizados com sucesso!`);
        } else {
          toast.warning(`Sincronização parcial: ${imported} processados, ${syncErrors.length} erros`);
        }

        await queryClient.invalidateQueries({ queryKey: [config.key] });
        await queryClient.invalidateQueries({ queryKey: [config.tableName] });
        if (imported > 0) {
          onImportComplete?.(imported);
        }
        setStatus('done');
        return;
      }

      for (let i = 0; i < finalRows.length; i += batchSize) {
        const batch = finalRows.slice(i, i + batchSize);
        const { error } = useUpsert
          ? await supabase.from(config.tableName as any).upsert(batch as any, { onConflict: conflictTarget, ignoreDuplicates } as any)
          : await supabase.from(config.tableName as any).insert(batch as any);

        if (error) {
          if (useUpsert) {
            // Em CP/CR não refazemos o batch linha-a-linha: o custo de 500
            // round-trips extras não compensa quando o erro normalmente é genérico.
            errors.push(`Batch linhas ${i + 1}-${i + batch.length}: ${enrichNumericError(batch[0], error.message)}`);
          } else {
            // Fallback linha-a-linha (demais tabelas, batches de 100)
            for (let j = 0; j < batch.length; j++) {
              const { error: rowErr } = await supabase.from(config.tableName as any).insert(batch[j] as any);
              if (rowErr) {
                errors.push(`Linha ${i + j + 1}: ${enrichNumericError(batch[j], rowErr.message)}`);
              } else {
                imported++;
              }
            }
          }
        } else {
          imported += batch.length;
        }

        setProgress(Math.round(((i + batchSize) / Math.max(finalRows.length, 1)) * 100));
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
  const invalidLineNumbers = extractErroredLineNumbers([...transformErrors, ...referenceErrors]);
  const validRowCount = transformedData.filter((_, idx) => !invalidLineNumbers.has(idx + 1)).length;
  const importTargetCount = config.updateMode ? transformedData.length : validRowCount;
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
                  <>, {config.references.flatMap(r => r.compositeSourceColumn ? [r.sourceColumn, r.compositeSourceColumn] : [r.sourceColumn]).join(', ')}</>
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
                      r.sourceColumn === col || r.sourceColumn.toUpperCase() === col ||
                      (r.compositeSourceColumn && (r.compositeSourceColumn === col || r.compositeSourceColumn.toUpperCase() === col))
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
                <p className="mb-2 text-xs text-muted-foreground">
                  Essas linhas não serão importadas; o restante seguirá normalmente.
                </p>
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
                  Pré-visualização ({rawData.length} registros, {validRowCount} válidos, mostrando primeiros 10)
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

          {status === 'previewing' && needsGranja && (
            <Card className="border-primary/50 bg-primary/5">
              <CardContent className="pt-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold text-primary flex items-center gap-2">
                      <Building className="h-4 w-4" />
                      Granja de Destino (Obrigatório se não houver na planilha)
                    </Label>
                    <Badge variant="outline" className="text-[10px] font-normal uppercase bg-background">Padrão</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Selecione a granja para a qual estes dados pertencem. Se a planilha já contiver o código da granja, a seleção abaixo será ignorada para aquelas linhas.
                  </p>
                  <Select value={selectedGranjaId} onValueChange={setSelectedGranjaId}>
                    <SelectTrigger className="h-10 border-primary/30">
                      <SelectValue placeholder="Selecione a granja correspondente..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Usar apenas códigos da planilha</SelectItem>
                      {granjas.map(g => (
                        <SelectItem key={g.id} value={g.id}>{g.razao_social}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          )}


            <div className="space-y-2">
              {upsertSupported && (
                <div className="flex items-start gap-2">
                  <Switch
                    checked={upsertMode}
                    onCheckedChange={(v) => { setUpsertMode(v); if (v) setClearExisting(false); }}
                    id="upsert-mode"
                  />
                  <div className="flex-1">
                    <Label htmlFor="upsert-mode" className="text-sm">
                      Atualizar existentes + inserir novos (não zerar a base)
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Registros já existentes serão atualizados pela chave <code className="font-mono">{syncConflictLabel}</code>; novos serão inseridos.
                    </p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Switch
                  checked={clearExisting}
                  onCheckedChange={(v) => { setClearExisting(v); if (v) setUpsertMode(false); }}
                  id="clear-existing"
                  disabled={upsertMode}
                />
                <Label htmlFor="clear-existing" className="text-sm">
                  Limpar dados existentes de "{config.label}" antes de importar
                </Label>
              </div>
            </div>




          {/* Import progress */}
          {status === 'importing' && (
            <Card>
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <span className="text-sm font-medium">Importando...</span>
                </div>
                <Progress value={progress} />
                <p className="text-xs text-muted-foreground">{importedCount} de {importTargetCount} registros</p>
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

            <Button onClick={handleImport} disabled={importTargetCount === 0}>
              {config.updateMode ? 'Atualizar' : (upsertMode ? 'Sincronizar' : 'Importar')} {importTargetCount} registros
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
