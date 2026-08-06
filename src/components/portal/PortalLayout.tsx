import { ReactNode, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { Menu, Wheat, X, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PORTAL_CONTATO, PORTAL_NOME, whatsappLink } from "@/config/portal";

interface PortalLayoutProps {
  children: ReactNode;
}

const navItems = [
  { label: "Início", path: "/" },
  { label: "Soluções", path: "/#solucoes" },
  { label: "Indicadores", path: "/indicadores" },
  { label: "Contato", path: "/contato" },
];

export function PortalLayout({ children }: PortalLayoutProps) {
  const [menuAberto, setMenuAberto] = useState(false);
  const location = useLocation();
  const wa = whatsappLink(
    `Olá! Vim pelo site do ${PORTAL_NOME} e gostaria de conhecer o sistema.`,
  );

  const isAtivo = (path: string) =>
    path.includes("#") ? false : location.pathname === path;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <div className="container max-w-6xl px-4 h-16 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <span className="p-2 rounded-xl bg-primary/15 text-primary">
              <Wheat className="h-5 w-5" />
            </span>
            <span className="font-bold text-lg tracking-tight text-foreground">
              {PORTAL_NOME}
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) =>
              item.path.includes("#") ? (
                <a
                  key={item.path}
                  href={item.path}
                  className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  {item.label}
                </a>
              ) : (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "px-3 py-2 text-sm font-medium transition-colors",
                    isAtivo(item.path)
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {item.label}
                </NavLink>
              ),
            )}
          </nav>

          <div className="hidden md:flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link to="/auth">Entrar</Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/contato">Solicitar demonstração</Link>
            </Button>
          </div>

          <button
            type="button"
            aria-label={menuAberto ? "Fechar menu" : "Abrir menu"}
            className="md:hidden p-2 rounded-lg text-foreground hover:bg-muted"
            onClick={() => setMenuAberto((v) => !v)}
          >
            {menuAberto ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {menuAberto && (
          <div className="md:hidden border-t border-border bg-background">
            <nav className="container max-w-6xl px-4 py-3 flex flex-col gap-1">
              {navItems.map((item) =>
                item.path.includes("#") ? (
                  <a
                    key={item.path}
                    href={item.path}
                    onClick={() => setMenuAberto(false)}
                    className="px-2 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted"
                  >
                    {item.label}
                  </a>
                ) : (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMenuAberto(false)}
                    className={cn(
                      "px-2 py-2.5 rounded-lg text-sm font-medium hover:bg-muted",
                      isAtivo(item.path) ? "text-primary" : "text-muted-foreground",
                    )}
                  >
                    {item.label}
                  </Link>
                ),
              )}
              <div className="flex gap-2 pt-2">
                <Button asChild variant="outline" size="sm" className="flex-1">
                  <Link to="/auth" onClick={() => setMenuAberto(false)}>
                    Entrar
                  </Link>
                </Button>
                <Button asChild size="sm" className="flex-1">
                  <Link to="/contato" onClick={() => setMenuAberto(false)}>
                    Demonstração
                  </Link>
                </Button>
              </div>
            </nav>
          </div>
        )}
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-border bg-muted/40">
        <div className="container max-w-6xl px-4 py-10 grid gap-8 md:grid-cols-3">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="p-1.5 rounded-lg bg-primary/15 text-primary">
                <Wheat className="h-4 w-4" />
              </span>
              <span className="font-bold text-foreground">{PORTAL_NOME}</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Gestão completa para cerealistas, armazéns de grãos e produtores rurais:
              recebimento, depósito, comercialização, fiscal e financeiro em um só lugar.
            </p>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-foreground mb-3">Navegação</h2>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link to="/" className="hover:text-foreground">
                  Início
                </Link>
              </li>
              <li>
                <Link to="/indicadores" className="hover:text-foreground">
                  Indicadores do mercado
                </Link>
              </li>
              <li>
                <Link to="/contato" className="hover:text-foreground">
                  Solicitar demonstração
                </Link>
              </li>
              <li>
                <Link to="/auth" className="hover:text-foreground">
                  Acessar o sistema
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-foreground mb-3">Contato</h2>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {PORTAL_CONTATO.email && <li>{PORTAL_CONTATO.email}</li>}
              {PORTAL_CONTATO.telefoneExibicao && <li>{PORTAL_CONTATO.telefoneExibicao}</li>}
              {PORTAL_CONTATO.cidade && (
                <li>
                  {PORTAL_CONTATO.cidade}
                  {PORTAL_CONTATO.uf ? ` - ${PORTAL_CONTATO.uf}` : ""}
                </li>
              )}
              {!PORTAL_CONTATO.email && !PORTAL_CONTATO.telefoneExibicao && (
                <li>
                  Envie sua solicitação pelo{" "}
                  <Link to="/contato" className="text-primary hover:underline">
                    formulário de contato
                  </Link>
                  .
                </li>
              )}
            </ul>
          </div>
        </div>

        <div className="border-t border-border">
          <div className="container max-w-6xl px-4 py-4 text-xs text-muted-foreground">
            © {new Date().getFullYear()} {PORTAL_NOME}. Todos os direitos reservados.
          </div>
        </div>
      </footer>

      {wa && (
        <a
          href={wa}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Falar no WhatsApp"
          className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-primary-foreground shadow-lg hover:opacity-90 transition-opacity"
        >
          <MessageCircle className="h-5 w-5" />
          <span className="hidden sm:inline text-sm font-semibold">WhatsApp</span>
        </a>
      )}
    </div>
  );
}
