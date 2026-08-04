# Remessa não atualiza para "Carregado/NFe" quando a NF-e é emitida pelo painel de Notas Fiscais

## Diagnóstico (confirmado no banco)

- Remessa **romaneio 8569 (código 64)**, 33.640 kg, contrato c2f3a335…: `status = "carregado"`, `nota_fiscal_id = null`, `updated_at` igual ao `created_at` — nunca foi atualizada.
- NF-e **146** (série 930, mesma quantidade, ADM DO BRASIL) foi rejeitada na primeira tentativa, corrigida e emitida pelo painel de **Notas Fiscais**; hoje está `autorizado`. A NF-e **145** foi cancelada por duplicidade.
- A tabela `notas_fiscais` **não tem** nenhuma coluna que aponte para a remessa. O único vínculo é `remessas_venda.nota_fiscal_id`, e ele só é gravado pelo diálogo de emissão automática da remessa, depois do polling retornar "autorizado".

Ou seja: quando a nota é rejeitada e depois reemitida/corrigida fora do fluxo da remessa, ninguém grava o vínculo — a remessa fica presa em "Carregado" para sempre.

## O que será feito

### 1. Vincular a remessa à NF-e no momento da criação da nota
No diálogo de emissão automática, gravar `nota_fiscal_id` na remessa assim que a nota é criada (antes do resultado da SEFAZ), mantendo o status como "carregado" até a autorização. Assim o vínculo existe mesmo em caso de rejeição, e qualquer correção/reemissão posterior é reconhecida.

### 2. Sincronizar o status automaticamente quando a NF-e for autorizada
Trigger no banco em `notas_fiscais`: quando o `status` passar para `autorizado`/`autorizada`, toda remessa vinculada àquela nota vai para `carregado_nfe`. Quando a nota for cancelada/inutilizada, a remessa volta para `carregado` e é desvinculada, liberando a reemissão.

Com isso, tanto a emissão pelo painel de Notas Fiscais quanto a correção de uma rejeição atualizam a remessa sozinhas, sem depender do navegador ficar aberto.

### 3. Vinculação manual para casos órfãos (como a 8569)
Na lista de remessas, para remessas em "Carregado" sem NF-e, um botão **"Vincular NF-e"** abre um seletor com as notas autorizadas compatíveis (mesmo destinatário/quantidade/período) para vincular manualmente. Ao vincular, o status vai para "Carregado/NFe".

### 4. Saneamento dos dados atuais
Vincular a remessa **8569** à NF-e **146** (autorizada) e marcar como `carregado_nfe`. Verificar e listar outras remessas em "Carregado" com nota autorizada compatível sem vínculo antes de qualquer outro ajuste.

## Detalhes técnicos

- `src/components/remessas/EmitirNfeAutomaticoDialog.tsx`: gravar `{ nota_fiscal_id }` na remessa logo após o insert em `notas_fiscais`; manter a mudança para `carregado_nfe` no sucesso (redundante com o trigger, mas mantém a UI imediata) e desfazer o vínculo se a nota falhar antes de ir à SEFAZ.
- Migração: função `trg_sync_remessa_status_nfe()` (SECURITY DEFINER, `search_path = public`) + trigger `AFTER UPDATE OF status ON notas_fiscais` atualizando `remessas_venda` por `nota_fiscal_id`.
- `supabase/functions/focus-nfe-cancelar/index.ts`: remessas vinculadas voltam para `status = "carregado"` com `nota_fiscal_id = null` (hoje ficam "cancelada"), coerente com o trigger.
- Novo `src/components/remessas/VincularNfeRemessaDialog.tsx` + botão em `src/pages/RemessasVendaForm.tsx`.
- Migração pontual de UPDATE para a remessa 8569 → NF-e 146.
- Sem novas tabelas; sem mudança de RLS ou grants.
