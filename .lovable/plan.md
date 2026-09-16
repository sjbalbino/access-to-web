# Corrigir a demora na leitura dos PDFs

## Diagnóstico confirmado

O leitor separado do PDF continua encerrando com `Promise.try is not a function`. A correção existente é carregada apenas na página principal, não dentro desse leitor; por isso a tela fica aguardando e nenhuma solicitação chega à função de interpretação.

## Alterações

1. Criar um leitor de PDF compatível que carregue as correções necessárias dentro do próprio processo separado antes de iniciar o pdf.js.
2. Reutilizar uma única instância desse leitor, encerrando-a corretamente ao concluir ou falhar, para evitar travamentos e consumo acumulado de memória.
3. Processar os dois PDFs em paralelo e informar a etapa atual na tela: “Lendo PDFs” e “Interpretando lançamentos”.
4. Adicionar limite de tempo com mensagem clara e opção de tentar novamente, evitando carregamento infinito.
5. Manter a leitura simples automática como alternativa caso a interpretação assistida demore ou falhe.

## Validação

- Testar com os dois extratos reais anexados juntos.
- Confirmar que o erro de compatibilidade não aparece mais.
- Confirmar que os movimentos são exibidos e que a tela sempre encerra o estado de leitura, inclusive em falhas.
- Verificar a prévia em computador e celular.

## Detalhes técnicos

Arquivos previstos: leitor/polyfills do PDF e diálogo de conferência. Nenhuma alteração de dados, saldos ou regras de reatribuição será feita.
