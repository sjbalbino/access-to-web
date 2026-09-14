# Trocar empresa no celular + cancelar remessa junto com a NF-e

## 1. Trocar empresa contratante pelo celular

No computador, o menu do usuário tem "Empresa ativa" e "Trocar empresa contratante". No menu do celular esse item não existe — só aparecem "Usuários" e "Empresas Contratantes".

Será adicionado no menu do celular, para super admin:
- a empresa ativa em destaque (ou "Todas as empresas");
- o item "Trocar empresa contratante", que abre a tela de seleção e fecha o menu.

## 2. Cancelamento da NF-e passa a cancelar a remessa

Hoje, ao cancelar uma NF-e de remessa de venda, a remessa volta para "Carregado" e é desvinculada da nota — por isso ela continua somando no saldo de carregados do contrato, como a Márcia relatou.

Regra nova, sempre automática: quando a NF-e é cancelada (ou inutilizada), a remessa vinculada passa para **Cancelada** e sai do saldo de carregados do contrato. Para emitir de novo, lança-se uma remessa nova.

Também será feito o saneamento das remessas já afetadas: remessas ligadas a notas canceladas (ou que ficaram em "Carregado" após um cancelamento) serão marcadas como Canceladas, para o saldo dos contratos ficar correto.

## Detalhes técnicos

- `src/components/layout/MobileNav.tsx`: bloco condicional `isSuperAdmin` com nome da empresa ativa (via `useTenants` + `profile.tenant_id`) e botão navegando para `/selecionar-empresa`.
- `supabase/functions/focus-nfe-cancelar/index.ts`: passo 4 passa a gravar `status = "cancelada"` em `remessas_venda` (mantendo `nota_fiscal_id` para rastreio) em vez de `carregado`/`null`.
- Migração: ajustar `trg_sync_remessa_status_nfe()` para, em status cancelado/inutilizado da nota, definir `status = 'cancelada'` na remessa; manter a promoção para `carregado_nfe` quando autorizada.
- Migração de saneamento: UPDATE em `remessas_venda` cujo `nota_fiscal_id` aponta para nota cancelada/inutilizada e status ainda não é `cancelada`.
- `useTotaisContrato` já ignora `status = 'cancelada'`, então o saldo do contrato se corrige sozinho.
- Sem novas tabelas, sem mudanças de RLS ou grants.
