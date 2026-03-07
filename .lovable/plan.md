

## Limpar Base de Dados (manter apenas Tenants)

A abordagem mais segura é adicionar um botão "Limpar Base" na página de Importação de Dados, que executa DELETEs em cascata respeitando a ordem de dependências (inversa da importação).

### Ordem de exclusão (inversa das dependências)

```text
1. notas_deposito_emitidas
2. compras_cereais (+ notas referenciadas de compra)
3. remessas_venda
4. contratos_venda
5. transferencias_deposito
6. colheitas
7. aplicacoes, plantios, chuvas, floracoes, insetos, plantas_invasoras, analises_solo, pivos
8. controles_lavoura
9. notas_fiscais_itens → notas_fiscais_referenciadas → notas_fiscais
10. estoque_produtos
11. inscricoes_produtor
12. produtores
13. lavouras
14. silos
15. produtos
16. placas, transportadoras, clientes_fornecedores
17. safras, culturas, tabela_umidades, grupos_produtos, unidades_medida
18. granjas
```

Tenants ficam intactos.

### Implementação

1. **Adicionar botão "Limpar Base de Dados"** na página `ImportarDados.tsx` com confirmação dupla (dialog de alerta)
2. **Função de limpeza** que executa DELETE em cada tabela na ordem correta, usando `.neq('id', '00000000-0000-0000-0000-000000000000')` para deletar todos os registros
3. **Filtro por tenant**: Limpar apenas dados do tenant selecionado (granjas com aquele tenant_id e seus dependentes) ou todos os dados
4. **Progress feedback**: Mostrar progresso da limpeza tabela por tabela
5. **Reset dos status** de importação após limpeza

### Arquivos a modificar
- `src/pages/ImportarDados.tsx` — Adicionar botão e lógica de limpeza com dialog de confirmação

