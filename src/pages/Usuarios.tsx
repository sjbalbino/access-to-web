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
import { Users, Shield, ShieldCheck, Eye, UserPlus, Search, Building2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTenants } from "@/hooks/useTenants";

type AppRole = "admin" | "operador" | "visualizador";

interface UserWithRole {
  id: string;
  nome: string | null;
  email: string | null;
  ativo: boolean | null;
  created_at: string;
  role: AppRole;
  tenant_id: string | null;
  tenant_nome?: string | null;
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
  const { user: currentUser, isAdmin, isSuperAdmin, profile } = useAuth();
  const { data: tenants } = useTenants();
  
  const [search, setSearch] = useState("");
  const [editingUser, setEditingUser] = useState<UserWithRole | null>(null);
  const [editingRole, setEditingRole] = useState<AppRole>("operador");
  const [editingTenantId, setEditingTenantId] = useState<string | null>(null);
  
  // Create user dialog state
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserNome, setNewUserNome] = useState("");
  const [newUserRole, setNewUserRole] = useState<AppRole>("operador");
  const [newUserTenantId, setNewUserTenantId] = useState<string | null>(null);

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

      const { data: tenantsData } = await supabase
        .from("tenants")
        .select("id, razao_social, nome_fantasia");

      const usersWithRoles: UserWithRole[] = profiles.map((userProfile) => {
        const userRole = roles.find((r) => r.user_id === userProfile.id);
        const tenant = tenantsData?.find((t) => t.id === userProfile.tenant_id);
        return {
          ...userProfile,
          role: (userRole?.role as AppRole) || "visualizador",
          tenant_nome: tenant?.nome_fantasia || tenant?.razao_social || null,
        };
      });

      return usersWithRoles;
    },
  });

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async (userData: {
      email: string;
      password: string;
      nome: string;
      role: AppRole;
      tenant_id: string | null;
    }) => {
      const { data: session } = await supabase.auth.getSession();
      
      const response = await supabase.functions.invoke("create-user", {
        body: userData,
      });

      if (response.error) {
        throw new Error(response.error.message || "Erro ao criar usuário");
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users-with-roles"] });
      toast({
        title: "Sucesso",
        description: "Usuário criado com sucesso!",
      });
      resetCreateForm();
      setIsCreateDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update role mutation
  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, newRole }: { userId: string; newRole: AppRole }) => {
      const { data: existingRole } = await supabase
        .from("user_roles")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (existingRole) {
        const { error } = await supabase
          .from("user_roles")
          .update({ role: newRole })
          .eq("user_id", userId);
        if (error) throw error;
      } else {
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
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Erro ao atualizar nível de acesso: " + error.message,
        variant: "destructive",
      });
    },
  });

  // Update tenant mutation
  const updateTenantMutation = useMutation({
    mutationFn: async ({ userId, tenantId }: { userId: string; tenantId: string | null }) => {
      const { error } = await supabase
        .from("profiles")
        .update({ tenant_id: tenantId })
        .eq("id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users-with-roles"] });
      toast({
        title: "Sucesso",
        description: "Empresa atualizada com sucesso!",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Erro ao atualizar empresa: " + error.message,
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

  const resetCreateForm = () => {
    setNewUserEmail("");
    setNewUserPassword("");
    setNewUserNome("");
    setNewUserRole("operador");
    setNewUserTenantId(null);
  };

  const handleCreateUser = () => {
    const tenantId = isSuperAdmin ? newUserTenantId : profile?.tenant_id;
    createUserMutation.mutate({
      email: newUserEmail,
      password: newUserPassword,
      nome: newUserNome,
      role: newUserRole,
      tenant_id: tenantId || null,
    });
  };

  const handleEditUser = (user: UserWithRole) => {
    setEditingUser(user);
    setEditingRole(user.role);
    setEditingTenantId(user.tenant_id);
  };

  const handleSaveEdit = () => {
    if (!editingUser) return;

    // Update role if changed
    if (editingRole !== editingUser.role) {
      updateRoleMutation.mutate({ userId: editingUser.id, newRole: editingRole });
    }

    // Update tenant if changed (super admin only)
    if (isSuperAdmin && editingTenantId !== editingUser.tenant_id) {
      updateTenantMutation.mutate({ userId: editingUser.id, tenantId: editingTenantId });
    }

    setEditingUser(null);
  };

  // Filter users based on tenant (non-super admins only see their tenant's users)
  const filteredUsers = users?.filter((user) => {
    const matchesSearch =
      user.nome?.toLowerCase().includes(search.toLowerCase()) ||
      user.email?.toLowerCase().includes(search.toLowerCase());

    // Super admins see all users
    if (isSuperAdmin) return matchesSearch;

    // Regular admins only see users from their tenant
    return matchesSearch && user.tenant_id === profile?.tenant_id;
  });

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
        {isAdmin && (
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Novo Usuário
          </Button>
        )}
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
              {isSuperAdmin && <TableHead>Empresa</TableHead>}
              <TableHead>Nível de Acesso</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={isSuperAdmin ? 6 : 5} className="text-center py-8 text-muted-foreground">
                  Carregando usuários...
                </TableCell>
              </TableRow>
            ) : filteredUsers?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isSuperAdmin ? 6 : 5} className="text-center py-8 text-muted-foreground">
                  Nenhum usuário encontrado
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers?.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.nome || "-"}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  {isSuperAdmin && (
                    <TableCell>
                      {user.tenant_id === null ? (
                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                          <Building2 className="h-3 w-3 mr-1" />
                          Super Admin
                        </Badge>
                      ) : (
                        <span className="text-sm">{user.tenant_nome || "-"}</span>
                      )}
                    </TableCell>
                  )}
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
                        onClick={() => handleEditUser(user)}
                        disabled={user.id === currentUser?.id}
                      >
                        Alterar
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

      {/* Create User Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Usuário</DialogTitle>
            <DialogDescription>
              Crie um novo usuário para o sistema
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome *</Label>
              <Input
                id="nome"
                value={newUserNome}
                onChange={(e) => setNewUserNome(e.target.value)}
                placeholder="Nome completo"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                placeholder="email@exemplo.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha *</Label>
              <Input
                id="password"
                type="password"
                value={newUserPassword}
                onChange={(e) => setNewUserPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
              />
            </div>
            <div className="space-y-2">
              <Label>Nível de Acesso *</Label>
              <Select value={newUserRole} onValueChange={(value: AppRole) => setNewUserRole(value)}>
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
            {isSuperAdmin && (
              <div className="space-y-2">
                <Label>Empresa Contratante</Label>
                <Select
                  value={newUserTenantId || "none"}
                  onValueChange={(value) => setNewUserTenantId(value === "none" ? null : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma empresa" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-amber-600" />
                        Super Admin (sem empresa)
                      </div>
                    </SelectItem>
                    {tenants?.map((tenant) => (
                      <SelectItem key={tenant.id} value={tenant.id}>
                        {tenant.nome_fantasia || tenant.razao_social}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Deixe vazio para criar um Super Admin
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleCreateUser}
              disabled={!newUserEmail || !newUserPassword || !newUserNome || createUserMutation.isPending}
            >
              {createUserMutation.isPending ? "Criando..." : "Criar Usuário"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
            <DialogDescription>
              {editingUser?.nome || editingUser?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nível de Acesso</Label>
              <Select value={editingRole} onValueChange={(value: AppRole) => setEditingRole(value)}>
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
            {isSuperAdmin && (
              <div className="space-y-2">
                <Label>Empresa Contratante</Label>
                <Select
                  value={editingTenantId || "none"}
                  onValueChange={(value) => setEditingTenantId(value === "none" ? null : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma empresa" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-amber-600" />
                        Super Admin (sem empresa)
                      </div>
                    </SelectItem>
                    {tenants?.map((tenant) => (
                      <SelectItem key={tenant.id} value={tenant.id}>
                        {tenant.nome_fantasia || tenant.razao_social}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUser(null)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEdit}>
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
