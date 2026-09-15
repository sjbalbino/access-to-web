# Revisão das inscrições estaduais repetidas

Levantei todas as inscrições estaduais usadas por mais de um produtor. São 22 no total (a de LUIS FELIPE BEHNEN já foi corrigida). Elas se dividem em três grupos com tratamentos bem diferentes.

## Grupo 1 — Inscrições fictícias (nenhuma ação de unificação)

Números genéricos herdados do sistema legado, usados como "sem inscrição":

| Inscrição | Produtores |
|---|---|
| 111.111.111-1 | 60 |
| 000.000.000-0 | 3 |
| 555.555.555-5 | 3 |
| 777.777.777-7 | 3 |

Não são duplicidade: cada produtor é uma pessoa diferente. Unificar aqui seria errado.

Ação proposta: nada nos dados. Apenas marcar esses números como "não informado" na tela de conferência (grupo 3 abaixo), para não voltarem a aparecer como alerta.

## Grupo 2 — Duplicidades reais (mesma pessoa cadastrada duas vezes)

Mesmo CPF e mesma pessoa em dois cadastros distintos:

| Inscrição | Cadastros | Movimentações |
|---|---|---|
| 472.101.722-6 — MARIA SIRLENE DE MATTOS DA VEIGA | 2 (só diferença de maiúsculas) | um com 12 entregas / 211.279 kg, outro com 4 entregas / 30.908 kg — ambos com movimento |
| 090.103.090-2 — claurinei jardim | 2 | um vazio, outro com 1 devolução, 1 nota e 1 transferência |
| 472.101.609-2 — TATIANE TRENHAGO WILGES | 2 | ambos totalmente vazios |

Ação proposta:
- MARIA SIRLENE: consolidar tudo no cadastro que tem mais movimento e desativar o outro (nada é apagado, apenas reapontado, igual ao que foi feito no LUIS FELIPE). Antes de aplicar, conferir o extrato dela para garantir que os saldos por safra/produto continuem coerentes.
- claurinei jardim: mover a movimentação para o cadastro principal e desativar o vazio.
- TATIANE: desativar a inscrição duplicada vazia (sem risco, não há movimento).

## Grupo 3 — Mesma inscrição em CPFs diferentes (casos legítimos, só sinalizar)

Quinze inscrições são compartilhadas por pessoas diferentes da mesma família/propriedade — situação normal em inscrição de produtor rural (cônjuges, pai e filho, condomínio rural). Exemplos: DIRCEU / MARLISE DE TOLEDO, LEONIR / ALZIRA DETTMER, ALGEU / CLEUSA DE CAMPOS, RICARDO / OLINDA ALTEVOGT, MILTON / JULIO / JORGE MACHADO DA COSTA.

Dois casos merecem conferência com a Márcia porque o CPF é o mesmo apesar dos nomes diferentes, o que indica erro de digitação em um dos cadastros:
- 472.100.168-0 — SERGIO LUIZ VALERIO ANTONELLO e marilda barbosa antonello, ambos com CPF 981.825.520-87
- 472.101.483-9 — maria salete soares e almira moreira da silva, ambos com CPF 768.204.670-87

Ação proposta: não alterar dados desses. Em vez disso, entregar uma tela de conferência.

## Tela de conferência de inscrições repetidas

Nova seção dentro de Produtores, listando as inscrições usadas por mais de um produtor, com:
- os cadastros envolvidos, CPF/CNPJ e a contagem de entregas, devoluções, transferências e notas de cada um;
- classificação automática: "Inscrição genérica", "Provável duplicidade (mesmo CPF e mesmo nome)", "CPF repetido — conferir", "Compartilhada na família";
- botão para abrir a reatribuição já existente, quando for o caso.

Assim os próximos casos aparecem sozinhos, sem precisar de análise manual no banco.

## Detalhes técnicos

- Reatribuição via `update` de `colheitas.inscricao_produtor_id`, `devolucoes_deposito.inscricao_produtor_id`, `transferencias_deposito.inscricao_origem_id`/`inscricao_destino_id`, `notas_deposito_emitidas.inscricao_produtor_id` e `contratos_venda.inscricao_produtor_id`.
- Registros com NF-e autorizada permanecem intocados (política de imutabilidade fiscal); se algum aparecer, será reportado em vez de alterado.
- Inscrições duplicadas ficam com `ativa = false` (sem exclusão), preservando rastreabilidade.
- A tela reaproveita `ReatribuirInscricaoDialog` e um novo hook de agregação por inscrição estadual.

## Confirmações necessárias

1. Posso consolidar MARIA SIRLENE, claurinei jardim e TATIANE conforme acima?
2. Os dois casos de CPF repetido (ANTONELLO e SOARES/SILVA) você prefere revisar manualmente na tela, certo?
