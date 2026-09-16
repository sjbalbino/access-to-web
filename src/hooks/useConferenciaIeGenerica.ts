/**
 * Conferência de produtores com Inscrição Estadual genérica.
 *
 * Compara os movimentos do extrato do sistema legado com os lançamentos do banco,
 * sugere a correção do vínculo de inscrição e registra tudo em histórico (com desfazer).
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { MovimentoLegado, TipoMovimentoLegado } from '@/lib/extratoLegado';

/** Tabela + coluna de inscrição afetada por cada tipo de movimento. */
const MAPA_TIPOS: Record<
  string,
  { tabela: 'colheitas' | 'devolucoes_deposito' | 'transferencias_deposito'; campo: string; coluna_data: string; coluna_kg: string }
> = {
  deposito: {
    tabela: 'colheitas',
    campo: 'inscricao_produtor_id',
    coluna_data: 'data_colheita',
    coluna_kg: 'producao_liquida_kg',
  },
  devolucao: {
    tabela: 'devolucoes_deposito',
    campo: 'inscricao_produtor_id',
    coluna_data: 'data_devolucao',
    coluna_kg: 'quantidade_kg',
  },
  transferencia_entrada: {
    tabela: 'transferencias_deposito',
    campo: 'inscricao_destino_id',
    coluna_data: 'data_transferencia',
    coluna_kg: 'quantidade_kg',
  },
  transferencia_saida: {
    tabela: 'transferencias_deposito',
    campo: 'inscricao_origem_id',
    coluna_data: 'data_transferencia',
    coluna_kg: 'quantidade_kg',
  },
};

export const TIPOS_SUPORTADOS: TipoMovimentoLegado[] = [
  'deposito',
  'devolucao',
  'transferencia_entrada',
  'transferencia_saida',
];

export interface CandidatoLancamento {
  registro_id: string;
  tabela: string;
  campo: string;
  codigo: string | number | null;
  data: string | null;
  quilos: number;
  produto: string | null;
  safra: string | null;
  inscricao_atual_id: string | null;
  produtor_atual: string | null;
  ie_atual: string | null;
  /** Documentos com NF-e autorizada são imutáveis (política fiscal). */
  bloqueado: boolean;
}

export type SituacaoConferencia =
  | 'ja_correto'
  | 'corrigir'
  | 'multiplos'
  | 'nao_encontrado'
  | 'bloqueado'
  | 'nao_suportado';

export interface MovimentoConferido {
  chave: string;
  movimento: MovimentoLegado;
  situacao: SituacaoConferencia;
  candidatos: CandidatoLancamento[];
  /** Candidato escolhido para correção (o único, quando houver só um). */
  selecionado: string | null;
}

const TOLERANCIA_KG = 1;
const JANELA_DIAS = 3;

const deslocarData = (iso: string, dias: number) => {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
};

const nomeInscricao = (row: Record<string, unknown> | null | undefined) => {
  if (!row) return null;
  const prod = (row as { produtores?: { nome?: string } }).produtores?.nome;
  return (prod || (row as { nome?: string }).nome || null)?.toUpperCase() ?? null;
};

