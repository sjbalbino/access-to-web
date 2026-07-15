# Corrigir "Saldo disponível" para não descontar Notas de Depósito

## Regra confirmada pelo usuário
- **Saldo disponível do produtor** (usado em devoluções, transferências etc.):
  ```
  saldo = totalColheitas + totalRecebidas − totalEnviadas − totalDevoluções
  ```
  Notas de Depósito emitidas **NÃO** entram nesse cálculo.

- **Saldo a emitir de Notas de Depósito** (controle paralelo, aparece apenas na tela de Emissão de Nota de Depósito):
  ```
  saldo_a_emitir = totalColheitas + totalRecebidas − totalNotasDeposito
  ```
  Já está correto em `useSaldosDeposito` — não será alterado.

## Causa da divergência (28.213 vs 3.592)
Para o SAULO, o painel verde mostrou **28.213 kg** (correto) e o combobox mostrou **3.592 kg** (errado — descontou indevidamente 24.621 kg de notas de depósito emitidas).

O hook `useSaldoDisponivelProdutor` já está correto. O hook `useInscricoesComSaldo` (em `src/hooks/useSaldosDeposito.ts`), que alimenta o combobox, está subtraindo indevidamente as notas de depósito emitidas do `saldo_disponivel`.

## Correção

### Arquivo único: `src/hooks/useSaldosDeposito.ts`

Dentro da função `useInscricoesComSaldo`:

1. **Remover** a busca de `notas_deposito_emitidas` do `Promise.all` (item `notasRes`) e a checagem `if (notasRes.error) throw notasRes.error;`.
2. **Remover** o bloco que filtra notas canceladas (linhas ~304–316).
   - *Nota:* esse bloco existe hoje **só** para preparar `notasFiltradas` para a subtração do item 3. Como a subtração vai sumir, o filtro fica sem uso e é removido junto como limpeza. Nenhum cálculo depende dele.
3. **Remover** o loop que subtrai `notasFiltradas` de `saldo_disponivel` (linhas ~318–324). Essa é a correção efetiva do bug.
4. Manter intactas as somas de colheitas e recebidas e as subtrações de enviadas e devoluções (incluindo `kg_taxa_armazenagem`).

Resultado: o `saldo_disponivel` retornado passa a ser
```
colheitas + transferências recebidas − transferências enviadas − devoluções (com taxa)
```
igual ao `useSaldoDisponivelProdutor`.

## Fora de escopo
- `useSaldosDeposito` (hook por produto, usado na Emissão de Nota de Depósito) — permanece como está.
- `useSaldoDisponivelProdutor` — permanece como está.
- `DevolucaoDialog` — o aviso informativo "📄 Notas Depósito emitidas" continua visível, apenas informativo.
- Nenhuma mudança em DB/migrations.

## Resultado esperado
Para o SAULO, o combobox passará a mostrar **Saldo: 28.213 kg**, batendo com o painel verde "Saldo disponível para devolução". A tela de Emissão de Nota de Depósito continua mostrando corretamente o saldo a emitir (colheitas + recebidas − notas emitidas).
