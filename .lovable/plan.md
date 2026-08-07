# Indicadores: separar "data de referência" de "última coleta"

## Diagnóstico (verificado no banco)

A coleta automática **funcionou hoje**: em 07/08 às 10:05 (SP) foram gravados 7 indicadores do CEPEA e 2 do Banco Central, com sucesso. O que não avançou foi a **data de referência**, que continua 06/08 — porque é essa a data que as próprias fontes publicam de manhã:

- CEPEA/ESALQ divulga o indicador do dia somente no fim da tarde.
- O PTAX de fechamento do Banco Central sai após as 13h (SP).

Portanto não há falha a corrigir na coleta. O problema é de comunicação: o visitante vê apenas "06/08" e conclui que o portal está parado.

## O que será feito

Exibir as duas informações, em todos os pontos onde a cotação aparece:

1. **Cards de cotação** (home e página de indicadores): manter "Referência DD/MM • Fonte" e acrescentar a linha "Atualizado hoje às HH:mm", com base no horário real da última coleta bem-sucedida.
2. **Cabeçalho de `/indicadores`**: trocar o texto atual por duas informações lado a lado — "Última referência: DD/MM" e "Última coleta: DD/MM às HH:mm".
3. **Nota explicativa** no rodapé da página de indicadores: esclarecer que grãos (CEPEA) e câmbio (PTAX) são divulgados no fim do dia, então de manhã a referência exibida é a do dia anterior — e que o portal nunca exibe valor ou data que a fonte não tenha publicado.
4. **Tabela resumo**: nova coluna/linha de rodapé com o horário da última coleta por fonte.

## Horários de coleta

Mantidos como estão: 10:05, 14:05 e 18:05 (segunda a sábado, horário de Brasília).

## Detalhes técnicos

- Novo hook `useUltimaColetaCotacoes` em `src/hooks/useCotacoes.ts`, lendo `cotacoes_status_coleta` (últimas coletas com `sucesso = true`, agrupadas por fonte). A tabela já tem política pública de leitura, então funciona sem sessão.
- Formatação do horário via `formatDateTimeSP` / `formatTimeSP` de `src/lib/datetime.ts`, garantindo fuso America/Sao_Paulo.
- `src/components/portal/CotacaoCard.tsx` recebe prop opcional `atualizadoEm` (nullable) e só renderiza a linha extra quando houver valor.
- `src/pages/portal/Indicadores.tsx` e `src/pages/portal/Home.tsx` passam o horário da coleta correspondente à fonte de cada cotação.
- Nenhuma alteração na Edge Function `atualizar-cotacoes`, no cron, nem na tabela `cotacoes_mercado`.
- Tokens semânticos apenas; verificação final no preview em mobile e desktop.
