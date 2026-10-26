// Envio de e-mails do próprio SisAgro via Resend (connector gateway).
// Usado quando o provedor fiscal do emitente não oferece envio de e-mail
// (ex.: Unimake / UniNFe Cloud): o DANFE (PDF) e o XML autorizado vão anexados.

const RESEND_GATEWAY = "https://connector-gateway.lovable.dev/resend";

export interface ResendAnexo {
  filename: string;
  /** Conteúdo do arquivo em base64. */
  content: string;
}

export interface ResendEnvioResult {
  ok: boolean;
  status: number;
  body: Record<string, unknown> | null;
}

/** Remetente configurável; por padrão usa o domínio verificado do projeto no Resend. */
export const remetentePadraoResend = (): string =>
  Deno.env.get("RESEND_FROM_EMAIL") ?? "SisAgro <noreply@sisagro.app>";

export async function enviarEmailResend(opts: {
  to: string[];
  subject: string;
  html: string;
  from?: string;
  attachments?: ResendAnexo[];
}): Promise<ResendEnvioResult> {
  const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  if (!lovableApiKey || !resendApiKey) {
    throw new Error("Envio de e-mail não configurado: conecte o serviço Resend ao projeto.");
  }

  const resp = await fetch(`${RESEND_GATEWAY}/emails`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${lovableApiKey}`,
      "X-Connection-Api-Key": resendApiKey,
    },
    body: JSON.stringify({
      from: opts.from ?? remetentePadraoResend(),
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      ...(opts.attachments?.length ? { attachments: opts.attachments } : {}),
    }),
  });

  const text = await resp.text();
  let body: Record<string, unknown> | null = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { raw: text };
  }
  return { ok: resp.ok, status: resp.status, body };
}

/** Codifica bytes como base64 (com suporte a Uint8Array grandes, sem estourar a pilha). */
export function bytesParaBase64(u8: Uint8Array): string {
  let binario = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < u8.length; i += CHUNK) {
    binario += String.fromCharCode(...u8.subarray(i, i + CHUNK));
  }
  return btoa(binario);
}
