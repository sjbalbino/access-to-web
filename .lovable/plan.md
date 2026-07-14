## Objetivo

No select **"Emitente para emissão de NFP-e"** (aba Inscrições do Produtor) hoje todas as opções aparecem como `AGROPECUARIA GRINGS (Produção)`, sem forma de distinguir. Vou incluir o **nome fantasia da inscrição vinculada**, a **IE** e o **CPF/CNPJ** para o usuário identificar qual emitente selecionar.

## Alteração

**`src/components/produtores/InscricoesTab.tsx`** (linhas 675-680)

Trocar o rótulo do `<SelectItem>` para compor:

```
{granja.nome_fantasia || razao_social}
 — {inscricao.nome_fantasia || inscricao.produtores?.nome}
 — IE: {inscricao.inscricao_estadual || '—'}
 — {formatCpfCnpj(inscricao.cpf_cnpj)}
 (Produção|Homologação)
```

Exemplo final:
`AGROPECUARIA GRINGS — MARCIO GRINGS (Sítio X) — IE: 123456789 — 000.000.000-00 (Produção)`

Também aplicar o mesmo padrão no bloco de detalhes abaixo (linhas 687-701), acrescentando IE, CPF/CNPJ e nome fantasia da inscrição vinculada para reforço visual após a seleção.

Nenhuma mudança em hook, banco ou lógica — apenas apresentação. O campo `inscricao` já vem populado em `useEmitentesNfe` com `inscricao_estadual`, `cpf_cnpj`, `nome_fantasia` e `produtores.nome`.
