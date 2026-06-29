## Causa real

A validação em `focus-nfe-emitir/index.ts` (linhas 146-147) lê o campo `serie` da própria **`notas_fiscais`**, não do emitente. O emitente Osmar tem `serie_nfe = 930` corretamente, mas a NF-e em rascunho foi criada com `serie` vazia, então o bloqueio dispara.

## Correção

1. **Edge function `focus-nfe-emitir`**
   - Incluir `serie_nfe` no SELECT do emitente.
   - Se `notas_fiscais.serie` vier vazia, **usar `emitentes_nfe.serie_nfe` como fallback** antes de validar.
   - Só retornar `SERIE_VAZIA` se ambos estiverem vazios.
   - Persistir a série usada de volta em `notas_fiscais.serie` no update final (junto com `numero`).

2. **Frontend (`NotaFiscalForm.tsx`)**
   - Quando o emitente for selecionado e o campo `serie` da nota estiver vazio, preencher automaticamente com `emitenteSelecionado.serie_nfe`.

3. **Migration pontual (opcional)**
   - `UPDATE notas_fiscais SET serie = 930 WHERE id = 'ed292781-...' AND (serie IS NULL OR serie = '')` para destravar a nota atual.

Isso resolve a Rejeição 236 (chave inválida por série ausente) sem exigir que o usuário edite cada rascunho manualmente.
