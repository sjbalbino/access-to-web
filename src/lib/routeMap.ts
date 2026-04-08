import {
  Building2,
  Leaf,
  Calendar,
  Users,
  Map,
  DollarSign,
  GitBranch,
  LayoutDashboard,
  Wheat,
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
  ArrowRightLeft,
  BarChart3,
  DatabaseBackup,
  LucideIcon,
} from "lucide-react";

export interface RouteInfo {
  title: string;
  icon: LucideIcon;
  color: string;
}

export const routeMap: Record<string, RouteInfo> = {
  "/": { title: "Dashboard", icon: LayoutDashboard, color: "text-primary" },
  "/granjas": { title: "Granjas", icon: Building2, color: "text-info" },
  "/culturas": { title: "Culturas", icon: Leaf, color: "text-success" },
  "/safras": { title: "Safras", icon: Calendar, color: "text-warning" },
  "/produtores": { title: "Produtores", icon: Users, color: "text-accent" },
  "/lavouras": { title: "Lavouras", icon: Map, color: "text-chart-5" },
  "/controle-lavoura": { title: "Controle Lavoura", icon: Wheat, color: "text-lime-600" },
  "/entrada-colheita": { title: "Entrada Colheita", icon: Truck, color: "text-orange-500" },
  "/clientes-fornecedores": { title: "Clientes/Forn.", icon: Users, color: "text-info" },
  "/vendas-producao": { title: "Vendas Produção", icon: ShoppingCart, color: "text-green-600" },
  "/notas-fiscais": { title: "Notas Fiscais", icon: Receipt, color: "text-rose-500" },
  "/transferencias": { title: "Transferências", icon: ArrowRightLeft, color: "text-blue-500" },
  "/notas-deposito": { title: "Notas Depósito", icon: FileText, color: "text-amber-600" },
  "/devolucao-deposito": { title: "Devolução Depósito", icon: ArrowRightLeft, color: "text-orange-600" },
  "/compra-cereais": { title: "Compra Cereais", icon: Wheat, color: "text-yellow-600" },
  "/entradas-nfe": { title: "Entradas NF-e", icon: Package, color: "text-teal-600" },
  "/relatorios": { title: "Relatórios", icon: BarChart3, color: "text-purple-600" },
  "/lancamentos-financeiros": { title: "Lançamentos Financeiros", icon: DollarSign, color: "text-emerald-600" },
  "/dre-estrutura": { title: "Estrutura DRE", icon: GitBranch, color: "text-blue-600" },
  "/produtos": { title: "Produtos", icon: Package, color: "text-amber-500" },
  "/grupos-produtos": { title: "Grupos Produtos", icon: FolderOpen, color: "text-violet-500" },
  "/plano-contas-gerencial": { title: "Plano Contas", icon: FileText, color: "text-emerald-600" },
  "/unidades-medida": { title: "Unidades", icon: Ruler, color: "text-sky-500" },
  "/silos": { title: "Silos", icon: Warehouse, color: "text-emerald-500" },
  "/placas": { title: "Placas", icon: Truck, color: "text-orange-500" },
  "/tabela-umidades": { title: "Tab. Umidades", icon: Droplets, color: "text-cyan-500" },
  "/locais-entrega": { title: "Locais Entrega", icon: Map, color: "text-pink-500" },
  "/ncm": { title: "NCM", icon: FileText, color: "text-slate-500" },
  "/cfops": { title: "CFOPs", icon: FileText, color: "text-indigo-500" },
  "/emitentes-nfe": { title: "Emitentes NF-e", icon: Building2, color: "text-teal-500" },
  "/transportadoras": { title: "Transportadoras", icon: Truck, color: "text-purple-500" },
  "/usuarios": { title: "Usuários", icon: Shield, color: "text-destructive" },
  "/tenants": { title: "Empresas Contratantes", icon: Crown, color: "text-amber-500" },
  "/importar-dados": { title: "Importar Dados", icon: DatabaseBackup, color: "text-cyan-600" },
};

export function getRouteInfo(path: string): RouteInfo {
  // Try exact match first
  if (routeMap[path]) return routeMap[path];
  
  // Try base path for sub-routes like /vendas-producao/nova or /vendas-producao/:id/remessas
  const basePath = "/" + path.split("/").filter(Boolean)[0];
  if (routeMap[basePath]) return routeMap[basePath];
  
  return { title: path, icon: FileText, color: "text-muted-foreground" };
}