async function buscarCandidatos(
  movimento: MovimentoLegado,
): Promise<{ candidatos: CandidatoLancamento[]; suportado: boolean }> {
  const config = MAPA_TIPOS[movimento.tipo];
  if (!config) return { candidatos: [], suportado: false };

  const kgMin = movimento.quilos - TOLERANCIA_KG;
  const kgMax = movimento.quilos + TOLERANCIA_KG;
  const dataMin = deslocarData(movimento.data, -JANELA_DIAS);
  const dataMax = deslocarData(movimento.data, JANELA_DIAS);

  const inscricaoJoin = 'id, inscricao_estadual, produtores(nome)';

  if (config.tabela === 'colheitas') {
    const { data, error } = await supabase
      .from('colheitas')
      .select(
        `id, codigo, data_colheita, producao_liquida_kg, inscricao_produtor_id,
         variedade:produtos!colheitas_variedade_id_fkey(nome), safra:safras(nome),
         inscricao:inscricoes_produtor!colheitas_inscricao_produtor_id_fkey(${inscricaoJoin})`,
      )
      .gte('data_colheita', dataMin)
      .lte('data_colheita', dataMax)
      .gte('producao_liquida_kg', kgMin)
      .lte('producao_liquida_kg', kgMax);

    if (error) throw error;

    return {
      suportado: true,
      candidatos: (data || []).map((r: any) => ({
        registro_id: r.id,
        tabela: 'colheitas',
        campo: config.campo,
        codigo: r.codigo ?? null,
        data: r.data_colheita,
        quilos: Number(r.producao_liquida_kg || 0),
        produto: r.variedade?.nome ?? null,
        safra: r.safra?.nome ?? null,
        inscricao_atual_id: r.inscricao_produtor_id ?? null,
        produtor_atual: nomeInscricao(r.inscricao),
        ie_atual: r.inscricao?.inscricao_estadual ?? null,
        bloqueado: false,
      })),
    };
  }

  if (config.tabela === 'devolucoes_deposito') {
    const { data, error } = await supabase
      .from('devolucoes_deposito')
      .select(
        `id, codigo, data_devolucao, quantidade_kg, inscricao_produtor_id,
         produto:produtos(nome), safra:safras(nome),
         nota_fiscal:notas_fiscais(status),
         inscricao:inscricoes_produtor!devolucoes_deposito_inscricao_produtor_id_fkey(${inscricaoJoin})`,
      )
      .gte('data_devolucao', dataMin)
      .lte('data_devolucao', dataMax)
      .gte('quantidade_kg', kgMin)
      .lte('quantidade_kg', kgMax);

    if (error) throw error;

    return {
      suportado: true,
      candidatos: (data || []).map((r: any) => ({
        registro_id: r.id,
        tabela: 'devolucoes_deposito',
        campo: config.campo,
        codigo: r.codigo ?? null,
        data: r.data_devolucao,
        quilos: Number(r.quantidade_kg || 0),
        produto: r.produto?.nome ?? null,
        safra: r.safra?.nome ?? null,
        inscricao_atual_id: r.inscricao_produtor_id ?? null,
        produtor_atual: nomeInscricao(r.inscricao),
        ie_atual: r.inscricao?.inscricao_estadual ?? null,
        bloqueado: r.nota_fiscal?.status === 'autorizada',
      })),
    };
  }

  const ehEntrada = movimento.tipo === 'transferencia_entrada';
  const { data, error } = await supabase
    .from('transferencias_deposito')
    .select(
      `id, codigo, data_transferencia, quantidade_kg, inscricao_origem_id, inscricao_destino_id,
       produto:produtos(nome), safra:safras(nome),
       inscricao_origem:inscricoes_produtor!transferencias_deposito_inscricao_origem_id_fkey(${inscricaoJoin}),
       inscricao_destino:inscricoes_produtor!transferencias_deposito_inscricao_destino_id_fkey(${inscricaoJoin})`,
    )
    .gte('data_transferencia', dataMin)
    .lte('data_transferencia', dataMax)
    .gte('quantidade_kg', kgMin)
    .lte('quantidade_kg', kgMax);

  if (error) throw error;

  return {
    suportado: true,
    candidatos: (data || []).map((r: any) => {
      const lado = ehEntrada ? r.inscricao_destino : r.inscricao_origem;
      return {
        registro_id: r.id,
        tabela: 'transferencias_deposito',
        campo: config.campo,
        codigo: r.codigo ?? null,
        data: r.data_transferencia,
        quilos: Number(r.quantidade_kg || 0),
        produto: r.produto?.nome ?? null,
        safra: r.safra?.nome ?? null,
        inscricao_atual_id: (ehEntrada ? r.inscricao_destino_id : r.inscricao_origem_id) ?? null,
        produtor_atual: nomeInscricao(lado),
        ie_atual: lado?.inscricao_estadual ?? null,
        bloqueado: false,
      };
    }),
  };
}

