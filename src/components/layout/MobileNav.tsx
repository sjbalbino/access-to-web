import { Link, useLocation } from "react-router-dom";
import {
  Building2,
  Leaf,
  Calendar,
  Users,
  Map,
  LayoutDashboard,
  Wheat,
  LogOut,
  User,
  Shield,
  Package,
  FolderOpen,
  Ruler,
  Warehouse,
  Truck,
  Droplets,
  Crown,
  FileText,
  Receipt,
  ShoppingCart,
  Menu,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useState } from "react";

const menuItems = [
  { title: "Dashboard", icon: LayoutDashboard, path: "/", color: "text-primary" },
  { title: "Granjas", icon: Building2, path: "/granjas", color: "text-info" },
  { title: "Culturas", icon: Leaf, path: "/culturas", color: "text-success" },
  { title: "Safras", icon: Calendar, path: "/safras", color: "text-warning" },
  { title: "Produtores", icon: Users, path: "/produtores", color: "text-accent" },
  { title: "Lavouras", icon: Map, path: "/lavouras", color: "text-chart-5" },
  { title: "Controle Lavoura", icon: Wheat, path: "/controle-lavoura", color: "text-lime-600" },
  { title: "Clientes/Forn.", icon: Users, path: "/clientes-fornecedores", color: "text-info" },
  { title: "Produtos", icon: Package, path: "/produtos", color: "text-amber-500" },
  { title: "Grupos Produtos", icon: FolderOpen, path: "/grupos-produtos", color: "text-violet-500" },
  { title: "Unidades", icon: Ruler, path: "/unidades-medida", color: "text-sky-500" },
  { title: "Silos", icon: Warehouse, path: "/silos", color: "text-emerald-500" },
  { title: "Placas", icon: Truck, path: "/placas", color: "text-orange-500" },
  { title: "Tab. Umidades", icon: Droplets, path: "/tabela-umidades", color: "text-cyan-500" },
  { title: "NCM", icon: FileText, path: "/ncm", color: "text-slate-500" },
  { title: "CFOPs", icon: FileText, path: "/cfops", color: "text-indigo-500" },
  { title: "Emitentes NF-e", icon: Building2, path: "/emitentes-nfe", color: "text-teal-500" },
  { title: "Transportadoras", icon: Truck, path: "/transportadoras", color: "text-purple-500" },
  { title: "Notas Fiscais", icon: Receipt, path: "/notas-fiscais", color: "text-rose-500" },
  { title: "Vendas Produção", icon: ShoppingCart, path: "/vendas-producao", color: "text-green-600" },
];

const roleLabels: Record<string, string> = {
  admin: "Administrador",
  operador: "Operador",
  visualizador: "Visualizador",
};

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const { profile, role, isAdmin, isSuperAdmin, signOut } = useAuth();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-6 w-6" />
          <span className="sr-only">Abrir menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 p-0">
        <SheetHeader className="p-4 border-b border-border">
          <SheetTitle className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-primary/20">
              <Wheat className="h-6 w-6 text-primary" />
            </div>
            <div className="text-left">
              <h1 className="text-lg font-bold">AgroGestão</h1>
              <p className="text-xs text-muted-foreground">Sistema Agrícola</p>
            </div>
          </SheetTitle>
        </SheetHeader>

        {/* Navigation */}
        <nav className="flex-1 py-4 overflow-y-auto max-h-[calc(100vh-180px)]">
          <ul className="space-y-1 px-2">
            {menuItems.map((item) => {
              const isActive = location.pathname === item.path;
              const Icon = item.icon;

              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                      "hover:bg-accent",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-md"
                        : "text-foreground"
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-5 w-5 flex-shrink-0",
                        isActive ? "text-primary-foreground" : item.color
                      )}
                    />
                    <span className="font-medium">{item.title}</span>
                  </Link>
                </li>
              );
            })}

            {/* Users Management - Admin Only */}
            {isAdmin && (
              <li>
                <Link
                  to="/usuarios"
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                    "hover:bg-accent",
                    location.pathname === "/usuarios"
                      ? "bg-primary text-primary-foreground shadow-md"
                      : "text-foreground"
                  )}
                >
                  <Shield
                    className={cn(
                      "h-5 w-5 flex-shrink-0",
                      location.pathname === "/usuarios" ? "text-primary-foreground" : "text-destructive"
                    )}
                  />
                  <span className="font-medium">Usuários</span>
                </Link>
              </li>
            )}

            {/* Tenants Management - Super Admin Only */}
            {isSuperAdmin && (
              <li>
                <Link
                  to="/tenants"
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                    "hover:bg-accent",
                    location.pathname === "/tenants"
                      ? "bg-primary text-primary-foreground shadow-md"
                      : "text-foreground"
                  )}
                >
                  <Crown
                    className={cn(
                      "h-5 w-5 flex-shrink-0",
                      location.pathname === "/tenants" ? "text-primary-foreground" : "text-amber-500"
                    )}
                  />
                  <span className="font-medium">Empresas Contratantes</span>
                </Link>
              </li>
            )}
          </ul>
        </nav>

        {/* User Info */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border bg-background">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
                <User className="h-4 w-4 text-primary" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium truncate max-w-[140px]">
                  {profile?.nome || "Usuário"}
                </span>
                <Badge variant="outline" className="text-xs w-fit">
                  {role && roleLabels[role]}
                </Badge>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={signOut}>
              <LogOut className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
