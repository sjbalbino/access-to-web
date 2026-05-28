## Objetivo

Tornar o erro "CPF/CNPJ Emitente não cadastrado/autorizado" muito mais claro e evitar que o usuário tente emitir uma NF-e quando o emitente ainda não está habilitado na Focus NFe.

## O que vou implementar

### 1. Mensagem amigável na UI (NotaFiscalForm)
Quando a Focus NFe ou a SEFAZ retornar um dos erros típicos de "emitente não cadastrado/autorizado", exibir um alerta destacado na tela da NF-e explicando em linguagem clara:

- O que aconteceu ("O CPF/CNPJ XXX do emitente ainda não está habilitado no provedor de NF-e")
- O que fazer (cadastrar a empresa no painel da Focus NFe, anexar certificado A1, habilitar para emissão)
- Em qual ambiente (homologação ou produção)

Os códigos detectados serão:
- `permissao_negada` / "CNPJ do emitente não autorizado"
- SEFAZ 621 / "CPF Emitente nao cadastrado"
- SEFAZ 233 / "Inscrição Estadual do Emitente não cadastrada"

### 2. Validação prévia antes de emitir
Nova edge function `focus-nfe-verificar-empresa` que recebe `emitente_id` e consulta `GET /v2/empresas/{cpf_cnpj}` na Focus NFe usando o token do próprio emitente. Retorna:
- `habilitada: true/false`
- `ambiente_atual`
- `mensagem` da Focus

No `handleEmitirNfe` do `NotaFiscalForm`, antes de chamar `focus-nfe-emitir`, chamar essa verificação. Se não estiver habilitada, abrir um dialog explicativo com instruções e bloquear a emissão (sem gastar uma tentativa que vai falhar).

### 3. Botão "Verificar habilitação na Focus NFe" no cadastro do Emitente
Em `src/pages/EmitentesNfe.tsx`, no formulário/lista do emitente, adicionar um botão que chama a mesma edge function `focus-nfe-verificar-empresa` e mostra um toast/badge com o status atual (Habilitada / Não habilitada / Token inválido), incluindo o ambiente.

## Arquivos afetados

- **Novo**: `supabase/functions/focus-nfe-verificar-empresa/index.ts`
- **Novo**: `src/hooks/useFocusNfeVerificarEmpresa.ts` (wrapper)
- **Editar**: `src/pages/NotaFiscalForm.tsx` — validação prévia + alerta de erro detalhado
- **Editar**: `src/pages/EmitentesNfe.tsx` — botão de verificação por emitente
- **Editar**: `src/hooks/useFocusNfe.ts` — expor melhor o `mensagem_sefaz`/`codigo` para a UI tratar

## Fora do escopo

- Não vou cadastrar empresas automaticamente na Focus NFe (isso exige certificado A1 e senha, que o usuário precisa anexar no painel deles).
- Não vou alterar a lógica de resolução do emitente (já está correta após as últimas correções).
