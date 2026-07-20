## Diagnóstico do caso LUIZ ANTONIO MARTINS DE SOUZA (SOJA 2025/2026)

Consultei o banco e a movimentação do Luiz é:

| Fonte | Kg |
|---|---|
| Colheitas | 0 |
| Transferência recebida (cód. 1199, 27/04/2026) | +11.760 |
| Transferências enviadas | 0 |
| Devoluções | 0 |
| **Notas de depósito emitidas (status "autorizado", 05/07/2026)** | **−11.760** |
| **Saldo atual** | **0** |

Respondendo à sua pergunta: **não**, os 11.760 kg **não** constam como "não emitidos" no nosso sistema — eles estão registrados em `notas_deposito_emitidas` com `status = 'autorizado'` (importados do legado). O que falta é apenas o vínculo com uma NF-e nossa (`nota_fiscal_id` está vazio), porque a NF-e foi emitida lá no legado. Do ponto de vista do saldo, o sistema já os considera como emitidos e por isso o saldo disponível é 0 — coerente com o legado.

Portanto **não há divergência de saldo**: o Luiz recebeu 11.760 por transferência e essa mesma quantidade já foi baixada pela nota de depósito importada. Nenhum ajuste de cálculo é necessário.

## O que vou implementar

Apenas o ajuste de UX pedido: nas Notas de Depósito, trocar o campo/coluna **Local (Granja)** por **Local de Entrega**.

### Alterações

- **`src/components/notas-deposito/NotaDepositoFormDialog.tsx`**
  - Substituir o Combobox de Granja pelo Combobox de **Local de Entrega** (usando `locais_entrega` da empresa, incluindo a Sede).
  - Ao selecionar o destinatário (inscrição), listar apenas locais onde ele tem saldo > 0 e mostrar o saldo por local ao lado.
  - Manter Granja apenas como referência interna (derivada do local, se necessário para persistência) — nenhum campo visível de granja.

- **`src/pages/NotasDeposito.tsx`**
  - Renomear coluna/filtro "Granja" para "Local de Entrega".
  - Passar a exibir o nome do local de entrega vinculado ao registro (via `local_entrega_id` da NF-e associada, ou fallback pela granja quando o registro é legado sem local definido).

- **`src/hooks/useSaldosDeposito.ts`**
  - Ajustar `useInscricoesComSaldo` para agrupar saldo por `(inscricao, local_entrega)` em vez de `(inscricao, granja)`, usando a mesma fórmula já existente (colheitas + transferências recebidas − enviadas − devoluções − notas emitidas autorizadas).
  - Registros legados sem local definido caem no **Local Sede** por padrão (mantendo a política já usada em relatórios).

### Fora do escopo
- Não vou alterar o cálculo de saldo nem ignorar as notas emitidas importadas do legado — elas continuam reduzindo o saldo, que é o comportamento correto conforme sua confirmação.
