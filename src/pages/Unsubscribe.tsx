import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle2, AlertCircle, MailX } from "lucide-react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

type State =
  | { kind: "loading" }
  | { kind: "valid" }
  | { kind: "already" }
  | { kind: "invalid" }
  | { kind: "submitting" }
  | { kind: "done" }
  | { kind: "error"; message: string };

export default function Unsubscribe() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    if (!token) {
      setState({ kind: "invalid" });
      return;
    }
    (async () => {
      try {
        const res = await fetch(
          `${SUPABASE_URL}/functions/v1/handle-email-unsubscribe?token=${encodeURIComponent(token)}`,
          { headers: { apikey: SUPABASE_ANON_KEY } }
        );
        const data = await res.json();
        if (!res.ok) {
          setState({ kind: "invalid" });
          return;
        }
        if (data.valid === false && data.reason === "already_unsubscribed") {
          setState({ kind: "already" });
        } else if (data.valid === true) {
          setState({ kind: "valid" });
        } else {
          setState({ kind: "invalid" });
        }
      } catch (e: any) {
        setState({ kind: "error", message: e?.message ?? "Erro" });
      }
    })();
  }, [token]);

  const confirmar = async () => {
    if (!token) return;
    setState({ kind: "submitting" });
    try {
      const res = await fetch(
        `${SUPABASE_URL}/functions/v1/handle-email-unsubscribe`,
        {
          method: "POST",
          headers: {
            apikey: SUPABASE_ANON_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ token }),
        }
      );
      const data = await res.json();
      if (data.success || data.reason === "already_unsubscribed") {
        setState({ kind: "done" });
      } else {
        setState({ kind: "error", message: data.error ?? "Falha ao cancelar inscrição" });
      }
    } catch (e: any) {
      setState({ kind: "error", message: e?.message ?? "Erro" });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <MailX className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>Cancelar inscrição de e-mails</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          {state.kind === "loading" && (
            <div className="flex flex-col items-center gap-2 py-4">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Validando link...</p>
            </div>
          )}

          {state.kind === "valid" && (
            <>
              <p className="text-sm text-muted-foreground">
                Confirme abaixo para deixar de receber e-mails do AgroGestão.
              </p>
              <Button onClick={confirmar} className="w-full">
                Confirmar cancelamento
              </Button>
            </>
          )}

          {state.kind === "submitting" && (
            <div className="flex flex-col items-center gap-2 py-4">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Processando...</p>
            </div>
          )}

          {state.kind === "done" && (
            <div className="flex flex-col items-center gap-2 py-4">
              <CheckCircle2 className="h-10 w-10 text-primary" />
              <p className="text-sm">
                Inscrição cancelada. Você não receberá mais e-mails deste endereço.
              </p>
            </div>
          )}

          {state.kind === "already" && (
            <div className="flex flex-col items-center gap-2 py-4">
              <CheckCircle2 className="h-10 w-10 text-primary" />
              <p className="text-sm">
                Este e-mail já estava cancelado.
              </p>
            </div>
          )}

          {state.kind === "invalid" && (
            <div className="flex flex-col items-center gap-2 py-4">
              <AlertCircle className="h-10 w-10 text-destructive" />
              <p className="text-sm text-muted-foreground">
                Link inválido ou expirado.
              </p>
            </div>
          )}

          {state.kind === "error" && (
            <div className="flex flex-col items-center gap-2 py-4">
              <AlertCircle className="h-10 w-10 text-destructive" />
              <p className="text-sm text-muted-foreground">{state.message}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
