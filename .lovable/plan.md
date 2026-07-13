## Objetivo

Gerar um arquivo Excel (`Colheitas_Corrigir_IEs_Genericas.xlsx`) com as **640 colheitas** vinculadas às inscrições genéricas `000.000.000-0` (366 linhas) e `111.111.111-1` (274 linhas), pronto para você preencher `inscricao_codigo` / `inscricao_nome` e reimportar em modo update.

## Contagem confirmada no banco

| IE atual | Colheitas |
|---|---|
| 000.000.000-0 | 366 |
| 111.111.111-1 | 274 |
| **Total** | **640** |

## Conteúdo da planilha

**Aba `Colheitas` (640 linhas)** — colunas na ordem:

1. `COL_CODIGO` — código da colheita (chave do updateMode)
2. `data_colheita` (DD/MM/YYYY)
3. `safra`
4. `lavoura` (controle de lavoura)
5. `silo`
6. `producao_kg`
7. `producao_liquida_kg`
8. `romaneio`
9. `motorista`
10. `inscricao_ie_atual` — IE genérica atual (000/111) — só para conferência
11. `produtor_atual` — nome do produtor hoje vinculado — pista para descobrir a IE correta
12. **`inscricao_codigo`** — VAZIO, você preenche com o código único da IE correta
13. **`inscricao_nome`** — VAZIO, opcional para conferência

**Aba `_INSCRICOES_REFERENCIA`** — dump de todas as inscrições ativas com `codigo`, `nome`, `inscricao_estadual`, `cpf_cnpj`, `produtor` — para você localizar o `inscricao_codigo` certo por busca.

## Fluxo

1. Você recebe o arquivo em `/mnt/documents/`.
2. Preenche `inscricao_codigo` nas 640 linhas (usando a aba de referência).
3. Importa em **Colheitas → Importar** — o `updateMode` já configurado atualiza somente `inscricao_produtor_id` das linhas com código preenchido, sem tocar em peso, data ou silo.

## O que aprovar

Aprovar libera a geração do arquivo Excel a partir das queries já validadas (nenhuma alteração de código).
