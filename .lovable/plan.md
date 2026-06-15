## Esclarecendo os dois campos

Hoje o formulário de Contas a Pagar / Receber tem dois campos parecidos, mas com funções diferentes:

### 1. `Parcela` (texto livre — ex.: "1/3")
- Campo `parcela` na tabela `contas_pagar` / `contas_receber`.
- É só um **rótulo identificador** da parcela dentro do documento (ex.: "1/3", "2/3").
- Usado em listagens, recibos e PDFs para mostrar a qual parcela do título aquela linha pertence.
- **Não gera nada automaticamente.** O usuário digita.

### 2. `Parcelar em (vezes)` + `Intervalo entre parcelas (dias)`
- Campos `num_parcelas` e `intervalo_dias`, que **não são salvos** — servem só para o ato da inclusão.
- Quando `num_parcelas > 1`, o sistema **gera N registros** de conta, dividindo o valor e somando o intervalo no vencimento.
- Cada conta gerada recebe o rótulo `parcela` no formato "i/N" automaticamente.
- Só aparece em **nova conta** (não em edição).

### A ambiguidade
Os dois ficam um do lado do outro, sem rótulo que deixe claro que:
- `Parcela` = rótulo desta linha;
- `Parcelar em (vezes)` = gerador de várias linhas.

E se o usuário digita "1/3" em `Parcela` e ao mesmo tempo coloca `num_parcelas = 3`, o rótulo digitado é ignorado (o gerador sobrescreve com "1/3", "2/3", "3/3").

## Plano de ajuste de UX (sem mudar lógica de negócio)

1. **Renomear e reagrupar visualmente:**
   - `Parcela` → rótulo **"Nº da parcela (ex.: 1/3)"** com tooltip "Identificação desta parcela. Preenchido automaticamente quando você gerar várias parcelas abaixo."
   - `Parcelar em (vezes)` / `Intervalo entre parcelas (dias)` → mover para um bloco separado **"Gerar várias parcelas"** com borda/fundo sutil, e descrição: "Cria N contas com vencimentos espaçados. O valor original será dividido."

2. **Esconder/desabilitar `Parcela` (rótulo) quando `num_parcelas > 1`**, mostrando um aviso "Será preenchido automaticamente (1/N, 2/N, …)".

3. **Em edição** (`initial?.id`): manter só o campo `Parcela` (rótulo). O bloco "Gerar várias parcelas" continua oculto, como já é hoje.

4. **Sem alteração de schema** nem de regras de cálculo — apenas labels, agrupamento visual e o desabilitar condicional.

### Arquivo afetado
- `src/components/contas/ContaFormDialog.tsx`

Confirma que quer este ajuste de UX, ou prefere outro caminho (ex.: remover o campo `Parcela` manual e deixar só o gerador)?
