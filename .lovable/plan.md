

## Importacao de Dados do Sistema Legado (Access → Excel → AgroGestao)

### Abordagem

Criar uma pagina dedicada de **Importacao de Dados** com um fluxo guiado, tabela por tabela, respeitando a ordem de dependencias. O usuario exporta cada tabela do Access como Excel (.xlsx) e importa no sistema seguindo a sequencia correta.

O projeto ja possui o padrao de importacao Excel funcionando (`ImportarUmidadesDialog` usando a lib `xlsx`). Vamos reutilizar esse mesmo padrao para todas as tabelas.

### Ordem de importacao (dependencias)

```text
1. Granjas           (sem dependencia)
2. Safras            (sem dependencia)
3. Culturas          (sem dependencia - ja importa via umidades)
4. Produtos          (depende de granja)
5. Silos             (depende de granja)
6. Lavouras          (depende de granja)
7. Produtores        (depende de granja)
8. Inscricoes Prod.  (depende de produtor, granja)
9. Placas            (sem dependencia)
10. Transportadoras  (sem dependencia)
11. Clientes/Forn.   (sem dependencia)
12. Colheitas        (depende de inscricao, safra, lavoura, silo, produto, placa)
13. Contratos Venda  (depende de safra, granja, inscricao, comprador, produto)
14. Remessas Venda   (depende de contrato)
15. Transferencias   (depende de inscricao, safra, produto)
16. Devolucoes       (depende de inscricao, safra, produto)
17. Notas Deposito   (depende de inscricao, safra, produto)
```

### Implementacao

#### 1. Nova pagina: `src/pages/ImportarDados.tsx`
- Wizard com lista de tabelas na ordem correta
- Cada tabela mostra status: pendente, importada, com erros
- Botao "Importar" por tabela abre dialog especifico
- Indicador visual de progresso geral

#### 2. Componente generico: `src/components/importacao/ImportacaoDialog.tsx`
Dialog reutilizavel que recebe:
- Nome da tabela destino
- Mapeamento de colunas (nome Access → nome Supabase)
- Funcao de transformacao/validacao
- Funcao de resolucao de referencias (ex: buscar granja_id pelo codigo)

Funcionalidades:
- Upload do Excel
- Preview dos primeiros 10 registros
- Mapeamento automatico de colunas (com fallback manual)
- Validacao pre-importacao (campos obrigatorios, referencias)
- Importacao em lotes de 100
- Relatorio de erros/sucesso

#### 3. Configuracoes por tabela: `src/lib/importacaoConfig.ts`
Arquivo com a configuracao de cada tabela:
- Mapeamento de colunas Access → banco
- Campos obrigatorios
- Transformacoes (ex: converter "S"/"N" para boolean)
- Resolucao de chaves estrangeiras (ex: buscar granja por codigo)
- Opcao de limpar dados existentes

#### 4. Atualizacoes
- `src/App.tsx`: rota `/importar-dados`
- `src/components/layout/AppSidebar.tsx`: item "Importar Dados" no menu (grupo Administracao)

### Fluxo do usuario

1. Exporta tabelas do Access como .xlsx (uma por tabela)
2. Acessa pagina "Importar Dados"
3. Segue a ordem sugerida (granjas primeiro, colheitas depois)
4. Para cada tabela: upload Excel → preview → confirma → importa
5. Sistema resolve codigos legados para UUIDs automaticamente (busca por codigo/nome)
6. Ao final, relatorio de importacao completo

### Secao Tecnica

**Resolucao de referencias**: O sistema legado usa codigos numericos (ex: granja codigo "01"). Na importacao, o sistema busca o registro pelo codigo e substitui pelo UUID correspondente. Se nao encontrar, marca como erro.

**Transformacoes comuns**:
- "S"/"N" ou "Sim"/"Nao" → `true`/`false`
- Datas Access (serial number) → ISO date
- Valores monetarios com virgula → numerico
- Campos vazios → `null`

**Batch insert**: Insercoes em lotes de 100 registros para evitar timeout. Progress bar visual durante importacao.

### Arquivos a criar
- `src/pages/ImportarDados.tsx` (pagina wizard)
- `src/components/importacao/ImportacaoDialog.tsx` (dialog generico)
- `src/lib/importacaoConfig.ts` (configuracoes por tabela)

### Arquivos a modificar
- `src/App.tsx` (nova rota)
- `src/components/layout/AppSidebar.tsx` (novo item menu)

