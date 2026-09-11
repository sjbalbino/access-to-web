# Granja nova não aparece na lista

## O que está acontecendo

Verifiquei no banco: a granja **AGRO SILO COMERCIAL LTDA** (criada hoje 13:33) foi realmente gravada, mas ficou **sem vínculo com a empresa**. Como a lista mostra apenas as granjas da empresa ativa, ela não aparece — daí a mensagem de sucesso sem resultado na tela.

Causa: no cadastro de granja o sistema não grava a empresa ativa do usuário, e como o seu usuário é super administrador, o banco aceitou o registro "sem empresa".

## Correção proposta

1. **Corrigir o registro existente**: vincular a granja AGRO SILO COMERCIAL LTDA à empresa AGRO SILO COMERCIAL LTDA (recém-cadastrada). Ela passa a aparecer na lista imediatamente.

2. **Impedir que aconteça de novo**: ao salvar uma granja, o sistema passa a gravar automaticamente a empresa ativa do usuário. Além disso, uma proteção no próprio banco preenche a empresa quando ela não for informada, valendo também para qualquer outro caminho de cadastro.

3. **Aviso de segurança**: se o super administrador estiver sem empresa selecionada, o botão de salvar avisa para escolher a empresa antes, em vez de gravar um registro órfão.

## Detalhes técnicos

- Backfill: `UPDATE public.granjas SET tenant_id = '90082c70-...' WHERE id = '3cce4e12-...'`.
- Nova trigger `BEFORE INSERT` em `public.granjas` (função security definer) aplicando `tenant_id := COALESCE(NEW.tenant_id, public.get_user_tenant_id())`, no mesmo padrão de `set_contas_bancarias_tenant`.
- `useCreateGranja` (`src/hooks/useGranjas.ts`) passa a incluir `tenant_id` do perfil no insert.
- `src/pages/Granjas.tsx`: bloqueio do salvar com mensagem quando `profile.tenant_id` for nulo.
- Sem alteração nas políticas RLS existentes.
