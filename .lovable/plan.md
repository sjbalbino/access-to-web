# Plano

## O que foi confirmado
- O cadastro usado na verificação é o **emitente do Júlio Cesar Machado Costa**.
- O CPF consultado é **606.846.740-68**.
- O token salvo para esse emitente é o mesmo que está sendo enviado na chamada.
- O ambiente atual do emitente está como **Produção**.
- A resposta da Focus NFe indica **permissão negada para esse token nesse CPF/CNPJ em produção**.

## O que isso significa
O problema **não está mais no salvamento do token nem na escolha do emitente**. Neste momento, a integração está chamando a Focus NFe com:
- emitente correto
- CPF correto
- token correto salvo no cadastro
- ambiente de produção

Mesmo assim, a Focus responde que esse token **não tem permissão** para consultar/operar esse CPF/CNPJ nesse ambiente.

## Próximos passos recomendados
1. Verificar no painel da Focus NFe se o **token pertence exatamente à mesma conta** onde a empresa/emitente do CPF `60684674068` está cadastrada.
2. Confirmar se essa empresa está cadastrada e habilitada em **produção**, e não apenas em homologação.
3. Confirmar se o token informado é realmente o token de **NFe/empresas** da conta certa, sem espaço extra nem token antigo/regenerado.
4. Melhorar a mensagem do sistema para mostrar com mais clareza:
   - emitente consultado
   - ambiente usado
   - prefixo do token usado
   - orientação objetiva quando a Focus devolver 403/permissão negada
5. Opcionalmente, adicionar uma verificação extra no backend para diferenciar com mais precisão:
   - token inválido
   - token de outra conta
   - empresa não cadastrada naquele ambiente
   - empresa cadastrada mas não habilitada

## Detalhe técnico
A função `focus-nfe-verificar-empresa` está chamando:
- `https://api.focusnfe.com.br/v2/empresas/60684674068`

com autenticação Basic usando o token salvo no emitente do Júlio. A resposta retornada pela Focus é compatível com erro de permissão do próprio provedor, não com seleção errada de registro no app.

## Resultado esperado após implementar a melhoria
Mesmo quando a Focus recusar, a tela vai deixar explícito se o problema é:
- ambiente incorreto
- empresa não cadastrada
- empresa não habilitada
- token sem acesso à conta/empresa consultada