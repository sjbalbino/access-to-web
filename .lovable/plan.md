## Problema

O SEFAZ está rejeitando as notas de compra porque no campo de município está sendo enviado o **código IBGE** (ex.: `4308904`) em vez do **nome do município** (ex.: `IJUÍ`).

Isso acontece porque em `inscricoes_produtor.cidade` guardamos o código IBGE (7 dígitos), e o mapeador da NF-e (`focusNfeMapper.ts`) envia esse valor direto como `municipio_emitente`/`municipio_destinatario` — a Focus NFe/SEFAZ espera o **nome**.

## O que será feito

### 1. Correção da causa da rejeição (backend/emissão)

Traduzir código IBGE → nome no momento de montar a NF-e, sem alterar o que está gravado no banco.

- Em `src/lib/focusNfeMapper.ts`: quando `cidade` for numérico (código IBGE), consultar `ibge_municipios` e substituir pelo `nome` do município antes de preencher `municipio_emitente` e `municipio_destinatario`. Fallback: manter o valor atual se não encontrar.
- Aplicar a mesma tradução em `dest_cidade` gravado em `notas_fiscais` nos fluxos:
  - `src/components/compra/EmitirNfeCompraDialog.tsx`
  - `src/components/compra/CompraDialog.tsx`
  - `src/components/devolucao/EmitirNfeDevolucaoDialog.tsx`
  - `src/components/deposito/NotaDepositoFormDialog.tsx`
  - `src/components/remessas/EmitirNfeAutomaticoDialog.tsx`
  - `src/pages/EntradaColheita.tsx`
  - `src/pages/NotaFiscalForm.tsx`

Usando um helper novo em `src/lib/utils.ts` (ou `src/lib/municipio.ts`): `resolveNomeMunicipio(codigoOuNome, uf)`.

### 2. Ajuste no select de município

Onde o usuário escolhe o município, exibir **"Nome (Código IBGE)"** de forma consistente:

- `src/components/produtores/InscricoesTab.tsx` — já mostra `Nome (Código)` no botão; confirmar que a lista de opções também exibe `Nome (Código)` no `CommandItem`.
- `src/pages/VendaProducaoForm.tsx` — combobox de cidade hoje mostra só o nome; adicionar `(Código IBGE)` ao lado.

### 3. Validação

- Testar emissão de uma compra de cereais e conferir no XML/retorno da Focus que `xMun` sai como nome.
- Verificar que a lista/edição de inscrições continua exibindo o município corretamente.

## Fora do escopo

- Migração de dados (não vamos reescrever `cidade` no banco de código para nome — a tradução é feita na emissão).
- Alteração de outros campos de endereço.