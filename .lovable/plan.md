

## Plano: Adicionar campo Ativa/Inativa no formulário de Granja

### Problema
O formulário de cadastro/edição de granjas não possui o campo para alterar o status (ativa/inativa). Também é necessário corrigir a granja existente que está com `ativa = false`.

### Solução

**1. Migração SQL** — Ativar granjas existentes:
```sql
UPDATE granjas SET ativa = true WHERE ativa = false;
```

**2. Código** (`src/pages/Granjas.tsx`) — Adicionar um `Switch` no formulário, após o campo E-mail (antes dos botões), com label "Ativa":
```typescript
<div className="flex items-center gap-2 md:col-span-2">
  <Switch
    checked={formData.ativa ?? true}
    onCheckedChange={(checked) => setFormData({ ...formData, ativa: checked })}
  />
  <Label>Granja Ativa</Label>
</div>
```

Importar o componente `Switch` de `@/components/ui/switch`.

### Arquivos alterados
- `src/pages/Granjas.tsx` (adicionar Switch + import)
- Nova migração SQL para corrigir dados existentes

