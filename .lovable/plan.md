# Importação dos custos da lavoura (aplicações por tipo)

Hoje o assistente de importação já traz Controle de Lavoura e Plantios, mas não existe nenhuma entrada para as aplicações (herbicidas, fungicidas, fertilizantes etc.), embora a tela de importação já cite "Aplicações". O plano cria uma importação separada para cada tipo de aplicação do Controle de Lavoura.

## O que muda

### 1. Novos itens no assistente de importação
Um item por tipo, cada um com sua própria planilha, todos gravando na mesma base de aplicações com o tipo já fixado:

- Adubação/Fertilizantes
- Herbicidas
- Fungicidas
- Inseticidas
- Dessecação
- Adjuvantes
- Micronutrientes
- Inoculantes
- Calcários

Formicidas não terão tipo próprio (conforme decidido): quem importar formicida usa a planilha de Inseticidas.

### 2. Colunas aceitas em cada planilha
Mesmo layout para todos os tipos:

- `safra_codigo` (código do Controle de Lavoura, igual ao já usado em Plantios) e `granja_codigo`
- `data_aplicacao`, `area_aplicada`, `dose_ha`, `quantidade_total`
- `valor_unitario`, `valor_total`
- `produto_codigo` (aceita também "produto", "defensivo", "fertilizante", "insumo")
- `aplicador`, `equipamento`, `condicao_climatica`, `observacoes`

Datas em DD/MM/AAAA e valores em padrão brasileiro (1.234,56) são convertidos automaticamente, como nas outras importações.

### 3. Vínculo automático com o Controle de Lavoura
Cada linha é ligada ao Controle de Lavoura pelo código informado (mesma regra já usada nos Plantios), e dele herda a safra e a lavoura. Linhas cujo controle não for encontrado entram no relatório de erros da importação, sem gravar nada.

### 4. Ordem e dependências
As aplicações são importadas depois de Safras, Lavouras, Controle de Lavoura e Produtos, e aparecem no grupo "Aplicações, Plantios, Chuvas, etc." da tela de Importar Dados, com contagem de registros já existentes.

## Detalhes técnicos

- `src/lib/importacaoConfig.ts`: gerar as 9 configurações a partir de um factory (`criarConfigAplicacao(tipo, label, order)`), com colunas comuns mais `tipo` fixo via transform constante; `dependsOn: ['safras','lavouras','controle_lavouras','produtos']`; referências opcionais para `_granja_id` (granjas.codigo) e `produto_id` (produtos.codigo).
- `src/components/importacao/ImportacaoDialog.tsx`: incluir as chaves de aplicação na mesma ramificação de resolução composta hoje usada por `colheitas`/`plantios` (cache paginado de `controle_lavouras.codigo` + granja, preenchendo `controle_lavoura_id`, `safra_id` e `lavoura_id`); registrar `controle_lavoura_id`/`lavoura_id`/`safra_id` como colunas válidas e manter `granja_id` fora do insert (a tabela não tem essa coluna); validação de linha exigindo `controle_lavoura_id` e `lavoura_id`.
- `src/pages/ImportarDados.tsx`: substituir a chave genérica `aplicacoes` do grupo pelas novas chaves por tipo e contar registros por `controle_lavoura_id` (como já é feito para plantios).
- Nenhuma mudança de banco de dados; `tenant_id` continua sendo preenchido pelo fluxo atual de importação.
