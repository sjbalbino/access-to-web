import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useTenants } from "@/hooks/useTenants";
import type { UsuarioPendente } from "@/hooks/useUsuariosPendentes";

type AppRole = "admin" | "operador" | "visualizador" | "gerente";

interface Props {
  usuario: UsuarioPendente | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

export function LiberarUsuarioDialog({ usuario, open, onOpenChange }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isSuperAdmin, profile } = useAuth();
  const { data: tenants } = useTenants();

  const [role, setRole] = useState<AppRole>("operador");
  const [tenantId, setTenantId] = useState<string | "__none__">("__none__");

  useEffect(() => {
    if (usuario) {
      setRole("operador");
      setTenantId(
        isSuperAdmin
          ? (usuario.tenant_id ?? "__none__")
          : (profile?.tenant_id ?? "__none__")
      );
    }
  }, [usuario, isSuperAdmin, profile?.tenant_id]);

  const approveMutation = useMutation({
    mutationFn: async () => {
      if (!usuario) throw new Error("Usuário inválido");
      const finalTenant = tenantId === "__none__" ? null : tenantId;
      const res = await supabase.functions.invoke("approve-user", {
        body: { user_id: usuario.id, tenant_id: finalTenant, role, ativo: true },
      });
      if (res.error) throw new Error(res.error.message);
      if (res.data?.error) throw new Error(res.data.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["usuarios-pendentes"] });
      queryClient.invalidateQueries({ queryKey: ["users-with-roles"] });
      toast({ title: "Acesso liberado", description: "O usuário foi notificado por e-mail." });
      onOpenChange(false);
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const rejectMutation = useMutation({
    mutationFn: async () => {
      if (!usuario) throw new Error("Usuário inválido");
      const res = await supabase.functions.invoke("reject-user", {
        body: { user_id: usuario.id },
      });
      if (res.error) throw new Error(res.error.message);
      if (res.data?.error) throw new Error(res.data.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["usuarios-pendentes"] });
      queryClient.invalidateQueries({ queryKey: ["users-with-roles"] });
      toast({ title: "Cadastro rejeitado", description: "A conta foi removida." });
      onOpenChange(false);
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  if (!usuario) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Liberar acesso</DialogTitle>
          <DialogDescription>
            {usuario.nome || "—"} ({usuario.email})
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Empresa (Tenant)</Label>
            {isSuperAdmin ? (
              <Select value={tenantId} onValueChange={(v) => setTenantId(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Sem empresa (Super Admin)</SelectItem>
                  {tenants?.map((t: any) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.nome_fantasia || t.razao_social}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="text-sm p-2 border rounded bg-muted">
                {tenants?.find((t: any) => t.id === profile?.tenant_id)?.nome_fantasia
                  || tenants?.find((t: any) => t.id === profile?.tenant_id)?.razao_social
                  || "Sua empresa"}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Nível de acesso</Label>
            <Select value={role} onValueChange={(v) => setRole(v as AppRole)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="visualizador">Visualizador</SelectItem>
                <SelectItem value="operador">Operador</SelectItem>
                <SelectItem value="gerente">Gerente</SelectItem>
                <SelectItem value="admin">Administrador</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            variant="destructive"
            onClick={() => rejectMutation.mutate()}
            disabled={rejectMutation.isPending || approveMutation.isPending}
          >
            Rejeitar
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            onClick={() => approveMutation.mutate()}
            disabled={approveMutation.isPending || rejectMutation.isPending}
          >
            {approveMutation.isPending ? "Liberando..." : "Liberar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
