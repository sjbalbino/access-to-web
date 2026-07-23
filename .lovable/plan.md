## Alterar origem da transferência #1241

Existem duas inscrições com IE **472.101.308-5** (CPF 028.014.670-14): uma vinculada a **LAIR BEHNEN** e outra a **LUIS FELIPE BEHNEN**. A transferência #1241 hoje está com origem na inscrição de LAIR BEHNEN.

### Ação
Atualizar apenas o campo `inscricao_origem_id` da transferência #1241 para a inscrição de LUIS FELIPE BEHNEN.

```sql
UPDATE transferencias_deposito
SET inscricao_origem_id = '4a62aef0-cef9-4888-b64c-d7a045d0b3f7'  -- LUIS FELIPE BEHNEN
WHERE id = 'e5aa0334-8b08-460a-88b1-7136f8a11fe7';                 -- transferência #1241
```

Nenhum outro campo é alterado (quantidade, data, destino, produto, safra, local permanecem iguais). O saldo de LAIR BEHNEN deixa de ter essa saída de 11.408 kg e passa a impactar LUIS FELIPE BEHNEN.
