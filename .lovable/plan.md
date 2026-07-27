## Objetivo

Impedir que uma inscrição sem emitente de NF-e configurado seja marcada como **Emitente Principal da Granja**, e corrigir o cadastro atual da granja AGROPECUARIA GRINGS.

## Diagnóstico confirmado

- Na granja AGROPECUARIA GRINGS existem 6 emitentes de NF-e, todos vinculados às inscrições de MARCIO GRINGS.
- A única inscrição marcada como emitente principal é **CLAUDIA ANDREIA FRANCA SANTOS**, que tem `emitente_id` vazio.
- O formulário de Nota de Depósito busca o emitente pela inscrição principal da granja; como ela não tem emitente, dispara "Emitente não configurado".

## O que será feito

### 1. Bloqueio na interface (Produtores → Inscrições)

Em `src/components/produtores/InscricoesTab.tsx`, no botão de coroa (`handleToggleEmitentePrincipal`):

- Antes de marcar, validar que a inscrição possui emitente vinculado (`emitente_id`) e que esse emitente está com API configurada (`api_configurada`) e ativo.
- Se não atender, exibir aviso explicativo: "Somente inscrições com emitente de NF-e configurado (API ativa) podem ser emitente principal da granja."
- Desabilitar visualmente o botão de coroa nas inscrições sem emitente, com tooltip explicando o motivo.
- Desmarcar continua sempre permitido.

### 2. Bloqueio no banco (regra definitiva)

Criar um gatilho de validação em `inscricoes_produtor` que rejeita gravar `is_emitente_principal = true` quando a inscrição não tiver emitente vinculado com API configurada. Isso garante a regra mesmo em edições feitas fora da tela de inscrições.

### 3. Correção do cadastro atual

- Desmarcar CLAUDIA ANDREIA FRANCA SANTOS como emitente principal.
- Marcar **MARCIO GRINGS - BOA VISTA DO INCRA** (IE 472.100.712-3) como emitente principal da granja AGROPECUARIA GRINGS.

## Detalhes técnicos

- Front: validação em `handleToggleEmitentePrincipal` usando o join `emitente` já retornado por `useInscricoesByProdutor`.
- Banco: função `SECURITY DEFINER` + trigger `BEFORE INSERT OR UPDATE` em `public.inscricoes_produtor`, checando `emitentes_nfe.api_configurada = true AND ativo = true`.
- Ajuste de dados via atualização direta nas duas inscrições envolvidas.
- Nenhuma alteração no fluxo de emissão de NF-e em si.
