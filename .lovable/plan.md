Ajustar a configuração de importação de placas para converter os valores do banco Access "PRÓPRIAS" e "TERCEIROS" para o formato esperado pelo banco: "propria" e "terceiros".

### Alterações
1. **src/lib/importacaoConfig.ts**
   - Criar função de transform `toPropriedade` que normaliza strings: trim, lower case, remove acentos, e converte "proprias"/"propria" → "propria", "terceiros" → "terceiros"
   - Aplicar essa função na coluna `propriedade` da configuração `placas`

### Valores esperados após normalização
- "PRÓPRIAS", "PRÓPRIA", "proprias", "propria" → `propria`
- "TERCEIROS", "terceiros" → `terceiros`
- Valor vazio → `null` (o banco tem default 'propria')