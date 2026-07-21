## Objetivo
Na tela **Entradas NF-e → Buscar no SEFAZ (DFe)**, deixar os botões **XML** e **Dar entrada** desabilitados visualmente enquanto a NF-e não tiver manifestação processada, e exibir um placeholder mais claro no lugar de "-" quando o nome do emitente não estiver disponível.

## Contexto atual
- A coluna **Emitente** mostra `nfe.nome || "-"`. Esse nome só vem preenchido quando a SEFAZ entrega o XML completo, o que só ocorre após uma manifestação (Ciência, Confirmação etc.).
- Os botões **XML** e **Dar entrada** já funcionam corretamente, mas permanecem clicáveis mesmo sem manifestação, gerando retornos de erro da SEFAZ.

## Alterações propostas

### 1. Desabilitar botões XML e "Dar entrada" sem manifestação
No componente `src/components/entradas-nfe/MdeDialog.tsx`, na linha de ações de cada NF-e:

- Criar uma verificação `const manifestacaoProcessada = !!nfe.manifestacao_destinatario;`.
- Aplicar `disabled={!manifestacaoProcessada}` nos botões:
  - **XML** (download do arquivo XML).
  - **Dar entrada** (importação automática para `entradas_nfe`).
- Adicionar `title` explicativo quando desabilitado:  
  *"Manifeste a NF-e primeiro para liberar o XML completo"*.
- Aplicar estilo visual de desabilitado (opacidade reduzida, cursor `not-allowed`) para deixar claro que a ação está bloqueada.

### 2. Melhorar placeholder do emitente
Na coluna **Emitente**, quando `nfe.nome` estiver vazio:

- Substituir o texto "-" por:  
  **"Aguardando manifestação"**.
- Manter o CNPJ e a chave visíveis abaixo, pois esses dados vêm do resumo do DFe.
- Opcionalmente, aplicar cor âmbar no placeholder para associar visualmente ao status "Sem manifestação".

### 3. Ajustar preview do DANFe (consistência)
No preview do DANFe (modal secundário), o botão **XML** também deve respeitar a mesma regra de desabilitação quando não houver manifestação processada.

## Arquivos envolvidos
- `src/components/entradas-nfe/MdeDialog.tsx`

## Critérios de aceitação
- Botões **XML** e **Dar entrada** aparecem desabilitados (visualmente apagados) para NF-es com status "Sem manifestação".
- Ao passar o mouse sobre os botões desabilitados, exibe tooltip explicando a necessidade da manifestação.
- NF-es sem nome do emitente exibem "Aguardando manifestação" em vez de "-".
- Manifestações registradas (Ciência, Confirmação, Desconhecimento, Não Realizada) mantêm os botões habilitados normalmente.
- Nenhuma alteração de comportamento nas demais ações (Manifestar, Visualizar DANFe, Baixar DANFe).