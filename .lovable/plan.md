

## Diagnóstico: Configuração de importação de Safras incorreta

### Problemas encontrados

Comparando a config de importação (`importacaoConfig.ts` linhas 103-111) com a tabela `safras` no banco:

| Config atual (errado) | Tabela safras (correto) |
|---|---|
| `ano_inicio` | **não existe** |
| `ano_fim` | **não existe** |
| — | `ano_colheita` (faltando) |
| — | `cultura_id` (faltando) |
| — | `status` (faltando) |
| `ativa` | **não existe** |

### Correção

Atualizar a config de safras em `src/lib/importacaoConfig.ts`:

1. **Remover** campos inexistentes: `ano_inicio`, `ano_fim`, `ativa`
2. **Adicionar** `ano_colheita` (integer)
3. **Adicionar** `status` (string)
4. **Adicionar referência** para `cultura_id` via lookup na tabela `culturas` pelo campo `nome` ou `codigo`
5. Ajustar `dependsOn: ['culturas']` pois safras dependem de culturas

### Arquivo a modificar
- `src/lib/importacaoConfig.ts` — Corrigir bloco de config de safras (linhas 97-112)

