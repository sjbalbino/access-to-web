import { useState } from "react";
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
  Wheat,
  LogOut,
  User,
  Shield,
} from "lucide-react";
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

const menuItems = [
  {
    title: "Dashboard",
    icon: LayoutDashboard,
    path: "/",
    color: "text-primary",
  },
  {
    title: "Empresas",
    icon: Building2,
    path: "/empresas",
    color: "text-info",
  },
  {
    title: "Culturas",
    icon: Leaf,
    path: "/culturas",
    color: "text-success",
  },
  {
    title: "Safras",
    icon: Calendar,
    path: "/safras",
    color: "text-warning",
  },
  {
    title: "Produtores",
    icon: Users,
    path: "/produtores",
    color: "text-accent",
  },
  {
    title: "Lavouras",
    icon: Map,
    path: "/lavouras",
    color: "text-chart-5",
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
  const { profile, role, isAdmin, signOut } = useAuth();

  return (
    <aside
      className={cn(
        "flex flex-col h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
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
        <ul className="space-y-1 px-2">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;

            return (
              <li key={item.path}>
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
              </li>
            );
          })}

          {/* Users Management - Admin Only */}
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
                    {!collapsed && (
                      <span className="font-medium">Usuários</span>
                    )}
                  </Link>
                </TooltipTrigger>
                {collapsed && (
                  <TooltipContent side="right" className="bg-popover">
                    Usuários
                  </TooltipContent>
                )}
              </Tooltip>
            </li>
          )}
        </ul>
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

      {/* Collapse Button */}
      <div className="p-2 border-t border-sidebar-border">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(!collapsed)}
          className="w-full justify-center text-sidebar-foreground hover:bg-sidebar-accent"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4 mr-2" />
              <span>Recolher</span>
            </>
          )}
        </Button>
      </div>
    </aside>
  );
}
