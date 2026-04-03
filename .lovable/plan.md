

## Plano: Adicionar campos do sistema legado na importacao de remessas

### Problema
A planilha Excel possui colunas que nao estao mapeadas na importacao: `remnota`, `remhora`, `remcancelada`, `remcnpjcpfentrega`, `reminscestadualentrega`. Esses campos sao importantes para o sistema legado. O campo `remcancelada` e critico pois remessas canceladas nao devem ser contadas no saldo carregado.

### Analise

O sistema ja filtra remessas canceladas usando `.neq("status", "cancelada")` nos calculos de saldo. Portanto, o campo `remcancelada` da planilha deve ser convertido para `status = "cancelada"` quando verdadeiro.

Os campos `remcnpjcpfentrega` e `reminscestadualentrega` sao duplicatas de `local_entrega_cnpj_cpf` e `local_entrega_ie` que ja existem na tabela — precisam apenas de alias no mapeamento.

Os campos `remnota` e `remhora` nao existem na tabela e precisam ser criados.

### Alteracoes

#### 1. Migracao SQL
Adicionar 2 novas colunas na tabela `remessas_venda`:
- `numero_nota_legado` (text) — numero da nota do sistema legado
- `hora_remessa` (text) — hora da remessa

#### 2. `src/lib/importacaoConfig.ts`
Adicionar mapeamentos na config de `remessas_venda`:

**Colunas novas:**
- `remnota` → `numero_nota_legado` (toStr)
- `remhora` → `hora_remessa` (toStr)

**Alias para colunas existentes (nomes diferentes na planilha):**
- `remcnpjcpfentrega` → `local_entrega_cnpj_cpf` (toStr)
- `reminscestadualentrega` → `local_entrega_ie` (toStr)

**Campo especial `remcancelada`:**
- Transform que verifica se valor e "Sim"/"S"/"1"/true e define `status = "cancelada"`. Implementar como transform customizado que popula o campo `status` baseado no valor de `remcancelada`.
- Na pratica: adicionar logica no transform de `status` para considerar tambem a coluna `remcancelada`, ou adicionar um `postProcess` que sobrescreve o status quando `remcancelada` for verdadeiro.

**Abordagem para `remcancelada`:** Como o motor de importacao mapeia coluna-a-coluna, a forma mais limpa e adicionar `remcancelada` como coluna mapeada para um campo auxiliar e depois no transform de `status` verificar se `remcancelada` esta presente. Alternativa mais simples: mapear `remcancelada` diretamente com um transform que retorna "cancelada" ou null, e ajustar a logica para que o campo `status` use esse valor quando presente.

**Solucao final:** Mapear `remcancelada` como coluna extra com `dbName: '_remcancelada'` (ignorada no insert), e modificar o transform de `status` para receber o row inteiro ou adicionar um `postProcess` na config. Como o motor nao suporta postProcess nativamente, a abordagem mais simples e: mapear `remcancelada` para `status` com um transform que retorna "cancelada" quando true, mas isso conflitaria com o mapeamento existente de `status`. Entao a melhor opcao e: no transform do campo `status`, verificar tambem o valor de `remcancelada` do row original — isso requer acesso ao row no transform.

**Abordagem escolhida:** Alterar o motor de importacao para passar o row completo como segundo argumento do transform, e no transform de `status` das remessas verificar se `remcancelada` indica cancelamento.

### Arquivos alterados
- 1 migracao SQL (2 colunas novas)
- `src/lib/importacaoConfig.ts` (adicionar mapeamentos + logica de cancelada)

