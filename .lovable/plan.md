# Nota 128 (série 930) — Umbu Agropecuária: rejeição por bairro vazio

## Diagnóstico (confirmado)

A NF-e 128 está com status `rejeitada`. A Focus NFe devolveu:

```text
codigo: erro_validacao_schema
mensagem: Erro na validação do Schema XML
erros: [{ campo: "bairro_destinatario", mensagem: "Bairro destinatario não pode ser vazio" }]
```

Causa: o cadastro do destinatário **Vitor Hugo Scariot** (CPF 034.985.800-43, Porteira do Pinhal — Pinhal da Serra/RS) está com o campo **Bairro vazio**. A nota copiou o valor vazio (`dest_bairro = ''`) e o mapper envia `bairro_destinatario: ""` sem qualquer bloqueio prévio — a rejeição só aparece depois de consumir o número na SEFAZ.

## Correções

### 1. Dados
- Gravar `INTERIOR` como bairro no cadastro do cliente Vitor Hugo Scariot.
- Gravar `INTERIOR` em `dest_bairro` da nota 128 (rejeitada, ainda editável), permitindo reemissão imediata.

### 2. Bloqueio antes da transmissão
- No mapper de emissão, validar os bairros obrigatórios (emitente, destinatário e, quando informado, transportador/local de entrega) e lançar erro claro apontando o cadastro exato a corrigir, no mesmo padrão já usado para Placa/UF do veículo.
- Aplicar a mesma validação nos fluxos que montam a nota (Nota Fiscal, Depósito, Compra, Devolução, Remessa) para que a mensagem apareça antes de reservar número.

### 3. Mensagem acionável e UI
- Adicionar regra de bairro no tradutor de rejeições SEFAZ, com orientação: "Cadastro do destinatário/emitente: informe o Bairro (obrigatório pela SEFAZ)".
- Marcar Bairro como campo obrigatório (asterisco + validação) nos formulários de Clientes/Fornecedores, Inscrições do Produtor e Locais de Entrega, evitando novos cadastros sem bairro.

## Detalhes técnicos
- `src/lib/focusNfeMapper.ts`: nova checagem de `bairro_emitente` / `dest_bairro` antes de montar o payload.
- `src/lib/sefazRejeicoes.ts`: nova regra com padrão `/bairro/i`.
- Formulários: `src/pages/ClientesFornecedores.tsx`, `src/components/produtores/InscricoesTab.tsx`, `src/pages/LocaisEntrega.tsx` — validação de bairro não vazio.
- Atualização de dados via operação de banco (cliente + nota 128).
