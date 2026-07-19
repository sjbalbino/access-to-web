## Objetivo
Garantir que exista apenas uma granja principal (`is_principal = true`) por empresa (`tenant_id`), tanto no banco de dados quanto na interface.

## Situação atual
- A função `public.handle_principal_granja()` existe e desmarca a anterior filtrando por `tenant_id`.
- O trigger que dispara essa função na tabela `public.granjas` **não está criado**.
- A UI já mostra um aviso visual, mas a regra não é reforçada no banco.

## Plano de ação

### 1. Banco de dados
- Criar o trigger `trg_handle_principal_granja` na tabela `public.granjas` (BEFORE INSERT OR UPDATE) para executar `public.handle_principal_granja()`.
- Validar que o trigger filtra por `tenant_id`, mantendo uma principal por empresa.

### 2. Frontend
- Manter o aviso visual na tela `Granjas.tsx` ao marcar uma nova granja como principal.
- Garantir que o hook `useGranjaPrincipal` continue filtrando por `tenant_id` (já faz isso).

### 3. Validação
- Verificar no banco que, ao marcar uma granja como principal, a anterior do mesmo tenant é desmarcada.
- Verificar que tenants diferentes podem ter suas próprias granjas principais sem conflito.

## Resultado esperado
Cada empresa terá no máximo uma granja principal; a anterior é desmarcada automaticamente ao salvar uma nova.