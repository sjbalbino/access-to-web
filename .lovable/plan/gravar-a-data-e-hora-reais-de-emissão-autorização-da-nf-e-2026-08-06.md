# Gravar a data e hora reais de emissão/autorização da NF-e

## Situação atual (verificada)

Nota 162 (série 930), autorizada pelo painel de Notas Fiscais:

```text
162/930  status autorizado
         data_emissao 06/08 21:30:22   (valor sintético: created_at + 1 min)
         created_at   06/08 21:29:22
         updated_at   06/08 21:53:39
         protocolo    243260349131515
```

Comparando com as vizinhas: 161 e 163 têm `data_emissao` gerada no navegador no momento em que o diálogo montou os dados (21:17 e 21:47), não a data/hora que consta no XML autorizado.

Verificado no código: nem `focus-nfe-emitir` nem `focus-nfe-consultar` gravam a data/hora de emissão retornada pela API — as duas funções atualizam somente status, chave, número, série, protocolo, XML/DANFE e mensagens. Ou seja, hoje a `data_emissao` do banco é sempre uma estimativa local, nunca o valor oficial do documento.

## O que será feito

1. **Persistir a data/hora oficial do documento**: nas funções de emissão e de consulta, quando a resposta da API traz a data/hora de emissão do documento (campo de data de emissão / data de autorização retornado pelo provedor), gravar esse valor em `data_emissao` da nota, sobrescrevendo a estimativa local. Se a API não devolver nada, mantém o valor atual (nunca zera).
2. **Registrar a data/hora da autorização**: gravar também o instante da autorização na nota, para diferenciar "emitida" de "autorizada" e permitir auditoria.
3. **Regravar a nota 162 (e demais autorizadas com data estimada)**: reconsultar a nota na API e atualizar a `data_emissao` com o valor oficial, corrigindo o horário sintético atual.
4. **Exibição**: a lista de Notas Fiscais e a coluna de data continuam mostrando data/hora no fuso America/São Paulo; a ordenação já usa o instante efetivo de emissão.

## Detalhes técnicos

- `supabase/functions/focus-nfe-emitir/index.ts` e `supabase/functions/focus-nfe-consultar/index.ts`: acrescentar ao `updateData` a data de emissão vinda de `responseData` (aceitando as variações de nome usadas pelo provedor: data de emissão e data de autorização), normalizada para timestamp com fuso.
- Nova coluna `data_autorizacao` (timestamptz, nullable) em `notas_fiscais` via migração, sem alterar nenhum dado existente.
- `src/hooks/useFocusNfe.ts`: manter o fallback que evita `data_emissao` às 00:00, mas deixar a resposta da API como fonte de verdade quando existir.
- Correção da nota 162 feita por reconsulta (usa o valor oficial) — sem inventar horário.