/** Confere os movimentos do extrato contra o banco, para a inscrição de destino escolhida. */
export function useConferirExtrato() {
  return useMutation({
    mutationFn: async ({
      movimentos,
      inscricaoDestinoId,
    }: {
      movimentos: MovimentoLegado[];
      inscricaoDestinoId: string;
    }): Promise<MovimentoConferido[]> => {
      const conferidos: MovimentoConferido[] = [];

      for (let i = 0; i < movimentos.length; i++) {
        const movimento = movimentos[i];
        const chave = `${i}-${movimento.data}-${movimento.tipo}-${movimento.quilos}`;

        const { candidatos, suportado } = await buscarCandidatos(movimento);

        if (!suportado) {
          conferidos.push({ chave, movimento, situacao: 'nao_suportado', candidatos: [], selecionado: null });
          continue;
        }

        const jaCorreto = candidatos.find((c) => c.inscricao_atual_id === inscricaoDestinoId);
        if (jaCorreto) {
          conferidos.push({ chave, movimento, situacao: 'ja_correto', candidatos: [jaCorreto], selecionado: null });
          continue;
        }

        const corrigiveis = candidatos.filter((c) => !c.bloqueado);

        if (candidatos.length === 0) {
          conferidos.push({ chave, movimento, situacao: 'nao_encontrado', candidatos: [], selecionado: null });
        } else if (corrigiveis.length === 0) {
          conferidos.push({ chave, movimento, situacao: 'bloqueado', candidatos, selecionado: null });
        } else if (corrigiveis.length === 1) {
          conferidos.push({
            chave,
            movimento,
            situacao: 'corrigir',
            candidatos,
            selecionado: corrigiveis[0].registro_id,
          });
        } else {
          conferidos.push({ chave, movimento, situacao: 'multiplos', candidatos, selecionado: null });
        }
      }

      return conferidos;
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Não foi possível conferir o extrato.');
    },
  });
}

export interface CorrecaoAplicar {
  tabela: string;
  registro_id: string;
  campo: string;
  valor_anterior: string | null;
  valor_novo: string;
  descricao: string;
}

const CHAVES_SALDO = [
  'colheitas',
  'transferencias_deposito',
  'devolucoes_deposito',
  'saldos_deposito',
  'saldo_produtor',
  'saldo_disponivel_produtor',
  'inscricoes_com_saldo',
  'saldo_socio',
  'reatribuicao',
  'reatribuicoes_log',
];

/** Aplica as correções em lote e grava o histórico. */
export function useAplicarCorrecoes() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      correcoes,
      tenantId,
      usuarioId,
    }: {
      correcoes: CorrecaoAplicar[];
      tenantId: string | null;
      usuarioId: string | null;
    }) => {
      const loteId = crypto.randomUUID();
      const aplicadas: CorrecaoAplicar[] = [];
      const falhas: string[] = [];

      for (const correcao of correcoes) {
        const { error } = await supabase
          .from(correcao.tabela as any)
          .update({ [correcao.campo]: correcao.valor_novo } as any)
          .eq('id', correcao.registro_id);

        if (error) {
          falhas.push(`${correcao.registro_id.slice(0, 8)}: ${error.message}`);
        } else {
          aplicadas.push(correcao);
        }
      }

      if (aplicadas.length > 0) {
        const { error: logError } = await supabase.from('reatribuicoes_inscricao_log').insert(
          aplicadas.map((c) => ({
            lote_id: loteId,
            tenant_id: tenantId,
            tabela: c.tabela,
            registro_id: c.registro_id,
            campo: c.campo,
            valor_anterior: c.valor_anterior,
            valor_novo: c.valor_novo,
            descricao: c.descricao,
            usuario_id: usuarioId,
          })),
        );
        if (logError) console.error('[conferencia] falha ao gravar histórico:', logError);
      }

      return { loteId, aplicadas: aplicadas.length, falhas };
    },
    onSuccess: ({ aplicadas, falhas }) => {
      CHAVES_SALDO.forEach((key) => queryClient.invalidateQueries({ queryKey: [key] }));
      if (falhas.length === 0) {
        toast.success(`${aplicadas} lançamento(s) corrigidos com sucesso.`);
      } else {
        toast.warning(`${aplicadas} corrigidos, ${falhas.length} com erro: ${falhas.slice(0, 3).join(' | ')}`);
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Não foi possível aplicar as correções.');
    },
  });
}

