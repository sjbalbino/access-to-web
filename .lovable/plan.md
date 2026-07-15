## Objetivo
Renderizar o formulário completo da Nota de Depósito desde a abertura do diálogo, mantendo os campos de produto/quantidade utilizáveis somente após a seleção de Local, Safra e Inscrição Estadual (opção **b**).

## Alteração
Arquivo: `src/components/deposito/NotaDepositoFormDialog.tsx`

1. **Remover o gate** da linha 677 `{inscricaoId && inscricaoSelecionada && (...)}` — todas as sub-seções (Dados do Produtor, Saldos por Variedade, Notas Referenciadas, Dados da Contra-Nota) passam a ser sempre renderizadas.

2. **Proteger acessos** dentro do card "Dados do Produtor" com optional chaining (`inscricaoSelecionada?.…`) e fallback `"-"`, para não quebrar quando ainda não há inscrição escolhida.

3. **Desabilitar entradas dependentes** enquanto `!inscricaoId`:
   - Select "Variedade" → `disabled={!inscricaoId}` e placeholder "Selecione a inscrição primeiro".
   - Input "Quantidade (kg)" → `disabled={!inscricaoId || !produtoId}`.
   - Botão "Adicionar Nota" (referenciadas) → `disabled={!inscricaoId}`.
   
4. **Estados vazios já existentes** dos cards de Saldos e Notas Referenciadas permanecem — vão exibir naturalmente "Nenhum saldo encontrado" / "Nenhuma nota referenciada adicionada" antes da seleção.

5. **Sem mudanças** em hooks, queries, lógica de emissão de NFe, validação do submit (`handleGerarNfe` já valida os campos) ou estilos.

## Fora de escopo
- Nada de banco, RLS, migrations.
- Não alterar comportamento do botão "Gerar NFe" (continua desabilitado até `produtoId && quantidadeKg && inscricaoId`).

## Validação
Abrir Notas de Depósito → Nova Nota de Depósito e confirmar que a tela abre já com todos os cards visíveis, com produto/quantidade desabilitados até que Local + Safra + IE sejam escolhidos.
