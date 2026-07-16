## Objetivo
Reestruturar o **Relatório de Vendas** (PDF) agrupando os contratos por **Comprador**, com cabeçalho de grupo, rodapé de subtotal por comprador e totalizador geral no final.

## Estrutura proposta do PDF (paisagem)

Cabeçalho do documento (inalterado):
- Título `RELATÓRIO DE VENDAS`
- Linha de filtros (safra/comprador/período conforme já existe)

Para cada **Comprador** (ordenado alfabeticamente):
1. **Cabeçalho do grupo** — linha destacada (fundo cinza claro, negrito) com:
   `COMPRADOR: <Razão Social (Nome Fantasia)> — CPF/CNPJ: <doc>`
2. **Linhas dos contratos** desse comprador (mesmas colunas atuais, sem repetir a coluna Comprador):
   `Nº | Data | Produto | Qtd (kg) | Sacas | Preço/kg | Valor Total | Carreg. (kg) | Carreg. (sc) | Saldo (kg) | Saldo (sc)`
3. **Subtotal do comprador** — linha em negrito, fundo cinza:
   `Subtotal <Comprador> (N contratos)` + somatórios de Qtd, Sacas, Valor Total, Carregado (kg/sc), Saldo (kg/sc). Preço/kg fica em branco.

Ao final, **TOTAL GERAL** (linha em negrito, fundo mais escuro) com os mesmos somatórios de todos os compradores + contagem total de contratos.

## Regras
- Ordenação: compradores A→Z; dentro do grupo, contratos por data desc e depois Nº desc (mesma ordem já usada).
- Compradores sem nome caem em grupo `SEM COMPRADOR` no fim da lista.
- Colunas numéricas (kg, sacas, R$) alinhadas à direita; Data centralizada; textos à esquerda (padrão dos relatórios).
- Sacas = kg / 60 com 1 casa decimal (mesma fórmula atual).
- Nenhuma mudança de filtros nem de dados consultados — apenas reagrupamento da renderização.
- Sem alteração de schema, hooks ou RLS.

## Arquivos alterados
- `src/lib/relatoriosPdf.ts` — refatorar `gerarRelatorioVendasPdf`:
  - Agrupar `contratos` por `comprador_nome` (+ doc) em memória.
  - Gerar `body` intercalando linhas de header de grupo, linhas de contrato, linha de subtotal.
  - Adicionar linha final de TOTAL GERAL.
  - Usar `didParseCell` para estilizar (negrito/fundo) linhas de header de grupo, subtotal e total geral (via índices marcados previamente em um `Set`).
  - Remover a coluna "Comprador" da tabela (agora vira cabeçalho de grupo). Ajustar `columnStyles` e larguras.
- `src/components/relatorios/RelatorioDialog.tsx` — incluir `comprador_nome_fantasia` e `comprador_cpf_cnpj` nos dados enviados para o PDF (para exibir no cabeçalho do grupo). Ajustar tipo `RelContratoVenda` correspondente.

## Detalhes técnicos
- Adicionar em `RelContratoVenda` os campos opcionais `comprador_nome_fantasia?: string | null` e `comprador_cpf_cnpj?: string | null`.
- Chave de agrupamento: `${comprador_id ?? nome}` para evitar colisão entre compradores homônimos; label formatada como `Razão Social (Nome Fantasia)` seguindo o padrão do projeto.
- Manter `downloadPdf` / `desenharCabecalhoBrand` / `desenharRodapeBrand` inalterados.
