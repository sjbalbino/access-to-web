## Objetivo
Ajustar a etapa **Emitente** da NF-e para que ela trabalhe pela **inscrição do produtor/sócio que tem emitente vinculado** (CPF para pessoa física, CNPJ para pessoa jurídica), e não pela granja como critério principal.

## O que vou corrigir
1. **Resolver o emitente pela própria inscrição**
   - Trocar todos os pontos restantes em `NotaFiscalForm.tsx` que ainda procuram emitente por `granja_id`.
   - Passar a usar sempre `inscricao.emitente_id` como vínculo principal.

2. **Corrigir o carregamento da inscrição selecionada**
   - Hoje a tela usa `useInscricoesSocio()`, mas a nota aberta está ligada a uma inscrição cujo `tipo_produtor` no banco está como `produtor`, não `socio`.
   - Isso faz a inscrição sumir da lista, o select ficar vazio e a tela cair em mensagens genéricas ligadas à granja.
   - Vou manter o filtro operacional para as opções válidas, mas garantir que a **inscrição já salva na nota** também seja carregada/mostrada mesmo quando estiver fora do filtro, para edição sem quebrar a tela.

3. **Corrigir a UI para refletir a regra real**
   - Atualizar textos de ajuda, status e erro para falar em:
     - inscrição do produtor/sócio
     - emitente vinculado à inscrição
     - CPF/CNPJ do emitente
   - Remover mensagens que ainda dizem “configuração da granja”.

4. **Ajustar autosave e preenchimento automático**
   - O autosave ainda tem trechos buscando emitente pela granja.
   - Vou alinhar autosave, carregamento inicial, progresso da aba e emissão para todos usarem o mesmo critério da inscrição.

5. **Preservar compatibilidade com notas já criadas**
   - Se a nota antiga já estiver salva com `emitente_id`/`granja_id`, a tela deve abrir corretamente e exibir o emitente correspondente sem perder o vínculo visual.

## Resultado esperado
- O campo **Inscrição do Sócio (Emitente)** deixa de parecer “vazio/incorreto” quando a nota já possui uma inscrição vinculada.
- A confirmação de API passa a refletir o **emitente vinculado à inscrição**.
- As mensagens deixam de dizer que a configuração está na granja quando, na prática, ela está vinculada ao CPF/CNPJ da inscrição.

## Detalhes técnicos
- Arquivo principal: `src/pages/NotaFiscalForm.tsx`
- Fontes de dados envolvidas:
  - `useInscricoesSocio()`
  - `useEmitentesNfe()`
  - nota atual carregada de `notas_fiscais`
- Regra-alvo:
  - `inscricao_produtor -> emitente_id -> emitentes_nfe`
  - `granja_id` fica apenas como contexto/apoio, não como chave principal de resolução do emitente.