# Nota 162 (remessa): erro "informe a UF do transportador"

## Diagnóstico (confirmado no banco)

A nota 162 / série 930 está em rascunho com:
- `transp_nome = "roberto r alves"`, `transp_cpf_cnpj = 94416877072` (CPF do motorista)
- `transp_uf = null`, `transp_cidade = null`
- `veiculo_placa = ISY8A10`, `veiculo_uf = RS`, `modalidade_frete = 0`

Ou seja: a remessa não tem transportadora cadastrada, então o motorista foi usado como transportador. Em `EmitirNfeAutomaticoDialog.tsx` os campos `transp_cidade`/`transp_uf` só são preenchidos quando existe transportadora — com motorista eles ficam nulos. A validação de transporte (`focusNfeMapper.ts`) exige UF sempre que houver transportador informado, logo a emissão é bloqueada.

## O que será feito

1. **Preencher a UF do transportador quando o transportador vem do motorista** (`EmitirNfeAutomaticoDialog.tsx`): usar, em ordem, a UF da transportadora → `remessa.uf_placa` → UF da inscrição/emitente. Mesma lógica para os demais fluxos que montam transporte a partir de motorista (dialog de edição da remessa, se aplicável).
2. **Autopreencher a UF na aba Transporte do formulário de NF-e** (`NotaFiscalForm.tsx`): ao informar nome/CPF do transportador sem UF, sugerir a UF da placa (ou do emitente), mantendo o campo editável e marcado como obrigatório.
3. **Corrigir a nota 162** gravando `transp_uf = 'RS'` (mesma UF da placa) para que possa ser transmitida sem retrabalho manual.

## Detalhes técnicos

- Nenhuma alteração de schema; os campos `transp_uf`, `veiculo_uf` já existem.
- A regra de validação em `focusNfeMapper.ts` permanece (a SEFAZ exige UF do transportador); a correção é na origem dos dados, não no afrouxamento da validação.
- Notas já autorizadas não são alteradas.
