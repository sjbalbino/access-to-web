## Objetivo

Exportar em CSV as 631 inscrições de produtor que ainda estão sem `codigo` (INSCCODIGO), para o usuário complementar em planilha e reimportar.

## O que vou fazer (em modo build)

1. Rodar uma consulta na tabela `inscricoes_produtor` filtrando `codigo IS NULL`, trazendo os campos úteis para identificação:
   - `inscricao_id` (id da inscrição no banco)
   - `inscricao_estadual`
   - `cpf_cnpj`
   - `nome` e `nome_fantasia`
   - `produtor_nome` (via join em `produtores`)
   - `granja` (razão social, via join em `granjas`)
   - `cidade`, `uf`
   - `tipo`, `ativa`

2. Ordenar por granja → produtor → inscrição estadual para facilitar o preenchimento manual.

3. Exportar via `COPY ... TO STDOUT WITH CSV HEADER` para `/mnt/documents/inscricoes_sem_codigo.csv`.

4. Entregar o arquivo com uma tag `<presentation-artifact>` para download imediato.

## Como usar depois

- Abrir o CSV, preencher a coluna `INSCCODIGO` (ou adicionar uma nova coluna com esse nome) para cada linha.
- Reimportar via **Importar Dados → Inscrições Produtor** com a opção "Atualizar existentes + inserir novos" ligada.
- O sistema fará o match pela chave `granja_id + codigo` e atualizará os cadastros existentes.

## Observação

Nenhuma alteração em código ou banco é necessária — é apenas uma exportação de leitura.
