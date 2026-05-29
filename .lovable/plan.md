# Envio de DANFE + XML por Email via Focus NFe

## Contexto

A Focus NFe **já envia automaticamente** a DANFE + XML por email para o destinatário, desde que o campo `email` esteja preenchido no cadastro do cliente/fornecedor (já mapeado em `src/lib/focusNfeMapper.ts`).

Além disso, a Focus disponibiliza o endpoint:
```
POST /v2/nfe/{ref}/email
Body: { "emails": ["a@x.com", "b@y.com"] }
```
que permite reenviar a NFe autorizada para uma lista de emails a qualquer momento. Esta é a solução mais simples — usa o token Focus já configurado, sem necessidade de provedor de email externo, domínio, DNS ou Lovable Emails.

## O que será implementado

### 1. Nova Edge Function `focus-nfe-enviar-email`
- Recebe: `notaFiscalId` e `emails: string[]`
- Busca a NFe (`uuid_api`, `status`, `emitente_id` para obter token + ambiente)
- Valida que a NFe está **autorizada** (não permite envio de notas rejeitadas/canceladas/processando)
- Chama `POST {baseUrl}/v2/nfe/{ref}/email` com o token do emitente
- Retorna sucesso/erro
- Configurada em `supabase/config.toml` com `verify_jwt = true` (padrão das outras focus-nfe-*)

### 2. Novo campo no cadastro do Emitente NFe
- Adicionar campo opcional `email_contador` em `emitentes_nfe` (migration)
- Editar `src/pages/EmitentesNfe.tsx` para incluir o campo no formulário

### 3. Novo Dialog `EnviarEmailNfeDialog`
Componente em `src/components/notas-fiscais/EnviarEmailNfeDialog.tsx` com:
- **Checkboxes pré-marcados** para destinatários padrão:
  - Destinatário da NFe (email do cliente/fornecedor)
  - Emitente (email do emitentes_nfe)
  - Contador (email_contador do emitente, se preenchido)
- **Campo de texto** para adicionar emails extras (separados por vírgula)
- Validação básica de formato de email
- Botão "Enviar" que chama a edge function via `useFocusNfe` hook (novo método `enviarEmail`)
- Toast de sucesso/erro
- Mensagem informativa: "A Focus NFe enviará a DANFE (PDF) e o XML para os destinatários selecionados"

### 4. Hook `useFocusNfe` — novo método
Adicionar `enviarEmail(notaFiscalId, emails)` em `src/hooks/useFocusNfe.ts` seguindo o padrão dos métodos existentes.

### 5. Botão na lista de Notas Fiscais
Em `src/pages/NotasFiscais.tsx`:
- Adicionar botão **"Enviar Email"** (ícone Mail) nas ações da linha
- Visível **somente** quando `status === 'autorizada'`
- Abre o `EnviarEmailNfeDialog`

## Sem histórico
Conforme escolhido, não será criada tabela de histórico de envios. A Focus NFe mantém o log de envios internamente e pode ser consultado no painel deles se necessário.

## Detalhes técnicos

**Endpoint Focus NFe:**
```
POST https://api.focusnfe.com.br/v2/nfe/{ref}/email
Auth: Basic base64(token:)
Body: { "emails": ["x@y.com", ...] }
```

**Arquivos a criar:**
- `supabase/functions/focus-nfe-enviar-email/index.ts`
- `src/components/notas-fiscais/EnviarEmailNfeDialog.tsx`

**Arquivos a editar:**
- `supabase/config.toml` (registrar a nova função com verify_jwt=true)
- `src/hooks/useFocusNfe.ts` (adicionar método enviarEmail)
- `src/pages/NotasFiscais.tsx` (botão Enviar Email)
- `src/pages/EmitentesNfe.tsx` (campo email_contador)

**Migration:**
- `ALTER TABLE emitentes_nfe ADD COLUMN email_contador TEXT;`

## Vantagens vs Lovable Emails

| Aspecto | Focus NFe (esta proposta) | Lovable Emails |
|---|---|---|
| Setup | Zero — usa token já configurado | Requer configurar domínio e DNS |
| Custo | Incluso no plano Focus | Incluso, mas exige domínio |
| Anexos | DANFE + XML enviados nativamente | Não suporta anexos (precisaria gerar link) |
| Confiabilidade | Infraestrutura dedicada para NFe | Genérica |
| Manutenção | Nenhuma | DNS + reputação de domínio |
