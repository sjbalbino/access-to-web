## Diagnóstico

Foram importados **299 plantios** recentemente. Os 4 registros que deveriam ir para os controles **314, 316, 317 e 318** da **Granja Bom Jesus / SOJA 2025/2026** foram salvos nos controles da **Granja Cruz Alta** (MILHO 2024/2025 e SOJA 2024/2025), porque esses códigos existem em mais de uma granja:

- **314** existe em: Cruz Alta (MILHO 2024/2025), Grings (MILHO 2021/2022), **Bom Jesus (SOJA 2025/2026)**
- **316, 317, 318** existem em: Cruz Alta, Grings e **Bom Jesus (SOJA 2025/2026)**

### Causa raiz no código

Em `src/components/importacao/ImportacaoDialog.tsx` (linhas 336–416), o lookup para resolver `controle_lavoura_id` em **plantios/colheitas** tenta três chaves em sequência:

```text
1) codigo + granja + safra   (específico)
2) codigo + granja            (fallback)
3) codigo                     (fallback global)
```

Quando a planilha **não traz coluna de granja** e o usuário **não seleciona uma granja no dropdown**, `granjaId` fica vazio e o sistema cai no fallback nº 3, pegando o **primeiro controle com aquele código** — que normalmente é o mais antigo (Cruz Alta), não o atual (Bom Jesus SOJA 2025/2026). Como `granjaId` é nulo, a checagem `match.granja_id !== granjaId` não dispara aviso, e o registro é gravado silenciosamente no controle errado.

## Plano

### 1. Corrigir a rotina de importação de Plantios e Colheitas
Arquivo: `src/components/importacao/ImportacaoDialog.tsx`

- **Tornar a Granja obrigatória** para importação de `plantios` e `colheitas` (igual ao que já acontece em `controle_lavouras`): exigir seleção no dropdown da UI ou coluna `granja_codigo` na planilha. Se faltar, bloquear a importação com mensagem clara.
- **Remover o fallback nº 3 (`ctrlMap.get(codigoControle)`)** — só permitir match quando `codigo + granja` (ou `codigo + granja + safra`) corresponderem.
- Quando o código existir em mais de um controle dentro da mesma granja (várias safras), preferir o vínculo `codigo + granja + safra`. Se a planilha tiver `safra_codigo` apenas como referência ao controle (caso atual), continuar usando `codigo + granja` como chave principal.
- Mensagens de erro mais específicas, do tipo: *"Linha X: código 314 existe em mais de uma granja; selecione a Granja correta acima do upload"*.

### 2. Corrigir os 4 vínculos errados já gravados
Atualizar no banco os plantios criados nas últimas importações cujo `controle_lavoura_id` aponta para Cruz Alta (códigos 314/316/317/318) e remapeá-los para os controles correspondentes de **Bom Jesus / SOJA 2025/2026**.

Também atualizar `safra_id` e `lavoura_id` desses plantios para refletir o controle correto.

### 3. Validar
- Conferir tela **Controle de Lavoura → Granja Bom Jesus → SOJA 2025/2026 → códigos 314/316/317/318**: os plantios devem aparecer na aba **Plantios**.
- Conferir que os controles de Cruz Alta (MILHO 2024/2025 e SOJA 2024/2025) não exibem mais os plantios que foram remanejados.
- Reimportar uma planilha de teste sem selecionar granja e confirmar que o sistema bloqueia em vez de gravar no controle errado.

## Observação para o usuário
Para a próxima importação de Plantios/Colheitas, **sempre selecione a granja correta no campo acima do upload** (ou inclua a coluna `granja` / `codigo_granja` na planilha). Sem isso, códigos repetidos entre granjas levam ao vínculo errado.
