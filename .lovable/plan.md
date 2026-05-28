## Problema

Ao clicar em **Salvar Rascunho**, aparece o toast "Não há configuração de API (Emitente) para a granja desta inscrição" e o rascunho não é salvo.

## Causa raiz

Em `src/pages/NotaFiscalForm.tsx`, `handleSaveDraft` (linha 770) busca o emitente **pela granja**:

```ts
const emitenteAuto = emitentes.find((e) => e.granja_id === inscricao.granja_id && e.ativo);
```

Isso está desatualizado. Na arquitetura atual, o emitente é vinculado **diretamente à inscrição** via `inscricoes_produtor.emitente_id` (1 emitente → N inscrições). A inscrição "SEMENTES COSTA BEBER" tem `emitente_id` setado, mas o emitente cadastrado pode não ter `granja_id` igual ao da inscrição — por isso o `find` retorna `undefined` e o save é bloqueado.

Além disso, **rascunho não deveria exigir emitente configurado** — só a emissão real precisa disso.

## Correção

Em `src/pages/NotaFiscalForm.tsx`:

### 1. `handleSaveDraft` (linhas 769-781)

- Trocar a busca por granja por busca direto pelo `inscricao.emitente_id`:
  ```ts
  const emitenteAuto = inscricao?.emitente_id 
    ? emitentes.find((e) => e.id === inscricao.emitente_id) 
    : null;
  ```
- **Remover o bloqueio** quando `emitenteAuto` for null. Salvar rascunho com `emitente_id: emitenteAuto?.id ?? null` — permite ao usuário salvar mesmo sem emitente configurado e completar depois.
- Manter apenas a validação obrigatória de `inscricao_produtor_id` e `natureza_operacao`.

### 2. `handleEmitirNfe` (linhas 828-845)

- Trocar também a busca por granja por `inscricao.emitente_id`:
  ```ts
  const emitente = inscricao.emitente_id 
    ? emitentes.find((e) => e.id === inscricao.emitente_id) 
    : null;
  ```
- **Manter** o bloqueio aqui (emissão real precisa de emitente + API configurada).
- Atualizar a mensagem de erro para: "Esta inscrição não tem Emitente NF-e vinculado. Vincule um emitente no cadastro da inscrição."

## Escopo

- Apenas `src/pages/NotaFiscalForm.tsx`.
- Sem mudanças de schema, hook, ou RLS.
- Sem mudanças em lógica de cálculo, mapper ou edge functions.
