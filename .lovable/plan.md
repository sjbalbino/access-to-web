## Diagnóstico
A linha mostrada no select **"UMBU AGROPECUARIA S.A. - IE: 034.109.337-8 (UMBU AGROPECUARIA-JUR)"** está correta:

| Campo | Valor exibido |
|---|---|
| Nome do **produtor sócio (PJ)** | UMBU AGROPECUARIA S.A. |
| IE da inscrição | 034.109.337-8 |
| Granja (parênteses) | UMBU AGROPECUARIA-JUR |

A confusão é só de **leitura do rótulo** — o usuário lê "UMBU AGROPECUARIA S.A." como sendo a granja, mas é o nome do produtor sócio (pessoa jurídica) cadastrado em `produtores` com `tipo_produtor='socio'`.

Regra atual já está correta:
- `produtor.tipo_produtor = 'socio'` ✅
- `inscricao.ativa = true` ✅
- `inscricao.emitente_id IS NOT NULL` ✅ (filtro adicionado no commit anterior)

## Correção visual

**Arquivo:** `src/pages/NotaFiscalForm.tsx` — bloco do `<SelectContent>` (linhas ~1342-1363) e `<CardDescription>` (linha 1321).

Trocar o rótulo de cada item de:
```
{produtor.nome} - IE: {inscricao_estadual} ({granja.razao_social})
```
para um formato **etiquetado e em duas linhas** que deixa claro o que é cada parte:
```
Sócio: UMBU AGROPECUARIA S.A.
IE 034.109.337-8 • Granja: UMBU AGROPECUARIA-JUR
```

- Linha 1: prefixo `Sócio:` + nome do produtor sócio, em negrito.
- Linha 2 (menor, muted): `IE <inscricao_estadual> • Granja: <granja>`.
- Manter o ★ para inscrição principal e o ⚠ para inscrição salva sem emitente.

Também atualizar a `CardDescription` para deixar explícito:
> "Selecione a inscrição do **sócio (pessoa física ou jurídica)** que vai emitir esta NF-e"

## Escopo
- Apenas o rótulo do `<SelectItem>` e a descrição do card.
- Sem mudanças no hook, no filtro ou no schema. Sem mudança de regra de negócio.
