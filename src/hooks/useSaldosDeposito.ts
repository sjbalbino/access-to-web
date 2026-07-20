import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { resolveSaldoProdutoIds } from '@/lib/produtoSaldo';

export interface SaldoDeposito {
  inscricao_produtor_id: string;
  produto_id: string;
  safra_id: string;
  produto_nome: string;
  depositado_kg: number;
  transferencias_recebidas_kg: number;
  notas_emitidas_kg: number;
  saldo_a_emitir_kg: number;
}

export interface SaldoDepositoFilters {
  inscricaoProdutorId?: string;
  safraId?: string;
  granjaId?: string;
}

export function useSaldosDeposito(filters: SaldoDepositoFilters) {
  return useQuery({
    queryKey: ['saldos_deposito', filters],
    queryFn: async () => {
      if (!filters.inscricaoProdutorId || !filters.safraId) {
        return [];
      }

      // Buscar colheitas (depositado)
      const { data: colheitas, error: colheitasError } = await supabase
        .from('colheitas')
        .select(`
          variedade_id,
          producao_liquida_kg,
          produto:produtos!colheitas_variedade_id_fkey(id, nome)
        `)
        .eq('inscricao_produtor_id', filters.inscricaoProdutorId)
        .eq('safra_id', filters.safraId);

      if (colheitasError) throw colheitasError;

      // Buscar transferências recebidas
      const { data: transferencias, error: transferenciasError } = await supabase
        .from('transferencias_deposito')
        .select(`
          produto_id,
          quantidade_kg,
          produto:produtos(id, nome)
        `)
        .eq('inscricao_destino_id', filters.inscricaoProdutorId)
        .eq('safra_id', filters.safraId);

      if (transferenciasError) throw transferenciasError;

      // Buscar notas de depósito emitidas
      const { data: notasEmitidas, error: notasError } = await supabase
        .from('notas_deposito_emitidas')
        .select(`
          produto_id,
          quantidade_kg,
          nota_fiscal_id,
          produto:produtos(id, nome)
        `)
        .eq('inscricao_produtor_id', filters.inscricaoProdutorId)
        .eq('safra_id', filters.safraId);

      if (notasError) throw notasError;

      // Filtro defensivo: excluir notas cujo NFe foi cancelada
      let notasFiltradas = notasEmitidas || [];
      if (notasFiltradas.length > 0) {
        const notaFiscalIds = notasFiltradas
          .map((n: any) => n.nota_fiscal_id)
          .filter(Boolean);
        
        if (notaFiscalIds.length > 0) {
          const { data: nfCanceladas } = await supabase
            .from('notas_fiscais')
            .select('id')
            .in('id', notaFiscalIds)
            .eq('status', 'cancelada');
          
          const canceladasSet = new Set((nfCanceladas || []).map((n: any) => n.id));
          if (canceladasSet.size > 0) {
            notasFiltradas = notasFiltradas.filter(
              (n: any) => !n.nota_fiscal_id || !canceladasSet.has(n.nota_fiscal_id)
            );
          }
        }
      }

      // Agrupar por produto
      const saldosPorProduto = new Map<string, SaldoDeposito>();

      // Adicionar colheitas
      colheitas?.forEach((c: any) => {
        const produtoId = c.variedade_id;
        if (!produtoId) return;
        
        const existing = saldosPorProduto.get(produtoId) || {
          inscricao_produtor_id: filters.inscricaoProdutorId!,
          produto_id: produtoId,
          safra_id: filters.safraId!,
          produto_nome: c.produto?.nome || 'Produto não identificado',
          depositado_kg: 0,
          transferencias_recebidas_kg: 0,
          notas_emitidas_kg: 0,
          saldo_a_emitir_kg: 0,
        };
        
        existing.depositado_kg += Math.round(Number(c.producao_liquida_kg) || 0);
        saldosPorProduto.set(produtoId, existing);
      });

      // Adicionar transferências recebidas
      transferencias?.forEach((t: any) => {
        const produtoId = t.produto_id;
        if (!produtoId) return;
        
        const existing = saldosPorProduto.get(produtoId) || {
          inscricao_produtor_id: filters.inscricaoProdutorId!,
          produto_id: produtoId,
          safra_id: filters.safraId!,
          produto_nome: t.produto?.nome || 'Produto não identificado',
          depositado_kg: 0,
          transferencias_recebidas_kg: 0,
          notas_emitidas_kg: 0,
          saldo_a_emitir_kg: 0,
        };
        
        existing.transferencias_recebidas_kg += Math.round(Number(t.quantidade_kg) || 0);
        saldosPorProduto.set(produtoId, existing);
      });

      // Subtrair notas emitidas
      notasFiltradas.forEach((n: any) => {
        const produtoId = n.produto_id;
        if (!produtoId) return;
        
        const existing = saldosPorProduto.get(produtoId);
        if (existing) {
          existing.notas_emitidas_kg += Math.round(Number(n.quantidade_kg) || 0);
        }
      });

      // Calcular saldo a emitir
      const saldos = Array.from(saldosPorProduto.values()).map(s => ({
        ...s,
        saldo_a_emitir_kg: s.depositado_kg + s.transferencias_recebidas_kg - s.notas_emitidas_kg,
      }));

      return saldos.filter(s => s.depositado_kg > 0 || s.transferencias_recebidas_kg > 0);
    },
    enabled: !!filters.inscricaoProdutorId && !!filters.safraId,
  });
}

