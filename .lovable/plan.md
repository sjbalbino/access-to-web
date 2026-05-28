## Objetivo

Hoje a consulta MD-e (Manifesto do Destinatário) é feita por **Granja**, mas a granja não tem mais CNPJ próprio. Quem possui CNPJ e emite NF-e são as **Inscrições dos Produtores** (sócios). Por isso a consulta de NF-es destinadas deve ser feita por **Inscrição**, usando o CNPJ daquela inscrição e o emitente vinculado a ela.

## Mudanças

### 1. UI — `src/components/entradas-nfe/MdeDialog.tsx`
- Substituir o seletor **Granja** por um seletor **Inscrição do Produtor**.
- Listar apenas inscrições `ativa = true` que tenham `emitente_id` preenchido (ou seja, inscrições aptas a emitir NF-e).
- Rótulo do item: `NOME DA INSCRIÇÃO — CPF/CNPJ` (padrão do sistema).
- Enviar `inscricaoId` para a edge function nas ações `consultar`, `manifestar`, `download_xml`, `download_danfe` e na importação.

### 2. Hook — `src/hooks/useMde.ts`
- Trocar parâmetro `granjaId` por `inscricaoId` em todas as funções (`consultarDestinatarias`, `manifestar`, `downloadXml`, `downloadDanfe`).

### 3. Edge function — `supabase/functions/focus-nfe-mde/index.ts`
- Aceitar `inscricaoId` no body (em vez de `granjaId`).
- `getCredentials(inscricaoId)`: buscar `emitente_id` em `inscricoes_produtor`, e a partir dele obter `ambiente` (em `emitentes_nfe`) e `api_access_token` (em `emitentes_nfe_credentials`).
- `getInscricaoCnpj(inscricaoId)`: buscar `cpf_cnpj` diretamente em `inscricoes_produtor` (sem fallback para granja).
- Mensagens de erro claras: "Inscrição sem emitente NF-e configurado" / "Inscrição sem CPF/CNPJ".

### 4. Importação de XML (MdeDialog → Entradas NF-e)
- Hoje o header da entrada salva `granja_id`. Vamos continuar salvando `granja_id` derivado da inscrição (`inscricoes_produtor.granja_id`), para manter compatibilidade com o restante do módulo Entradas NF-e. Nenhuma mudança de schema necessária.

## Fora de escopo
- Nenhuma alteração no banco de dados.
- Demais módulos que usam emitente por granja (emissão de NF-e de venda etc.) continuam como estão.
