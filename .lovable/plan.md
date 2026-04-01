

## Plano: Adicionar importacao de Remessas de Venda

### Problema
Nao existe configuracao de importacao para `remessas_venda`. As remessas precisam ser vinculadas aos contratos de venda ja importados.

### Alteracao

**Arquivo:** `src/lib/importacaoConfig.ts`

Adicionar nova entrada de configuracao apos `contratos` (order: 14), com `dependsOn: ['contratos', 'silos', 'placas', 'produtos']`.

Colunas mapeadas da planilha:
- `codigo` (int), `data_remessa` (date), `peso_bruto`, `peso_tara`, `peso_liquido`, `ph`, `umidade`, `impureza`
- `kg_remessa`, `kg_desconto_umidade`, `kg_desconto_impureza`, `kg_nota`
- `sacos_remessa`, `sacos_nota`, `preco_kg`, `valor_remessa`, `valor_nota`
- `romaneio` (int), `motorista`, `balanceiro`, `status`, `observacoes`
- `placa` (varchar direto), `uf_placa`, `motorista_cpf`
- `local_entrega_nome`, `local_entrega_cnpj_cpf`, `local_entrega_ie`, `local_entrega_logradouro`, `local_entrega_numero`, `local_entrega_complemento`, `local_entrega_bairro`, `local_entrega_cidade`, `local_entrega_uf`, `local_entrega_cep`

Referencias (lookup):
- `contrato_venda_id` via `contrato_numero` -> `contratos_venda.numero`
- `silo_id` via `silo_codigo` -> `silos.codigo`
- `variedade_id` via `variedade_codigo` -> `produtos.codigo`
- `transportadora_id` via `transportadora_codigo` -> `transportadoras.codigo`
- `placa_id` via `placa_codigo` -> `placas.placa`

Tambem ajustar `CLEANUP_STEPS` em `ImportarDados.tsx` para incluir `remessas_venda` na ordem correta (ja existe).

### Arquivos alterados
- `src/lib/importacaoConfig.ts` (adicionar config de remessas_venda)

