/**
 * Normalização do detalhamento de erros devolvido pela API Focus NFe / SEFAZ.
 *
 * A Focus NFe devolve, em rejeições de schema, uma mensagem genérica
 * ("Erro na validação do Schema XML, verifique o detalhamento dos erros")
 * acompanhada de uma lista `erros`, que pode vir em formatos diferentes:
 *   - array de strings:  ["campo X inválido", ...]
 *   - array de objetos:  [{ campo: "xBairro", mensagem: "..." }, ...]
 *   - array de objetos:  [{ codigo: "...", mensagem: "..." }, ...]
 *
 * Este módulo converte qualquer um desses formatos em uma estrutura estável
 * para persistir em `notas_fiscais.erros_api` e exibir na interface.
 */

export interface ErroNfeNormalizado {
  campo: string | null;
  mensagem: string;
  codigo?: string | null;
}

export interface ErrosApiPersistidos {
  codigo?: string | null;
  mensagem?: string | null;
  status_sefaz?: string | null;
  erros: ErroNfeNormalizado[];
  /** Momento da captura, para auditoria */
  capturado_em: string;
}

function asString(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "string") return v.trim() || null;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return null;
}

/** Extrai e normaliza a lista de erros de uma resposta da Focus NFe. */
export function normalizarErrosFocus(responseData: unknown): ErroNfeNormalizado[] {
  const data = (responseData ?? {}) as Record<string, unknown>;
  const brutos = data.erros ?? data.errors ?? data.detalhes ?? null;
  const lista: ErroNfeNormalizado[] = [];

  const push = (campo: unknown, mensagem: unknown, codigo?: unknown) => {
    const msg = asString(mensagem);
    if (!msg) return;
    lista.push({
      campo: asString(campo),
      mensagem: msg,
      codigo: asString(codigo),
    });
  };

  if (Array.isArray(brutos)) {
    for (const item of brutos) {
      if (typeof item === "string") {
        push(null, item);
      } else if (item && typeof item === "object") {
        const o = item as Record<string, unknown>;
        push(
          o.campo ?? o.field ?? o.caminho ?? o.path ?? null,
          o.mensagem ?? o.message ?? o.descricao ?? o.erro ?? JSON.stringify(o),
          o.codigo ?? o.code ?? null,
        );
      }
    }
  } else if (brutos && typeof brutos === "object") {
    // Formato { campo: "mensagem" } ou { campo: ["m1","m2"] }
    for (const [campo, valor] of Object.entries(brutos as Record<string, unknown>)) {
      if (Array.isArray(valor)) valor.forEach((v) => push(campo, v));
      else push(campo, valor);
    }
  } else if (typeof brutos === "string") {
    push(null, brutos);
  }

  return lista;
}

/** Monta o objeto completo a ser gravado em `notas_fiscais.erros_api`. */
export function montarErrosApi(responseData: unknown): ErrosApiPersistidos | null {
  const data = (responseData ?? {}) as Record<string, unknown>;
  const erros = normalizarErrosFocus(data);
  const mensagem = asString(data.mensagem_sefaz) ?? asString(data.mensagem);
  const codigo = asString(data.codigo);
  const statusSefaz = asString(data.status_sefaz);

  if (erros.length === 0 && !mensagem && !codigo) return null;

  return {
    codigo,
    mensagem,
    status_sefaz: statusSefaz,
    erros,
    capturado_em: new Date().toISOString(),
  };
}

/**
 * Texto resumido para `motivo_status`: mensagem principal + os primeiros
 * erros detalhados (para que o usuário veja algo útil mesmo na lista).
 */
export function resumirErros(
  mensagemPrincipal: string | null | undefined,
  erros: ErroNfeNormalizado[],
  maxErros = 3,
): string {
  const partes: string[] = [];
  const principal = asString(mensagemPrincipal);
  if (principal) partes.push(principal);

  if (erros.length > 0) {
    const amostra = erros
      .slice(0, maxErros)
      .map((e) => (e.campo ? `${e.campo}: ${e.mensagem}` : e.mensagem))
      .join(" | ");
    const restante = erros.length > maxErros ? ` (+${erros.length - maxErros} erro(s))` : "";
    partes.push(`Detalhes — ${amostra}${restante}`);
  }

  return partes.join(" — ") || "Erro desconhecido";
}
