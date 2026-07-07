## Objetivo

Adicionar em **todos os cabeçalhos** dos relatórios PDF:

- Logotipo da empresa contratante (tenant), quando cadastrado
- Razão social / nome fantasia da empresa contratante + CNPJ
- Nome do sistema: **AgroGestão – Sistema de Gerenciamento Agropecuário**
- Assinatura da desenvolvedora (rodapé): **Desenvolvido por UniNFe Sistemas**

## Escopo

Geradores afetados (todos usam `jsPDF` + `autoTable`):

- `src/lib/relatoriosPdf.ts` (Extrato, Colheitas, Vendas)
- `src/lib/relatoriosEstoque.ts` (Saldo Disponível, Depósitos, Resumo Local)
- `src/lib/relatoriosGestao.ts` (Demonstrativo, DRE)
- `src/lib/relatoriosIR.ts` (Bens Móveis, Extrato CF)
- `src/lib/reciboPdf.ts`
- `src/lib/contratoVendaPdf.ts`

## Passos

1. **Banco de dados**
   - Migration: adicionar coluna `logo_url TEXT` em `public.tenants`.
   - Storage: criar bucket público `tenant-logos` com policies para o admin do tenant enviar/atualizar.
   - Atualizar `useTenants.ts` (interface `Tenant`) e `types.ts` fica auto-gerado.

2. **UI de cadastro do tenant** (`src/pages/Tenants.tsx`)
   - Upload de logo (PNG/JPG, ≤512KB) no formulário.
   - Preview e botão de remover.

3. **Helper compartilhado** — novo `src/lib/relatorioHeader.ts`:
   - `carregarLogoDataUrl(url)` — busca a imagem e devolve dataURL (com cache em memória).
   - `getTenantHeader()` — obtém o tenant atual via `supabase.auth.getUser()` + `tenants` (com cache).
   - `desenharCabecalhoRelatorio(doc, { titulo, subtitulo?, tenant, logoDataUrl? }): number` — desenha:
     - Logo à esquerda (30×15 mm, se existir)
     - Bloco esquerdo: razão social + CNPJ + cidade/UF do tenant
     - Bloco direito: "AgroGestão – Sistema de Gerenciamento Agropecuário" + data/hora
     - Título centralizado e subtítulo (filtros) abaixo
     - Retorna `yPos` inicial para a primeira tabela.
   - `desenharRodapeRelatorio(doc)` — sobrescreve o footer atual acrescentando "Desenvolvido por UniNFe Sistemas" à esquerda e "Página X de Y" à direita, mantendo data/hora ao centro.

4. **Integração**
   - Cada gerador passa a chamar `await getTenantHeader()` no início e usar `desenharCabecalhoRelatorio` no lugar dos blocos `doc.text(...)` manuais.
   - `addFooter(doc)` em cada arquivo é substituído por `desenharRodapeRelatorio`.

5. **Fallback**
   - Se `logo_url` for nulo ou o fetch falhar, o cabeçalho é renderizado sem imagem (sem quebrar).
   - Se o tenant não for encontrado (super admin), usa apenas o nome do sistema.

## Detalhes técnicos

- Imagem carregada via `fetch → blob → FileReader.readAsDataURL`; tipo detectado a partir do `content-type` (`PNG`/`JPEG`) para `doc.addImage`.
- Cache em `Map<string,string>` por URL para não refazer download entre relatórios da sessão.
- Todos os geradores continuam retornando o mesmo `RelatorioPayload`; a captura para preview em tela não muda.

## Fora do escopo

- Não altera o preview HTML (`PreviewRelatorioDialog`) — o cabeçalho é do PDF final.
- Não altera contratos de assinatura nem PDF do DANFE.
