import { useState } from "react";
import { useLocation, Link } from "react-router-dom";
import {
  Building2,
  Leaf,
  Calendar,
  Users,
  Map,
  LayoutDashboard,
  Settings,
  ChevronLeft,
  ChevronRight,
  Wheat,
  Menu,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

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
        </ul>
      </nav>

      {/* Footer */}
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