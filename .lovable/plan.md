## Diagnóstico

As 9 compras (códigos 5 a 13, de 21/07/2026) permanecem com status **Pendente** apesar de suas NFes (números 82, 84, 85, 86, 87, 88, 89, 90 e 94) estarem **autorizadas** na SEFAZ.

**Causa raiz** (`src/components/compra/EmitirNfeCompraDialog.tsx`, linhas 488-494):

O vínculo entre a compra e a nota fiscal (`compras_cereais.nota_fiscal_id`) e a mudança de status para `nfe_emitida` só ocorrem **dentro do bloco de polling**, quando a SEFAZ devolve `autorizado` dentro da janela do polling (30 tentativas × 3s = 90s). Se:

- o polling estoura o tempo (SEFAZ demora >90s para autorizar), OU
- o usuário fecha o diálogo antes da autorização, OU
- a conexão cai durante o polling,

…a NFe é criada e autorizada normalmente pela SEFAZ, mas a compra fica órfã com `nota_fiscal_id = NULL` e status `pendente`. Foi exatamente o que aconteceu com essas 9 compras.

Confirmei via banco que existe correspondência 1:1 inequívoca entre cada compra pendente e uma NFe autorizada (mesmo `dest_cpf_cnpj` do vendedor + mesmo `total_nota` + mesma data). Ex.: compra #7 (R$ 19.296,00, Claudia Andreia) ↔ NFe #85.

## Correção proposta

### 1. Backfill imediato das 9 compras afetadas (migration)

Atualizar `compras_cereais` casando por CPF/CNPJ do vendedor (normalizado, sem máscara) + `total_nota` + `natureza_operacao ILIKE 'COMPRA%'` + `status IN ('autorizado','autorizada')`, escolhendo a NFe mais próxima temporalmente e que ainda não esteja vinculada a outra compra:

```
UPDATE compras_cereais SET nota_fiscal_id = <nf.id>, status = 'nfe_emitida'
WHERE id IN (as 9 compras)
```

### 2. Fix na lógica de emissão (`EmitirNfeCompraDialog.tsx`)

Alterar a ordem de gravação para eliminar a janela de perda:

- **Logo após criar a `notas_fiscais` (linha ~282)**: já persistir `compras_cereais.nota_fiscal_id = notaFiscal.id` (mantendo `status = 'pendente'`). Isso garante o vínculo mesmo se o polling falhar.
- **Após autorização confirmada no polling**: apenas mudar `status` para `'nfe_emitida'`.
- **No branch `else` (linha 518, "sem ref")**: manter o vínculo já persistido; não deixar a compra sem `nota_fiscal_id`.

### 3. Rotina de reconciliação preventiva (opcional, recomendado)

Ao abrir a página `CompraCereais`, para cada compra `status='pendente' AND nota_fiscal_id IS NOT NULL`, consultar o status atual da nota vinculada; se estiver `autorizada`, atualizar o status da compra para `nfe_emitida`. Isso cobre casos onde a nota foi autorizada depois do fechamento do diálogo.

## Arquivos afetados

- `src/components/compra/EmitirNfeCompraDialog.tsx` — reordenar gravação do vínculo
- Nova migration — backfill das 9 compras + atualização de status
- (Opcional) `src/hooks/useComprasCereais.ts` — reconciliação ao carregar a lista

## Observação

O mesmo padrão de bug pode existir em `EmitirNfeDevolucaoDialog.tsx` e no fluxo de emissão de Notas de Depósito. Recomendo revisar em seguida, mas fora do escopo desta correção pontual.