## Decisão aprovada
A verificação prévia continua usando o CPF/CNPJ da **inscrição selecionada como emitente na NF-e** (já é assim hoje no formulário), mas ela deixa de **bloquear** a emissão quando a Focus NFe retorna falso-negativo em homologação. Ela só bloqueia quando o erro é claramente de **token inválido / sem permissão**.

## Mudanças

### 1. `src/pages/NotaFiscalForm.tsx` — `handleEmitirNfe`
- Continuar enviando à verificação `emitente_id` e `cpf_cnpj` da inscrição selecionada (`formData.inscricao_produtor_id`).
- Quando o retorno for `habilitada = false`:
  - Se `codigo === "token_invalido_ou_sem_permissao"` → **bloquear** com mensagem clara (token errado é problema real).
  - Demais códigos (`empresa_nao_cadastrada`, `nao_habilitada_no_ambiente`) → **apenas exibir aviso (toast)** e seguir com a emissão; o SEFAZ devolverá o erro definitivo se houver.
- Quando a verificação falhar tecnicamente (`success = false`) → seguir normalmente (já é assim hoje).

### 2. `src/pages/EmitentesNfe.tsx` — botão "Verificar habilitação"
- Hoje pega a **primeira** inscrição vinculada ao emitente, podendo consultar um CPF/CNPJ diferente do esperado.
- Passar a **priorizar** a inscrição com `is_emitente_principal = true`; se não houver, usar a primeira ativa.
- Incluir no toast o **CPF/CNPJ que foi consultado** e o **nome do produtor**, para o usuário ter certeza de qual documento está sendo verificado.

### 3. `supabase/functions/focus-nfe-verificar-empresa/index.ts`
- Pequena melhoria: incluir o **prefixo do token usado** (primeiros 6 caracteres) no campo `detalhes` da resposta — facilita conferir se o token salvo é o mesmo do painel sem expor o segredo.
- Sem mudanças de comportamento.

## Fora do escopo
- Nenhuma mudança de banco, RLS, ou de outros fluxos de emissão (compra, devolução, remessa).
- Nenhuma mudança no edge `focus-nfe-emitir`.

## Resultado esperado
- Quando a Focus retorna 404 em homologação para um CPF/CNPJ que está no painel, o sistema **avisa** mas **não trava** a emissão.
- Token inválido continua sendo barrado antes de chegar ao SEFAZ.
- A verificação manual na tela de Emitentes consulta a inscrição certa e mostra qual documento foi conferido.