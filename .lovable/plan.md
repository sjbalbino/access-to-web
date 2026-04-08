
## Plano: Manifesto do Destinatário Eletrônico (MD-e) via Focus NFe

### Visão Geral
Integrar o MD-e usando a API Focus NFe já configurada, permitindo consultar NF-es emitidas contra o CNPJ da granja, manifestar (ciência, confirmação, desconhecimento, não realizada) e baixar o XML completo para importar no módulo de Entradas NF-e.

### 1. Edge Function: `focus-nfe-mde`
Função única com ações via parâmetro `action`:
- **consultar**: `GET /v2/nfes_recebidas?cnpj={cnpj}` — lista NF-es destinadas
- **manifestar**: `POST /v2/nfes_recebidas/{chave}/manifesto` — envia manifestação (ciência, confirmação, desconhecimento, não realizada)
- **download_xml**: `GET /v2/nfes_recebidas/{chave}.xml` — baixa XML completo da NF-e
- **download_danfe**: `GET /v2/nfes_recebidas/{chave}.pdf` — baixa DANFe em PDF
- Usa token e ambiente do emitente vinculado à granja (mesmo padrão das outras edge functions)

### 2. Hook: `useMde.ts`
- `consultarDestinatarias(granjaId)` — busca NF-es recebidas
- `manifestar(chave, tipo, granjaId)` — envia manifestação
- `downloadXml(chave, granjaId)` — baixa XML
- `downloadDanfe(chave, granjaId)` — baixa DANFe
- `importarParaEntrada(chave, granjaId)` — baixa XML e cria entrada no módulo Entradas NF-e automaticamente

### 3. Componente: `MdeDialog.tsx`
- Dialog acessível pela página de Entradas NF-e (novo botão "Buscar no SEFAZ")
- Selecionar granja → consultar NF-es destinadas
- Tabela com: Nº NF-e, Emitente (CNPJ/Nome), Data Emissão, Valor Total, Situação, Manifestação
- Ações por linha: Manifestar (dropdown com opções), Baixar XML, Baixar DANFe, Importar (cria entrada automaticamente)
- Filtros: período, situação

### 4. Integração com Entradas NF-e
- Botão "Importar" na listagem do MD-e: baixa o XML, passa pelo parser existente (`nfeXmlParser.ts`) e cria a entrada automaticamente

### Arquivos a criar
- `supabase/functions/focus-nfe-mde/index.ts`
- `src/hooks/useMde.ts`
- `src/components/entradas-nfe/MdeDialog.tsx`

### Arquivos a modificar
- `supabase/config.toml` — adicionar config da nova edge function
- `src/pages/EntradasNfe.tsx` — adicionar botão "Buscar no SEFAZ"
