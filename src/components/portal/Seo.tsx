import { Helmet } from "react-helmet-async";
import { PORTAL_NOME, PORTAL_URL } from "@/config/portal";

interface SeoProps {
  title: string;
  description: string;
  /** Caminho da rota, iniciando com "/". */
  path: string;
  /** JSON-LD adicional específico da página. */
  jsonLd?: Record<string, unknown>;
}

export function Seo({ title, description, path, jsonLd }: SeoProps) {
  const url = `${PORTAL_URL}${path === "/" ? "/" : path}`;

  return (
    <Helmet prioritizeSeoTags>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      <meta property="og:site_name" content={PORTAL_NOME} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content="website" />
      <meta property="og:url" content={url} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      {jsonLd ? (
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      ) : null}
    </Helmet>
  );
}
