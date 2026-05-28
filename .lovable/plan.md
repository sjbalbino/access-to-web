# Preencher cidade/UF padrão em clientes/fornecedores

## Contexto
O usuário pediu para atualizar todos os registros em `clientes_fornecedores` que não tenham cidade ou UF preenchidos, definindo:
- **CIDADE** = "CRUZ ALTA"
- **UF** = "RS"

## Dados atuais
- 1.148 registros encontrados sem cidade ou UF preenchidos.
- A tabela `clientes_fornecedores` já possui as colunas `cidade` e `uf` (strings).

## Ação
Executar um único UPDATE via SQL direto na Lovable Cloud:

```sql
UPDATE clientes_fornecedores
SET cidade = 'CRUZ ALTA', uf = 'RS'
WHERE cidade IS NULL OR cidade = '' OR uf IS NULL OR uf = '';
```

## Resultado esperado
- Todos os 1.148 registros passam a ter cidade "CRUZ ALTA" e UF "RS".
- Registros que já possuíam cidade/UF preenchidos permanecem inalterados.

## Fora de escopo
- Não criar coluna de código IBGE.
- Não alterar `logradouro`, `bairro`, `complemento`, `cep`.
- Não tocar em outras entidades.
