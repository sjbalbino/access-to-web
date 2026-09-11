# Corrigir erro ao criar Emitente NF-e

## Diagnóstico confirmado

Na empresa **AGRO SILO COMERCIAL**, as três tentativas de criação enviaram a alíquota padrão de ICMS como **1818**. O campo do banco aceita no máximo **999,99**, por isso retornou `numeric field overflow`. Os demais valores numéricos enviados estavam dentro dos limites e nenhum emitente foi criado nessas tentativas.

O valor provavelmente pretendido é **18,18%**, mas o sistema atualmente permite enviar `1818` sem alertar o usuário.

## Implementação

1. Validar todas as alíquotas antes de salvar:
   - aceitar somente números finitos;
   - limitar o intervalo de **0% a 100%**;
   - impedir o envio e identificar exatamente o campo inválido.
2. Configurar os campos de alíquota com limites visuais e numéricos compatíveis (`min`, `max` e precisão decimal).
3. Melhorar o tratamento do erro no cadastro para mostrar uma orientação em português, em vez da mensagem técnica do banco.
4. Manter os limites do banco como proteção adicional; não ampliar a coluna para aceitar percentuais inválidos.

## Validação

- Confirmar que **18,18%** salva corretamente.
- Confirmar que **1818%**, valores negativos, vazios inválidos e números acima de 100% são bloqueados antes do envio.
- Verificar criação e edição de emitentes, incluindo os valores padrão de ICMS, PIS, COFINS, IBS, CBS e IS.
- Conferir que o cadastro aparece normalmente na lista após salvar.

## Impacto

A correção será aplicada a todos os emitentes, evitando o mesmo erro em outras empresas. Não será necessário alterar dados existentes nem a estrutura do banco.
