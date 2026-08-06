# Portal público SisAgro — site institucional + indicadores do agro

Objetivo: transformar `sisagro.app` em um portal público de captação de clientes, mantendo o sistema atual intacto atrás do login, e publicar indicadores diários do mercado agrícola atualizados automaticamente.

## Estrutura de rotas

```text
/                     → Portal público (novo home de marketing)
/indicadores          → Painel público de cotações e indicadores diários
/contato              → Formulário de demonstração
/auth                 → Login (inalterado)
/dashboard            → Dashboard atual do sistema (o Index de hoje)
```

O sistema hoje ocupa `/`. Ele passa a viver em `/dashboard`, e todo redirecionamento de login e links internos apontam para lá. Usuário já autenticado que abrir `/` vê um botão "Acessar o sistema" em destaque.

## Home do portal

Seções, em ordem, seguindo a linguagem visual do sistema (verde agro, azul céu, tons de terra) mas com layout próprio de landing page — sem o padrão genérico de gradiente roxo:

1. **Hero** — título forte ("Controle total dos seus grãos, do recebimento à venda final"), subtítulo, CTA primário "Agendar demonstração" e secundário "Ver indicadores do dia". Faixa lateral/inferior com os 4 indicadores do dia (soja, milho, trigo, dólar) já visíveis no primeiro scroll.
2. **O que é o SisAgro** — parágrafo institucional + imagem/mock do sistema.
3. **Módulos** — grid de cards: Operações com Produtores, Classificação e Estoque, Balança e Pesagem, Notas de Depósito e Devolução, Compra de Cereais, Transferências, Vendas e Contratos, Fiscal (NF-e), Financeiro (contas, DRE, conciliação), Relatórios Gerenciais, Multiempresa. Cada card com ícone e 3-4 bullets curtos derivados do que o sistema realmente faz.
4. **Diferenciais** — rastreabilidade total, NF-e automática com Reforma Tributária 2026, extratos por produtor e local de entrega, multiempresa com isolamento de dados, acesso mobile.
5. **Indicadores do mercado (resumo)** — cards de cotação + link para `/indicadores`.
6. **Para quem é** — cerealistas, armazéns gerais, produtores com múltiplas inscrições, cooperativas.
7. **Prova social** — placeholder estruturado. Não serão inventados depoimentos, números de clientes ou resultados; a seção só é preenchida com o que você fornecer (fica oculta até então).
8. **CTA final + formulário** e **rodapé** com contato, WhatsApp e link de login.

Botão flutuante de WhatsApp em todas as páginas públicas, com mensagem pré-preenchida.

## Página de indicadores

- Cards de cotação por produto (soja, milho, trigo, arroz, boi gordo) com valor em R$/saca e R$/t, variação do dia (%) e data da referência.
- Câmbio: dólar comercial (PTAX) e euro, com variação.
- Gráfico de linha com o histórico dos últimos 30/90 dias por produto.
- Bloco de clima/chuva para a região (opcional, na segunda etapa).
- Nota de rodapé com a fonte e o horário da última atualização em cada bloco — sem valor exibido sem fonte identificada.

## Coleta automática dos dados

- Nova tabela pública de cotações (produto, referência, unidade, valor, variação, fonte, data) com leitura liberada para visitantes e escrita apenas pelo serviço interno.
- Uma função de backend agendada roda 1x por dia (manhã) e grava as cotações do dia: câmbio via API pública do Banco Central (PTAX) e indicadores de grãos via fonte pública de indicadores (CEPEA/ESALQ ou equivalente acessível). Cada gravação registra a fonte.
- Se uma fonte falhar, o portal mostra o último valor disponível com a data real dele — nunca um número inventado nem uma data atual falsa.
- Como as fontes públicas de grãos podem mudar de formato ou exigir licença de uso, a coleta será validada fonte por fonte na implementação; qualquer indicador que não tenha fonte pública utilizável fica de fora do portal e eu aviso quais foram.

## Captação de leads

- Tabela de leads (nome, empresa, e-mail, telefone, cidade/UF, nº de produtores atendidos, mensagem, origem).
- Formulário validado com Zod, inserção permitida para visitante anônimo, leitura só para admin.
- E-mail de aviso para vocês + e-mail de confirmação para o lead, usando a infraestrutura de e-mail do próprio projeto.
- Tela interna "Leads" (só admin) para acompanhar e marcar status.
- Botão "Criar minha conta" apontando para o cadastro existente, que já cai no fluxo de aprovação por admin.

## SEO

- Title/description próprios por página pública, canonical, Open Graph, JSON-LD de `SoftwareApplication` e `Organization`.
- `sitemap.xml` com as rotas públicas e `robots.txt` liberando a indexação delas e bloqueando as rotas internas.
- H1 único por página, imagens com alt, carregamento lazy.

## Detalhes técnicos

- Rotas públicas ficam fora de `ProtectedRoute`, em um `PublicLayout` novo (header próprio, sem sidebar/TabBar).
- Componentes do portal em `src/components/portal/`, páginas em `src/pages/portal/`.
- Cotações lidas via TanStack Query com `staleTime` alto; a página pública não usa sessão autenticada.
- Cores exclusivamente por tokens semânticos; novos tokens de portal adicionados em `index.css` e no Tailwind config.
- Mobile-first, com verificação da home e da página de indicadores no preview ao final.

## Entrega em etapas

1. Rotas públicas, `PublicLayout`, home completa, WhatsApp, SEO, movimentação do sistema para `/dashboard`.
2. Tabela + função agendada de cotações e a página `/indicadores` com gráficos.
3. Leads: tabela, formulário, e-mails e tela admin.
