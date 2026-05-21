## Causa do problema

A tabela `produtores` tem uma restrição **UNIQUE global** na coluna `codigo`:

```
produtores_codigo_key  UNIQUE (codigo)
```

No sistema multi-tenant, cada empresa contratante tem seus próprios produtores numerados a partir de 1. Como a empresa anterior já importou produtores com códigos 1, 2, 4, 5, a nova importação da segunda empresa falhou com:

```
duplicate key value violates unique constraint "produtores_codigo_key"
```

Apenas o produtor de código 3 entrou (porque não existia ainda em nenhum tenant).

Além disso, o lookup de `produtor_codigo` nas inscrições (e referências futuras) também ficaria ambíguo se dois tenants tiverem o mesmo código — mas como o RLS filtra por tenant, na prática o lookup já só enxerga os do tenant atual; o problema é apenas a constraint global.

## Plano de correção

### 1. Migração no banco

- Remover `UNIQUE (codigo)` global em `produtores`.
- Criar índice único composto **por granja**: `UNIQUE (granja_id, codigo)` em `produtores` (cada granja tem sua própria numeração; isso já garante isolamento por tenant via granja → tenant).
- Verificar e corrigir o mesmo padrão em outras tabelas com numeração legada por empresa. Vou auditar e ajustar onde houver UNIQUE global em `codigo`:
  - `granjas.codigo` (já deve ser por tenant — confirmar)
  - `clientes_fornecedores.codigo`
  - `lavouras.codigo`
  - `silos.codigo`
  - `produtos.codigo`
  - `placas.codigo`
  - `transportadoras.codigo`
  - `safras.codigo`, `culturas.codigo`, etc.
  
  Em cada uma: se houver UNIQUE global, substituir por UNIQUE composto com a coluna de escopo apropriada (tenant_id ou granja_id, conforme a tabela).

### 2. Após a migração

- Reimportar produtores da segunda empresa — todos os registros deverão entrar.
- Não é necessário alterar `importacaoConfig.ts` nem a UI: o lookup de `granja_codigo`/`produtor_codigo` já é resolvido dentro do tenant via RLS.

### 3. Observação

Não vou alterar configurações do supabase/auth nem dados de produção. A migração é apenas estrutural (drop/recreate de índices únicos), preservando todos os dados existentes.