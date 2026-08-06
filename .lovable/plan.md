# Botão de WhatsApp: erro ERR_BLOCKED_BY_RESPONSE

## O que está acontecendo

O link atual é `https://wa.me/<numero>?text=...`. O `wa.me` faz um redirecionamento para `api.whatsapp.com`, e o WhatsApp envia cabeçalhos que **proíbem a página de ser aberta dentro de um iframe**. Como a pré-visualização do Lovable roda dentro de um iframe, o navegador recusa a conexão e mostra `ERR_BLOCKED_BY_RESPONSE`.

Isso é uma limitação da pré-visualização, não do site publicado — no `sisagro.app` aberto em aba normal o link funciona. Mesmo assim, dá para tornar o botão à prova disso.

## O que vou mudar

1. **Abrir sempre em uma aba nova de verdade**, fora do iframe: um único helper de clique que usa `window.open(url, "_blank", "noopener,noreferrer")` e, se o navegador bloquear, cai para `window.top.location`.
2. **Usar o domínio direto do WhatsApp** (`https://api.whatsapp.com/send?phone=...&text=...`) em vez do encurtador `wa.me`, eliminando o redirecionamento intermediário.
3. **Aplicar nos três pontos** onde o WhatsApp aparece hoje: botão flutuante do portal, botão "Falar no WhatsApp" na página de Contato e qualquer outro uso do helper.
4. Manter o `href` real no elemento `<a>` (bom para SEO e para "abrir em nova aba" pelo menu do navegador), interceptando apenas o clique.

## Detalhes técnicos

- `src/config/portal.ts`: `whatsappLink()` passa a montar `https://api.whatsapp.com/send?phone=<digitos>&text=<encoded>`; novo helper `abrirWhatsapp(url)` com `window.open` + fallback `window.top.location.href`.
- `src/components/portal/PortalLayout.tsx`: botão flutuante passa a chamar `abrirWhatsapp` no `onClick` (mantendo `href`, `target="_blank"`, `rel="noopener noreferrer"`).
- `src/pages/portal/Contato.tsx`: mesmo tratamento no botão "Falar no WhatsApp".

Nenhuma mudança de banco de dados, backend ou lógica de negócio.
