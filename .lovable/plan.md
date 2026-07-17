## Objetivo

Ao dar entrada de NF-e (importação por XML e cadastro manual), sugerir automaticamente o CFOP correto para cada item conforme:

- **Destinação** do produto, derivada do **Grupo de Produtos**:
  - `insumos = true` → **Insumo / matéria-prima** → 1.101 (interna) / 2.101 (interestadual)
  - `maquinas_implementos = true` OU `bens_benfeitorias = true` → **Ativo imobilizado** → 1.551 / 2.551
  - Nenhum dos acima → **Uso e consumo** → 1.556 / 2.556
- **UF**: se UF do emitente da NF-e = UF do destinatário (produtor/inscrição) → CFOP interno (1.xxx). Caso contrário → interestadual (2.xxx). Regra genérica, não apenas RS.

## Escopo (frontend apenas)

Nenhuma alteração de schema. Usa flags já existentes em `grupos_produtos` (`insumos`, `maquinas_implementos`, `bens_benfeitorias`).

### 1. Helper novo `src/lib/cfopEntradaSuggest.ts`

```text
suggestCfopEntrada({ grupo, ufEmitente, ufDestinatario }) → "1101" | "2101" | "1551" | "2551" | "1556" | "2556"
```

Regras exatas descritas acima. Interna quando UFs iguais e ambas presentes; caso qualquer UF esteja vazia, mantém interna por padrão (comportamento seguro para lançamento manual sem UF).

### 2. `src/components/entradas-nfe/ImportarXmlDialog.tsx`

- Carregar produtos vinculados (já disponíveis via lookup) e grupos.
- Após parse do XML, para cada item **vinculado a um produto** que tenha `grupo_produto_id`, sobrescrever `item.cfop` pelo código sugerido, ignorando o CFOP original do XML.
- Itens sem vínculo/grupo mantêm o `toEntradaCfop(item.cfop)` atual.
- Recalcular o CFOP do cabeçalho (mais frequente entre os itens) após a sugestão, buscando o registro correspondente em `cfops` com `tipo = 'entrada'`.

### 3. `src/components/entradas-nfe/EntradaNfeFormDialog.tsx` (entrada manual)

- Quando o usuário selecionar/alterar o **produto** de um item, olhar `produto.grupo_produto_id → grupo`, e preencher `item.cfop` com o CFOP sugerido (usando UF do emitente selecionado e UF do destinatário/inscrição).
- Sobrescreve o `cfopCabecalhoCodigo` atualmente auto-injetado quando houver produto com grupo definido; não sobrescreve se o usuário já editou manualmente o CFOP daquele item (respeitar edição posterior).
- Botão discreto "Sugerir CFOPs" no cabeçalho da tabela de itens que re-aplica a sugestão em todos os itens.

### 4. Sem migrações / sem alterações em backend

Emissão da contra-nota continua igual; o CFOP correto já entra no item antes do envio.

## Detalhes técnicos

- Tipagem: retorno do helper é um `string` de 4 dígitos. Consumidores fazem lookup em `useCfops()` para achar o `cfop_id` correspondente (`tipo === 'entrada'`).
- UF do emitente: já disponível em `emitentes_nfe` (via inscrição do produtor selecionado no formulário).
- UF do destinatário: no XML vem do `<dest><enderDest><UF>`; no manual, derivada da inscrição/produtor destinatário.
- Fallback: se `cfops` não tiver a entrada correspondente (ex.: 1.551 não cadastrada), mantém sugestão como string e loga aviso via `toast` para o usuário cadastrar o CFOP.

## Fora de escopo

- Regras de diferimento de ICMS do RS (aviso apenas na documentação/tooltip; não altera cálculo).
- Alteração dos cadastros de Grupos de Produtos (usa flags atuais).
