## Causa

A tabela `contas_pagar_baixas` **não possui a coluna `tenant_id`**, mas o importador injeta `tenant_id` na linha porque ela está listada em `SCR_TENANT_SCOPED_TABLES`. O PostgREST rejeita com:

> Could not find the 'tenant_id' column of 'contas_pagar_baixas' in the schema cache

A irmã `contas_receber_baixas` já tem `tenant_id` + trigger `set_baixa_tenant_from_conta`. Vamos espelhar isso em `contas_pagar_baixas`.

## Correção (migration única)

1. `ALTER TABLE public.contas_pagar_baixas ADD COLUMN tenant_id uuid;`
2. Backfill a partir de `contas_pagar.tenant_id`.
3. Criar trigger `BEFORE INSERT` que preenche `tenant_id` a partir de `contas_pagar` quando vier nulo (reutilizando/clonando a função `set_baixa_tenant_from_conta` para o lado pagar).
4. Índice em `tenant_id`.

(Não precisa mexer no código TS — o importador já envia `tenant_id` correto.)

## Observação

As políticas RLS atuais já isolam via `conta_id → contas_pagar → granja_belongs_to_tenant`, então a coluna nova é só para coerência de schema e o importador.
