import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight, Copy, ListTree } from "lucide-react";
import { toast } from "sonner";
import {
  extrairErrosDetalhados,
  orientacaoCampoSchema,
  type ErroDetalhadoSefaz,
} from "@/lib/sefazRejeicoes";

export interface DetalhesErrosSefazProps {
  /** Conteúdo de notas_fiscais.erros_api, ou o retorno bruto da edge function */
  fonte?: unknown;
  /** Lista já normalizada (opcional) — tem prioridade sobre `fonte` */
  erros?: ErroDetalhadoSefaz[];
  /** Inicia expandido (padrão: true quando há poucos erros) */
  defaultAberto?: boolean;
  className?: string;
}

/**
 * Painel de detalhamento dos erros devolvidos pela SEFAZ / Focus NFe.
 *
 * Mostra, para cada erro: o campo técnico do XML, a descrição original e a
 * orientação de onde corrigir no sistema. Permite copiar o detalhamento
 * completo para enviar ao contador/suporte.
 */
export function DetalhesErrosSefaz({
  fonte,
  erros,
  defaultAberto,
  className,
}: DetalhesErrosSefazProps) {
  const lista = erros && erros.length > 0 ? erros : extrairErrosDetalhados(fonte);
  const [aberto, setAberto] = useState(defaultAberto ?? lista.length <= 5);

  if (lista.length === 0) return null;

  const copiar = async () => {
    const texto = lista
      .map((e, i) => {
        const orientacao = orientacaoCampoSchema(e.campo, e.mensagem);
        return [
          `${i + 1}. ${e.campo ? `[${e.campo}] ` : ""}${e.mensagem}`,
          orientacao ? `   Onde corrigir: ${orientacao}` : null,
        ]
          .filter(Boolean)
          .join("\n");
      })
      .join("\n");
    try {
      await navigator.clipboard.writeText(texto);
      toast.success("Detalhamento copiado");
    } catch {
      toast.error("Não foi possível copiar automaticamente");
    }
  };

  return (
    <div className={className}>
      <div className="flex flex-wrap items-center gap-2 border-t pt-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2"
          onClick={() => setAberto((v) => !v)}
        >
          {aberto ? <ChevronDown className="h-4 w-4 mr-1" /> : <ChevronRight className="h-4 w-4 mr-1" />}
          <ListTree className="h-4 w-4 mr-1" />
          Detalhamento dos erros
          <Badge variant="secondary" className="ml-2">{lista.length}</Badge>
        </Button>
        <Button type="button" variant="ghost" size="sm" className="h-7 px-2" onClick={copiar}>
          <Copy className="h-4 w-4 mr-1" /> Copiar detalhes
        </Button>
      </div>

      {aberto && (
        <ol className="mt-2 space-y-2">
          {lista.map((e, i) => {
            const orientacao = orientacaoCampoSchema(e.campo, e.mensagem);
            return (
              <li
                key={`${e.campo ?? "erro"}-${i}`}
                className="rounded-md border bg-background/60 p-2 text-sm break-words"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-muted-foreground">#{i + 1}</span>
                  {e.campo && (
                    <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                      {e.campo}
                    </code>
                  )}
                  {e.codigo && (
                    <Badge variant="outline" className="text-xs">{e.codigo}</Badge>
                  )}
                </div>
                <p className="mt-1 whitespace-pre-wrap font-mono text-xs">{e.mensagem}</p>
                {orientacao && (
                  <p className="mt-1 text-xs">
                    <span className="font-semibold">Onde corrigir: </span>
                    {orientacao}
                  </p>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

export default DetalhesErrosSefaz;

/** Utilitário para uso em textos simples (ex.: descrição de toast) */
export function resumirErrosParaTexto(fonte: unknown, max = 3): string | null {
  const lista = extrairErrosDetalhados(fonte);
  if (lista.length === 0) return null;
  const amostra = lista
    .slice(0, max)
    .map((e) => (e.campo ? `${e.campo}: ${e.mensagem}` : e.mensagem))
    .join(" | ");
  const restante = lista.length > max ? ` (+${lista.length - max} erro(s))` : "";
  return `${amostra}${restante}`;
}

