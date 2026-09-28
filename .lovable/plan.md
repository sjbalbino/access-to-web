# Seletor de Titular do DFe: só nome do sócio + CPF

## O que muda
Hoje o seletor lista cada inscrição (MARCIO GRINGS - BOA VISTA DO INCRA, - MINAS DO LEAO, ...), repetindo o mesmo CPF 7 vezes. Passará a mostrar **uma única linha por sócio**: `MARCIO GRINGS — 926.005.570-91`.

## Como
- Agrupar as inscrições emissoras por CPF/CNPJ (somente dígitos).
- Nome exibido: nome do produtor/sócio (cadastro principal); se indisponível, o nome da inscrição sem o sufixo após " - ".
- Para cada sócio, usar internamente uma inscrição representante (a que tiver mais notas / a primeira com emitente configurado) para sincronizar e manifestar — a lista de notas já é carregada por todas as inscrições do mesmo CPF.
- Ao abrir, se a inscrição pré-selecionada pertencer a um sócio, selecionar esse sócio.
- Remover a linha "Granja vinculada" do texto de apoio; manter o aviso de que traz notas de todas as granjas do CPF.

## Técnico
- `MdeDialog.tsx`: `useMemo` gerando `titulares = [{ key: cpfDigits, nome, cpf, inscricaoId }]`; `Select` usa `inscricaoId` do representante como value.
- Sem mudanças no banco.
