## Correções na tela de Silos e esclarecimento sobre importação

### 1. Importação de Silos (resposta)
Na planilha de importação de silos, a coluna para vincular a granja é **`granja_codigo`** — deve conter o **código da granja** (não o nome). O sistema faz lookup em `granjas.codigo` para encontrar o `granja_id` correspondente.

### 2. Correção da listagem de Silos (`src/pages/Silos.tsx`)
Atualmente a coluna está rotulada como "Empresa" e lê `item.empresa?.razao_social`, campo que não existe no retorno do hook — por isso aparece sempre "-".

Alterações:
- Renomear o cabeçalho da coluna de **"Empresa"** para **"Granja"**.
- Trocar a leitura da célula de `item.empresa?.razao_social` para `item.granja?.razao_social` (que é o que o `useSilos` realmente retorna via join).

Nenhuma outra alteração necessária — o hook `useSilos` já busca corretamente `granja:granjas(id, razao_social)`.