## Por que hoje pede arquivo toda vez

O navegador (Chrome/Edge) **não permite** guardar o caminho `C:\LESBR\peso.txt` e abrir sozinho — seria uma brecha de segurança grave (qualquer site leria qualquer arquivo do PC). O que ele **permite** é guardar um *handle* (referência ao arquivo já autorizado pelo usuário) no **IndexedDB** do próprio navegador. Esse handle sobrevive a refresh, fechar/abrir o navegador e até reiniciar o PC.

Resultado prático: **o usuário seleciona o arquivo UMA vez por navegador/PC**. Depois disso, basta clicar em "Conectar" e — se a permissão tiver expirado — confirmar um único prompt "Permitir leitura?" (sem reabrir o seletor de arquivos).

As demais configurações (separador decimal, unidade, regex, intervalo, dica de caminho) podem sim ir para uma **tabela no banco**, ficando compartilhadas entre todos os usuários do mesmo tenant e entre dispositivos.

## O que vai mudar

### 1. Persistir o handle do arquivo no navegador (IndexedDB)
- Após o usuário selecionar o arquivo a primeira vez, salvamos o `FileSystemFileHandle` em IndexedDB com chave `balanca_handle_<tenant_id>`.
- Ao abrir o sistema de novo, o hook `useBalanca` tenta recuperar o handle e:
  - Se a permissão ainda está válida → **conecta automaticamente** (sem clique).
  - Se expirou → mostra botão "Reautorizar" que chama `handle.requestPermission({ mode: 'read' })` — só um clique de confirmação, **sem seletor de arquivo**.
- Botão "Trocar arquivo" para casos em que mudaram o caminho da balança.

### 2. Tabela `configuracoes_balanca` (compartilhada por tenant)
Guarda só os parâmetros do parser — o handle continua local, pois é específico do PC.

```
configuracoes_balanca
├── id (uuid)
├── tenant_id (uuid)         ← uma config por tenant
├── caminho_hint (text)      ← "C:\LESBR\peso.txt" (informativo)
├── decimal (text)           ← "," ou "."
├── unidade (text)           ← "kg" | "g" | "t"
├── regex (text, nullable)
├── poll_ms (integer)
└── timestamps
```
Com RLS por tenant + GRANTs padrão.

### 3. Hook `useBalanca` reescrito
- Carrega config da tabela (com fallback para defaults se ainda não existir linha).
- Tenta restaurar handle do IndexedDB no mount.
- Expõe estado adicional: `precisaReautorizar` (handle salvo mas permissão expirada).
- `conectar()` agora tem 3 caminhos:
  1. Sem handle salvo → abre seletor de arquivo (única vez na vida do PC).
  2. Handle salvo + permissão ativa → conecta direto.
  3. Handle salvo + permissão expirada → pede permissão (1 clique).

### 4. UI do `BalancaButton`
- Quando há handle salvo mas desconectado: botão muda para **"Reconectar balança"** (cor diferente, ícone diferente).
- Dentro do popover de configuração: botão **"Trocar arquivo"** para selecionar outro.
- Texto explicativo: "Arquivo já autorizado neste PC: ✅" ou "Selecione o arquivo da balança (será lembrado)".

### Fluxo do usuário daqui pra frente

**Primeira vez no PC da balança:**
1. Clica em **Balança → Conectar**
2. Seletor abre, escolhe `C:\LESBR\peso.txt`
3. Sistema salva handle no IndexedDB

**Próximas vezes (mesmo PC, mesmo navegador):**
1. Abre o sistema → conecta sozinho, peso aparece em tempo real ✅

**Se o navegador derrubou a permissão (raro, semanas sem uso):**
1. Clica **Reautorizar** → confirma 1 prompt → conectado ✅ (sem reabrir seletor)

**Outro PC ou outro navegador:**
- Precisa selecionar o arquivo de novo (limitação do navegador, não dá pra contornar). Mas as configurações (decimal, regex, etc.) virão prontas da tabela.

### Detalhes técnicos
- IndexedDB acessado via API nativa (sem libs novas), helpers em `src/lib/balancaHandleStorage.ts`.
- `useBalanca` passa a usar React Query para `configuracoes_balanca` com `upsert` ao salvar.
- Migração cria tabela + RLS (`tenant_id = get_user_tenant_id()`) + GRANTs para `authenticated` e `service_role`.
- `BalancaButton` ganha estado visual para "salvo mas precisa reautorizar".
- Sem mudanças em `PesarBrutoDialog`, `EditarRemessaDialog`, `RemessasVendaForm`, `EntradaColheita` — eles já consomem o botão.

### Limitação honesta
Não existe forma 100% silenciosa entre sessões: o navegador *pode* (raramente) pedir uma confirmação. Mas o **seletor de arquivo** (aquele dialog do Windows) só aparece **uma vez por PC/navegador**, ou quando o usuário clicar explicitamente em "Trocar arquivo".
