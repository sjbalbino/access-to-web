## Problema
No campo **"Inscrição do Sócio (Emitente)"** (formulário de NF-e), hoje aparecem TODAS as inscrições de sócios ativas, mesmo aquelas que não têm emitente NFe configurado — quando o usuário escolhe uma sem emitente, a emissão falha.

## Correção
Filtrar a lista para mostrar **apenas inscrições de sócios que tenham `emitente_id` preenchido** (ou seja, vinculadas a uma configuração de emitente NFe).

## Alteração
- **Arquivo:** `src/pages/NotaFiscalForm.tsx` — linha 1343
- Trocar `inscricoesSocio.map(...)` por `inscricoesSocio.filter(i => i.emitente_id).map(...)`.
- Manter no select a inscrição já salva mesmo que perca o emitente_id depois (padrão "Robust Select"): se `formData.inscricao_produtor_id` aponta para uma inscrição sem `emitente_id`, injetá-la na lista exibida.
- Adicionar mensagem amigável quando a lista filtrada estiver vazia: orientar o usuário a configurar um emitente em **Emitentes NF-e** e vinculá-lo à inscrição do sócio.

## Escopo
- Somente esse filtro de UI. Demais comportamentos (auto-emitente, granja, dados padrão) permanecem.
- Sem mudanças de schema/backend.
