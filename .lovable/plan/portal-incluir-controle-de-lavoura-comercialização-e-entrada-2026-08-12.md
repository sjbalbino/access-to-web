# Portal: incluir Controle de Lavoura, Comercialização e Entrada por XML

A página de apresentação (`/`) hoje lista 6 módulos e não menciona o ciclo da lavoura (plantio → colheita), nem o detalhe de contratos/remessas, nem a importação do XML da NF-e gerando entrada de estoque e contas a pagar. O plano amplia o conteúdo institucional — sem mexer em regras do sistema.

## O que muda

### 1. Novo módulo "Controle de lavoura"
Card destacando o ciclo produtivo que o sistema já contempla:
plantio, aplicações (defensivos/fertilizantes), análises de solo, chuvas, floração, pragas e plantas invasoras, pivôs, até a colheita por safra e lavoura, com custo e produtividade por área.

### 2. Comercialização mais explícita
Reescrever o card para citar contratos de venda (quantidades, preços, saldo a entregar), remessas por carga, romaneios e o acompanhamento de cada carregamento até a autorização fiscal, além da compra de cereais.

### 3. Financeiro + entrada por XML
- Ajustar o card Financeiro para citar a geração automática de contas a pagar a partir das notas de entrada.
- Ajustar o card Fiscal/NF-e para citar a manifestação de destinatário (DF-e) e a importação do XML que gera a entrada no estoque e o contas a pagar em um só passo.

### 4. Nova seção "Do plantio ao caixa"
Faixa visual com o fluxo em 5 etapas ligadas entre si, mostrando a integração:

```text
Lavoura        Colheita        Depósito       Comercialização      Financeiro
plantio    →   balança e   →   saldo por  →   contratos e      →   contas a pagar/
aplicações     umidade         produtor       remessas + NF-e      receber e DRE
```

### 5. Benefícios e SEO
- Acrescentar dois itens à lista de benefícios: rastreio do custo da lavoura até a venda; entrada de nota por XML sem digitação.
- Atualizar a meta description e o texto de apoio da seção de módulos para incluir lavoura, contratos/remessas e entrada por XML (mantendo o título abaixo de 60 caracteres e a descrição abaixo de 160).

## Detalhes técnicos

- Arquivo único: `src/pages/portal/Home.tsx`.
- Novos ícones do `lucide-react` (ex.: `Sprout`, `FileInput`) para os cards; grid de módulos passa a 7-8 itens, mantendo `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`.
- Seção de fluxo construída com o mesmo padrão de tokens semânticos (`bg-card`, `border-border`, `text-muted-foreground`), responsiva: coluna única no mobile, linha com setas a partir de `md`.
- Nenhuma alteração em banco de dados, hooks ou rotas.
