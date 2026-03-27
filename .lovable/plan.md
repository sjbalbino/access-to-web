

## Plano: Adicionar campo "Nome" na Inscrição Estadual

### Contexto
A inscrição estadual pode ter um nome/razão social diferente do produtor vinculado. Precisamos de um campo `nome` na tabela `inscricoes_produtor`.

### Alterações

#### 1. Migração SQL
Adicionar coluna `nome` (varchar, nullable) na tabela `inscricoes_produtor`.

#### 2. `src/components/produtores/InscricoesTab.tsx`
- Adicionar campo "Nome" no formulário de inscrição (input text, logo no topo do form)
- Incluir `nome` no `emptyInscricao`
- Exibir nome na listagem/tabela de inscrições

#### 3. `src/hooks/useInscricoesProdutor.ts`
- Adicionar `nome` na interface `InscricaoProdutor`

#### 4. `src/lib/importacaoConfig.ts`
- Adicionar mapeamento `{ accessName: 'nome', dbName: 'nome', transform: toStr }` na config de `inscricoes`

#### 5. Hooks auxiliares (`useAllInscricoes.ts`, `useInscricoesCompletas.ts`)
- Incluir `nome` no select e na interface

### Resultado
- Campo "Nome" disponível no cadastro de inscrições
- Importação aceita coluna `nome` na planilha de inscrições
- Nome exibido na listagem de inscrições do produtor

