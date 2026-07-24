## Diagnóstico

Analisando a produtora **MARLICIA DA SILVA FERREIRA** (IE 472.100.647-0):

| Movimentação | Data | Qtd (kg) | Local | Status |
|---|---|---|---|---|
| Transferência entrada | 27/04/2026 | 15.000 | Márcio Grings | Confere com legado |
| Devolução #4105 | 28/04/2026 | 12.000 | Márcio Grings | Confere com legado |
| **Devolução #4245** | **24/06/2026** | **25.500** | **TosAgro** | **Não existe no legado (segundo o print)** |

O extrato do legado mostra saldo **3.000 kg** para o Local **Márcio Grings** (15.000 − 12.000), que bate perfeitamente com as duas primeiras movimentações. A devolução #4245, importada via wizard, está registrada no local **TosAgro** — que não aparece no print enviado.

## Próximo passo (aguardando você)

Você optou por **verificar no legado antes** de qualquer alteração. Por favor, confira no sistema legado:

1. Existe algum extrato/movimentação da MARLICIA no local **TosAgro**?
2. A devolução de **25.500 kg em 24/06/2026** existe em algum outro produtor/local do legado?
3. Se existir, qual é a IE / produtor correto para essa devolução?

## O que farei após seu retorno

Dependendo da resposta:

- **Se a devolução #4245 não existir no legado** → executo `DELETE` do registro `10751542-...` na tabela `devolucoes_deposito` (via ferramenta de dados).
- **Se pertencer a outro produtor** → executo `UPDATE` de `inscricao_produtor_id` (e `local_entrega_id` se necessário) para o cadastro correto.
- **Se pertencer à MARLICIA mesmo em outro local** → nenhuma alteração de dados; investigo a apresentação do relatório do nosso sistema para agrupar corretamente por local (o legado provavelmente exibe uma segunda seção "Local TosAgro" que o print não mostra).

## Observação técnica

Trata-se de correção pontual de dados importados. Nenhuma mudança de código de aplicação está prevista neste plano.
