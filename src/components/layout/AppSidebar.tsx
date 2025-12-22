import { useState, useEffect } from "react";
import { useLocation, Link } from "react-router-dom";
import {
  Building2,
  Leaf,
  Calendar,
  Users,
  Map,
  LayoutDashboard,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
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
  LucideIcon,
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface MenuItem {
  title: string;
  icon: LucideIcon;
  path: string;
  color: string;
}

interface MenuGroup {
  title: string;
  items: MenuItem[];
}

const menuGroups: MenuGroup[] = [
  {
    title: "Principal",
    items: [
      { title: "Dashboard", icon: LayoutDashboard, path: "/", color: "text-primary" },
    ],
  },
  {
    title: "Produção",
    items: [
      { title: "Granjas", icon: Building2, path: "/granjas", color: "text-info" },
      { title: "Culturas", icon: Leaf, path: "/culturas", color: "text-success" },
      { title: "Safras", icon: Calendar, path: "/safras", color: "text-warning" },
      { title: "Produtores", icon: Users, path: "/produtores", color: "text-accent" },
      { title: "Lavouras", icon: Map, path: "/lavouras", color: "text-chart-5" },
      { title: "Controle Lavoura", icon: Wheat, path: "/controle-lavoura", color: "text-lime-600" },
    ],
  },
  {
    title: "Comercial",
    items: [
      { title: "Clientes/Forn.", icon: Users, path: "/clientes-fornecedores", color: "text-info" },
      { title: "Vendas Produção", icon: ShoppingCart, path: "/vendas-producao", color: "text-green-600" },
      { title: "Notas Fiscais", icon: Receipt, path: "/notas-fiscais", color: "text-rose-500" },
    ],
  },
  {
    title: "Cadastros",
    items: [
      { title: "Produtos", icon: Package, path: "/produtos", color: "text-amber-500" },
      { title: "Grupos Produtos", icon: FolderOpen, path: "/grupos-produtos", color: "text-violet-500" },
      { title: "Unidades", icon: Ruler, path: "/unidades-medida", color: "text-sky-500" },
      { title: "Silos", icon: Warehouse, path: "/silos", color: "text-emerald-500" },
      { title: "Placas", icon: Truck, path: "/placas", color: "text-orange-500" },
      { title: "Tab. Umidades", icon: Droplets, path: "/tabela-umidades", color: "text-cyan-500" },
    ],
  },
  {
    title: "Fiscal",
    items: [
      { title: "NCM", icon: FileText, path: "/ncm", color: "text-slate-500" },
      { title: "CFOPs", icon: FileText, path: "/cfops", color: "text-indigo-500" },
      { title: "Emitentes NF-e", icon: Building2, path: "/emitentes-nfe", color: "text-teal-500" },
      { title: "Transportadoras", icon: Truck, path: "/transportadoras", color: "text-purple-500" },
    ],
  },
];

const roleLabels: Record<string, string> = {
  admin: "Administrador",
  operador: "Operador",
  visualizador: "Visualizador",
};

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { profile, role, isAdmin, isSuperAdmin, signOut } = useAuth();

  // Função para verificar se um grupo contém a rota ativa
  const isGroupActive = (items: MenuItem[]) =>
    items.some((item) => location.pathname === item.path);

  // Estado para controlar grupos expandidos
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    menuGroups.forEach((group) => {
      initial[group.title] = isGroupActive(group.items);
    });
    // Administração
    initial["Administração"] = ["/usuarios", "/tenants"].includes(location.pathname);
    return initial;
  });

  // Atualiza grupos expandidos quando a rota muda
  useEffect(() => {
    setExpandedGroups((prev) => {
      const updated = { ...prev };
      menuGroups.forEach((group) => {
        if (isGroupActive(group.items)) {
          updated[group.title] = true;
        }
      });
      if (["/usuarios", "/tenants"].includes(location.pathname)) {
        updated["Administração"] = true;
      }
      return updated;
    });
  }, [location.pathname]);

  const toggleGroup = (groupTitle: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupTitle]: !prev[groupTitle],
    }));
  };

  const renderMenuItem = (item: MenuItem, isActive: boolean) => {
    const Icon = item.icon;
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <Link
            to={item.path}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
              "hover:bg-sidebar-accent",
              isActive
                ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md"
                : "text-sidebar-foreground"
            )}
          >
            <Icon
              className={cn(
                "h-5 w-5 flex-shrink-0",
                isActive ? "text-sidebar-primary-foreground" : item.color
              )}
            />
            {!collapsed && (
              <span className="font-medium">{item.title}</span>
            )}
          </Link>
        </TooltipTrigger>
        {collapsed && (
          <TooltipContent side="right" className="bg-popover">
            {item.title}
          </TooltipContent>
        )}
      </Tooltip>
    );
  };

  return (
    <aside
      className={cn(
        "relative flex flex-col h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Floating Toggle Button - Always Visible */}
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCollapsed(!collapsed)}
            className={cn(
              "absolute -right-3 top-20 z-50",
              "h-6 w-6 rounded-full",
              "bg-background border-2 border-border shadow-lg",
              "hover:bg-primary hover:text-primary-foreground hover:border-primary",
              "transition-all duration-200"
            )}
          >
            {collapsed ? (
              <ChevronRight className="h-3 w-3" />
            ) : (
              <ChevronLeft className="h-3 w-3" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right">
          {collapsed ? "Expandir menu" : "Recolher menu"}
        </TooltipContent>
      </Tooltip>

      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-sidebar-primary/20">
              <Wheat className="h-6 w-6 text-sidebar-primary" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-sidebar-foreground">AgroGestão</h1>
              <p className="text-xs text-sidebar-foreground/60">Sistema Agrícola</p>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="mx-auto p-2 rounded-xl bg-sidebar-primary/20">
            <Wheat className="h-6 w-6 text-sidebar-primary" />
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 overflow-y-auto">
        <div className="space-y-1 px-2">
          {menuGroups.map((group, groupIndex) => (
            <div key={group.title}>
              {collapsed ? (
                <>
                  {groupIndex > 0 && (
                    <div className="my-2 border-t border-sidebar-border" />
                  )}
                  <ul className="space-y-1">
                    {group.items.map((item) => {
                      const isActive = location.pathname === item.path;
                      return (
                        <li key={item.path}>
                          {renderMenuItem(item, isActive)}
                        </li>
                      );
                    })}
                  </ul>
                </>
              ) : (
                <Collapsible
                  open={expandedGroups[group.title]}
                  onOpenChange={() => toggleGroup(group.title)}
                >
                  <CollapsibleTrigger className="flex items-center justify-between w-full px-3 py-2 hover:bg-sidebar-accent rounded-lg transition-colors cursor-pointer">
                    <span className="text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider">
                      {group.title}
                    </span>
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 text-sidebar-foreground/50 transition-transform duration-200",
                        expandedGroups[group.title] && "rotate-180"
                      )}
                    />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
                    <ul className="space-y-1 mt-1">
                      {group.items.map((item) => {
                        const isActive = location.pathname === item.path;
                        return (
                          <li key={item.path}>
                            {renderMenuItem(item, isActive)}
                          </li>
                        );
                      })}
                    </ul>
                  </CollapsibleContent>
                </Collapsible>
              )}
            </div>
          ))}

          {/* Administração - Conditional Items */}
          {(isAdmin || isSuperAdmin) && (
            <div>
              {collapsed ? (
                <>
                  <div className="my-2 border-t border-sidebar-border" />
                  <ul className="space-y-1">
                    {isAdmin && (
                      <li>
                        <Tooltip delayDuration={0}>
                          <TooltipTrigger asChild>
                            <Link
                              to="/usuarios"
                              className={cn(
                                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                                "hover:bg-sidebar-accent",
                                location.pathname === "/usuarios"
                                  ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md"
                                  : "text-sidebar-foreground"
                              )}
                            >
                              <Shield
                                className={cn(
                                  "h-5 w-5 flex-shrink-0",
                                  location.pathname === "/usuarios" ? "text-sidebar-primary-foreground" : "text-destructive"
                                )}
                              />
                            </Link>
                          </TooltipTrigger>
                          <TooltipContent side="right" className="bg-popover">
                            Usuários
                          </TooltipContent>
                        </Tooltip>
                      </li>
                    )}
                    {isSuperAdmin && (
                      <li>
                        <Tooltip delayDuration={0}>
                          <TooltipTrigger asChild>
                            <Link
                              to="/tenants"
                              className={cn(
                                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                                "hover:bg-sidebar-accent",
                                location.pathname === "/tenants"
                                  ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md"
                                  : "text-sidebar-foreground"
                              )}
                            >
                              <Crown
                                className={cn(
                                  "h-5 w-5 flex-shrink-0",
                                  location.pathname === "/tenants" ? "text-sidebar-primary-foreground" : "text-amber-500"
                                )}
                              />
                            </Link>
                          </TooltipTrigger>
                          <TooltipContent side="right" className="bg-popover">
                            Empresas Contratantes
                          </TooltipContent>
                        </Tooltip>
                      </li>
                    )}
                  </ul>
                </>
              ) : (
                <Collapsible
                  open={expandedGroups["Administração"]}
                  onOpenChange={() => toggleGroup("Administração")}
                >
                  <CollapsibleTrigger className="flex items-center justify-between w-full px-3 py-2 hover:bg-sidebar-accent rounded-lg transition-colors cursor-pointer">
                    <span className="text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider">
                      Administração
                    </span>
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 text-sidebar-foreground/50 transition-transform duration-200",
                        expandedGroups["Administração"] && "rotate-180"
                      )}
                    />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
                    <ul className="space-y-1 mt-1">
                      {isAdmin && (
                        <li>
                          <Link
                            to="/usuarios"
                            className={cn(
                              "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                              "hover:bg-sidebar-accent",
                              location.pathname === "/usuarios"
                                ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md"
                                : "text-sidebar-foreground"
                            )}
                          >
                            <Shield
                              className={cn(
                                "h-5 w-5 flex-shrink-0",
                                location.pathname === "/usuarios" ? "text-sidebar-primary-foreground" : "text-destructive"
                              )}
                            />
                            <span className="font-medium">Usuários</span>
                          </Link>
                        </li>
                      )}
                      {isSuperAdmin && (
                        <li>
                          <Link
                            to="/tenants"
                            className={cn(
                              "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                              "hover:bg-sidebar-accent",
                              location.pathname === "/tenants"
                                ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md"
                                : "text-sidebar-foreground"
                            )}
                          >
                            <Crown
                              className={cn(
                                "h-5 w-5 flex-shrink-0",
                                location.pathname === "/tenants" ? "text-sidebar-primary-foreground" : "text-amber-500"
                              )}
                            />
                            <span className="font-medium">Empresas Contratantes</span>
                          </Link>
                        </li>
                      )}
                    </ul>
                  </CollapsibleContent>
                </Collapsible>
              )}
            </div>
          )}
        </div>
      </nav>

      {/* User Menu */}
      <div className="p-2 border-t border-sidebar-border">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className={cn(
                "w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent",
                collapsed && "justify-center"
              )}
            >
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-sidebar-primary/20 flex items-center justify-center">
                  <User className="h-4 w-4 text-sidebar-primary" />
                </div>
                {!collapsed && (
                  <div className="flex flex-col items-start text-left">
                    <span className="text-sm font-medium truncate max-w-[140px]">
                      {profile?.nome || "Usuário"}
                    </span>
                    <span className="text-xs text-sidebar-foreground/60">
                      {role && roleLabels[role]}
                    </span>
                  </div>
                )}
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span>{profile?.nome || "Usuário"}</span>
                <span className="text-xs font-normal text-muted-foreground">
                  {profile?.email}
                </span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <Badge variant="outline" className="mr-2">
                {role && roleLabels[role]}
              </Badge>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={signOut} className="text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}
