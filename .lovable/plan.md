# Corrigir rejeição 1033 — grupo de redução de alíquota Estadual (IBS)

## O que a SEFAZ devolveu

Contra-nota de entrada, série 930 (CFOP 1551, "Contra-nota de entrada - Venda de Merc.Adq.ou Rec.Terc."):

```text
status_sefaz: 1033
Rejeicao: Não informado o grupo de redução de alíquota Estadual  [nItem:1]
```

## Causa confirmada

O item 1 foi enviado com **CST IBS/CBS 515** e **cClassTrib 515001** (insumos agropecuários — Anexo IX), que é uma classificação **com redução de alíquota**. Nesse caso o XML exige o grupo de redução (`gRed` / `pRedAliq`) tanto para o IBS estadual quanto para o municipal e para a CBS.

No payload efetivamente enviado (visto nos logs da função de emissão) foram gravadas apenas as alíquotas cheias — `ibs_uf_aliquota: 0.1`, `ibs_mun_aliquota: 0`, `cbs_aliquota: 0.99` — **sem nenhum campo de percentual de redução**.

O motivo está em `src/lib/focusNfeMapper.ts`: a função `getPercentualReducaoIbsCbs` só conhece as classificações `200014`, `200036` e `200038`. Para `515001` ela retorna `undefined`, e as linhas seguintes omitem `ibs_uf_percentual_reducao_aliquota`, `ibs_mun_percentual_reducao_aliquota` e `cbs_percentual_reducao_aliquota`. Sem esses campos a Focus não monta o grupo de redução e a SEFAZ rejeita com 1033.

## Correção proposta

1. **Ampliar a tabela de reduções** (`getPercentualReducaoIbsCbs`), incluindo `515001` (insumos agropecuários e aquícolas — redução de 60%) e as demais classificações da família 515 usadas nas operações do sistema.

2. **Fallback por CST, e não só por cClassTrib**: quando o CST exigir o grupo de redução (famílias 200, 210, 220/221/222, 510, 515) e a classificação não estiver mapeada, aplicar o percentual padrão do CST em vez de omitir o grupo. Assim uma classificação nova nunca mais gera rejeição por grupo ausente.

3. **Nunca omitir o grupo quando ele é obrigatório**: enviar `ibs_uf_percentual_reducao_aliquota`, `ibs_mun_percentual_reducao_aliquota`, `cbs_percentual_reducao_aliquota` e as respectivas alíquotas efetivas sempre que o CST estiver na lista acima, recalculando `ibs_uf_valor`, `ibs_mun_valor`, `ibs_valor_total` e `cbs_valor` com a alíquota efetiva.

4. **Validação preventiva na tela**: em `validarIbsCbsItens`, acusar o item quando o CST exigir redução e não houver percentual determinável, exibindo o aviso antes da emissão em vez de deixar a nota ir para rejeição.

5. **Reemitir a nota**: após o ajuste, recalcular impostos e emitir novamente (o sistema já gera nova referência a cada tentativa, então não haverá duplicidade).

## Detalhes técnicos

- Arquivo principal: `src/lib/focusNfeMapper.ts` (`getPercentualReducaoIbsCbs`, bloco `if (temIbsCbs)`, `validarIbsCbsItens`).
- Nenhuma alteração de banco de dados ou de edge function é necessária — o payload é montado no frontend e apenas repassado pela função de emissão.
- Valores monetários seguem o arredondamento já existente (`calcularAliquotaEfetiva` com 4 casas, `calcularValorTributo` com 2).
