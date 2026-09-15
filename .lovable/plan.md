# Preencher CPF/CNPJ dos produtores da AGROPECUARIA GRINGS a partir das inscrições estaduais

## O que foi encontrado

Na empresa AGROPECUARIA GRINGS existem **336 produtores** sem CPF/CNPJ no cadastro principal, mas que possuem esse número informado em alguma inscrição estadual.

Divisão dos casos:

- **330 produtores** têm um único número nas inscrições, com tamanho válido (11 dígitos de CPF ou 14 de CNPJ). São preenchidos automaticamente.
- **2 produtores** têm número claramente fictício (todos os dígitos iguais): ADAIR TOLEDO CRECA (11111111111) e "anderson e marcio 2020" (88888888888). Não serão preenchidos.
- **4 produtores** têm números diferentes entre suas inscrições, então não é possível decidir sozinho qual é o do produtor:
  - LAIR BEHNEN (2 números)
  - RUI ANTONIO DE MELLO ALMEIDA (5 números)
  - SERGIO LUIZ VALERIO ANTONELLO (2 números)
  - VARLEI BEHNEN (2 números)

## O que será feito

1. Preencher o CPF/CNPJ no cadastro principal dos produtores com número único e válido, copiando o valor da inscrição estadual (mantendo o formato já usado no cadastro).
2. Ajustar também o tipo de pessoa quando estiver vazio: física para 11 dígitos, jurídica para 14.
3. Não alterar nada dos produtores com números fictícios nem dos 4 com números divergentes — esses ficam para revisão manual.
4. Conferir depois da atualização quantos produtores continuam sem CPF/CNPJ e apresentar a lista dos casos pendentes.

Nenhuma tela ou regra do sistema é alterada; a mudança é apenas nos dados dos produtores dessa empresa.

## Detalhes técnicos

- Alvo: `produtores` cujo `granja_id` pertence a granjas do tenant `AGROPECUARIA GRINGS`, com `cpf_cnpj` nulo/vazio.
- Origem: `inscricoes_produtor.cpf_cnpj` (somente dígitos via `regexp_replace`), agrupado por `produtor_id`, exigindo `count(distinct ...) = 1`, tamanho em (11, 14) e descartando padrões de dígito repetido (`^(\d)\1+$`).
- Gravação formatada no padrão brasileiro (CPF `000.000.000-00`, CNPJ `00.000.000/0000-00`), coerente com o restante do cadastro.
- `tipo_pessoa` só é definido quando estiver nulo/vazio, sem sobrescrever valores existentes.
- Execução via comando de atualização de dados (não é mudança de estrutura), seguida de consulta de verificação.
