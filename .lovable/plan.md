# Separar tokens de Homologação e Produção no cadastro do Emitente NFe

## Contexto

Hoje cada emitente NFe guarda **um único token** (`api_access_token`) em `emitentes_nfe_credentials`. Na Focus NFe, porém, cada empresa tem **dois tokens distintos**:

- **Token de Homologação** (ex.: `0q8nVnCQfcIIMUWo8I5g4ulHJsFll1IP`)
- **Token de Produção** (ex.: `3Y8r8s32uBrZ6S0keL0imIzPw9QZDqCC`)

Não existe um "ambiente ativo" no painel da Focus — o que define o ambiente é **qual token é enviado** em cada chamada. Hoje o AgroGestão usa o mesmo token para tudo e só troca a URL (api vs homologacao). Isso causa falhas de permissão (HTTP 403) quando o token salvo é o de homologação e o emitente está em produção (ou vice-versa).

No caso do **Julio Cesar Machado Costa (CPF 60684674068)** o token salvo é o de produção e o emitente está em produção, mas qualquer alternância de ambiente (ou cópia de token errado) quebra o fluxo. Manter os dois tokens separados elimina essa fonte de erro.

## O que muda para o usuário

Na tela **Emitentes NFe → aba Credenciais da API**:

- Em vez de um único campo "Token de Acesso", aparecerão **dois campos**:
  - **Token de Homologação**
  - **Token de Produção**
- O sistema escolhe automaticamente o token correto com base no **Ambiente** configurado no emitente (1 = Produção, 2 = Homologação).
- Botão **"Verificar empresa na Focus"** passa a usar o token do ambiente selecionado.
- Se o token do ambiente atual estiver vazio, mostra erro claro: *"Token de Produção não configurado para este emitente"*.

Nada mais muda no fluxo de emissão/cancelamento/consulta — apenas a seleção do token fica correta automaticamente.

## Migração de dados

- Criar coluna nova `api_access_token_homologacao` (TEXT, nullable) em `emitentes_nfe_credentials`.
- Renomear conceitualmente `api_access_token` para "token de produção" (mantém o nome físico no banco para não quebrar nada).
- **Não migrar dados automaticamente**: o token existente fica como "Produção" por padrão. Os emitentes que estavam em homologação precisarão ter o token de homologação preenchido manualmente (são poucos casos e o usuário já vai conferir mesmo).

## Detalhes técnicos

1. **Migration SQL**
   - `ALTER TABLE emitentes_nfe_credentials ADD COLUMN api_access_token_homologacao TEXT;`
   - GRANTs já existentes na tabela cobrem a nova coluna.

2. **`useEmitenteCredentials.ts`**
   - Adicionar `api_access_token_homologacao` na interface `EmitenteCredentials`, em `EMPTY` e no payload do `upsertEmitenteCredentials`.
   - Continuar normalizando strings vazias para `null`.

3. **`EmitentesNfe.tsx`** (form de credenciais)
   - Trocar o input único "Token de Acesso" por dois inputs lado a lado: **Token de Homologação** e **Token de Produção**, com legenda explicando que o sistema escolhe pelo Ambiente.
   - Salvar ambos no upsert.

4. **Edge functions** que hoje leem `api_access_token`:
   - `focus-nfe-verificar-empresa`
   - `focus-nfe-emitir`
   - `focus-nfe-cancelar`
   - `focus-nfe-consultar`
   - `focus-nfe-carta-correcao`
   - `focus-nfe-download`
   - `focus-nfe-mde`
   
   Em todas: ao carregar credenciais, escolher o token conforme o `ambiente` do emitente:
   ```
   token = ambiente === 2 ? api_access_token_homologacao : api_access_token
   ```
   Se o token do ambiente atual estiver ausente, retornar erro `token_ausente` com mensagem clara indicando **qual ambiente** está faltando.

5. **Mensagens de diagnóstico** em `focus-nfe-verificar-empresa` (já melhoradas no último passo) passam a também informar qual dos dois tokens foi usado.

## Diagrama

```
Emitente NFe (ambiente=1 Produção)
        │
        ▼
emitentes_nfe_credentials
  ├─ api_access_token_homologacao   ← usado se ambiente=2
  └─ api_access_token (produção)    ← usado se ambiente=1
        │
        ▼
Edge function escolhe token correto
        │
        ▼
api.focusnfe.com.br   (produção)
homologacao.focusnfe.com.br  (homologação)
```

## Riscos

- Emitentes que estavam de fato em **homologação** ficarão sem token até o usuário preencher o novo campo — esperado e desejável (evita usar token errado silenciosamente).
- Nenhuma quebra nos fluxos existentes: a coluna antiga continua sendo usada como "token de produção".
