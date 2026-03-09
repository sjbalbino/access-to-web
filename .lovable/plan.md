

## Sistema de Abas para Navegação de Páginas

Implementar um sistema de abas (tabs) no topo da área de conteúdo, similar a abas de navegador, onde cada página aberta vira uma aba que pode ser alternada ou fechada.

### Arquitetura

```text
┌──────────┬──────────────────────────────────┐
│          │  [Dashboard] [Granjas] [Safras] X │  ← Tab bar
│ Sidebar  │──────────────────────────────────│
│          │                                   │
│          │   Conteúdo da aba ativa           │
│          │                                   │
└──────────┴──────────────────────────────────┘
```

### Implementação

1. **Criar contexto `TabsContext`** (`src/contexts/TabsContext.tsx`)
   - Estado: lista de abas abertas `{ path, title, icon }[]` e aba ativa
   - Funções: `openTab(path)`, `closeTab(path)`, `setActiveTab(path)`
   - Ao clicar no sidebar, abre nova aba (ou ativa existente)
   - Aba Dashboard sempre presente e não pode ser fechada
   - Persistir abas abertas em `localStorage`

2. **Criar componente `TabBar`** (`src/components/layout/TabBar.tsx`)
   - Barra horizontal com abas, cada uma mostrando ícone + título + botão fechar (X)
   - Aba ativa destacada visualmente
   - Scroll horizontal se muitas abas
   - Fechar aba com clique no X ou middle-click

3. **Modificar `AppLayout.tsx`**
   - Inserir `TabBar` acima do conteúdo principal
   - O conteúdo exibido depende da aba ativa

4. **Modificar navegação no `AppSidebar.tsx` e `MobileNav.tsx`**
   - Ao clicar em item do menu, chamar `openTab()` do contexto em vez de navegação direta
   - A navegação de rota (`useNavigate`) ainda ocorre para manter URL sincronizada

5. **Modificar `App.tsx`**
   - Envolver rotas com `TabsProvider`
   - Manter rotas existentes (URLs continuam funcionando)

### Mapeamento de rotas para títulos/ícones
Reutilizar o array `menuGroups` existente no sidebar para mapear `path → { title, icon }`.

### Arquivos a criar
- `src/contexts/TabsContext.tsx`
- `src/components/layout/TabBar.tsx`

### Arquivos a modificar
- `src/components/layout/AppLayout.tsx` — adicionar TabBar
- `src/components/layout/AppSidebar.tsx` — usar openTab ao clicar
- `src/components/layout/MobileNav.tsx` — usar openTab ao clicar
- `src/App.tsx` — envolver com TabsProvider

