## Verificação: Safra Principal por Empresa (Tenant)

Consultei o banco e confirmei que a regra **já está corretamente aplicada** para `safras`, diferente do que aconteceu com `granjas`.

### Estado atual verificado

- **Função `handle_principal_safra()`**: existe e filtra por `tenant_id IS NOT DISTINCT FROM NEW.tenant_id`, desmarcando qualquer outra safra principal do mesmo tenant.
- **Trigger `trg_handle_principal_safra`**: **está ativo** na tabela `public.safras` (`BEFORE INSERT OR UPDATE OF is_principal`, `tgenabled = 'O'`).

### Conclusão

A safra já segue a mesma regra da granja (uma principal por empresa/tenant), e a garantia está no banco — não depende apenas da interface. Diferente da granja, aqui o trigger não estava faltando.

**Nenhuma migration ou alteração de código é necessária.**

Se quiser, posso apenas fazer um teste rápido marcando duas safras como principais em tenants diferentes para confirmar o comportamento em produção — mas do ponto de vista de schema, está tudo correto.
