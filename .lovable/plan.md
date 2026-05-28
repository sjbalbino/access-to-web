# Enriquecer cidade/UF dos clientes e fornecedores legados

## Objetivo
Preencher `cidade` e `uf` (e, quando vazios, `logradouro`, `bairro`, `complemento`) dos registros em `clientes_fornecedores` que vieram do sistema legado sem essas informações, usando duas fontes públicas:

1. **ViaCEP** — quando o registro tem `cep` com 8 dígitos.
2. **BrasilAPI (CNPJ)** — quando o registro não tem CEP utilizável mas tem `cpf_cnpj` com 14 dígitos.

## Escopo dos dados (medido agora)
- 1.329 clientes/fornecedores no total.
- 1.194 estão sem cidade/UF.
  - 56 com CEP válido → recuperáveis via ViaCEP.
  - 41 com CNPJ → recuperáveis via BrasilAPI.
  - 70 só com CPF → não há fonte pública de endereço; ficam como estão.
  - 1.083 sem CEP e sem CNPJ → impossíveis de enriquecer automaticamente; ficam como estão.
- A tabela não possui coluna de código IBGE, então o enriquecimento via IBGE não é aplicável aqui (essa coluna existe em outras entidades, não em `clientes_fornecedores`).

## Implementação

### 1. Nova edge function `enriquecer-clientes-fornecedores`
- Roda no servidor (evita CORS e respeita rate-limit melhor).
- Recebe opcional `{ tenant_id?: string, dry_run?: boolean, limit?: number }`.
- Seleciona `clientes_fornecedores` onde `cidade IS NULL OR cidade = ''` (e opcionalmente filtrado por tenant).
- Para cada registro:
  - Se houver `cep` com 8 dígitos → consulta ViaCEP.
  - Senão, se houver `cpf_cnpj` com 14 dígitos → consulta BrasilAPI (`/api/cnpj/v1/{cnpj}`).
  - Atualiza apenas campos vazios: `cidade`, `uf`, e (somente se estavam em branco) `logradouro`, `bairro`, `complemento`, `cep`.
  - Nunca sobrescreve `nome`, `cpf_cnpj`, `inscricao_estadual`, telefones ou email.
- Throttle simples (~200 ms entre chamadas) para não bater rate-limit das APIs públicas.
- Retorna um resumo: total processado, atualizados, falhas por motivo (CEP não encontrado, CNPJ não encontrado, erro de rede), e lista dos IDs não resolvidos.
- Em `dry_run = true`, apenas simula e retorna o resumo sem gravar.

### 2. Botão de manutenção em `src/pages/ClientesFornecedores.tsx`
- Botão **"Enriquecer endereços (CEP/CNPJ)"** visível só para usuários com permissão de edição.
- Abre diálogo de confirmação mostrando a contagem estimada (1.194 sem cidade, 97 enriquecíveis).
- Permite rodar primeiro em **dry-run** e depois efetivar.
- Mostra progresso/resultado via toast e um pequeno painel com o resumo retornado pela função.
- Invalida a query `clientes_fornecedores` ao final.

### 3. Sem mudanças de schema
- Nenhuma migration necessária: estamos preenchendo colunas já existentes.

## Fora de escopo
- Não cria coluna de código IBGE em `clientes_fornecedores`.
- Não tenta inferir cidade a partir de DDD do telefone ou do nome do cliente.
- Não altera registros que já têm `cidade` preenchida.
- Não toca em outras entidades (produtores, emitentes, granjas etc.).

## Resultado esperado
- ~97 registros passam a ter cidade/UF preenchidos automaticamente.
- Os ~1.097 restantes seguem em branco e podem ser tratados manualmente ou por um novo import com endereço — informo isso claramente no resumo final.
