## Unificação do produtor duplicado LAURO REICHERT

### Diagnóstico

Existem **dois cadastros do produtor LAURO REICHERT** na mesma granja (7c708923...), criados no mesmo instante pela importação de 05/07/2026:

| Produtor ID | CPF | Ativo | Inscrição vinculada | IE |
|---|---|---|---|---|
| `ccf3bbba…0afb` (**canônico**) | 279.291.080-15 | ✅ Sim | `ed5dfdbf…90e2` | 472.101.871-0 |
| `e82b73db…1664` (duplicado) | — vazio — | ❌ Não | `75eacfbd…abee` | 472.101.871-0 |

Ambas as inscrições apontam para a **mesma IE 472.101.871-0**, o que confirma que se trata de um único produtor real fragmentado durante a importação.

### Movimentações encontradas

Só a **inscrição duplicada `75eacfbd`** ainda carrega movimento próprio — todo o resto já está na inscrição canônica:

- **2 colheitas** na inscrição duplicada:
  - 01/04/2024 — 4.390 kg
  - 19/04/2026 — 16.269 kg
- Inscrição canônica `ed5dfdbf`: 1 colheita + 3 transferências (origem) + 1 (destino) + 2 notas de depósito + 3 devoluções.
- Nenhuma nota fiscal, contrato, rateio ou entrada NF-e vinculada ao produtor/inscrição duplicada.

### Ação de unificação (SQL, uma única migração)

```text
1. UPDATE colheitas
     SET inscricao_produtor_id = 'ed5dfdbf…90e2'   -- canônica
   WHERE inscricao_produtor_id = '75eacfbd…abee';  -- duplicada
       (2 linhas afetadas)

2. DELETE FROM inscricoes_produtor
   WHERE id = '75eacfbd…abee';

3. DELETE FROM produtores
   WHERE id = 'e82b73db…1664';   -- duplicado inativo, agora sem vínculos
```

Nenhum outro dado é tocado. A inscrição canônica passa a totalizar **3 colheitas** (as 2 migradas + a que já tinha) e continua respondendo por todas as transferências, notas de depósito e devoluções existentes. O saldo do produtor deixa de estar dividido em dois cadastros.

### Observação

O cadastro canônico está com `percentual_participacao = 0.00`. Se o LAURO for sócio de rateio, esse percentual precisa ser ajustado à parte — este plano não altera esse campo, apenas unifica os cadastros.