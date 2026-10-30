import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

export const DEMO_EMAIL = "demo@sisagro.app";
const WHATSAPP_PHONE = "5555996391464";

/** Faixa exibida apenas para o usuário do ambiente de demonstração. */
export function DemoBanner() {
  const { user } = useAuth();
  if (user?.email !== DEMO_EMAIL) return null;

  const url = `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(
    "Olá! Testei a demonstração do SisAgro e quero usar na minha empresa."
  )}`;

  return (
    <div className="flex flex-col items-center justify-center gap-2 bg-primary px-3 py-2 text-center text-sm text-primary-foreground sm:flex-row sm:gap-4">
      <span>
        Você está na <strong>empresa de demonstração</strong> — os dados são fictícios.
      </span>
      <Button asChild size="sm" variant="secondary" className="h-7 gap-1.5">
        <a href={url} target="_blank" rel="noopener noreferrer">
          <MessageCircle className="h-3.5 w-3.5" />
          Quero contratar
        </a>
      </Button>
    </div>
  );
}
