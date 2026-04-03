

## Plano: Atualizar Inscrições Estaduais sem granja

### Problema
562 de 563 inscrições estaduais estão sem o campo `granja_id` preenchido.

### Solução
Executar um UPDATE via insert tool para definir `granja_id` da única granja cadastrada (`9ee8bf67-f322-4415-9dfc-2ab123ecffaa` - AGROPECUARIA GRINGS) em todas as inscrições que estejam com `granja_id IS NULL`.

```sql
UPDATE inscricoes_produtor 
SET granja_id = '9ee8bf67-f322-4415-9dfc-2ab123ecffaa' 
WHERE granja_id IS NULL;
```

### Impacto
- 562 registros atualizados
- Nenhuma alteração de código necessária