// Hook para buscar inscrições com saldo agrupado por Local de Entrega
export interface InscricaoComSaldoPorLocal {
  id: string;
  inscricao_estadual: string | null;
  cpf_cnpj: string | null;
  nome_fantasia: string | null;
  granja: string | null;
  granja_id: string | null;
  produtor_nome: string | null;
  local_entrega_id: string | null;
  local_entrega_nome: string | null;
  total_depositado: number;
  saldo_disponivel: number;
}

export function useInscricoesComSaldo(filters: {
  safraId?: string;
  granjaId?: string;
  produtoId?: string;
  localEntregaId?: string;
  incluirSemSaldo?: boolean;
}) {
  return useQuery({
    queryKey: ['inscricoes_com_saldo', filters],
    queryFn: async (): Promise<InscricaoComSaldoPorLocal[]> => {
      if (!filters.safraId) return [];

      const produtoIds = filters.produtoId ? await resolveSaldoProdutoIds(filters.produtoId) : null;
      const localFilter = filters.localEntregaId || null;

      const round = (v: any) => Math.round(Number(v) || 0);
      const localKey = (id: string | null | undefined) => id || 'sem_local';

      // Buscas em paralelo (colheitas + transferências recebidas/enviadas + devoluções).
      // Cada fonte contribui para o saldo por (inscrição, local).
      const colheitasPromise = (async () => {
        let q = supabase
          .from('colheitas')
          .select(`
            inscricao_produtor_id,
            producao_liquida_kg,
            variedade_id,
            local_entrega_terceiro_id,
            local_entrega:locais_entrega!colheitas_local_entrega_terceiro_id_fkey(id, nome)
          `)
          .eq('safra_id', filters.safraId)
          .not('inscricao_produtor_id', 'is', null);
        if (produtoIds?.length) q = q.in('variedade_id', produtoIds);
        if (localFilter) q = q.eq('local_entrega_terceiro_id', localFilter);
        const { data, error } = await q;
        if (error) throw error;
        return data || [];
      })();

      const recebidasPromise = (async () => {
        let q = supabase
          .from('transferencias_deposito')
          .select(`
            inscricao_destino_id,
            quantidade_kg,
            local_entrada_id,
            local_entrega:locais_entrega!transferencias_deposito_local_entrada_id_fkey(id, nome)
          `)
          .eq('safra_id', filters.safraId);
        if (produtoIds?.length) q = q.in('produto_id', produtoIds);
        if (localFilter) q = q.eq('local_entrada_id', localFilter);
        const { data, error } = await q;
        if (error) throw error;
        return data || [];
      })();

      const enviadasPromise = (async () => {
        let q = supabase
          .from('transferencias_deposito')
          .select('inscricao_origem_id, quantidade_kg, local_saida_id')
          .eq('safra_id', filters.safraId);
        if (produtoIds?.length) q = q.in('produto_id', produtoIds);
        if (localFilter) q = q.eq('local_saida_id', localFilter);
        const { data, error } = await q;
        if (error) throw error;
        return data || [];
      })();

      const devolucoesPromise = (async () => {
        let q = supabase
          .from('devolucoes_deposito')
          .select('inscricao_produtor_id, quantidade_kg, kg_taxa_armazenagem, local_entrega_id')
          .eq('safra_id', filters.safraId)
          .neq('status', 'cancelada');
        if (produtoIds?.length) q = q.in('produto_id', produtoIds);
        if (localFilter) q = q.eq('local_entrega_id', localFilter);
        const { data, error } = await q;
        if (error) throw error;
        return data || [];
      })();

      // Notas de depósito emitidas: reduzem o saldo por inscrição (agregado,
      // pois a tabela não guarda local_entrega_id).
      const emitidasPromise = (async () => {
        let q = supabase
          .from('notas_deposito_emitidas')
          .select('inscricao_produtor_id, quantidade_kg, nota_fiscal_id')
          .eq('safra_id', filters.safraId);
        if (produtoIds?.length) q = q.in('produto_id', produtoIds);
        const { data, error } = await q;
        if (error) throw error;
        return data || [];
      })();

      const [colheitas, recebidas, enviadas, devolucoes, emitidas] = await Promise.all([
        colheitasPromise,
        recebidasPromise,
        enviadasPromise,
        devolucoesPromise,
        emitidasPromise,
      ]);

      // Excluir emissões cuja NF-e esteja cancelada
      let emitidasValidas = emitidas as any[];
      const nfIds = emitidasValidas.map((n) => n.nota_fiscal_id).filter(Boolean);
      if (nfIds.length > 0) {
        const { data: nfCanceladas } = await supabase
          .from('notas_fiscais')
          .select('id')
          .in('id', nfIds)
          .eq('status', 'cancelada');
        const canceladasSet = new Set((nfCanceladas || []).map((n: any) => n.id));
        if (canceladasSet.size > 0) {
          emitidasValidas = emitidasValidas.filter(
            (n) => !n.nota_fiscal_id || !canceladasSet.has(n.nota_fiscal_id)
          );
        }
      }

      // Total emitido por inscrição (usado para filtrar inscrições sem saldo global)
      const emitidoPorInscricao = new Map<string, number>();
      emitidasValidas.forEach((n: any) => {
        if (!n.inscricao_produtor_id) return;
        emitidoPorInscricao.set(
          n.inscricao_produtor_id,
          (emitidoPorInscricao.get(n.inscricao_produtor_id) || 0) + round(n.quantidade_kg)
        );
      });

      // Buckets: chave = `${inscId}_${localId}` → saldo consolidado.
      interface Bucket {
        inscId: string;
        localId: string | null;
        localNome: string | null;
        total_depositado: number;
        saldo: number;
      }
      const buckets = new Map<string, Bucket>();

      const getBucket = (inscId: string, localId: string | null, localNome: string | null) => {
        const key = `${inscId}_${localKey(localId)}`;
        let b = buckets.get(key);
        if (!b) {
          b = { inscId, localId, localNome, total_depositado: 0, saldo: 0 };
          buckets.set(key, b);
        } else if (!b.localNome && localNome) {
          b.localNome = localNome;
        }
        return b;
      };

      colheitas.forEach((c: any) => {
        if (!c.inscricao_produtor_id) return;
        const kg = round(c.producao_liquida_kg);
        const b = getBucket(c.inscricao_produtor_id, c.local_entrega_terceiro_id, c.local_entrega?.nome || null);
        b.total_depositado += kg;
        b.saldo += kg;
      });

      recebidas.forEach((t: any) => {
        if (!t.inscricao_destino_id) return;
        const b = getBucket(t.inscricao_destino_id, t.local_entrada_id, t.local_entrega?.nome || null);
        b.saldo += round(t.quantidade_kg);
      });

      enviadas.forEach((t: any) => {
        if (!t.inscricao_origem_id) return;
        const b = getBucket(t.inscricao_origem_id, t.local_saida_id, null);
        b.saldo -= round(t.quantidade_kg);
      });

      devolucoes.forEach((d: any) => {
        if (!d.inscricao_produtor_id) return;
        const b = getBucket(d.inscricao_produtor_id, d.local_entrega_id, null);
        // Taxa de armazenagem também sai do estoque do produtor (conforme
        // fórmula de useSaldoDisponivelProdutor: kg_taxa é crédito do sócio,
        // portanto reduz o disponível do produtor).
        b.saldo -= round(d.quantidade_kg) + round(d.kg_taxa_armazenagem);
      });

      // Buscar metadados das inscrições envolvidas.
      const inscIds = Array.from(new Set(Array.from(buckets.values()).map((b) => b.inscId)));
      if (inscIds.length === 0) return [];

      const { data: inscricoesData, error: inscError } = await supabase
        .from('inscricoes_produtor')
        .select(`
          id,
          inscricao_estadual,
          cpf_cnpj,
          nome_fantasia,
          granja,
          granja_id,
          produtores(nome, tipo_produtor)
        `)
        .in('id', inscIds);
      if (inscError) throw inscError;

      const inscMeta = new Map<string, any>();
      (inscricoesData || []).forEach((i: any) => inscMeta.set(i.id, i));

      // Buscar nomes de locais que ainda não temos.
      const localIdsSemNome = Array.from(
        new Set(
          Array.from(buckets.values())
            .filter((b) => b.localId && !b.localNome)
            .map((b) => b.localId as string)
        )
      );
      if (localIdsSemNome.length > 0) {
        const { data: locaisData } = await supabase
          .from('locais_entrega')
          .select('id, nome')
          .in('id', localIdsSemNome);
        const locaisMap = new Map<string, string>((locaisData || []).map((l: any) => [l.id, l.nome]));
        buckets.forEach((b) => {
          if (b.localId && !b.localNome) b.localNome = locaisMap.get(b.localId) || null;
        });
      }

      // Saldo total por inscrição (soma de todos os locais - notas emitidas)
      const saldoTotalPorInscricao = new Map<string, number>();
      buckets.forEach((b) => {
        saldoTotalPorInscricao.set(
          b.inscId,
          (saldoTotalPorInscricao.get(b.inscId) || 0) + b.saldo
        );
      });
      emitidoPorInscricao.forEach((qtd, inscId) => {
        saldoTotalPorInscricao.set(inscId, (saldoTotalPorInscricao.get(inscId) || 0) - qtd);
      });

      const resultado: InscricaoComSaldoPorLocal[] = [];
      buckets.forEach((b) => {
        const meta = inscMeta.get(b.inscId);
        if (!meta) return;
        const tipoProdutor = meta.produtores?.tipo_produtor;
        if (tipoProdutor !== 'produtor') return;
        if (filters.granjaId && meta.granja_id !== filters.granjaId) return;
        if (b.saldo <= 0) return;
        // Se o saldo agregado (todos os locais menos emissões) já é <= 0,
        // não faz sentido oferecer esta inscrição para emissão de nova nota.
        if ((saldoTotalPorInscricao.get(b.inscId) || 0) <= 0) return;

        resultado.push({
          id: b.inscId,
          inscricao_estadual: meta.inscricao_estadual,
          cpf_cnpj: meta.cpf_cnpj,
          nome_fantasia: meta.nome_fantasia || null,
          granja: meta.granja,
          granja_id: meta.granja_id,
          produtor_nome: meta.produtores?.nome || null,
          local_entrega_id: b.localId,
          local_entrega_nome: b.localNome,
          total_depositado: b.total_depositado,
          saldo_disponivel: b.saldo,
        });
      });

      return resultado.sort((a, b) => {
        const na = (a.produtor_nome || a.nome_fantasia || a.inscricao_estadual || '').toString();
        const nb = (b.produtor_nome || b.nome_fantasia || b.inscricao_estadual || '').toString();
        return na.localeCompare(nb, 'pt-BR', { sensitivity: 'base' });
      });
    },
    enabled: !!filters.safraId,
  });
}