export interface RegistroHistorico {
  id: string;
  lote_id: string;
  tabela: string;
  registro_id: string;
  campo: string;
  valor_anterior: string | null;
  valor_novo: string | null;
  descricao: string | null;
  desfeito_em: string | null;
  created_at: string;
}

export function useHistoricoReatribuicoes() {
  return useQuery({
    queryKey: ['reatribuicoes_log'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reatribuicoes_inscricao_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(300);
      if (error) throw error;
      return (data || []) as RegistroHistorico[];
    },
  });
}

/** Desfaz um lote inteiro (ou um registro) voltando o vínculo anterior. */
export function useDesfazerReatribuicao() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ loteId, registroLogId }: { loteId?: string; registroLogId?: string }) => {
      let query = supabase.from('reatribuicoes_inscricao_log').select('*').is('desfeito_em', null);
      if (loteId) query = query.eq('lote_id', loteId);
      if (registroLogId) query = query.eq('id', registroLogId);

      const { data, error } = await query;
      if (error) throw error;
      const registros = (data || []) as RegistroHistorico[];
      if (registros.length === 0) throw new Error('Nada a desfazer neste lote.');

      let desfeitos = 0;
      for (const reg of registros) {
        const { error: updError } = await supabase
          .from(reg.tabela as any)
          .update({ [reg.campo]: reg.valor_anterior } as any)
          .eq('id', reg.registro_id);
        if (updError) {
          console.error('[conferencia] falha ao desfazer:', updError);
          continue;
        }
        await supabase
          .from('reatribuicoes_inscricao_log')
          .update({ desfeito_em: new Date().toISOString() })
          .eq('id', reg.id);
        desfeitos++;
      }

      return desfeitos;
    },
    onSuccess: (desfeitos) => {
      CHAVES_SALDO.forEach((key) => queryClient.invalidateQueries({ queryKey: [key] }));
      toast.success(`${desfeitos} correção(ões) desfeita(s).`);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Não foi possível desfazer.');
    },
  });
}

/** Saldo por safra da inscrição, para comparar com o extrato do legado. */
export function useSaldoPorSafraInscricao(inscricaoId: string | null) {
  return useQuery({
    queryKey: ['saldo_produtor', 'por_safra', inscricaoId],
    enabled: !!inscricaoId,
    queryFn: async () => {
      if (!inscricaoId) return [] as Array<{ safra: string; saldo_kg: number }>;

      const [colheitas, entradas, saidas, devolucoes] = await Promise.all([
        supabase
          .from('colheitas')
          .select('producao_liquida_kg, safra:safras(nome)')
          .eq('inscricao_produtor_id', inscricaoId),
        supabase
          .from('transferencias_deposito')
          .select('quantidade_kg, safra:safras(nome)')
          .eq('inscricao_destino_id', inscricaoId),
        supabase
          .from('transferencias_deposito')
          .select('quantidade_kg, safra:safras(nome)')
          .eq('inscricao_origem_id', inscricaoId),
        supabase
          .from('devolucoes_deposito')
          .select('quantidade_kg, safra:safras(nome)')
          .eq('inscricao_produtor_id', inscricaoId),
      ]);

      const mapa = new Map<string, number>();
      const somar = (safra: string | null | undefined, kg: number) => {
        const chave = safra || 'SEM SAFRA';
        mapa.set(chave, (mapa.get(chave) || 0) + kg);
      };

      (colheitas.data || []).forEach((r: any) => somar(r.safra?.nome, Number(r.producao_liquida_kg || 0)));
      (entradas.data || []).forEach((r: any) => somar(r.safra?.nome, Number(r.quantidade_kg || 0)));
      (saidas.data || []).forEach((r: any) => somar(r.safra?.nome, -Number(r.quantidade_kg || 0)));
      (devolucoes.data || []).forEach((r: any) => somar(r.safra?.nome, -Number(r.quantidade_kg || 0)));

      return [...mapa.entries()]
        .map(([safra, saldo_kg]) => ({ safra, saldo_kg: Math.round(saldo_kg) }))
        .sort((a, b) => a.safra.localeCompare(b.safra, 'pt-BR'));
    },
  });
}
