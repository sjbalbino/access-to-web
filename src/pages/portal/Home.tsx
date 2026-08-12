import { Link } from "react-router-dom";
import {
  ArrowRight,
  Warehouse,
  Scale,
  Receipt,
  ShoppingCart,
  BarChart3,
  Landmark,
  ShieldCheck,
  Smartphone,
  CloudCog,
  Users,
  CheckCircle2,
  Sprout,
  FileInput,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { Seo } from "@/components/portal/Seo";
import { CotacaoCard } from "@/components/portal/CotacaoCard";
import { LeadForm } from "@/components/portal/LeadForm";
import { useCotacoesAtuais, useUltimaColetaCotacoes } from "@/hooks/useCotacoes";
import { PORTAL_NOME, PORTAL_URL } from "@/config/portal";
import heroImg from "@/assets/portal-hero.jpg";

const modulos = [
  {
    icon: Sprout,
    titulo: "Controle de lavoura",
    texto:
      "Do plantio à colheita: aplicações de defensivos e fertilizantes, análises de solo, chuvas, floração, pragas, plantas invasoras e pivôs — com custo e produtividade por safra e por lavoura.",
  },
  {
    icon: Scale,
    titulo: "Recebimento e balança",
    texto:
      "Entrada de colheita com peso bruto, tara, umidade, impurezas e descontos por tabela. Tickets e romaneios impressos na hora.",
  },
  {
    icon: Warehouse,
    titulo: "Depósito e armazenagem",
    texto:
      "Controle de saldos por produtor, inscrição estadual, safra e produto. Notas de depósito, transferências, devoluções e extratos de movimentação.",
  },
  {
    icon: ShoppingCart,
    titulo: "Comercialização",
    texto:
      "Contratos de venda com quantidade, preço e saldo a entregar; remessas carga por carga, romaneios e acompanhamento do carregamento até a autorização fiscal. Inclui compra de cereais.",
  },
  {
    icon: Receipt,
    titulo: "Fiscal e NF-e",
    texto:
      "Emissão de NF-e integrada, contra-notas, cartas de correção, cancelamentos e manifestação de destinatário (DF-e) das notas recebidas.",
  },
  {
    icon: FileInput,
    titulo: "Entrada por XML da NF-e",
    texto:
      "Importe o XML da nota do fornecedor e gere, em um só passo, a entrada no estoque e as parcelas no contas a pagar — sem digitar itens, impostos ou duplicatas.",
  },
  {
    icon: Landmark,
    titulo: "Financeiro",
    texto:
      "Contas a pagar e receber (geradas automaticamente pelas notas de entrada), baixas, contas bancárias, conciliação, lançamentos, rateio entre sócios e estrutura de DRE.",
  },
  {
    icon: BarChart3,
    titulo: "Relatórios gerenciais",
    texto:
      "Colheita diária, resumo por lavoura, extratos por produtor, saldo disponível, entregas por variedade e relatórios de IR.",
  },
];

const fluxo = [
  {
    titulo: "Lavoura",
    texto: "Plantio, aplicações e acompanhamento por área",
  },
  {
    titulo: "Colheita",
    texto: "Balança, umidade e descontos",
  },
  {
    titulo: "Depósito",
    texto: "Saldo por produtor e inscrição",
  },
  {
    titulo: "Comercialização",
    texto: "Contratos, remessas e NF-e",
  },
  {
    titulo: "Financeiro",
    texto: "Contas a pagar/receber e DRE",
  },
];

const diferenciais = [
  {
    icon: ShieldCheck,
    titulo: "Dados isolados por empresa",
    texto:
      "Arquitetura multiempresa com isolamento de dados e perfis de acesso (visualizador, operador, gerente e administrador).",
  },
  {
    icon: Smartphone,
    titulo: "Funciona no celular",
    texto:
      "Interface responsiva pensada para uso na balança, no armazém e no escritório, sem instalar nada.",
  },
  {
    icon: CloudCog,
    titulo: "100% na nuvem",
    texto:
      "Atualizações automáticas, backup contínuo e acesso de qualquer lugar — sem servidor local para manter.",
  },
  {
    icon: Users,
    titulo: "Feito com quem opera",
    texto:
      "Regras fiscais e de depósito construídas junto a cerealistas e produtores, seguindo a prática real do dia a dia.",
  },
];

const beneficios = [
  "Custo da lavoura rastreado do plantio até a venda da produção",
  "Saldo de depósito confiável por produtor e inscrição estadual",
  "Entrada de nota por XML: estoque e contas a pagar sem digitação",
  "Emissão fiscal sem retrabalho e com rastreamento de rejeições da SEFAZ",
  "Fechamento de safra e apuração de IR com relatórios prontos",
  "Menos planilhas: uma única base para produção, fiscal e financeiro",
];


export default function PortalHome() {
  const { data: cotacoes, isLoading } = useCotacoesAtuais();
  const { data: coletas } = useUltimaColetaCotacoes();

  const destaques = ["soja-paranagua", "milho", "trigo-rs", "dolar-ptax"]
    .map((slug) => cotacoes?.find((c) => c.slug === slug))
    .filter((c): c is NonNullable<typeof c> => !!c);


  return (
    <PortalLayout>
      <Seo
        title="SisAgro — Sistema de gestão para cerealistas e produtores rurais"
        description="Do plantio à colheita, depósito de grãos, contratos e remessas, NF-e, entrada por XML e financeiro. Com indicadores diários do mercado agrícola."
        path="/"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: PORTAL_NOME,
          applicationCategory: "BusinessApplication",
          operatingSystem: "Web",
          url: PORTAL_URL,
          description:
            "Sistema de gestão agropecuária para cerealistas, armazéns de grãos e produtores rurais.",
        }}
      />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <img
          src={heroImg}
          alt="Colheitadeira operando em lavoura de soja ao lado de silos de armazenagem"
          width={1920}
          height={1088}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/90 to-background/40" />

        <div className="relative container max-w-6xl px-4 py-20 md:py-28">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary mb-5">
              Gestão agropecuária na nuvem
            </span>
            <h1 className="text-3xl md:text-5xl font-bold text-foreground leading-tight mb-5">
              Do recebimento na balança à nota fiscal autorizada, em um só sistema
            </h1>
            <p className="text-base md:text-lg text-muted-foreground mb-7">
              O {PORTAL_NOME} organiza depósito de grãos, comercialização, fiscal e
              financeiro da sua cerealista ou fazenda — com saldos confiáveis por produtor
              e relatórios prontos para a safra.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button asChild size="lg">
                <Link to="/contato">
                  Solicitar demonstração
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/indicadores">Ver indicadores do mercado</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Indicadores em destaque */}
      <section className="border-y border-border bg-muted/30">
        <div className="container max-w-6xl px-4 py-10">
          <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-foreground">
                Indicadores do mercado agrícola
              </h2>
              <p className="text-sm text-muted-foreground">
                Coletados automaticamente 3x ao dia de fontes públicas (CEPEA/ESALQ e
                Banco Central). A data de referência é sempre a publicada pela fonte —
                grãos e câmbio saem no fim do dia.
              </p>

            </div>
            <Button asChild variant="ghost" size="sm">
              <Link to="/indicadores">
                Ver todos
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-28 rounded-xl border border-border bg-card animate-pulse"
                />
              ))}
            </div>
          ) : destaques.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {destaques.map((c) => (
                <CotacaoCard
                  key={c.slug}
                  cotacao={c}
                  atualizadoEm={coletas?.[c.fonte]?.created_at ?? null}
                />
              ))}

            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Os indicadores serão exibidos assim que a próxima coleta diária for
              concluída.
            </p>
          )}
        </div>
      </section>

      {/* Fluxo integrado */}
      <section className="container max-w-6xl px-4 py-16 md:py-20">
        <div className="max-w-2xl mb-10">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
            Do plantio ao caixa, sem retrabalho
          </h2>
          <p className="text-muted-foreground">
            Cada etapa alimenta a próxima: o custo da lavoura chega até a venda, e a nota
            fiscal chega até o contas a pagar e a receber.
          </p>
        </div>

        <ol className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {fluxo.map((f, i) => (
            <li key={f.titulo} className="rounded-xl border border-border bg-card p-4">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary mb-3">
                {i + 1}
              </span>
              <h3 className="font-semibold text-foreground text-sm mb-1">{f.titulo}</h3>
              <p className="text-xs text-muted-foreground">{f.texto}</p>
            </li>
          ))}
        </ol>

      </section>

      {/* Módulos */}
      <section id="solucoes" className="container max-w-6xl px-4 pb-16 md:pb-20">
        <div className="max-w-2xl mb-10">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
            Tudo o que a operação agrícola precisa
          </h2>
          <p className="text-muted-foreground">
            Módulos integrados que conversam entre si: lavoura, balança, depósito,
            contratos e remessas, fiscal e financeiro em uma única base.
          </p>
        </div>


        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {modulos.map((m) => {
            const Icon = m.icon;
            return (
              <article
                key={m.titulo}
                className="rounded-xl border border-border bg-card p-5 hover:border-primary/40 transition-colors"
              >
                <span className="inline-flex p-2.5 rounded-xl bg-primary/10 text-primary mb-4">
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="font-semibold text-foreground mb-2">{m.titulo}</h3>
                <p className="text-sm text-muted-foreground">{m.texto}</p>
              </article>
            );
          })}
        </div>
      </section>

      {/* Diferenciais */}
      <section className="border-y border-border bg-muted/30">
        <div className="container max-w-6xl px-4 py-16 md:py-20 grid gap-10 lg:grid-cols-2 items-start">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
              Por que escolher o {PORTAL_NOME}
            </h2>
            <p className="text-muted-foreground mb-6">
              Um sistema construído para a realidade fiscal e operacional do agronegócio
              brasileiro.
            </p>
            <ul className="space-y-3">
              {beneficios.map((b) => (
                <li key={b} className="flex gap-3 text-sm text-foreground">
                  <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {diferenciais.map((d) => {
              const Icon = d.icon;
              return (
                <div key={d.titulo} className="rounded-xl border border-border bg-card p-5">
                  <span className="inline-flex p-2 rounded-lg bg-secondary/10 text-secondary mb-3">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="font-semibold text-foreground mb-1.5">{d.titulo}</h3>
                  <p className="text-sm text-muted-foreground">{d.texto}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Lead */}
      <section id="demonstracao" className="container max-w-6xl px-4 py-16 md:py-20">
        <div className="grid gap-10 lg:grid-cols-2 items-start">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
              Agende uma demonstração
            </h2>
            <p className="text-muted-foreground mb-6">
              Mostramos o sistema com dados parecidos com os da sua operação e explicamos
              como funciona a implantação e a migração dos seus cadastros.
            </p>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li>• Apresentação online de aproximadamente 40 minutos</li>
              <li>• Análise do fluxo atual da sua cerealista ou fazenda</li>
              <li>• Plano de implantação e importação de dados existentes</li>
            </ul>
          </div>
          <LeadForm />
        </div>
      </section>
    </PortalLayout>
  );
}
