
## Visualizacao do Estoque dos Silos

### Objetivo
Adicionar uma secao visual na pagina de Silos que mostre o nivel de ocupacao de cada silo, com barras de progresso, indicadores de cor e cards informativos.

### Dados Utilizados
- **Capacidade**: campo `capacidade_kg` da tabela `silos`
- **Estoque atual**: soma de `producao_liquida_kg` da tabela `colheitas` agrupado por `silo_id`

### Implementacao

#### 1. Criar hook `useEstoqueSilos` (novo arquivo: `src/hooks/useEstoqueSilos.ts`)
- Query que busca todos os silos com a soma das colheitas por silo
- Retorna: nome, codigo, capacidade, estoque atual, percentual de ocupacao, granja
- Aceita filtro opcional por `safra_id`

#### 2. Criar componente `SiloEstoqueVisual` (novo arquivo: `src/components/silos/SiloEstoqueVisual.tsx`)
Cards visuais para cada silo contendo:
- Nome e codigo do silo
- Barra de progresso (Progress) mostrando % de ocupacao
- Cores dinamicas:
  - Verde (0-60%): ocupacao normal
  - Amarelo (60-85%): atencao
  - Vermelho (85-100%+): lotado/acima da capacidade
- Valores numericos: estoque atual / capacidade em kg e sacas
- Badge do tipo do silo (armazenamento, secagem, transbordo)
- Indicador de granja associada

#### 3. Modificar `src/pages/Silos.tsx`
- Adicionar secao de resumo no topo com DataCards:
  - Total de silos ativos
  - Capacidade total (kg)
  - Estoque total (kg)
  - Ocupacao media (%)
- Adicionar filtro por safra (Select)
- Renderizar grid de `SiloEstoqueVisual` acima da tabela existente
- A tabela de cadastro permanece inalterada abaixo

### Layout Visual

```text
+--------------------------------------------------+
| PageHeader: Silos                                |
+--------------------------------------------------+
| [Filtro: Safra]                                  |
+----------+----------+----------+----------+------+
| Silos    | Capac.   | Estoque  | Ocupacao |      |
| Ativos   | Total    | Total    | Media    |      |
+----------+----------+----------+----------+------+
| +------------------+  +------------------+       |
| | Silo 1           |  | Silo 2           |       |
| | [===75%===    ]   |  | [==40%==      ]  |       |
| | 75.000/100.000 kg |  | 40.000/100.000kg |       |
| +------------------+  +------------------+       |
+--------------------------------------------------+
| Card: Lista de Silos (tabela existente)          |
+--------------------------------------------------+
```

### Secao Tecnica

**Hook `useEstoqueSilos`**: Faz uma query na tabela `colheitas` agrupando `SUM(producao_liquida_kg)` por `silo_id`, com join na tabela `silos`. Aceita `safraId` opcional para filtrar por safra.

**Componente `SiloEstoqueVisual`**: Usa o componente `Progress` existente com classes CSS dinamicas para cor da barra. Calcula percentual como `(estoque / capacidade) * 100`, tratando capacidade nula como 0%.

**Formatacao**: Valores em kg formatados com `toLocaleString('pt-BR')`, sacas calculadas como `kg / 60`.
