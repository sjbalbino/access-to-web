# Os 2 rascunhos não liberam "Emitir NF-e" — diagnóstico e correção

## Diagnóstico (confirmado no banco)

Os dois rascunhos criados hoje (FELIPE COPETTE DARONCO, 17:55, R$ 12.389,00 e EDUARDO DARONCO JUNIOR, 18:02, R$ 9.611,00) pertencem à granja **UMBU AGROPECUARIA** e foram gravados apontando para a inscrição do produtor **JORGE ALBERTO MACHADO DA COSTA** (IE 034.109.042-5), cujo emitente NF-e vinculado está:

- `ativo = false`
- `api_configurada = false`
- sem nenhuma credencial Focus NFe gravada (todos os tokens nulos)

O botão só habilita quando a nota é rascunho, tem itens e o emitente tem `api_configurada = true`. Os itens existem (1 item em cada nota), então o único bloqueio é o emitente.

Contexto adicional: existem **3 inscrições diferentes com a mesma IE 034.109.042-5** na Umbu (Jorge Alberto, Milton, Julio Cesar), cada uma com um emitente próprio. Todo o histórico real de notas autorizadas da empresa (72 notas, série 930, até o número 140) foi emitido pelo emitente da inscrição de **JULIO CESAR MACHADO COSTA**. O emitente usado nos rascunhos nunca emitiu nada.

Ou seja: as notas foram vinculadas à inscrição "errada" (duplicata da mesma IE, sem API), e não a um problema do formulário.

## Correção proposta

### 1. Destravar as duas notas (imediato)
Trocar, nos dois rascunhos, a inscrição/emitente para a inscrição ativa e configurada da mesma IE 034.109.042-5 (a que já emite a série 930). Feito isso, o botão "Emitir NF-e" habilita normalmente.

### 2. Evitar reincidência no cadastro
- No seletor de "Produtor / Inscrição" do formulário de NF-e, exibir apenas inscrições cujo emitente esteja ativo e com API configurada, ou marcar visualmente as demais como "sem emissor configurado" e impedir a seleção.
- Mensagem de bloqueio explícita no botão (tooltip) informando o motivo real: "Emitente sem API configurada", "Nota sem itens" ou "Nota já emitida" — hoje o botão apenas fica cinza sem explicação.

### 3. Higienização das duplicatas (opcional, recomendado)
As 3 inscrições com IE idêntica vêm da importação antiga. Sugestão: manter apenas a inscrição correta como emissora e desativar (`ativa = false`) os emitentes duplicados sem credenciais, para que não voltem a aparecer nas telas de emissão.

## Detalhes técnicos
- Regra do botão: `src/pages/NotaFiscalForm.tsx` (canEmit exige `emitente?.api_configurada`); mesma checagem em `handleEmitirNfe`.
- Filtro/rotulagem do seletor de inscrições: `src/hooks/useInscricoesProdutor.ts` (já retorna `emitente.api_configurada`) consumido pelo formulário.
- Atualização dos 2 rascunhos e desativação dos emitentes duplicados via operação de dados/migração.
