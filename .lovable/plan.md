

## Plano: Corrigir mapeamento de status e exibir nota legada

### Problemas

1. **Status numerico nao convertido corretamente**: O sistema legado usa 1=Carregando, 2=Carregado, 3=Carregado/NFe. O transform atual apenas faz `toLowerCase()` e grava "1", "2", "3" literalmente.
2. **Nota legada nao exibida na UI**: O campo `numero_nota_legado` esta preenchido no banco mas a coluna "Nota" so mostra `nota_fiscal?.numero`.

### Alteracoes

#### 1. Normalizacao de dados existentes (insert tool - UPDATE)
```sql
UPDATE remessas_venda SET status = 'carregando' WHERE status = '1';
UPDATE remessas_venda SET status = 'carregado' WHERE status = '2';
UPDATE remessas_venda SET status = 'carregado_nfe' WHERE status = '3';
```

#### 2. `src/lib/importacaoConfig.ts`
Alterar o transform do campo `status` (linha 649) para converter codigos numericos:
- "1" → "carregando"
- "2" → "carregado"
- "3" → "carregado_nfe"
- Outros valores: manter como estao

#### 3. `src/pages/RemessasVendaForm.tsx`
Na coluna "Nota" (linha 838), exibir `numero_nota_legado` como fallback:
```
r.nota_fiscal?.numero || r.numero_nota_legado || "-"
```

### Arquivos alterados
- `src/lib/importacaoConfig.ts` (transform de status)
- `src/pages/RemessasVendaForm.tsx` (exibicao nota legada)
- UPDATE nos dados existentes via insert tool

