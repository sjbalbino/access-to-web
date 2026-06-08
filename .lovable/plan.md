## Objetivo
Corrigir o problema em que registros do **Controle de Lavoura** da **Granja Cruz Alta** continuam exibindo nomes de lavouras da **Granja Bom Jesus**.

## Diagnóstico encontrado
Os registros já gravados no banco estão com **vínculo incorreto de `lavoura_id`**.
Exemplo identificado: controles da **Granja Cruz Alta** apontando para lavouras cuja granja real é **Granja Bom Jesus**.

Ou seja: não é só um problema visual da tela; há também dados salvos incorretamente.

## Plano
1. **Corrigir a importação do Controle de Lavoura**
   - Ajustar a rotina para nunca aceitar uma `lavoura_id` cuja granja da lavoura seja diferente da granja do controle.
   - Remover qualquer fallback que permita vincular pelo código da lavoura sem validar a granja correspondente.
   - Fazer a busca sempre pelo par: **granja + código da lavoura**.

2. **Corrigir a listagem e os detalhes da tela**
   - Garantir que a tela de Controle de Lavoura priorize o vínculo consistente entre `controle_lavouras.granja_id` e `lavouras.granja_id`.
   - Evitar exibir nomes cruzados quando houver registro inconsistente.
   - Se necessário, mostrar somente registros válidos ou destacar inconsistências para não confundir a operação.

3. **Corrigir os dados já importados incorretamente**
   - Atualizar os registros existentes da safra afetada para apontarem para a lavoura correta da **Granja Cruz Alta**, usando o código legado + granja.
   - Onde não for possível determinar com segurança, deixar esses registros sinalizados para nova importação em vez de manter vínculo errado.

4. **Validar o resultado**
   - Conferir a safra **SOJA 2025/2026** da **Granja Cruz Alta**.
   - Verificar que nomes como **CHICO** e demais lavouras passem a refletir a granja correta na lista e no detalhe.

## Detalhes técnicos
- Arquivos principais já identificados:
  - `src/components/importacao/ImportacaoDialog.tsx`
  - `src/hooks/useControleLavouras.ts`
  - `src/components/controle-lavoura/ControleLavouraList.tsx`
- Também será necessária **correção de dados no backend**, porque parte dos registros atuais está salva com `lavoura_id` errada.
- A correção será feita de forma segura, respeitando a granja do controle e o código da lavoura importada.