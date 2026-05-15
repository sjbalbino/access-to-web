# Causa raiz

A tabela `granjas` tem **UNIQUE global** em `codigo` e em `cnpj`:

```
empresas_codigo_key  UNIQUE (codigo)
empresas_cnpj_key    UNIQUE (cnpj)
```

Estado atual no banco:

| codigo | razao_social          | tenant                  |
|--------|-----------------------|-------------------------|
| 1      | AGROPECUARIA GRINGS   | AGROPECUARIA GRINGS     |
| 2      | UMBU AGROPECUARIA-JUR | UMBU AGROPECUARIA S.A.  |
| 3      | CASA DONA IRENE       | UMBU AGROPECUARIA S.A.  |

Você importou 3 granjas para o tenant **UMBU**, mas a 3ª (provavelmente com `codigo = 1`, mesmo código da AGROPECUARIA GRINGS já existente em outro tenant) foi bloqueada pela constraint global. Por isso só 2 entraram. Como a importação faz fallback linha-a-linha em silêncio, o erro foi acumulado em `importErrors`, mas o resumo mostrou apenas "X importados".

Em sistema multi-tenant, código e CNPJ de granja devem ser únicos **por tenant**, não globalmente — duas empresas contratantes diferentes podem ter granjas com o mesmo código legado ou até mesmo o mesmo CNPJ (cenário raro mas possível em reorganizações societárias).

# Mudança proposta

## Banco (migration)

1. Remover constraints globais:
   - `ALTER TABLE granjas DROP CONSTRAINT empresas_codigo_key`
   - `ALTER TABLE granjas DROP CONSTRAINT empresas_cnpj_key`

2. Criar índices únicos compostos parciais (ignoram NULL):
   - `CREATE UNIQUE INDEX granjas_tenant_codigo_uniq ON granjas (tenant_id, codigo) WHERE codigo IS NOT NULL`
   - `CREATE UNIQUE INDEX granjas_tenant_cnpj_uniq ON granjas (tenant_id, cnpj) WHERE cnpj IS NOT NULL`

Isso permite repetir `codigo`/`cnpj` entre tenants distintos, mas mantém unicidade dentro de cada tenant.

## Frontend (nenhuma alteração)

A lógica de importação já injeta `tenant_id` corretamente. Após a migration, basta reimportar a planilha — a 3ª granja entrará normalmente.

# Observação

A importação atual silencia erros parciais no toast (`Importação parcial: X importados, Y erros`). Os erros ficam visíveis no painel do diálogo (`importErrors`), então da próxima vez confira o painel após a importação para ver linhas rejeitadas.
