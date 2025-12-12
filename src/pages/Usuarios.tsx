import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Users, Shield, ShieldCheck, Eye, UserPlus, Search } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

type AppRole = "admin" | "operador" | "visualizador";

interface UserWithRole {
  id: string;
  nome: string | null;
  email: string | null;
  ativo: boolean | null;
  created_at: string;
  role: AppRole;
}

const roleLabels: Record<AppRole, string> = {
  admin: "Administrador",
  operador: "Operador",
  visualizador: "Visualizador",
};

const roleColors: Record<AppRole, string> = {
  admin: "bg-red-100 text-red-800 border-red-200",
  operador: "bg-blue-100 text-blue-800 border-blue-200",
  visualizador: "bg-gray-100 text-gray-800 border-gray-200",
};

const roleIcons: Record<AppRole, React.ReactNode> = {
  admin: <ShieldCheck className="h-3 w-3" />,
  operador: <Shield className="h-3 w-3" />,
  visualizador: <Eye className="h-3 w-3" />,
};

export default function Usuarios() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();
  const [search, setSearch] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserWithRole | null>(null);

  // Fetch users with roles
  const { data: users, isLoading } = useQuery({
    queryKey: ["users-with-roles"],
    queryFn: async () => {
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("*");

      if (rolesError) throw rolesError;

      const usersWithRoles: UserWithRole[] = profiles.map((profile) => {
        const userRole = roles.find((r) => r.user_id === profile.id);
        return {
          ...profile,
          role: (userRole?.role as AppRole) || "visualizador",
        };
      });

      return usersWithRoles;
    },
  });

  // Update role mutation
  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, newRole }: { userId: string; newRole: AppRole }) => {
      // First check if role exists
      const { data: existingRole } = await supabase
        .from("user_roles")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (existingRole) {
        // Update existing role
        const { error } = await supabase
          .from("user_roles")
          .update({ role: newRole })
          .eq("user_id", userId);
        if (error) throw error;
      } else {
        // Insert new role
        const { error } = await supabase
          .from("user_roles")
          .insert({ user_id: userId, role: newRole });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users-with-roles"] });
      toast({
        title: "Sucesso",
        description: "Nível de acesso atualizado com sucesso!",
      });
      setEditingUser(null);
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Erro ao atualizar nível de acesso: " + error.message,
        variant: "destructive",
      });
    },
  });

  // Toggle active mutation
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ userId, ativo }: { userId: string; ativo: boolean }) => {
      const { error } = await supabase
        .from("profiles")
        .update({ ativo })
        .eq("id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users-with-roles"] });
      toast({
        title: "Sucesso",
        description: "Status do usuário atualizado!",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Erro ao atualizar status: " + error.message,
        variant: "destructive",
      });
    },
  });

  const filteredUsers = users?.filter(
    (user) =>
      user.nome?.toLowerCase().includes(search.toLowerCase()) ||
      user.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AppLayout>
      <PageHeader
        title="Gerenciamento de Usuários"
        description="Gerencie os usuários e seus níveis de acesso ao sistema"
        icon={<Users className="h-8 w-8" />}
      />

      <div className="flex flex-col sm:flex-row gap-4 mb-6 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar usuários..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Role Legend */}
      <div className="flex flex-wrap gap-4 mb-6 p-4 bg-muted/50 rounded-lg">
        <div className="text-sm font-medium text-muted-foreground">Níveis de Acesso:</div>
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Badge className={roleColors.admin}>
              {roleIcons.admin}
              <span className="ml-1">Administrador</span>
            </Badge>
            <span className="text-xs text-muted-foreground">Acesso total</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={roleColors.operador}>
              {roleIcons.operador}
              <span className="ml-1">Operador</span>
            </Badge>
            <span className="text-xs text-muted-foreground">Criar/Editar/Excluir</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={roleColors.visualizador}>
              {roleIcons.visualizador}
              <span className="ml-1">Visualizador</span>
            </Badge>
            <span className="text-xs text-muted-foreground">Somente leitura</span>
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Nível de Acesso</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  Carregando usuários...
                </TableCell>
              </TableRow>
            ) : filteredUsers?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  Nenhum usuário encontrado
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers?.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.nome || "-"}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Badge className={roleColors[user.role]}>
                      {roleIcons[user.role]}
                      <span className="ml-1">{roleLabels[user.role]}</span>
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.ativo ? "default" : "secondary"}>
                      {user.ativo ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingUser(user)}
                        disabled={user.id === currentUser?.id}
                      >
                        Alterar Nível
                      </Button>
                      <Button
                        variant={user.ativo ? "destructive" : "default"}
                        size="sm"
                        onClick={() =>
                          toggleActiveMutation.mutate({
                            userId: user.id,
                            ativo: !user.ativo,
                          })
                        }
                        disabled={user.id === currentUser?.id}
                      >
                        {user.ativo ? "Desativar" : "Ativar"}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Edit Role Dialog */}
      <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar Nível de Acesso</DialogTitle>
            <DialogDescription>
              Altere o nível de acesso do usuário {editingUser?.nome || editingUser?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Novo Nível de Acesso</Label>
              <Select
                value={editingUser?.role}
                onValueChange={(value: AppRole) => {
                  if (editingUser) {
                    updateRoleMutation.mutate({
                      userId: editingUser.id,
                      newRole: value,
                    });
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-red-600" />
                      Administrador
                    </div>
                  </SelectItem>
                  <SelectItem value="operador">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-blue-600" />
                      Operador
                    </div>
                  </SelectItem>
                  <SelectItem value="visualizador">
                    <div className="flex items-center gap-2">
                      <Eye className="h-4 w-4 text-gray-600" />
                      Visualizador
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUser(null)}>
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
