

## Plano: Corrigir conversão de datas na importação

### Problema
Ao importar colheitas, a data gravada no banco difere da data na planilha. Isso ocorre porque a biblioteca xlsx, sem a opção `cellDates`, retorna datas como números seriais do Excel. A função `toDate` converte corretamente, mas pode haver imprecisão de fuso horário dependendo do ambiente.

### Correção (2 pontos)

#### 1. `src/components/importacao/ImportacaoDialog.tsx` — forçar `cellDates` e `raw: false`
Na leitura do workbook (linha 165), passar opções para que o xlsx retorne datas como objetos Date nativos:
```typescript
const workbook = XLSX.read(data, { cellDates: true });
```
Isso garante que os valores de data cheguem à `toDate` como objetos `Date` e não como números seriais sujeitos a arredondamento.

#### 2. `src/lib/importacaoConfig.ts` — tornar `toDate` à prova de fuso horário
Alterar a função `toDate` para usar métodos UTC em vez de `toISOString()`, e mover a verificação de `Date` para antes da verificação de `string`:

```typescript
const toDate = (v: any): string | null => {
  if (v === null || v === undefined || v === '') return null;
  if (v instanceof Date) {
    // Usar UTC para evitar deslocamento de fuso
    const yyyy = v.getUTCFullYear();
    const mm = String(v.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(v.getUTCDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
  if (typeof v === 'number') {
    const utcMs = Math.round((v - 25569) * 86400 * 1000);
    const d = new Date(utcMs);
    const yyyy = d.getUTCFullYear();
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(d.getUTCDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
  if (typeof v === 'string') {
    const parts = v.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (parts) return `${parts[3]}-${parts[2]}-${parts[1]}`;
    if (/^\d{4}-\d{2}-\d{2}/.test(v)) return v.split('T')[0];
  }
  return null;
};
```

Mudanças:
- `Date` instanceof verificado **antes** de `string` (evita que Date caia em `.toString()` e falhe no regex)
- `Math.round` no cálculo de ms (evita imprecisão de ponto flutuante)
- Usa `getUTCFullYear/Month/Date` em vez de `toISOString` (comportamento idêntico, mas mais explícito)

### Arquivos impactados
- `src/components/importacao/ImportacaoDialog.tsx` (1 linha)
- `src/lib/importacaoConfig.ts` (~15 linhas na função `toDate`)

