import { Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { Seo } from "@/components/portal/Seo";
import { LeadForm } from "@/components/portal/LeadForm";
import { abrirWhatsapp, PORTAL_CONTATO, PORTAL_NOME, whatsappLink } from "@/config/portal";
import { Button } from "@/components/ui/button";

export default function PortalContato() {
  const wa = whatsappLink(
    `Olá! Gostaria de solicitar uma demonstração do ${PORTAL_NOME}.`,
  );

  return (
    <PortalLayout>
      <Seo
        title="Solicitar demonstração — SisAgro"
        description="Fale com nossa equipe e agende uma demonstração do SisAgro para sua cerealista, armazém ou propriedade rural."
        path="/contato"
      />

      <section className="border-b border-border bg-muted/30">
        <div className="container max-w-6xl px-4 py-12">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
            Solicitar demonstração
          </h1>
          <p className="text-muted-foreground max-w-2xl">
            Preencha o formulário e nossa equipe entra em contato para agendar uma
            apresentação do sistema, sem compromisso.
          </p>
        </div>
      </section>

      <section className="container max-w-6xl px-4 py-12 grid gap-10 lg:grid-cols-2 items-start">
        <LeadForm />

        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            <h2 className="font-semibold text-foreground">Outros canais</h2>

            {PORTAL_CONTATO.email && (
              <p className="flex items-center gap-3 text-sm text-muted-foreground">
                <Mail className="h-4 w-4 text-primary" />
                {PORTAL_CONTATO.email}
              </p>
            )}
            {PORTAL_CONTATO.telefoneExibicao && (
              <p className="flex items-center gap-3 text-sm text-muted-foreground">
                <Phone className="h-4 w-4 text-primary" />
                {PORTAL_CONTATO.telefoneExibicao}
              </p>
            )}
            {PORTAL_CONTATO.cidade && (
              <p className="flex items-center gap-3 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4 text-primary" />
                {PORTAL_CONTATO.cidade}
                {PORTAL_CONTATO.uf ? ` - ${PORTAL_CONTATO.uf}` : ""}
              </p>
            )}

            {wa ? (
              <Button asChild variant="outline" className="w-full">
                <a
                  href={wa}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => abrirWhatsapp(wa, e)}
                >
                  <MessageCircle className="mr-2 h-4 w-4" />
                  Falar no WhatsApp
                </a>
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">
                O formulário é o canal mais rápido: sua solicitação chega direto à nossa
                equipe comercial.
              </p>
            )}
          </div>

          <div className="rounded-xl border border-border bg-muted/40 p-6">
            <h2 className="font-semibold text-foreground mb-2">
              Já é cliente {PORTAL_NOME}?
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              Acesse o sistema com seu login para continuar de onde parou.
            </p>
            <Button asChild variant="secondary">
              <a href="/auth">Acessar o sistema</a>
            </Button>
          </div>
        </div>
      </section>
    </PortalLayout>
  );
}
