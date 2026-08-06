import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LeadInput, useEnviarLead } from "@/hooks/useLeadPortal";
import { CheckCircle2 } from "lucide-react";

const estadoInicial: LeadInput = {
  nome: "",
  empresa: "",
  email: "",
  telefone: "",
  cidade: "",
  uf: "",
  qtd_produtores: "",
  mensagem: "",
};

export function LeadForm() {
  const [form, setForm] = useState<LeadInput>(estadoInicial);
  const [enviado, setEnviado] = useState(false);
  const enviar = useEnviarLead();

  const set = (campo: keyof LeadInput) => (valor: string) =>
    setForm((prev) => ({ ...prev, [campo]: valor }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await enviar.mutateAsync(form);
      setForm(estadoInicial);
      setEnviado(true);
    } catch {
      // O erro já é exibido via toast pelo hook.
    }
  };

  if (enviado) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center">
        <CheckCircle2 className="h-10 w-10 text-success mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-foreground mb-1">
          Solicitação recebida
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          Nossa equipe entrará em contato para agendar a demonstração.
        </p>
        <Button variant="outline" onClick={() => setEnviado(false)}>
          Enviar outra solicitação
        </Button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-border bg-card p-5 md:p-6 space-y-4"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="lead-nome">Nome *</Label>
          <Input
            id="lead-nome"
            value={form.nome}
            onChange={(e) => set("nome")(e.target.value)}
            maxLength={120}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lead-empresa">Empresa / Fazenda</Label>
          <Input
            id="lead-empresa"
            value={form.empresa}
            onChange={(e) => set("empresa")(e.target.value)}
            maxLength={160}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lead-email">E-mail *</Label>
          <Input
            id="lead-email"
            type="email"
            value={form.email}
            onChange={(e) => set("email")(e.target.value)}
            maxLength={255}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lead-telefone">Telefone / WhatsApp *</Label>
          <Input
            id="lead-telefone"
            value={form.telefone}
            onChange={(e) => set("telefone")(e.target.value)}
            maxLength={30}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lead-cidade">Cidade</Label>
          <Input
            id="lead-cidade"
            value={form.cidade}
            onChange={(e) => set("cidade")(e.target.value)}
            maxLength={120}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lead-uf">UF</Label>
          <Input
            id="lead-uf"
            value={form.uf}
            onChange={(e) => set("uf")(e.target.value.toUpperCase().slice(0, 2))}
            maxLength={2}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="lead-porte">Volume operado / nº de produtores atendidos</Label>
        <Input
          id="lead-porte"
          placeholder="Ex.: 40 produtores, 300 mil sacas por safra"
          value={form.qtd_produtores}
          onChange={(e) => set("qtd_produtores")(e.target.value)}
          maxLength={40}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="lead-mensagem">Como podemos ajudar?</Label>
        <Textarea
          id="lead-mensagem"
          rows={4}
          value={form.mensagem}
          onChange={(e) => set("mensagem")(e.target.value)}
          maxLength={1000}
        />
      </div>

      <Button type="submit" className="w-full" disabled={enviar.isPending}>
        {enviar.isPending ? "Enviando..." : "Solicitar demonstração"}
      </Button>

      <p className="text-xs text-muted-foreground">
        Seus dados são usados apenas para retorno comercial.
      </p>
    </form>
  );
}
