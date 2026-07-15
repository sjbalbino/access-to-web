## Objetivo
Na aba **Inscrições Estaduais** (dentro do dialog "Editar Produtor/Sócio"), exibir claramente o nome do produtor ao qual a IE pertence e impedir o cadastro de Inscrições Estaduais inválidas ou genéricas.

## Mudanças

### 1. Exibir o nome do produtor
Arquivo: `src/components/produtores/InscricoesTab.tsx`

- Adicionar um cabeçalho contextual acima da lista e dentro do dialog de nova/editar inscrição, no formato:
  - Lista: `Inscrições Estaduais de: **{produtor.nome}** ({CPF/CNPJ formatado})`
  - Dialog: título passa a ser `Nova Inscrição — {produtor.nome}` / `Editar Inscrição — {produtor.nome}`
- Usa o hook já disponível `useProdutor(produtorId)`.

### 2. Rejeitar IEs genéricas
Criar utilitário `src/lib/inscricaoEstadualValidator.ts` com:

- `isIeGenerica(ie: string): boolean` — rejeita:
  - Vazio (mas "ISENTO" é aceito somente quando o campo do formulário estiver marcado como isento — hoje o campo é livre, então "ISENTO"/"ISENTA" **não** será tratado como genérico e sim como valor legítimo aceito sem dígito verificador).
  - Somente zeros (`000000000...`)
  - Todos dígitos iguais (`111...`, `222...`)
  - Sequências óbvias: `123456789`, `12345678`, `987654321`
  - Menos de 2 dígitos após limpeza
- `validarIeUF(ie: string, uf: string): { valida: boolean; motivo?: string }` — aplica o algoritmo oficial de dígito verificador para as 27 UFs (SP, MG, RS, PR, SC, GO, MT, MS, RJ, ES, BA, PE, CE, PA, MA, PI, RN, PB, AL, SE, TO, RO, RR, AM, AC, AP, DF).
  - Aceita `"ISENTO"`/`"ISENTA"` como válido (contribuinte isento).
  - Retorna `{ valida: false, motivo: "..." }` para IE com comprimento ou dígito verificador inválido.

### 3. Aplicar validação no `handleSave`
Arquivo: `src/components/produtores/InscricoesTab.tsx` (função `handleSave`)

Após validação de campos obrigatórios e antes de salvar:

```ts
const ie = formData.inscricao_estadual?.trim() || "";
const uf = formData.uf || "";

if (isIeGenerica(ie)) {
  toast({ title: "Inscrição Estadual inválida",
          description: "Não é permitido cadastrar IE genérica (zeros, sequências ou repetições).",
          variant: "destructive" });
  return;
}

const resultado = validarIeUF(ie, uf);
if (!resultado.valida) {
  toast({ title: "Inscrição Estadual inválida",
          description: resultado.motivo ?? `A IE informada não é válida para ${uf}.`,
          variant: "destructive" });
  return;
}
```

### 4. Feedback visual no campo IE
No input de `inscricao_estadual`, adicionar `onBlur` que dispara a mesma validação e mostra mensagem inline abaixo do campo em vermelho quando inválida (sem bloquear digitação). Facilita ao usuário corrigir antes de clicar Salvar.

## Detalhes técnicos

- **Escopo restrito**: mudanças apenas em `InscricoesTab.tsx` + novo arquivo `src/lib/inscricaoEstadualValidator.ts`. Nenhuma alteração no banco, hooks de dados ou lógica de NF-e.
- **Referência dos algoritmos**: fórmulas de módulo 11 (com pesos específicos por UF) publicadas pelas SEFAZ estaduais / SINTEGRA.
- **"ISENTO"** permanece aceito para produtores isentos de IE.
- Não altera IEs já cadastradas — validação roda apenas no submit de novo/editar.
