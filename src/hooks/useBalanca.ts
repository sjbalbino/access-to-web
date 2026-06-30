import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  saveBalancaHandle,
  loadBalancaHandle,
  clearBalancaHandle,
  queryHandlePermission,
  requestHandlePermission,
} from "@/lib/balancaHandleStorage";

/**
 * Integração com balança de pesagem via leitura de arquivo TXT.
 *
 * - Configurações (decimal, unidade, regex, intervalo, dica de caminho)
 *   são persistidas em `configuracoes_balanca` por tenant.
 * - O handle do arquivo é guardado em IndexedDB local (FileSystemFileHandle),
 *   então o usuário seleciona o arquivo apenas uma vez por PC/navegador.
 */

export interface BalancaConfig {
  decimal: "," | ".";
  unidade: "kg" | "g" | "t";
  regex?: string;
  pollMs: number;
  caminhoHint: string;
}

const DEFAULT_CONFIG: BalancaConfig = {
  decimal: ",",
  unidade: "kg",
  regex: "",
  pollMs: 500,
  caminhoHint: "C:\\LESBR\\peso.txt",
};

const LEGACY_KEY = "balanca_config_v1";

export function parsePesoFromText(text: string, cfg: BalancaConfig): number | null {
  if (!text) return null;
  const limpo = text.replace(/\r/g, " ").trim();
  let bruto: string | null = null;

  if (cfg.regex && cfg.regex.trim()) {
    try {
      const re = new RegExp(cfg.regex);
      const m = limpo.match(re);
      if (m) bruto = (m[1] ?? m[0]).trim();
    } catch {
      // ignore
    }
  }

  if (!bruto) {
    const matches = limpo.match(/-?\d+(?:[.,]\d+)?/g);
    if (!matches || matches.length === 0) return null;
    bruto = matches[matches.length - 1];
  }

  let normalizado: string;
  if (cfg.decimal === ",") {
    normalizado = bruto.replace(/\./g, "").replace(",", ".");
  } else {
    normalizado = bruto.replace(/,/g, "");
  }

  const n = parseFloat(normalizado);
  if (isNaN(n)) return null;

  switch (cfg.unidade) {
    case "g": return n / 1000;
    case "t": return n * 1000;
    default: return n;
  }
}

interface UseBalancaOptions {
  onPeso?: (kg: number) => void;
}

