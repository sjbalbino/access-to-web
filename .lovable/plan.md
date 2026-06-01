# Corrigir lista do "Vendedor (Parceiro)" na Venda da Produção

## Diagnóstico

Consulta direta ao banco mostra:

| Inscrição | Nome inscrição | Produtor | tipo_produtor |
|---|---|---|---|
| 034.104.448-2 | JORGE ALBERTO MACHADO DA COSTA | JORGE ALBERTO | produtor |
| 034.109.042-5 | JORGE ALBERTO MACHADO DA COSTA-UMBU | JORGE ALBERTO | produtor |
| 034.104.219-6 | MILTON MACHADO DA COSTA | MILTON | produtor |
| 034.109.042-5 | MILTON MACHADO DA COSTA-UMBU | MILTON | produtor |
| 034.109.337-8 | UMBU AGROPECUARIA S.A. | UMBU AGROPECUARIA S.A. | **socio** |

Duas causas no `src/pages/VendaProducaoForm.tsx` (linhas 180 e 544‑547):

1. **UMBU não aparece** — o filtro `inscricoesParceria` só aceita `tipo_produtor === "produtor"`, excluindo produtores cadastrados como `socio` (caso da UMBU AGROPECUARIA S.A.).
2. **"Duplicidade" de Milton e Jorge** — não é duplicidade real: cada um possui duas inscrições estaduais distintas (a própria e a compartilhada da UMBU, IE 034.109.042-5). O label atual mostra só `produtor + IE`, e ambas as linhas ficam visualmente iguais quando o usuário não nota a IE diferente.

## Mudanças (somente UI/apresentação em `src/pages/VendaProducaoForm.tsx`)

1. **Linha 180** — Ampliar o filtro para aceitar também sócios produtores:
   ```ts
   const inscricoesParceria = inscricoes?.filter(
     i => i.produtores?.tipo_produtor === "produtor"
       || i.produtores?.tipo_produtor === "socio"
   ) || [];
   ```

2. **Linhas 544‑548** — Incluir o `nome` da inscrição no label para diferenciar as duas IEs de Milton/Jorge, no padrão já usado em outros pontos do sistema:
   ```tsx
   {inscricoesParceria.map((i) => (
     <SelectItem key={i.id} value={i.id}>
       {(i.produtores?.nome || i.granjas?.razao_social)}
       {i.nome && i.nome !== i.produtores?.nome ? ` (${i.nome})` : ""}
       {" - "}{i.inscricao_estadual}
     </SelectItem>
   ))}
   ```

   Resultado:
   - `JORGE ALBERTO MACHADO DA COSTA - 034.104.448-2`
   - `JORGE ALBERTO MACHADO DA COSTA (JORGE ALBERTO MACHADO DA COSTA-UMBU) - 034.109.042-5`
   - `UMBU AGROPECUARIA S.A. - 034.109.337-8`

## Fora de escopo

- Sem alterações de schema, dados ou hooks.
- Sem mudança na ordenação atual (mantida do `useAllInscricoes`).
- Substituir o `Select` por `ComboboxFilter` (padrão do projeto) pode ser feito depois, se desejar.
