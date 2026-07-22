## Objetivo
Aplicar o favicon de folha verde já usado no sisagro.app e corrigir metadados do <head> para que o Google exiba o ícone correto nos resultados de busca.

## Diagnóstico atual
- `public/favicon.png` e `public/favicon.ico` já contêm a folha verde, idênticos aos arquivos publicados em sisagro.app.
- Porém `public/favicon.png` está salvo como JPEG apesar da extensão `.png`, o que pode confundir crawlers/navegadores.
- `index.html` ainda usa metadados do template Lovable (`og:title="Lovable App"`, `og:description="Lovable Generated Project"`, imagem OG da Lovable), o que reforça a impressão errada no Google.

## Plano de execução

### 1. Corrigir favicon.png
- Converter o arquivo atual para PNG válido 512×512, mantendo a folha verde.
- Substituir `public/favicon.png`.

### 2. Regenerar favicon.ico
- Gerar ícone multi-resolução (16×16, 32×32, 48×48, 180×180, 256×256) a partir do PNG corrigido.
- Substituir `public/favicon.ico`.

### 3. Atualizar metadados em index.html
- `<title>`: manter "AgroGestão" (ou ajustar se necessário).
- `<meta name="description">`: descrição em português do sistema.
- `og:title`, `og:description`: remover referências ao Lovable.
- Remover `og:image` e `twitter:image` do Lovable (deixar vazio para o hosting injetar o preview correto, ou usar imagem própria se fornecida).
- Adicionar:
  - `<link rel="apple-touch-icon" href="/apple-touch-icon.png">`
  - `<link rel="manifest" href="/manifest.json">`
  - `<meta name="theme-color" content="#16a34a">` (verde agrícola)

### 4. Criar manifest.json
- Criar `public/manifest.json` com nome curto, nome completo, ícones, theme_color e background_color.
- Gerar `public/apple-touch-icon.png` (180×180) a partir do favicon.

### 5. Verificar build
- Rodar build/typecheck para garantir que nenhum caminho quebrou.
- Verificar com `file` e `identify` se os novos favicons estão em formatos corretos.

## Resultado esperado
Favicon válido em PNG/ICO, metadados limpos sem referências ao Lovable, e melhores condições para o Google atualizar o ícone nos resultados de busca (embora o cache do Google ainda possa levar dias).