export function useBalanca(opts: UseBalancaOptions = {}) {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id || null;

  const [config, setConfig] = useState<BalancaConfig>(() => {
    // Fallback inicial: tenta carregar do localStorage legado
    try {
      const raw = localStorage.getItem(LEGACY_KEY);
      if (raw) return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
    } catch {}
    return DEFAULT_CONFIG;
  });
  const [conectado, setConectado] = useState(false);
  const [peso, setPeso] = useState<number | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [handleSalvo, setHandleSalvo] = useState(false);
  const [precisaReautorizar, setPrecisaReautorizar] = useState(false);

  const handleRef = useRef<FileSystemFileHandle | null>(null);
  const timerRef = useRef<number | null>(null);
  const onPesoRef = useRef(opts.onPeso);
  const configRef = useRef(config);

  useEffect(() => { onPesoRef.current = opts.onPeso; }, [opts.onPeso]);
  useEffect(() => { configRef.current = config; }, [config]);

  const suportado = typeof (window as any).showOpenFilePicker === "function";

  // ---------- Config (Supabase) ----------
  useEffect(() => {
    if (!tenantId) return;
    let cancel = false;
    (async () => {
      const { data } = await (supabase as any)
        .from("configuracoes_balanca")
        .select("*")
        .eq("tenant_id", tenantId)
        .maybeSingle();
      if (cancel) return;
      if (data) {
        setConfig({
          decimal: (data.decimal as "," | ".") || ",",
          unidade: (data.unidade as "kg" | "g" | "t") || "kg",
          regex: data.regex || "",
          pollMs: data.poll_ms || 500,
          caminhoHint: data.caminho_hint || DEFAULT_CONFIG.caminhoHint,
        });
      }
    })();
    return () => { cancel = true; };
  }, [tenantId]);

  // ---------- Restaurar handle do IndexedDB ----------
  useEffect(() => {
    if (!suportado) return;
    let cancel = false;
    (async () => {
      const h = await loadBalancaHandle(tenantId);
      if (cancel || !h) return;
      setHandleSalvo(true);
      const perm = await queryHandlePermission(h);
      if (perm === "granted") {
        handleRef.current = h;
        setConectado(true);
        setPrecisaReautorizar(false);
        void lerInterno();
        timerRef.current = window.setInterval(() => { void lerInterno(); }, configRef.current.pollMs);
      } else {
        setPrecisaReautorizar(true);
      }
    })();
    return () => { cancel = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, suportado]);

  const lerInterno = useCallback(async () => {
    if (!handleRef.current) return;
    try {
      const file = await handleRef.current.getFile();
      const text = await file.text();
      const kg = parsePesoFromText(text, configRef.current);
      if (kg !== null) {
        setPeso(kg);
        setErro(null);
        onPesoRef.current?.(kg);
      }
    } catch (e: any) {
      setErro(e?.message || "Erro ao ler arquivo da balança");
    }
  }, []);

  const startPolling = useCallback(() => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = window.setInterval(() => { void lerInterno(); }, configRef.current.pollMs);
  }, [lerInterno]);

  const desconectar = useCallback(() => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    handleRef.current = null;
    setConectado(false);
  }, []);

  const ativarHandle = useCallback(async (h: FileSystemFileHandle) => {
    handleRef.current = h;
    setConectado(true);
    setPrecisaReautorizar(false);
    setErro(null);
    await lerInterno();
    startPolling();
  }, [lerInterno, startPolling]);

  const conectar = useCallback(async () => {
    if (!suportado) {
      toast.error("Navegador sem suporte. Use Chrome ou Edge no PC da balança.");
      return;
    }
    // Caso já tenhamos handle salvo, só pedir permissão (sem seletor de arquivo)
    try {
      const existente = await loadBalancaHandle(tenantId);
      if (existente) {
        let perm = await queryHandlePermission(existente);
        if (perm !== "granted") perm = await requestHandlePermission(existente);
        if (perm === "granted") {
          await ativarHandle(existente);
          toast.success("Balança reconectada!");
          return;
        }
        toast.error("Permissão negada. Selecione o arquivo novamente.");
      }
      // Sem handle ou permissão definitivamente negada -> abre seletor
      const [handle] = await (window as any).showOpenFilePicker({
        multiple: false,
        types: [{ description: "Arquivo da balança", accept: { "text/plain": [".txt", ".csv", ".dat", ".log"] } }],
      });
      await saveBalancaHandle(tenantId, handle);
      setHandleSalvo(true);
      await ativarHandle(handle);
      toast.success("Balança conectada! Arquivo lembrado para próximas vezes.");
    } catch (e: any) {
      if (e?.name !== "AbortError") {
        toast.error("Falha ao conectar: " + (e?.message || e));
      }
    }
  }, [suportado, tenantId, ativarHandle]);

  const trocarArquivo = useCallback(async () => {
    if (!suportado) return;
    try {
      const [handle] = await (window as any).showOpenFilePicker({
        multiple: false,
        types: [{ description: "Arquivo da balança", accept: { "text/plain": [".txt", ".csv", ".dat", ".log"] } }],
      });
      desconectar();
      await saveBalancaHandle(tenantId, handle);
      setHandleSalvo(true);
      await ativarHandle(handle);
      toast.success("Arquivo da balança atualizado!");
    } catch (e: any) {
      if (e?.name !== "AbortError") toast.error("Falha: " + (e?.message || e));
    }
  }, [suportado, tenantId, desconectar, ativarHandle]);

  const esquecerArquivo = useCallback(async () => {
    desconectar();
    await clearBalancaHandle(tenantId);
    setHandleSalvo(false);
    setPrecisaReautorizar(false);
    toast.success("Arquivo esquecido.");
  }, [tenantId, desconectar]);

  // Reinicia polling se mudar pollMs com conexão ativa
  useEffect(() => {
    if (conectado) startPolling();
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [config.pollMs, conectado, startPolling]);

  const atualizarConfig = useCallback(async (c: BalancaConfig) => {
    setConfig(c);
    if (!tenantId) {
      // Sem tenant: cai pra localStorage
      try { localStorage.setItem(LEGACY_KEY, JSON.stringify(c)); } catch {}
      return;
    }
    const payload = {
      tenant_id: tenantId,
      decimal: c.decimal,
      unidade: c.unidade,
      regex: c.regex || null,
      poll_ms: c.pollMs,
      caminho_hint: c.caminhoHint,
    };
    const { error } = await (supabase as any)
      .from("configuracoes_balanca")
      .upsert(payload, { onConflict: "tenant_id" });
    if (error) {
      toast.error("Erro ao salvar configurações: " + error.message);
    }
  }, [tenantId]);

  return {
    suportado,
    conectado,
    peso,
    erro,
    config,
    handleSalvo,
    precisaReautorizar,
    conectar,
    desconectar,
    trocarArquivo,
    esquecerArquivo,
    atualizarConfig,
    lerAgora: lerInterno,
  };
}
