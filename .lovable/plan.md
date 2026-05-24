## Objetivo

Transformar `forma_pagamento` e `conta_bancaria` (hoje texto livre nas baixas) em vínculos reais com cadastros, importáveis do sistema legado.

## 1. Banco de dados (migration)

### Tabela `bancos` (catálogo nacional)
- `id uuid pk`, `codigo text` (ex.: "001", "341"), `nome text`, `ativo bool default true`, `created_at`, `updated_at`
- Único: `(codigo)`
- **Sem `tenant_id`** — é catálogo global (igual a `ncm`/`cfops`).
- RLS: SELECT para todos autenticados; INSERT/UPDATE/DELETE só admin.
- **Seed**: inserir os ~250 bancos da lista oficial Febraban (Itaú, Bradesco, BB, Caixa, Santander, Sicoob, Sicredi, NuBank, Inter, C6, BTG, etc.). Lista completa via seed SQL.

### Tabela `contas_bancarias` (por tenant, vinculada a sócio)
Campos:
- `id`, `tenant_id` (NOT NULL, default `get_user_tenant_id()`)
- `codigo_legado text` (rastreio do Access)
- `nome text NOT NULL` (apelido: "Itaú PJ Principal")
- `banco_id uuid REFERENCES bancos(id)`
- `agencia text`, `agencia_dv text`
- `conta text`, `conta_dv text`
- `tipo text` (corrente | poupanca | investimento | caixa | outro)
- `socio_produtor_id uuid REFERENCES produtores(id)` (nullable — pode ser conta da granja)
- `granja_id uuid REFERENCES granjas(id)` (nullable)
- `titular text`, `cpf_cnpj_titular text`
- `pix_chave text`, `pix_tipo text` (cpf|cnpj|email|telefone|aleatoria)
- `saldo_inicial numeric(15,2) default 0`, `data_saldo_inicial date`
- `ativo bool default true`, `observacoes text`, timestamps
- Único: `(tenant_id, codigo_legado) WHERE codigo_legado IS NOT NULL` (índice **completo**, não parcial, para funcionar com upsert)
- RLS multi-tenant padrão (SELECT pelo tenant, INSERT/UPDATE/DELETE com `can_edit`).
- Trigger `before insert` para setar `tenant_id` automaticamente.

### Alterações em `contas_pagar_baixas` e `contas_receber_baixas`
- Adicionar `conta_bancaria_id uuid REFERENCES contas_bancarias(id) ON DELETE SET NULL`
- Manter `conta_bancaria text` (legado / fallback) — não dropar agora para não quebrar histórico.
- `forma_pagamento text` continua, mas validada nas 7 opções fixas (constraint CHECK opcional ou só validação no front).

## 2. Página de cadastro `Contas Bancárias`

Nova rota `/contas-bancarias` + item de menu (categoria Financeiro).
- Lista paginada (20/página) com filtros: sócio, banco, ativo.
- Dialog CRUD: combobox de banco (busca por código ou nome), combobox de sócio (produtores do tenant), combobox de granja.
- Coluna `Banco` mostra `código - nome`.

Nova rota `/bancos` (somente admin) — opcional, simples lista read-only do catálogo, com botão "ativar/inativar".

## 3. Importação

Adicionar duas configs novas em `importacaoConfig.ts`:

### `bancos` (opcional — se o legado tiver lista própria, senão usa seed)
Pular — usaremos o seed Febraban.

### `contas_bancarias`
- `order: 4` (depois de `produtores`/`granjas`)
- Colunas: `codigo_legado`, `nome`, `banco_codigo` (resolve via `bancos.codigo`), `agencia`, `conta`, `tipo`, `titular`, `cpf_cnpj_titular`, `pix_chave`, `pix_tipo`, `socio_codigo_legado` (resolve via `produtores.codigo_legado`), `granja_codigo_legado` (opcional), `saldo_inicial`, `ativo`
- Conflict key: `(tenant_id, codigo_legado)`

### Ajustes em `baixas_contas_pagar` e `baixas_contas_receber`
- Adicionar coluna `conta_bancaria_codigo_legado` que resolve via `contas_bancarias.codigo_legado` → `conta_bancaria_id`.
- Manter `conta_bancaria` (texto) como fallback para quando não houver código legado.
- Adicionar transform em `forma_pagamento` que **mapeia para as 7 fixas** (case-insensitive, sem acentos):
  - "dinheiro", "espécie", "cash" → `dinheiro`
  - "pix" → `pix`
  - "boleto", "bol" → `boleto`
  - "ted", "doc", "transf*", "transferencia" → `transferencia`
  - "cheque", "chq" → `cheque`
  - "cartão", "cartao", "débito", "credito*" → `cartao`
  - resto → `outro` (e loga warning)
- Adicionar essa config `baixas_contas_pagar` (que está faltando — só existe `baixas_contas_receber` hoje!) com o mesmo padrão.

### Dependências do wizard
- `contas_bancarias` depende de `produtores` (e opcionalmente `granjas`).
- `baixas_contas_pagar`/`baixas_contas_receber` agora dependem de `contas_pagar`/`contas_receber` **e** `contas_bancarias`.

## 4. UI das baixas (`BaixasDialog.tsx`)

- Trocar o `<Input>` de `conta_bancaria` por `<ComboboxFilter>` carregando contas bancárias do tenant (filtradas opcionalmente pelo sócio da conta).
- Salvar `conta_bancaria_id` (FK) **e** preencher `conta_bancaria` (texto) com o nome para display rápido.
- `forma_pagamento` continua como Select com as 7 fixas.
- Recibo PDF: mostrar nome do banco/agência/conta a partir da FK em vez do texto livre.

## 5. Hooks novos

- `useBancos()` — lista catálogo (cacheado, staleTime longo).
- `useContasBancarias(filtros)` — CRUD da tabela tenant-scoped.

## 6. Memórias

Adicionar `mem://features/contas-bancarias-e-formas-pagamento` documentando:
- Catálogo `bancos` global; `contas_bancarias` por tenant ligadas a sócio/granja.
- 7 formas fixas; mapeamento na importação.
- Baixas guardam `conta_bancaria_id` (FK) + texto fallback.

## Fora de escopo

- Conciliação bancária / extrato.
- Saldo corrente automático das contas (só guarda `saldo_inicial`).
- Mudar `inscricoes_produtor.conta_bancaria` (campo de texto separado, não mexer agora).
- Importar formas de pagamento como tabela própria (decidido: mapear nas 7 fixas).
