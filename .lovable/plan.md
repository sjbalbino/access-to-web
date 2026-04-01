

## Plano: Alterar campo Nº Contrato para texto alfanumérico

### Problema
O campo `numero` em `contratos_venda` é do tipo `integer` no banco e `number` no formulário. O usuário precisa que seja alfanumérico (ex: "CV-001", "2026/015").

### Alterações

#### 1. Migração de banco de dados
Alterar o tipo da coluna `numero` de `integer` para `varchar`:
```sql
ALTER TABLE contratos_venda ALTER COLUMN numero TYPE varchar USING numero::varchar;
```

#### 2. Hook `useContratosVenda.ts`
- Alterar tipo de `numero` na interface de `number` para `string`
- Alterar `ContratoVendaInsert` para aceitar `numero: string`
- No filtro, trocar `.eq("numero", filtros.numero)` para usar string
- Em `useProximoNumeroContrato`, manter lógica mas retornar string

#### 3. Formulário `VendaProducaoForm.tsx`
- Alterar `FormData.numero` de `number` para `string`
- Remover `type="number"` e `valueAsNumber: true` do input
- Remover `readOnly` para permitir edição manual
- Default value: `""` em vez de `0`

#### 4. Listagem `VendasProducao.tsx`
- Filtro: remover `parseInt()`, usar string diretamente
- Remover `type="number"` do input de filtro

#### 5. Importação `importacaoConfig.ts`
- Alterar transform do campo `numero` de `toNumber` para `toStr` (se aplicável)

### Arquivos alterados
- 1 migração SQL
- `src/hooks/useContratosVenda.ts`
- `src/pages/VendaProducaoForm.tsx`
- `src/pages/VendasProducao.tsx`
- `src/lib/importacaoConfig.ts` (verificar)

