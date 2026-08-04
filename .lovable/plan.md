# Evitar rejeições por dados de transporte incompletos (caso NF-e 146)

## Diagnóstico

A NF-e 146 (série 930) hoje está `autorizado` no banco (`veiculo_placa = IVP7J13`, `veiculo_uf = RS`, `modalidade_frete = 1`), ou seja, foi reemitida após o preenchimento manual da UF. A rejeição original não ficou registrada em `motivo_status` (foi sobrescrito por "Autorizado o uso da NF-e"), então a mensagem exata da SEFAZ não é recuperável — o que é, em si, parte do problema: hoje o sistema perde a mensagem de rejeição e não valida nada de transporte antes de transmitir.

A validação atual (`validateNotaForEmission` em `src/lib/relatorios`/`src/lib/focusNfeMapper.ts`) cobre emitente, destinatário e itens/IBS-CBS, mas **não tem nenhuma regra para o grupo de transporte**: placa sem UF passa direto para a SEFAZ, que responde com rejeição técnica pouco compreensível.

## O que será feito

### 1. Validação de transporte antes de transmitir (bloqueio com mensagem clara)
Em `validateNotaForEmission` (`src/lib/focusNfeMapper.ts`), adicionar regras:
- Se houver placa informada → UF da placa é obrigatória: "Aba Transporte > Veículo: informe a UF da Placa (obrigatório quando a placa é informada)".
- Se houver UF sem placa → exigir a placa.
- Placa deve ter 7 caracteres alfanuméricos após limpeza; senão mensagem explicando o formato (ABC1D23 / ABC1234).
- Se `modalidade_frete` indicar frete contratado (0, 1, 2, 3, 4) → exigir identificação do transportador (nome/CPF-CNPJ) ou, na falta dele, placa + UF, com mensagem apontando o campo exato.
- Se houver transportador informado → exigir UF do transportador.

### 2. Aviso preventivo no formulário (antes de salvar/emitir)
Na aba Transporte de `src/pages/NotaFiscalForm.tsx`:
- Marcar visualmente "UF" como obrigatória quando a placa estiver preenchida (asterisco + borda de erro + texto de ajuda).
- Autopreencher a UF ao informar a placa, buscando o cadastro em `placas`/`transportadoras`; se não houver, usar a UF da granja/emitente como sugestão (o operador pode alterar).
- Normalizar a placa (maiúsculas, sem separadores, máx. 7).

### 3. Aplicar a mesma validação nos demais fluxos de emissão
Reaproveitar a validação nos diálogos que emitem NF-e sem passar pelo formulário completo: `EmitirNfeAutomaticoDialog`, `EmitirNfeCompraDialog`, `EmitirNfeDevolucaoDialog` e `NotaDepositoFormDialog` — bloqueando com a mesma mensagem em português.

### 4. Traduzir rejeições da SEFAZ e preservar o histórico
Criar `src/lib/sefazRejeicoes.ts` com um dicionário das rejeições mais comuns (incluindo as do grupo de transporte, ex.: UF do veículo, placa inválida, transportador sem IE) traduzindo código/mensagem técnica em orientação acionável ("Aba Transporte > Veículo: UF da placa não informada").
- Usar esse tradutor ao exibir erros de emissão em `src/pages/NotasFiscais.tsx` e nos diálogos de emissão.
- Na Edge Function `focus-nfe-emitir`, gravar a mensagem de rejeição em `motivo_status` sem sobrescrever o histórico útil, para auditoria futura.

## Detalhes técnicos
- Validação centralizada em `focusNfeMapper.ts` para evitar divergência entre fluxos.
- Nenhuma migração de banco necessária; campos já existem (`veiculo_placa`, `veiculo_uf`, `transp_*`).
- A NF-e 146 já está autorizada e não sofrerá alteração.
