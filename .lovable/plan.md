

## Plano: Corrigir lookup de Inscrição Estadual na importação

### Problema
A IE está armazenada no banco como `4721016882` (somente dígitos), mas a planilha traz `472.101.688-2` (com pontos e traço). O motor de importação compara os valores literalmente, sem remover caracteres não-numéricos, resultando em "não encontrado".

### Solução
Na função `resolveReferences` em `src/lib/importacaoConfig.ts`, adicionar normalização que remove caracteres não-dígitos (`/\D/g`) ao construir as chaves do cache E ao buscar valores da planilha. Isso garante que `472.101.688-2` e `4721016882` sejam equivalentes.

### Alterações em `src/lib/importacaoConfig.ts`

**1. No cache (linhas ~844-866)**: Ao indexar cada item, adicionar uma versão somente dígitos da chave:
```typescript
const digitsOnly = key.replace(/\D/g, '');
if (digitsOnly && digitsOnly !== key) {
  cache[digitsOnly] = item.id;
  cache[digitsOnly.toLowerCase()] = item.id;
}
```
Fazer o mesmo para chaves compostas.

**2. No lookup (linhas ~909-920)**: Ao buscar o `sourceValue`, tentar também a versão somente dígitos:
```typescript
const sourceDigits = sourceValue.replace(/\D/g, '');
// Após tentativas existentes, adicionar:
if (!uuid && sourceDigits !== sourceValue) {
  uuid = cache?.[sourceDigits] || cache?.[sourceDigits.toLowerCase()];
}
```
E para chaves compostas, tentar `sourceDigits|compositeValue`.

### Arquivo modificado
- `src/lib/importacaoConfig.ts` — função `resolveReferences`

