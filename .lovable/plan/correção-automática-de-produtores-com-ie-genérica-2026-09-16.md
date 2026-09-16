# Correção automática de produtores com IE genérica

Hoje cada ajuste depende de eu ler os PDFs e corrigir os lançamentos um por um. A ideia é levar exatamente esse fluxo para dentro do Sisagro: você anexa o extrato e o resumo em PDF do produtor, o sistema entende o que está no legado, encontra os lançamentos correspondentes no sistema atual e mostra a correção pronta para você aprovar.

## Como vai funcionar

Nova tela em Produtores: **Conferência de Produtores (IE genérica)**.

1. Escolha o produtor que deve receber os lançamentos.
2. Anexe o extrato detalhado e, se quiser, o resumo (PDF, os mesmos arquivos que você me manda hoje).
3. O sistema lê os PDFs e monta a lista de movimentos do legado: data, tipo (depósito, devolução, transferência de entrada/saída), produto, safra, quilos e saldo por safra.
4. Para cada movimento, o sistema procura no banco o lançamento equivalente (mesma data, quilos, produto e safra), independente de qual cadastro está com ele hoje, e mostra:
   - **Encontrado e no produtor errado** — correção sugerida, marcada para aplicar.
   - **Já está correto** — nada a fazer.
   - **Não encontrado** ou **mais de um candidato** — fica para você escolher na tela.
5. Lançamentos com NF-e autorizada aparecem bloqueados, seguindo a política fiscal.
6. Antes e depois de aplicar, a tela mostra o saldo por safra do produtor comparado ao saldo do legado, com sinal verde quando bate.
7. Ao aplicar, tudo é registrado em um histórico com data, usuário, valor anterior e novo — com botão **Desfazer** por correção ou por lote inteiro.

Alcance dos lançamentos: transferências de depósito, devoluções de depósito e depósitos (colheitas). Nada é excluído — apenas o vínculo de inscrição muda.

## Detalhes técnicos

- **Leitura do PDF:** extração de texto no navegador com o pdf.js já presente no projeto (usado em `PdfViewer`), sem subir arquivo para storage.
- **Interpretação:** nova Edge Function `interpretar-extrato-legado` recebe o texto extraído e devolve JSON estruturado (movimentos + resumo por safra) usando Lovable AI, com validação por zod. Fallback: parser por expressão regular do layout atual do relatório legado.
- **Casamento dos lançamentos:** novo hook `useConferenciaIeGenerica.ts` consulta `transferencias_deposito` (origem e destino), `devolucoes_deposito` e `colheitas` filtrando por data (±3 dias), produto equivalente (`src/lib/produtoSaldo.ts`) e quantidade em kg com tolerância de 1 kg; classifica cada movimento em exato / múltiplo / ausente.
- **Aplicação:** updates apenas nas colunas de inscrição (`inscricao_destino_id`, `inscricao_origem_id`, `inscricao_produtor_id`), em lote, com invalidação das queries de saldo já usadas hoje.
- **Histórico:** nova tabela `reatribuicoes_inscricao_log` (tenant_id, lote_id, tabela, registro_id, campo, valor_anterior, valor_novo, usuario_id, created_at) com RLS por tenant e GRANT para `authenticated`/`service_role`; desfazer reaplica `valor_anterior`.
- **Reuso:** o diálogo atual `ReatribuirInscricaoDialog` continua disponível para ajustes manuais pontuais e passa a gravar no mesmo histórico.

## Fora do escopo

Compras de cereais, contratos e remessas de venda não entram nesta tela.
