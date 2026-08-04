# Cancelamento da NF-e 145 e vínculo com a Remessa

## Diagnóstico (confirmado no banco)

- NF-e **145** (série 930, 33.640 kg, ADM DO BRASIL) foi criada às 12:36 e cancelada às 12:52 com a justificativa "essa nota esta om duplicidade". Status atual: `cancelado`.
- Nenhuma remessa aponta para essa NF-e (`remessas_venda.nota_fiscal_id` = id da 145 retorna zero linhas).
- A remessa que a gerou é a de **romaneio 8569 / código 64**, mesma quantidade (33.640 kg), criada às 12:36:09 — e o `updated_at` dela é idêntico ao `created_at`: **ela nunca foi atualizada**. Continua com `status = "carregado"` e `nota_fiscal_id = null`.
- Em seguida foi emitida a NF-e **146** (mesma quantidade, criada 12:37, autorizada às 12:44) — também sem vínculo com a remessa 8569.

Conclusão: o cancelamento da 145 não pôde "cancelar a remessa" porque a remessa **nunca ficou vinculada à nota**. O vínculo (`nota_fiscal_id` + status `carregado_nfe`) só é gravado no navegador, após o polling da SEFAZ retornar "autorizado" (limite de 30 tentativas × 3s ≈ 90s). A 145 e a 146 demoraram mais que isso / o diálogo foi fechado antes, então a gravação nunca ocorreu — e a remessa permaneceu "carregado", permitindo a segunda emissão que gerou a duplicidade.

## O que será feito

### 1. Vincular a NF-e à remessa no momento da criação (causa raiz)
Na emissão automática de remessa, gravar `nota_fiscal_id` na remessa e mudar o status para "carregado_nfe" **imediatamente após criar a nota / enviar para a SEFAZ**, sem depender do polling. Assim:
- a remessa deixa de aceitar uma segunda emissão (evita duplicidade como 145/146);
- qualquer cancelamento posterior encontra a remessa e propaga corretamente.

Se a emissão falhar antes de ir para a SEFAZ (erro de validação/rejeição imediata), o vínculo é desfeito e a remessa volta para "carregado".

### 2. Cancelamento libera a remessa para reemissão
Na função de cancelamento, remessas vinculadas passam a voltar para `status = "carregado"` com `nota_fiscal_id = null` (hoje ficam "cancelada"). Motivo: o caso típico é cancelamento por duplicidade/erro fiscal, em que a carga física existe e precisa de nova NF-e. O cancelamento da remessa em si continua disponível manualmente na tela de remessas.

### 3. Saneamento dos dados atuais
- Vincular a remessa **romaneio 8569** à NF-e **146** (autorizada) e marcar como `carregado_nfe`.
- Conferir se existem outras remessas em "carregado" com NF-e autorizada de mesma quantidade/data sem vínculo e reportar a lista antes de qualquer ajuste adicional.

## Detalhes técnicos

- `src/components/remessas/EmitirNfeAutomaticoDialog.tsx`: mover o `updateRemessa.mutateAsync({ nota_fiscal_id, status: "carregado_nfe" })` para logo após o insert em `notas_fiscais` / retorno positivo de `emitirNfe`; adicionar rollback (`nota_fiscal_id: null`, `status: "carregado"`) nos ramos de erro e no `catch`.
- `supabase/functions/focus-nfe-cancelar/index.ts` (bloco "4. Cancelar remessas de venda"): trocar `{ status: "cancelada", nota_fiscal_id: null }` por `{ status: "carregado", nota_fiscal_id: null }`, mantendo o log.
- Saneamento via migração de UPDATE pontual na remessa 8569.
- Sem alterações de schema, RLS ou grants.