// Hook para buscar locais de entrega que têm colheitas
export function useLocaisEntregaComColheitas(filters: { safraId?: string; produtoId?: string }) {
  return useQuery({
    queryKey: ['locais_entrega_com_colheitas', filters],
    queryFn: async () => {
      if (!filters.safraId) return [];

      const produtoIds = filters.produtoId ? await resolveSaldoProdutoIds(filters.produtoId) : null;

      // Buscar colheitas com local de entrega - com ou sem safra_id
      let query = supabase
        .from('colheitas')
        .select(`
          local_entrega_terceiro_id,
          safra_id,
          local_entrega:locais_entrega!colheitas_local_entrega_terceiro_id_fkey(id, nome, is_sede)
        `)
        .not('local_entrega_terceiro_id', 'is', null);

      if (produtoIds?.length) {
        query = query.in('variedade_id', produtoIds);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Filtrar por safra: incluir colheitas da safra selecionada OU sem safra
      const filtered = data?.filter((c: any) => 
        !c.safra_id || c.safra_id === filters.safraId
      );

      // Extrair locais únicos
      const locaisMap = new Map<string, { id: string; nome: string; is_sede: boolean }>();
      filtered?.forEach((c: any) => {
        if (c.local_entrega && !locaisMap.has(c.local_entrega.id)) {
          locaisMap.set(c.local_entrega.id, {
            id: c.local_entrega.id,
            nome: c.local_entrega.nome,
            is_sede: c.local_entrega.is_sede || false,
          });
        }
      });

      return Array.from(locaisMap.values());
    },
    enabled: !!filters.safraId,
  });
}
