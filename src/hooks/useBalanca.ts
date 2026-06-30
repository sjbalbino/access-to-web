import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

/**
 * Integração com balança de pesagem via leitura de arquivo TXT.
 *
 * Estratégia: File System Access API (Chrome/Edge). O usuário seleciona
 * uma única vez o arquivo gerado pela balança (ex.: C:\LESBR\peso.txt) e
 * o sistema faz polling lendo o conteúdo a cada N ms.
 *
 * Parser genérico configurável:
 *  - decimal: "," ou "."
 *  - unidade: "kg" | "g" | "t" (converte para kg)
 *  - regex opcional para extrair o peso (default: pega o último número)
 */

export interface BalancaConfig {
  decimal: "," | ".";
  unidade: "kg" | "g" | "t";
  regex?: string; // opcional - precisa ter 1 grupo de captura
  pollMs: number;
  caminhoHint: string; // só p/ exibir ao usuário (ex.: C:\LESBR\peso.txt)
}

const DEFAULT_CONFIG: BalancaConfig = {
  decimal: ",",
  unidade: "kg",
  regex: "",
  pollMs: 500,
  caminhoHint: "C:\\LESBR\\peso.txt",
};

const STORAGE_KEY = "balanca_config_v1";

export function loadBalancaConfig(): BalancaConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_CONFIG;
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function saveBalancaConfig(cfg: BalancaConfig) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
}

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
      // regex inválida -> fallback
    }
  }

  if (!bruto) {
    // Pega o ÚLTIMO número do arquivo (balanças tendem a repetir/atualizar a última linha)
    const matches = limpo.match(/-?\d+(?:[.,]\d+)?/g);
    if (!matches || matches.length === 0) return null;
    bruto = matches[matches.length - 1];
  }

  // Normaliza decimal
  let normalizado: string;
  if (cfg.decimal === ",") {
    normalizado = bruto.replace(/\./g, "").replace(",", ".");
  } else {
    normalizado = bruto.replace(/,/g, "");
  }

  const n = parseFloat(normalizado);
  if (isNaN(n)) return null;

  // Converte para kg
  switch (cfg.unidade) {
    case "g":
      return n / 1000;
    case "t":
      return n * 1000;
    default:
      return n;
  }
}

interface UseBalancaOptions {
  onPeso?: (kg: number) => void;
}

export function useBalanca(opts: UseBalancaOptions = {}) {
  const [config, setConfig] = useState<BalancaConfig>(loadBalancaConfig);
  const [conectado, setConectado] = useState(false);
  const [peso, setPeso] = useState<number | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const handleRef = useRef<FileSystemFileHandle | null>(null);
  const timerRef = useRef<number | null>(null);
  const onPesoRef = useRef(opts.onPeso);

  useEffect(() => {
    onPesoRef.current = opts.onPeso;
  }, [opts.onPeso]);

  const suportado = typeof (window as any).showOpenFilePicker === "function";

  const desconectar = useCallback(() => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    handleRef.current = null;
    setConectado(false);
  }, []);

  const ler = useCallback(async () => {
    if (!handleRef.current) return;
    try {
      const file = await handleRef.current.getFile();
      const text = await file.text();
      const kg = parsePesoFromText(text, config);
      if (kg !== null) {
        setPeso(kg);
        setErro(null);
        onPesoRef.current?.(kg);
      }
    } catch (e: any) {
      setErro(e?.message || "Erro ao ler arquivo da balança");
    }
  }, [config]);

  const conectar = useCallback(async () => {
    if (!suportado) {
      toast.error("Navegador sem suporte. Use Chrome ou Edge no PC da balança.");
      return;
    }
    try {
      const [handle] = await (window as any).showOpenFilePicker({
        multiple: false,
        types: [
          {
            description: "Arquivo da balança",
            accept: { "text/plain": [".txt", ".csv", ".dat", ".log"] },
          },
        ],
      });
      handleRef.current = handle;
      setConectado(true);
      setErro(null);
      await ler();
      timerRef.current = window.setInterval(() => { void ler(); }, config.pollMs);
      toast.success("Balança conectada!");
    } catch (e: any) {
      if (e?.name !== "AbortError") {
        toast.error("Falha ao conectar: " + (e?.message || e));
      }
    }
  }, [suportado, ler, config.pollMs]);

  // Reinicia polling se mudar pollMs com conexão ativa
  useEffect(() => {
    if (conectado && timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = window.setInterval(() => { void ler(); }, config.pollMs);
    }
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.pollMs, conectado]);

  const atualizarConfig = useCallback((c: BalancaConfig) => {
    saveBalancaConfig(c);
    setConfig(c);
  }, []);

  return {
    suportado,
    conectado,
    peso,
    erro,
    config,
    conectar,
    desconectar,
    atualizarConfig,
    lerAgora: ler,
  };
}
