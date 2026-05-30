## Objetivo
Colocar os campos **Token de Produção** e **Token de Homologação** lado a lado, na mesma linha, no formulário de Emitentes NFe.

## Situação atual (`src/pages/EmitentesNfe.tsx`, linhas ~875-952)
- Linha 1 do grid: Token Principal de Produção (md:col-span-2) + Token de Homologação (1 coluna) — ficam na mesma linha.
- Linha 2 (grid separado de 2 colunas): Token de Produção sozinho, posicionado na coluna 2.

Resultado: Homologação fica em uma linha, Produção em outra.

## Mudança
Reordenar para que **Token de Homologação** e **Token de Produção** fiquem na mesma linha do grid (cada um ocupando 1 coluna em `md:`), e **Token Principal de Produção** fique sozinho em linha própria ocupando largura total (`md:col-span-2`).

Nova estrutura do grid (mantém `grid-cols-1 md:grid-cols-2 gap-4` já existente):
1. Token Principal de Produção — `md:col-span-2` (linha inteira)
2. Token de Homologação — 1 coluna
3. Token de Produção — 1 coluna (ao lado de Homologação)

Remover o segundo `<div className="grid grid-cols-2 gap-4">` extra que envolvia apenas o Token de Produção, movendo esse campo para dentro do grid principal de credenciais.

## Fora de escopo
- Sem alteração de lógica, validação, estado ou salvamento.
- Sem mudanças visuais além do reposicionamento (ícone show/hide, labels e placeholders permanecem).
