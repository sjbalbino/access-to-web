import { useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { Loader2, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const schema = z.object({
  nome: z.string().trim().min(2, "Informe seu nome").max(150),
  email: z.string().trim().email("Informe um e-mail válido").max(255),
  telefone: z.string().trim().max(20).optional(),
  empresa: z.string().trim().max(200).optional(),
});

export interface DemoAccessDialogProps {
  trigger: ReactNode;
}

/** Abre a empresa de demonstração com dados fictícios após registrar o interessado. */
export function DemoAccessDialog({ trigger }: DemoAccessDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ nome: "", email: "", telefone: "", empresa: "" });
  const [erro, setErro] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) { setErro(parsed.error.issues[0].message); return; }
    setErro(null);
    setLoading(true);
    try {
      const { data: res, error } = await supabase.functions.invoke("start-demo", { body: parsed.data });
      if (error || !res?.email) throw new Error(res?.error ?? "Falha ao abrir a demonstração");
      const { error: signErr } = await supabase.auth.signInWithPassword({ email: res.email, password: res.password });
      if (signErr) throw signErr;
      setOpen(false);
      navigate("/dashboard");
    } catch (err) {
      toast({
        title: "Não foi possível abrir a demonstração",
        description: err instanceof Error ? err.message : "Tente novamente em instantes.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const campo = (id: keyof typeof form, label: string, type = "text") => (
    <div className="space-y-1.5">
      <Label htmlFor={`demo-${id}`}>{label}</Label>
      <Input id={`demo-${id}`} type={type} value={form[id]}
        onChange={(e) => setForm((f) => ({ ...f, [id]: e.target.value }))} />
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Testar o SisAgro</DialogTitle>
          <DialogDescription>
            Preencha seus dados e entre agora em uma empresa de demonstração com dados fictícios.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          {campo("nome", "Nome *")}
          {campo("email", "E-mail *", "email")}
          {campo("telefone", "WhatsApp")}
          {campo("empresa", "Fazenda / Cerealista")}
          {erro && <p className="text-xs text-destructive">{erro}</p>}
          <Button type="submit" className="w-full gap-2" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
            Entrar na demonstração
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
